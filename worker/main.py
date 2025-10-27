# worker/main.py
# Sunday 10-26-25 Version – adapted to Highlights-only
import os, json, time, tempfile, logging
from google.cloud import pubsub_v1, storage, firestore
from VideoInputTest import process_video_and_summarize, CreateHighlightVideo2, timestamp_maker
from dotenv import load_dotenv   # NEW

logging.basicConfig(level=logging.INFO)

# --- NEW: load env file ---
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# UNCHANGED: env
# PROJECT_ID      = os.environ["GCP_PROJECT_ID"]
# SUBSCRIPTION_ID = os.environ["PUBSUB_SUB"]
# RAW_BUCKET      = os.environ["GCS_RAW_BUCKET"]   # UNCHANGED: temporary ingest objects live here and are deleted
# OUT_BUCKET      = os.environ["GCS_OUT_BUCKET"]
# COLLECTION      = os.environ.get("FIRESTORE_COLLECTION", "jobs")
PROJECT_ID = os.getenv("GCP_PROJECT_ID")
RAW_BUCKET = os.getenv("GCS_RAW_BUCKET")
OUT_BUCKET = os.getenv("GCS_OUT_BUCKET")
SUBSCRIPTION_ID = os.getenv("PUBSUB_SUB")
COLLECTION = os.getenv("FIRESTORE_COLLECTION", "jobs")
HIGHLIGHT_COL = os.getenv("FIRESTORE_HIGHLIGHT_COL", "Highlights")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# UNCHANGED: clients
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher = pubsub_v1.PublisherClient() # NEW

# UNCHANGED: Firestore helpers
def update_job(job_id: str, data: dict):
    firestore_client.collection(COLLECTION).document(job_id).set(data, merge=True)

def _parse_gs(gs_uri: str):
    assert gs_uri.startswith("gs://")
    rest = gs_uri[5:]
    b, _, k = rest.partition("/")
    return b, k

# UNCHANGED: GCS helpers
def download_from_gcs(gcs_uri: str, dest_path: str):
    b, k = _parse_gs(gcs_uri)
    storage_client.bucket(b).blob(k).download_to_filename(dest_path)

def upload_to_gcs(local_path: str, bucket_name: str, dst_key: str) -> str:
    blob = storage_client.bucket(bucket_name).blob(dst_key)
    blob.upload_from_filename(local_path)
    return f"gs://{bucket_name}/{dst_key}"

# UNCHANGED: build highlight from Gemini timestamps
def make_highlight(in_path: str, out_path: str, gemini_output):
    hl = CreateHighlightVideo2()
    make_ts = timestamp_maker(gemini_output)
    clip_files = hl.create_highlights_ffmpeg(make_ts, in_path, out_path)
    if not clip_files:
        raise RuntimeError("No highlight clips were created.")
    return out_path

def handle_job(msg: pubsub_v1.subscriber.message.Message):
    try:
        payload        = json.loads(msg.data.decode("utf-8"))
        job_id         = payload["jobId"]                  # UNCHANGED
        input_gcs_uri  = payload["videoGcsUri"]            # UNCHANGED
        out_key        = f"{job_id}/highlight.mp4"         # UNCHANGED
        json_key       = f"{job_id}/analysis.json"         # UNCHANGED

        owner_email    = payload.get("ownerEmail")         # NEW
        visibility     = payload.get("visibility", "private")  # NEW
        user_id        = payload.get("userId")             # UNCHANGED (optional)

        logging.info(f"Worker: start {job_id} owner={owner_email} uri={input_gcs_uri}")
        update_job(job_id, {"status": "processing", "startedAt": firestore.SERVER_TIMESTAMP})

        with tempfile.TemporaryDirectory() as td:
            in_path   = os.path.join(td, "input.mp4")
            out_path  = os.path.join(td, "highlight.mp4")
            json_path = os.path.join(td, "analysis.json")

            # UNCHANGED: download source
            download_from_gcs(input_gcs_uri, in_path)

            # UNCHANGED: get Gemini events
            raw = process_video_and_summarize(in_path)

            # UNCHANGED: tolerant parse
            if isinstance(raw, str):
                # try to extract a JSON array even if the model adds fences
                if "```json" in raw:
                    js = raw[raw.find("["): raw.rfind("]") + 1]
                    parsed = json.loads(js)
                else:
                    parsed = json.loads(raw)
            elif isinstance(raw, dict):
                if not raw.get("ok", True):
                    raise RuntimeError(raw.get("error", "Gemini error"))
                parsed = raw
            elif isinstance(raw, list):
                parsed = raw
            else:
                raise TypeError(f"Unexpected Gemini output type: {type(raw)}")
            if isinstance(parsed, list) and len(parsed) == 1 and isinstance(parsed[0], list):
                parsed = parsed[0]

            with open(json_path, "w") as f:
                json.dump(parsed, f, indent=2)

            # UNCHANGED: create highlight file
            make_highlight(in_path, out_path, parsed)

            # UNCHANGED: upload outputs
            out_gcs_uri     = upload_to_gcs(out_path, OUT_BUCKET, out_key)
            analysis_gcs_uri= upload_to_gcs(json_path, OUT_BUCKET, json_key)

        # NEW: write a Highlight document (single collection)
        # id = jobId (easy joins), or you can use a random id—jobId keeps it simple
        highlight_doc = {
            "ownerEmail": owner_email,
            "jobId": job_id,
            "downloadUrl": out_gcs_uri,      # gs://… (UI can exchange for a signed URL when needed)
            "title": None,                   # user can rename in dashboard later
            "isPublic": (visibility == "public"),
            "visibility": visibility,        # "private" | "unlisted" | "public"
            "stats": None,                   # reserve for your computed stats
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        firestore_client.collection(HIGHLIGHT_COL).document(job_id).set(highlight_doc, merge=True)

        # NEW: delete the temporary raw object to save storage (you asked to stop storing raws)
        try:
            b, k = _parse_gs(input_gcs_uri)
            storage_client.bucket(b).blob(k).delete()
            logging.info(f"Deleted temp raw object: {input_gcs_uri}")
        except Exception as d_err:
            logging.warning(f"Could not delete temp raw object: {d_err}")

        # UNCHANGED: finalize job
        update_job(job_id, {
            "status": "done",
            "outputGcsUri": out_gcs_uri,
            "analysisGcsUri": analysis_gcs_uri,
            "finishedAt": firestore.SERVER_TIMESTAMP,
        })
        msg.ack()
    except Exception as e:
        try:
            job_id = json.loads(msg.data.decode("utf-8")).get("jobId")
            if job_id:
                update_job(job_id, {
                    "status": "error",
                    "error": str(e),
                    "finishedAt": firestore.SERVER_TIMESTAMP,
                })
        except Exception as inner:
            logging.error(f"Failed to update job status: {inner}")
        finally:
            msg.ack()  # CHANGED: ack to avoid infinite retries during dev
        logging.exception("ERROR processing message:")

def main():
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)
    streaming_pull_future = subscriber.subscribe(subscription_path, callback=handle_job)
    print(f"Worker listening on {subscription_path}", flush=True)
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        streaming_pull_future.cancel()

if __name__ == "__main__":
    main()


#---------------------------------------------------------
# #worker/main.py - Sunday 10-26-25 Version (same as on hooptuber-new-merge-oct branch on github)

# #worker/main.py -downloads from GCS, “processes” the file, uploads back to GCS, and updates Firestore

# import os, json, time, tempfile, shutil
# from google.cloud import pubsub_v1, storage, firestore
# from VideoInputTest import process_video_and_summarize, client, CreateHighlightVideo2, timestamp_maker, strip_code_fences
# import subprocess
# import logging # for render logs

# logging.basicConfig(level=logging.INFO)
# PROJECT_ID         = os.environ["GCP_PROJECT_ID"]
# SUBSCRIPTION_ID    = os.environ["PUBSUB_SUB"]          # e.g. video-jobs-worker
# RAW_BUCKET         = os.environ["GCS_RAW_BUCKET"]
# OUT_BUCKET         = os.environ["GCS_OUT_BUCKET"]
# COLLECTION         = os.environ.get("FIRESTORE_COLLECTION", "jobs")
# PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC", "video-jobs")

# # Optional: if you use Gemini here too
# #USE_GEMINI = bool(os.environ.get("GOOGLE_API_KEY"))
# #is just a placeholder and isn’t used—feel free to delete it (or keep it as a future feature flag).

# # --- helpers
# storage_client   = storage.Client(project=PROJECT_ID)
# firestore_client = firestore.Client(project=PROJECT_ID)



# def update_job(job_id: str, data: dict):
#     firestore_client.collection(COLLECTION).document(job_id).set(data, merge=True)

# def download_from_gcs(gcs_uri: str, dest_path: str):
#     # gcs_uri like gs://bucket/path/file.mp4
#     assert gcs_uri.startswith("gs://")
#     _, _, rest = gcs_uri.partition("gs://")
#     bucket_name, _, blob_name = rest.partition("/")
#     folder_prefix = os.path.dirname(blob_name)
#     bucket = storage_client.bucket(bucket_name)
#     blob   = bucket.blob(blob_name)
#     blob.download_to_filename(dest_path)

# def upload_to_gcs(local_path: str, bucket_name: str, dst_key: str) -> str:
#     bucket = storage_client.bucket(bucket_name)
#     blob   = bucket.blob(dst_key)
#     blob.upload_from_filename(local_path)
#     return f"gs://{bucket_name}/{dst_key}"

# def make_highlight(in_path: str, out_path: str, gemini_output):
#     highlighter = CreateHighlightVideo2()
#     """
#     Replace this with your real highlight pipeline (ffmpeg, moviepy, Gemini, etc).
#     For now, just copy the file to simulate work.
#     """
#     # REAL HIGHLIGHT PIPELINE:
    
#     make_timestamps = timestamp_maker(gemini_output) # list of make timestamps
#     clip_files = highlighter.create_highlights_ffmpeg(make_timestamps, in_path, out_path) # create highlight clips
#     if not clip_files:
#         raise RuntimeError("No highlight clips were created.")
#     return out_path
# def handle_job(msg: pubsub_v1.subscriber.message.Message):
#     try:
        
#         payload = json.loads(msg.data.decode("utf-8"))
#         job_id        = payload["jobId"]
#         user_id       = payload.get("userId")
#         input_gcs_uri = payload["videoGcsUri"]     # gs://...
#         out_key       = f"{job_id}/highlight.mp4"
#         json_key      = f"{job_id}/analysis.json"
#         print(f"DEBUG: Paylod: {payload}, Processing {job_id} for {user_id}, gcs_uri={input_gcs_uri}")
#         update_job(job_id, {"status": "processing", "startedAt": firestore.SERVER_TIMESTAMP})
#         print(f"=== handle_job() started for jobId={payload.get('jobId')} ===", flush=True)


#         with tempfile.TemporaryDirectory() as td:
#             in_path  = os.path.join(td, "input.mp4")
#             out_path = os.path.join(td, "highlight.mp4")
#             json_path = os.path.join(td, "output.json")

#             download_from_gcs(input_gcs_uri, in_path)
#             # handling .mov files, will be better in the long run
#             converted_path = in_path
#             """
#             try:
#                 if not in_path.lower.endswith(".mp4"):
#                     converted_path = os.path.join(td, "converted.mp4")
#                     logging.info("Converting .MOV file to .mp4")
#                     subprocess.run([
#                         "ffmpeg", "-i", in_path, "-c:v", "libx264", "-c:a", "aac", "-y", converted_path
#                     ], check=True)
#                 else:
#                     logging.info(f"{in_path} is an .mp4 file")
#             except Exception as E:
#                 logging.error("Conversion failed, contintuing with original file")
            
#             """
#             raw_gemini_output = process_video_and_summarize(converted_path) # gemini output
            
#             print(f"DEBUG: gemini is outputting: {type(raw_gemini_output)}, coming from worker/main.py", flush=True)
#             print(f"DEBUG: Gem output: {raw_gemini_output}")

#             # Handle dict error responses from process_video_and_summarize
            
#             if isinstance(raw_gemini_output, str):
#                 try:
#                     # Remove code fences and whitespace
#                     #clean_text = strip_code_fences(raw_gemini_output).strip()
#                     clean_text = raw_gemini_output
#                     # If the response includes ```json``` fences, extract the content inside
#                     if "```json" in raw_gemini_output:
#                         json_start = raw_gemini_output.find('[')
#                         json_end = raw_gemini_output.rfind(']') + 1
#                         clean_text = raw_gemini_output[json_start:json_end]

#                     # Try parsing the clean JSON string
#                     parsed_data = json.loads(clean_text)
#                     logging.info("Parsed Gemini JSON string successfully")

#                 except json.JSONDecodeError as e:
#                     raise RuntimeError(f"Gemini returned invalid JSON: {e}")

#             elif isinstance(raw_gemini_output, dict):
#                 # Check if it's an error response
#                 if not raw_gemini_output.get("ok", True):
#                     error_msg = raw_gemini_output.get("error", "Unknown error from Gemini")
#                     logging.error(f"Gemini processing failed: {error_msg}")
#                     raise RuntimeError(f"Gemini processing failed: {error_msg}")
#                 parsed_data = raw_gemini_output
#                 logging.info("Gemini is returning a dict object")
#                 #else:
#             elif isinstance(raw_gemini_output, list):
#                 parsed_data = raw_gemini_output
#                 logging.info("DEBUG: GEMINI OUTPUT is already a list")
#             else:
#                 raise TypeError(f"Gemini output is neither dict nor string, it is: {type(raw_gemini_output)}")
#             if isinstance(parsed_data, list) and len(parsed_data) == 1 and isinstance(parsed_data[0], list):
#                 parsed_data = parsed_data[0]  # unwrap nested list
            
#             with open(json_path, "w") as f:
#                json.dump(parsed_data, f,indent=2)
            

#             make_highlight(in_path, out_path, parsed_data)

#             out_gcs_uri = upload_to_gcs(out_path, OUT_BUCKET, out_key)
#             analysis_gcs_uri = upload_to_gcs(json_path, OUT_BUCKET, json_key)
            
#         update_job(job_id, {
#             "status": "done",
#             "outputGcsUri": out_gcs_uri,
#             "analysisGcsUri": analysis_gcs_uri,
#             "finishedAt": firestore.SERVER_TIMESTAMP,
#         })
#         msg.ack()
#     except Exception as e:
#         # Mark failed; DO NOT ack so it can be retried (or set a dead-letter topic later)
#         try:
#             job_id = json.loads(msg.data.decode("utf-8")).get("jobId")
#             if job_id:
#                 update_job(job_id, {
#                     "status": "error",
#                     "error": str(e),
#                     "finishedAt": firestore.SERVER_TIMESTAMP,
#                 })
            
#         except Exception as inner:
#             logging.error(f"Failed to update job status for: {inner}")
#         finally:
#             msg.ack() # ACKNOWLEDGE TO AVOID INF LOOP
#         print("ERROR processing message:", e, flush=True)

# def main():
#     subscriber = pubsub_v1.SubscriberClient()
#     subscription_path = subscriber.subscription_path(PROJECT_ID, SUBSCRIPTION_ID)
#     streaming_pull_future = subscriber.subscribe(subscription_path, callback=handle_job)
#     print(f"Worker listening on {subscription_path}", flush=True)
#     try:
#         while True:
#             time.sleep(60)
#     except KeyboardInterrupt:
#         streaming_pull_future.cancel()

# if __name__ == "__main__":
#     main()

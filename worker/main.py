# worker/main.py -downloads from GCS, “processes” the file, uploads back to GCS, and updates Firestore

import os, json, time, tempfile, shutil
from google.cloud import pubsub_v1, storage, firestore
from VideoInputTest import process_video_and_summarize, client, CreateHighlightVideo2, timestamp_maker, strip_code_fences
import subprocess
import logging # for render logs
from utils import convert_to_mp4, add_watermark
import math


from utils import format_gemini_output # COMBINES GEMINI OUTPUT AND TUPLE ARRAY FOR FRONTEND

logging.basicConfig(level=logging.INFO)
PROJECT_ID         = os.environ["GCP_PROJECT_ID"]
SUBSCRIPTION_ID    = os.environ["PUBSUB_SUB"]          # e.g. video-jobs-worker
RAW_BUCKET         = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET         = os.environ["GCS_OUT_BUCKET"]
COLLECTION         = os.environ.get("FIRESTORE_COLLECTION", "jobs")
PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC", "video-jobs")


storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)

Creator = CreateHighlightVideo2()

def update_job(job_id: str, data: dict):
    firestore_client.collection(COLLECTION).document(job_id).set(data, merge=True)

def download_from_gcs(gcs_uri: str, dest_path: str):
    # gcs_uri like gs://bucket/path/file.mp4
    assert gcs_uri.startswith("gs://")
    _, _, rest = gcs_uri.partition("gs://")
    bucket_name, _, blob_name = rest.partition("/")
    folder_prefix = os.path.dirname(blob_name)
    bucket = storage_client.bucket(bucket_name)
    blob   = bucket.blob(blob_name)
    blob.download_to_filename(dest_path)

def upload_to_gcs(local_path: str, bucket_name: str, dst_key: str) -> str:
    bucket = storage_client.bucket(bucket_name)
    blob   = bucket.blob(dst_key)
    blob.upload_from_filename(local_path)
    return f"gs://{bucket_name}/{dst_key}"

def make_highlight(in_path: str, out_path: str, gemini_output):
    highlighter = CreateHighlightVideo2()
    # REAL HIGHLIGHT PIPELINE:
    print(f"[DEBUG] @make_highlight: type={type(gemini_output)}")
    print(f"[DEBUG] make_highlight: first element={gemini_output[0] if gemini_output else 'None'}")
    make_timestamps = timestamp_maker(gemini_output) # list of make timestamps
    print(f"[DEBUG] @ make_highlight: timestamps = {make_timestamps}")
    tuple_timestamps = highlighter.converting_tester(make_timestamps)
    clip_files = highlighter.create_highlights_ffmpeg(tuple_timestamps, in_path, out_path) # create highlight clips
    if not clip_files:
        raise RuntimeError("No highlight clips were created.")
    return out_path

def get_video_length_seconds(out_path):
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "json",
        out_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)

    duration = float(data["format"]["duration"])    
    return math.ceil(duration) # round up to nearest second                   

def handle_job(msg: pubsub_v1.subscriber.message.Message):
    try:
        
        payload = json.loads(msg.data.decode("utf-8"))
        job_id        = payload["jobId"]
        user_id       = payload.get("userId")
        input_gcs_uri = payload["videoGcsUri"]     # gs://...
        out_key       = f"{job_id}/highlight.mp4"
        json_key      = f"{job_id}/analysis.json"
        print(f"DEBUG: Paylod: {payload}, Processing {job_id} for {user_id}, gcs_uri={input_gcs_uri}")
        update_job(job_id, {"status": "processing", "startedAt": firestore.SERVER_TIMESTAMP})
        print(f"=== handle_job() started for jobId={payload.get('jobId')} ===", flush=True)


        with tempfile.TemporaryDirectory() as td:
            in_path  = os.path.join(td, "input.mp4")
            out_path = os.path.join(td, "highlight.mp4")
            json_path = os.path.join(td, "output.json")

            download_from_gcs(input_gcs_uri, in_path)
            # handling .mov files, will be better in the long run
            converted_path = convert_to_mp4(in_path, td)
            
            raw_gemini_output = process_video_and_summarize(converted_path) # gemini output
            
            print(f"DEBUG: gemini is outputting: {type(raw_gemini_output)}, coming from worker/main.py", flush=True)
            print(f"DEBUG: Gem output: {raw_gemini_output}")

            # Handle dict error responses from process_video_and_summarize
            
            if isinstance(raw_gemini_output, str):
                try:
                    # Remove code fences and whitespace
                    #clean_text = strip_code_fences(raw_gemini_output).strip()
                    clean_text = raw_gemini_output
                    # If the response includes ```json``` fences, extract the content inside
                    if "```json" in raw_gemini_output:
                        json_start = raw_gemini_output.find('[')
                        json_end = raw_gemini_output.rfind(']') + 1
                        clean_text = raw_gemini_output[json_start:json_end]

                    # Try parsing the clean JSON string
                    parsed_data = json.loads(clean_text)
                    logging.info("Parsed Gemini JSON string successfully")

                except json.JSONDecodeError as e:
                    raise RuntimeError(f"Gemini returned invalid JSON: {e}")

            elif isinstance(raw_gemini_output, dict):
                # Check if it's an error response
                if not raw_gemini_output.get("ok", True):
                    error_msg = raw_gemini_output.get("error", "Unknown error from Gemini")
                    logging.error(f"Gemini processing failed: {error_msg}")
                    raise RuntimeError(f"Gemini processing failed: {error_msg}")
                parsed_data = raw_gemini_output
                logging.info("Gemini is returning a dict object")
                #else:
            elif isinstance(raw_gemini_output, list):
                parsed_data = raw_gemini_output
                logging.info("DEBUG: GEMINI OUTPUT is already a list")
            else:
                raise TypeError(f"Gemini output is neither dict nor string, it is: {type(raw_gemini_output)}")
            if isinstance(parsed_data, list) and len(parsed_data) == 1 and isinstance(parsed_data[0], list):
                parsed_data = parsed_data[0]  # unwrap nested list
            
            with open(json_path, "w") as f:
               json.dump(parsed_data, f,indent=2)
            

            make_highlight(in_path, out_path, parsed_data)
            try:
                logging.info("Starting timestamp merge for frontend")
                
                start_end_times = Creator.converting_tester(timestamp_maker(parsed_data))
                logging.info("Converted to tuple timstamps")
                logging.info(f"Timestamps: {start_end_times}\n")
                formatted_output = format_gemini_output(parsed_data, start_end_times)

                logging.info("CHECK! Combined Gemini + Timestamp ranges successfully")
                logging.info(f"FORMATTED OUTPUT: {formatted_output}")
                with open(json_path, "w") as f:
                    json.dump(formatted_output, f, indent=2)
            except Exception as e:
                logging.error(f"ERROR (make_highlight function):error merging timestamps: {e}")
                formatted_output = [] # fallback
            out_gcs_uri = upload_to_gcs(out_path, OUT_BUCKET, out_key)
            analysis_gcs_uri = upload_to_gcs(json_path, OUT_BUCKET, json_key)

            video_duration_sec = get_video_length_seconds(out_path) # returns int secodns length of video
        update_job(job_id, {
            "status": "done",
            "shotEvents": formatted_output,
            "outputGcsUri": out_gcs_uri,
            "analysisGcsUri": analysis_gcs_uri,
            "finishedAt": firestore.SERVER_TIMESTAMP,
            "videoDurationSec": video_duration_sec,
        })
        msg.ack()
    except Exception as e:
        # Mark failed; DO NOT ack so it can be retried (or set a dead-letter topic later)
        try:
            job_id = json.loads(msg.data.decode("utf-8")).get("jobId")
            if job_id:
                update_job(job_id, {
                    "status": "error",
                    "error": str(e),
                    "finishedAt": firestore.SERVER_TIMESTAMP,
                })
            
        except Exception as inner:
            logging.error(f"Failed to update job status for: {inner}")
        finally:
            msg.ack() # ACKNOWLEDGE TO AVOID INF LOOP
        print("(HANDLE_JOB FUNC) ERROR processing message:", e, flush=True)

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
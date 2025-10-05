#worker/main.py -downloads from GCS, “processes” the file, uploads back to GCS, and updates Firestore

import os, json, time, tempfile, shutil
from google.cloud import pubsub_v1, storage, firestore
from VideoInputTest import process_video_and_summarize, client, CreateHighlightVideo2, timestamp_maker, strip_code_fences


PROJECT_ID         = os.environ["GCP_PROJECT_ID"]
SUBSCRIPTION_ID    = os.environ["PUBSUB_SUB"]          # e.g. video-jobs-worker
RAW_BUCKET         = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET         = os.environ["GCS_OUT_BUCKET"]
COLLECTION         = os.environ.get("FIRESTORE_COLLECTION", "jobs")

# Optional: if you use Gemini here too
#USE_GEMINI = bool(os.environ.get("GOOGLE_API_KEY"))
#is just a placeholder and isn’t used—feel free to delete it (or keep it as a future feature flag).

# --- helpers
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)



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
    """
    Replace this with your real highlight pipeline (ffmpeg, moviepy, Gemini, etc).
    For now, just copy the file to simulate work.
    """
    # REAL HIGHLIGHT PIPELINE:
    
    make_timestamps = timestamp_maker(gemini_output) # list of make timestamps
    clip_files = highlighter.create_highlights_ffmpeg(make_timestamps, in_path, out_path) # create highlight clips
    if not clip_files:
        raise RuntimeError("No highlight clips were created.")
    return out_path
def handle_job(msg: pubsub_v1.subscriber.message.Message):
    try:
        payload = json.loads(msg.data.decode("utf-8"))
        job_id        = payload["jobId"]
        user_id       = payload.get("userId")
        input_gcs_uri = payload["videoGcsUri"]     # gs://...
        out_key       = f"{job_id}/highlight.mp4"
        json_key      = f"{job_id}/analysis.json"

        update_job(job_id, {"status": "processing", "startedAt": firestore.SERVER_TIMESTAMP})

        with tempfile.TemporaryDirectory() as td:
            in_path  = os.path.join(td, "input.mp4")
            out_path = os.path.join(td, "highlight.mp4")
            json_path = os.path.join(td, "output.json")

            download_from_gcs(input_gcs_uri, in_path)
            raw_gemini_output = process_video_and_summarize(in_path) # gemini output
            #if isinstance(raw_gemini_output, str):
            if '```json' in raw_gemini_output:
                json_start = raw_gemini_output.find('[')
                json_end = raw_gemini_output.rfind(']') + 1
                clean_data = strip_code_fences(raw_gemini_output[json_start:json_end])
                parsed_data = json.loads(clean_data)
            else:
                parsed_data = json.loads(raw_gemini_output)
            #else:
                #parsed_data = raw_gemini_output
            with open(json_path, "w") as f:
                json.dump(parsed_data, f,indent=2)
            make_highlight(in_path, out_path, raw_gemini_output)

            out_gcs_uri = upload_to_gcs(out_path, OUT_BUCKET, out_key)
            analysis_gcs_uri = upload_to_gcs(json_path, OUT_BUCKET, json_key)
        update_job(job_id, {
            "status": "done",
            "outputGcsUri": out_gcs_uri,
            "analysisGcsUri": analysis_gcs_uri,
            "finishedAt": firestore.SERVER_TIMESTAMP,
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
        except Exception:
            pass
        print("ERROR processing message:", e, flush=True)

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

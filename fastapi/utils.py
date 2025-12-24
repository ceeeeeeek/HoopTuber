# 12/7 : MOVED ALL HELPER FUNCTIONS INTO THIS FILE (utils.py) for better organization
# fastapi/main.py will now just have endpoints, and import from this file


import os
from typing import Optional
from datetime import timedelta, datetime
import os, uuid, json
from dotenv import load_dotenv
# NEW: Google Cloud clients
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
from zoneinfo import ZoneInfo
# slow api import for rate limiting ai calls
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from urllib.parse import urlparse
from fastapi.responses import StreamingResponse
from google.cloud import storage
import io


load_dotenv()

print("DEBUGGING:")
print(f"GCP_PROJECT_ID: {os.environ.get('GCP_PROJECT_ID')}")
print(f"GOOGLE_APP_CREDS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")
print(f"Credentials file exists: {os.path.exists(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''))}")

PROJECT_ID   = os.environ["GCP_PROJECT_ID"]
RAW_BUCKET   = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET   = os.environ["GCS_OUT_BUCKET"]
TOPIC_NAME   = os.environ["PUBSUB_TOPIC"]
COLLECTION   = os.getenv("FIRESTORE_COLLECTION", "jobs")
#HIGHLIGHT_COL = os.getenv("FIRESTORE_HIGHLIGHT_COL", "Highlights")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher        = pubsub_v1.PublisherClient()
topic_path       = publisher.topic_path(PROJECT_ID, TOPIC_NAME)



def _job_doc(job_id: str):
    """Return a Firestore doc handle for the job."""
    return firestore_client.collection(COLLECTION).document(job_id)

def _make_keys(original_name: str, job_id: str) -> tuple[str, str, str]:
    """
    Create a stable GCS object name for RAW uploads and return:
      (blob_name_in_raw_bucket, gs_uri, original_file_name)
    """
    # Keep user uploads grouped by job; you can also include userId if you pass it
    safe_name = original_name or "upload.mp4"
    #now_pst = datetime.now(ZoneInfo("America/Los_Angeles"))
    #date_str = now_pst.strftime("%Y-%m-%d")
    blob_name = f"uploads/{job_id}/{safe_name}"
    gcs_uri   = f"gs://{RAW_BUCKET}/{blob_name}"
    print(f"DEBUG: uploading to blob_name={blob_name}")
    return blob_name, gcs_uri, safe_name

def _publish_job(job_id: str, raw_gcs_uri: str, user_id: Optional[str] = None, owner_email: Optional[str] = None, mode="vertex"):
    """Publish a message the Background Worker will process."""
    payload = {
        "jobId": job_id,
        "videoGcsUri": raw_gcs_uri,
        "outBucket": OUT_BUCKET,
        "userId": user_id,
        "ownerEmail": owner_email,
        "mode": mode  # "vertex" or "old"
        
    }
    # .result() to surface publish errors immediately
    publisher.publish(topic_path, json.dumps(payload).encode("utf-8"))


def _upload_filelike_to_gcs(bucket: storage.Bucket, blob_name: str, file_obj, content_type: str):
    """Blocking upload of a file-like object to GCS (invoked in a threadpool)."""
    blob = bucket.blob(blob_name)
    try:
        file_obj.seek(0)
    except Exception:
        pass
    blob.upload_from_file(file_obj, content_type=content_type, timeout=600)

#What changed & why: 
#These helpers encapsulate the cloud handoff: naming, Firestore doc handle, Pub/Sub publish, and streaming the file to GCS.
#---------------------------------------------------------
# NEW: Helper functions 
def _job_doc(job_id: str):
    """Return a Firestore doc handle for the job."""
    return firestore_client.collection(COLLECTION).document(job_id)

def _parse_gs_uri(gs_uri: str) -> tuple[str, str]:
    """Split 'gs://bucket/path/to/key' -> (bucket, key)."""
    assert gs_uri.startswith("gs://"), "Not a gs:// URI"
    rest = gs_uri[len("gs://"):]
    bucket, _, key = rest.partition("/")
    return bucket, key

def _sign_get_url(gs_uri: str, minutes: int = 15) -> str:
    """Generate a short-lived signed URL for downloading from GCS."""
    bucket_name, blob_name = _parse_gs_uri(gs_uri)
    blob = storage_client.bucket(bucket_name).blob(blob_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
    )

def ts_to_seconds(ts):
        if isinstance(ts, (int, float)):
            return int(ts)
        parts = ts.split(":")
        if len(parts) == 3:
            h, m, s = map(int, parts)
            return h*3600 + m*60 + s
        elif len(parts) == 2:
            m, s = map(int, parts)
            return m*60 + s
        elif len(parts) == 1:
            return int(parts[0])
        else:
            raise ValueError(f"invalid timestamp {ts}")
def seconds_to_ts(seconds):
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    if h > 0:
        return f"{h}:{m:02}:{s:02}"
    else:
        return f"00:{m:02}:{s:02}"
from fastapi import APIrouter, Body, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
import os, uuid, io
import datetime
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
from zoneinfo import ZoneInfo
from typing import Optional


PROJECT_ID   = os.environ["GCP_PROJECT_ID"]
RAW_BUCKET   = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET   = os.environ["GCS_OUT_BUCKET"]
TOPIC_NAME   = os.environ["PUBSUB_TOPIC"]
COLLECTION   = os.getenv("FIRESTORE_COLLECTION", "jobs")
#HIGHLIGHT_COL = os.getenv("FIRESTORE_HIGHLIGHT_COL", "Highlights")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# NEW: GCP clients
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher        = pubsub_v1.PublisherClient()
topic_path       = publisher.topic_path(PROJECT_ID, TOPIC_NAME)


from utils import (_make_keys,
                   _job_doc,
                   _publish_job,
                   _upload_filelike_to_gcs,
                   _sign_get_url,
                   _parse_gs_uri)

router = APIrouter(prefix="/vertex")
def user_or_ip_key(request: Request):
    user_id = request.query_params.get("userID")
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)
limiter = Limiter(key_func=user_or_ip_key)

@router.post("/upload")
@limiter.limit("1/minute")
async def upload_file(request: Request, file: UploadFile = Body(...), userID: Optional[str] = None, ownerEmail: Optional[str] = None):
    """Upload a file and create a processing job."""
    job_id = str(uuid.uuid4())
    blob_name, gcs_uri, safe_name = _make_keys(file.filename, job_id)

    # Upload to GCS
    await _upload_filelike_to_gcs(RAW_BUCKET, blob_name, file.file)

    # Create Firestore job document
    job_data = {
        "jobId": job_id,
        "status": "uploaded",
        "rawGcsUri": gcs_uri,
        "originalFileName": safe_name,
        "userID": userID,
        "ownerEmail": ownerEmail,
        "createdAt": datetime.utcnow(),
    }
    _job_doc(job_id).set(job_data)

    # Publish Pub/Sub message
    _publish_job(job_id, gcs_uri, user_id=userID, owner_email=ownerEmail)

    return JSONResponse({"jobId": job_id, "message": "File uploaded and job created."})
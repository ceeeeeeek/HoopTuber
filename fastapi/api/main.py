# fastapi server as of 10/17/2025

from fastapi import Body, FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
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

load_dotenv()

print("DEBUGGING:")
print(f"GCP_PROJECT_ID: {os.environ.get('GCP_PROJECT_ID')}")
print(f"GOOGLE_APP_CREDS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")
print(f"Credentials file exists: {os.path.exists(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''))}")
# NEW: env-config (you already set these on Render)
PROJECT_ID   = os.environ["GCP_PROJECT_ID"]
RAW_BUCKET   = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET   = os.environ["GCS_OUT_BUCKET"]
TOPIC_NAME   = os.environ["PUBSUB_TOPIC"]
COLLECTION   = os.getenv("FIRESTORE_COLLECTION", "jobs")

# NEW: GCP clients
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher        = pubsub_v1.PublisherClient()
topic_path       = publisher.topic_path(PROJECT_ID, TOPIC_NAME)


def user_or_ip_key(request: Request):
    user_id = request.query_params.get("userID")
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)

limiter = Limiter(key_func=user_or_ip_key)
app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."}
    )



app.add_middleware(
    CORSMiddleware,
    #allow_origins=['http://localhost:3000'],
    allow_origins=['http://localhost:3000',
    "https://app.hooptuber.com", 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # directory of current script (main.py)
#DATASET_DIR = os.path.join(BASE_DIR, "videoDataset") # directory to save uploaded videos (/videoDataset)
#os.makedirs(DATASET_DIR, exist_ok=True)

@app.get("/ratelimit/status")
async def ratelimit_status(request: Request):
    # creating an endpoint to check rate limit status
    try:
        key = user_or_ip_key(request)

        window_stats = limiter.get_window_stats(
            limiter._key_prefix(request.endpoint, key),
            limit = 1,
            expiry=60,
        )
        if not window_stats:
            return {"allowed": True, "retry_after": 0}
        remaining = window_stats.reset_in
        if remaining > 0:
            return {"allowed": False, "retry_after": remaining}
        else:
            return {"allowed": True, "retry_after": 0}
    except Exception as e:
        return {"allowed": True, "retry_after": 0, "error": str(e)}

@app.post("/generate_upload_url")
def generate_upload_url(request: dict = Body(...)):
    filename = request.get("filename")
    user_id = request.get("UserId")
    content_type = request.get("userId")
    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    
    job_id = str(uuid.uuid4())
    blob_name, gcs_uri, safe_name = _make_keys(filename, job_id)
    bucket = storage_client.bucket(RAW_BUCKET)
    blob = bucket.blob(blob_name)

    # Generate signed upload URL
    upload_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=15),
        method="PUT",
        content_type=content_type
    )

    # Create a Firestore entry with status "uploading"
    _job_doc(job_id).set({
        "jobId": job_id,
        "userId": user_id,
        "status": "uploading",
        "videoGcsUri": gcs_uri,
        "originalFileName": safe_name,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }, merge=True)

    return {
        "uploadUrl": upload_url,
        "gcsUri": gcs_uri,
        "jobId": job_id,
        "contentType": content_type
    }

@app.post("/publish_job")
def publish_job(request: dict = Body(...)):
    job_id = request.get("jobId")
    gcs_uri = request.get("videoGcsUri")
    user_id = request.get("userId")

    if not job_id or not gcs_uri:
        raise HTTPException(status_code=400, detail="Missing jobId or videoGcsUri")

    # Publish the job to Pub/Sub for the worker to process
    try:
        _publish_job(job_id, gcs_uri, user_id=user_id)
        _job_doc(job_id).set({
            "status": "queued",
            "queuedAt": firestore.SERVER_TIMESTAMP
        }, merge=True)
        return {"ok": True, "message": "Job queued successfully"}
    except Exception as e:
        _job_doc(job_id).set({"status": "publish_error", "error": str(e)}, merge=True)
        raise HTTPException(status_code=502, detail=f"Publish failed: {e}")
    
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

def _publish_job(job_id: str, raw_gcs_uri: str, user_id: Optional[str] = None, owner_email: Optional[str] = None):
    """Publish a message the Background Worker will process."""
    payload = {
        "jobId": job_id,
        "videoGcsUri": raw_gcs_uri,
        "outBucket": OUT_BUCKET,
        "userId": user_id,
        "ownerEmail": owner_email
    }
    # .result() to surface publish errors immediately
    publisher.publish(topic_path, json.dumps(payload).encode("utf-8")).result(timeout=10)


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


@app.post("/upload")
@limiter.limit("1/minute")
async def upload_video(
    request: Request,
    video: UploadFile = File(...),
    userId: Optional[str] = None,
):
    """
    1) Streams the uploaded file directly to GCS (RAW)
    2) Creates a job record in Firestore (status=queued)
    3) Publishes a Pub/Sub message for the Worker
    4) Returns { jobId, status } for the frontend to poll /jobs/{id}
    """
    try:
        owner_email = request.header.get("x-owner-email")
        print(f"Debug: starting upload for {video.filename}")
        if not video or not video.filename:
            raise HTTPException(status_code=400, detail="Missing file/filename")

        # 1) IDs & GCS keys
        job_id = str(uuid.uuid4())
        blob_name, raw_gcs_uri, original_name = _make_keys(video.filename, job_id)

        # 2) Stream to RAW bucket (no large temp files on Render)
        bucket = storage_client.bucket(RAW_BUCKET)
        await run_in_threadpool(
            _upload_filelike_to_gcs, bucket, blob_name, video.file, (video.content_type or "video/mp4")
        )

        # 3) Create Firestore job (the Worker will update it later)
        _job_doc(job_id).set({
            "jobId": job_id,
            "userId": userId,
            "ownerEmail": owner_email,
            "status": "queued",
            "originalFileName": original_name,
            "videoGcsUri": raw_gcs_uri,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }, merge=True)

        # 4) Publish to Pub/Sub so the Background Worker starts processing
        try:
            _publish_job(job_id, raw_gcs_uri, user_id=userId, owner_email=owner_email)
        except Exception as e:
            _job_doc(job_id).set({"status": "publish_error", "error": str(e)}, merge=True)
            raise HTTPException(status_code=502, detail=f"Enqueue failed: {e}")

        return {
            "ok": True,
            "jobId": job_id,
            "status": "queued",
            "videoGcsUri": raw_gcs_uri,
        }
    except Exception as e:
        print(f"Error: upload failed at error: {e}")
        print(f"Error details:", {type(e).__name__})
        import traceback
        print(f"Error: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")
@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    """
    Fetch the Firestore record for this job.
    Frontend can poll this until status becomes 'done' and outputGcsUri is present.
    """
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    return snap.to_dict()

@app.get("/jobs/{job_id}/download")
def job_download(job_id: str):
    """
    Return a signed URL for the output when ready.
    Worker should set outputGcsUri on success:
      { status: 'done', outputGcsUri: 'gs://<OUT_BUCKET>/<key>' }
    """
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    data = snap.to_dict()
    if data.get("status") != "done" or not data.get("outputGcsUri"):
        raise HTTPException(status_code=409, detail="job not finished")
    try:
        url = _sign_get_url(data["outputGcsUri"], minutes=30)
        response =  {"ok": True, "url": url, "expiresInMinutes": 30}
        if data.get("analysisGcsUri"):
            bucket_name, blob_name = _parse_gs_uri(data["analysisGcsUri"])
            blob = storage_client.bucket(bucket_name).blob(blob_name)
            json_bytes = blob.download_as_bytes()
            try:
                shot_events = json.loads(json_bytes.decode("utf-8"))
                response["shot_events"] = shot_events
            except Exception as e:
                print(f"Warning: failed to parse analysis JSON: {e}")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"signing failed: {e}")

@app.get("/healthz")
def healthz():
    """Used by Render for health checks."""
    return {"ok": True}


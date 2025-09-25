#fastapi/api/main.py (#fastapi/api/main.p VERSION as of Thursday 09-11-25)

#What changed & why:
#❌ Removed shutil, local DATASET_DIR, and the import of your on-box pipeline (process_video_and_summarize).
#Reason: we don’t keep user uploads on Render’s disk or run heavy processing in the API anymore.
#✅ Added Google Cloud clients + env config.
#Reason: the API now streams uploads straight to GCS (RAW), creates a job in Firestore, and enqueues work via Pub/Sub.
#---------------------------------------------------------
# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# import shutil
# import os
# import uuid
# from VideoInputTest import process_video_and_summarize, client
# from typing import List, Dict, Any, Optional
# import json

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from typing import Optional
from datetime import timedelta
import os, uuid, json
from dotenv import load_dotenv
# NEW: Google Cloud clients
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    #allow_origins=['http://localhost:3000'],
    allow_origins=['http://localhost:3000',
    "https://app.hooptuber.com", # add your prod origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # directory of current script (main.py)
#DATASET_DIR = os.path.join(BASE_DIR, "videoDataset") # directory to save uploaded videos (/videoDataset)
#os.makedirs(DATASET_DIR, exist_ok=True)

#What changed & why: 
#These helpers encapsulate the cloud handoff: naming, Firestore doc handle, Pub/Sub publish, and streaming the file to GCS.
#---------------------------------------------------------
# NEW: Helper functions 
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
    blob_name = f"uploads/{job_id}/{safe_name}"
    gcs_uri   = f"gs://{RAW_BUCKET}/{blob_name}"
    return blob_name, gcs_uri, safe_name

def _publish_job(job_id: str, raw_gcs_uri: str, user_id: Optional[str] = None):
    """Publish a message the Background Worker will process."""
    payload = {
        "jobId": job_id,
        "videoGcsUri": raw_gcs_uri,
        "outBucket": OUT_BUCKET,
        "userId": user_id,
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

#What changed & why:
#❌ Removed: write to videoDataset/… and calling process_video_and_summarize directly in the API.
#Reason: the API is now thin: it ingests and enqueues. The heavy work (player choice → makes/misses → highlight) runs in the Worker.

#✅ Added: streaming to GCS RAW, Firestore job record (status="queued"), and Pub/Sub publish.
#eason: this is the decoupled, reliable pipeline that supports big videos and background processing.

#✅ The response now returns { jobId, status }.
#Reason: your frontend polls job status and later shows a download link when the Worker finishes.
#---------------------------------------------------------
# @app.post("/upload")
# async def upload_video(video: UploadFile = File(...)):
#     """
#     Handles video upload, processing, and returns a structured response
#     or a specific HTTP error for all failure cases.
#     """

#     os.makedirs(DATASET_DIR, exist_ok=True) # Making sure dataset directory exists
#     temp_filename = os.path.join(DATASET_DIR, f"{uuid.uuid4()}.mp4") # creating temporary video file
#     highlight_filename = os.path.join(DATASET_DIR, f"{uuid.uuid4()}_highlightvid.mp4") # highlight filename

#     with open(temp_filename, "wb") as buffer:
#         shutil.copyfileobj(video.file, buffer) # saving uploaded video to temp file directory (/videoDataset)

#     results = process_video_and_summarize(temp_filename)
#     print("DEBUG: returning response to frontend:", results)
#     print("DEBUG: type of response: :", type(results))
#     if isinstance(results, str):
#         try:
#             results = json.loads(results)
#         except json.JSONDecodeError:
#             raise HTTPException(status_code=500, detail="AI model returned invalid JSON")    
#     #if results.get("ok") is False:
#      #   return {"ok": False, "error": results.get("error", "Unknown error")}
#     if isinstance(results, list):
#         return {"shot_events": results}
#     elif isinstance(results, dict):
#         return results
#     else:
#         raise HTTPException(status_code=500, detail="Unexpected response format from AI model")
#---------------------------------------------------------
# Routes
# NEW: cloud-native /upload endpoint
@app.post("/upload")
async def upload_video(
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
            "status": "queued",
            "originalFileName": original_name,
            "videoGcsUri": raw_gcs_uri,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }, merge=True)

        # 4) Publish to Pub/Sub so the Background Worker starts processing
        try:
            _publish_job(job_id, raw_gcs_uri, user_id=userId)
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
            analysis_url = _sign_get_url(data["analysisGcsUri"], minutes=30)
            response["analysisGcsUri"] = analysis_url
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"signing failed: {e}")

@app.get("/healthz")
def healthz():
    """Used by Render for health checks."""
    return {"ok": True}


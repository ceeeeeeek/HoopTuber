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
from urllib.parse import urlparse
from pydantic import BaseModel, EmailStr

from typing import Dict, Any, List
from google.cloud.firestore import Query

import resend

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
resend.api_key = os.getenv("RESEND_API_KEY")

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
    "https://www.hooptuber.com",
    "https://hooptuber.com" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def check_working():
    return {"detail": "FastAPI server up and running"}

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
def generate_upload_url(request: Request, body: dict = Body(...)):
    print("DEBUG BODY:", body)
    print("DEBUG HEADERS:", dict(request.headers))
    filename = body.get("filename")
    user_id = body.get("UserId")
    content_type = body.get("ContentType", "video/mp4")
    owner_email = request.headers.get("x-owner-email")
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
        "ownerEmail": owner_email,
        "status": "uploading",
        "originalFileName": safe_name,
        "title": safe_name,
        "visibility": "private",
        "videoGcsUri": gcs_uri,
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
        owner_email = request.headers.get("x-owner-email")
        print(f"Debug: starting upload for {video.filename}")
        if not video or not video.filename:
            raise HTTPException(status_code=400, detail="Missing file/filename")

        # 1) IDs & GCS keys
        curr_datetime = datetime.now().strftime("%Y%m%d-%H%M%S")

        job_id = str(f"{curr_datetime}--{uuid.uuid4()}")
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
            "title": original_name,
            "visibility": "private",
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

@app.get("/highlights")
def list_highlights(
    ownerEmail: Optional[str]=None,
    userId: Optional[str]=None,
    limit: int = 20,
    pageToken: Optional[str] = None,
    signed: bool = True):
    """
    NEW:
    Returns finished highlight jobs filtered by ownerEmail (preferred) or userId.
    Ordered by finishedAt desc. pageToken is the last document id from previous page.
    """
    if not ownerEmail and not userId:
        raise HTTPException(status_code=400, detail="ownerEmail or userId required")
    
    q = (
        firestore_client.collection(COLLECTION).where("status","==","done")
        .order_by("finishedAt", direction=firestore.Query.DESCENDING)
    )
    if ownerEmail:
        q = q.where("ownerEmail", "==", ownerEmail)  
    elif userId:
        q = q.where("userId", "==", userId)
    #clamp limit
    limit = max(1, min(100, limit))                  

    #pagination by document id
    if pageToken:
        last_doc = _job_doc(pageToken).get()         
        if last_doc.exists:
            q = q.start_after(last_doc)              

    docs = list(q.limit(limit).stream())             

    items: List[Dict[str, Any]] = []                 
    for d in docs:
        data = d.to_dict()

        # fields + NEW: title & visibility (with sensible fallbacks)
        item = {
            "jobId": data.get("jobId") or d.id,
            "originalFileName": data.get("originalFileName"),
            "title": data.get("title") or data.get("originalFileName"),          
            "visibility": data.get("visibility") or "private",                    
            "finishedAt": str(data.get("finishedAt")),
            "outputGcsUri": data.get("outputGcsUri"),
            "analysisGcsUri": data.get("analysisGcsUri"),
            "ownerEmail": data.get("ownerEmail"),
            "userId": data.get("userId"),
            "status": data.get("status"),
        }
        if signed and data.get("outputGcsUri"):
            try:
                item["signedUrl"] = _sign_get_url(data["outputGcsUri"], minutes=30)
                item["signedUrlExpiresInMinutes"] = 30
            except Exception as e:
                item["signedUrlError"] = str(e)
        items.append(item)

    next_token = docs[-1].id if len(docs) == limit else None  
    return {"items": items, "nextPageToken": next_token}         


@app.patch("/highlights/{job_id}")
def update_highlight(job_id: str, body: dict = Body(...)):
    """
    Body supports:
      { "title": "New name" }
      { "visibility": "public"|"unlisted"|"private" }
    """
    #doc_ref = db.collection("jobs").document(job_id)
    doc_ref = _job_doc(job_id) #use _job_doc / firestore_client helper instead
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="highlight not found")

    updates = {}
    title = body.get("title")
    if title is not None:
        updates["title"] = title 

    visibility = body.get("visibility")
    if visibility in ("public", "unlisted", "private"):
        updates["visibility"] = visibility 
        updates["isPublic"] = visibility == "public"  #optional convenience flag

    if not updates:
        # no-op
        snap = doc_ref.get()
        return {"ok": True, "updated": False, "item": snap.to_dict()}

    updates["updatedAt"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(updates)

    #read back and return the full, fresh document so the UI has title/visibility
    fresh = doc_ref.get().to_dict() or {}
    return {"ok": True, "updated": True, "item": {
        "jobId": fresh.get("jobId") or job_id,
        "originalFileName": fresh.get("originalFileName"),
        "title": fresh.get("title"),
        "visibility": fresh.get("visibility"),
        "finishedAt": str(fresh.get("finishedAt")),
        "outputGcsUri": fresh.get("outputGcsUri"),
        "analysisGcsUri": fresh.get("analysisGcsUri"),
        "ownerEmail": fresh.get("ownerEmail"),
        "userId": fresh.get("userId"),
        "status": fresh.get("status"),
    }}


#soft-delete (and optional hard delete of GCS blob)
@app.delete("/highlights/{job_id}")
def delete_highlight(job_id: str):
    #doc_ref = db.collection("jobs").document(job_id)
    doc_ref = _job_doc(job_id)  #use _job_doc / firestore_client helper instead
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="highlight not found")

    data = snap.to_dict() or {}
    # Soft-delete in Firestore
    doc_ref.update({
        "status": "deleted",           
        "deletedAt": firestore.SERVER_TIMESTAMP
    })

    #remove output file in GCS if you want a hard delete
    #Comment out if you prefer to keep the file.
    out_uri = data.get("outputGcsUri")
    try:
        if out_uri and out_uri.startswith("gs://"):
            bucket_name, blob_path = _parse_gs_uri(out_uri)  #reuse use _job_doc / firestore_client helper
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.delete()  #may raise if not found; safe to ignore below
    except Exception:
        pass

    return {"ok": True, "deleted": True}

class WaitlistEntry(BaseModel):
    email: EmailStr

@app.post("/join_waitlist")
def join_waitlist(entry: WaitlistEntry):
    db = firestore_client
    email = entry.email.strip().lower()

    try:
        #doc_ref = db.collection("waitlist").document(email)
        db_ref = db.collection("waitlist").document(email)
        

        existing = db_ref.get()
        if existing.exists:
            return {"message": "Email already on waitlist", "status": "duplicate"}

        db_ref.set({
            "email": email,
            "createdAt": firestore.SERVER_TIMESTAMP
        })
        try:
            params: resend.Emails.SendParams = {
                "from": "Chris <chris@hooptuber.com>",
                "to": email,
                "subject": "Welcome to Hooptuber!",
                "html": f"""
                <div style="font-family: Verdana, sans-serif; background-color: #fef6f2; padding: 24px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center;">
                    <img src="https://hooptuber.com/hooptubericon2.png" alt="HoopTuber Logo" width="64" height="64" style="margin-bottom: 16px;" />
                    <h1 style="color: #f97316; font-size: 24px; margin-bottom: 8px;">Welcome to HoopTuber!</h1>
                </div>

                <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Hey there,
                    <br><br>
                    Thanks for joining the <strong>HoopTuber Waitlist</strong>! You’re officially one of the first in line to try out our AI-powered basketball highlight creator.
                    <br><br>
                    When we launch, you’ll be able to upload your games, let AI detect your best moments, and instantly create shareable highlight reels and in-depth analyses for your highlights, all automatically.
                </p>

                <div style="margin: 32px 0; text-align: center;">
                    <a href="https://hooptuber.com" style="display: inline-block; background-color: #f97316; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">
                        Visit HoopTuber
                    </a>
                </div>

                <p style="font-size: 14px; color: #555; line-height: 1.5;">
                    Stay tuned, we’ll send you early access as soon as we go live.
                </p>

                <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />

                <p style="font-size: 12px; color: #999; text-align: center;">
                    You received this email because you signed up for the HoopTuber waitlist.<br>
                    If you’d like to unsubscribe, <a href="https://hooptuber.com/unsubscribe?email={email}" style="color: #f97316;">click here</a>.
                </p>
            </div>
        </div>

                """,
            }
            sent_email = resend.Emails.send(params)
            print(f"[DEBUG] @ join_waitlist: email sent! {sent_email}")
        except Exception as e:
            print(f"[DEBUG] @ join_waitlist: email not sent: {e}")
        return {"message": "Added to waitlist", "status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))   

@app.get("/healthz")
def healthz():
    """Used by Render for health checks."""
    return {"ok": True}


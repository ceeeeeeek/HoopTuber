# fastapi server as of 10/17/2025

from fastapi import Body, FastAPI, UploadFile, File, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from typing import Optional, Union
from datetime import timedelta, datetime
import os, uuid, json
from dotenv import load_dotenv
# NEW: Google Cloud clients
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
from zoneinfo import ZoneInfo
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from urllib.parse import urlparse
from fastapi.responses import StreamingResponse
from google.cloud import storage
import io



from api.utils import (_make_keys,
                   _job_doc,_publish_job,
                   _upload_filelike_to_gcs,
                   _sign_get_url,
                   _parse_gs_uri,
                   ts_to_seconds)

# IMPORTING SERVICE ROUTERS
from api.vertex_service import router as vertex_router
from api.video_service import router as video_router
from api.folders_router import router as folders_router



from typing import Dict, Any, List
from google.cloud.firestore import Query

load_dotenv()

print("DEBUGGING (FASTAPI):")
print(f"GCP_PROJECT_ID: {os.environ.get('GCP_PROJECT_ID')}")
print(f"GOOGLE_APP_CREDS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")
print(f"Credentials file exists: {os.path.exists(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''))}")
print(f"Fastapi is listening to PUB SUB TOPIC: {os.environ.get("PUBSUB_TOPIC", False)}")


PROJECT_ID   = os.environ["GCP_PROJECT_ID"]
RAW_BUCKET   = os.environ["GCS_RAW_BUCKET"]
OUT_BUCKET   = os.environ["GCS_OUT_BUCKET"]
TOPIC_NAME   = os.environ["PUBSUB_TOPIC"]
COLLECTION   = os.getenv("FIRESTORE_COLLECTION", "jobs")
#HIGHLIGHT_COL = os.getenv("FIRESTORE_HIGHLIGHT_COL", "Highlights")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
RUNS_COLLECTION = os.getenv("FIRESTORE_RUNS_COLLECTION", "runs") #11-22-25 Saturday 12pm - For my runs page
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")
#RUNS_COLLECTION = "runs" #11-21-25 Friday 4pm - For my runs page
#top-level collection for per-video comments
COMMENTS_COLLECTION = os.getenv("FIRESTORE_COMMENTS_COLLECTION", "videoComments")

# NEW: GCP clients
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher        = pubsub_v1.PublisherClient()
topic_path       = publisher.topic_path(PROJECT_ID, TOPIC_NAME)

app = FastAPI(
    #docs_url=None,
    #redoc_url=None,
    #openapi_url=None,
)
# CORS setup
origins = [
    "https://app.hooptuber.com",
    "https://www.hooptuber.com",
    "https://hooptuber.com"
]
origins2 = ["*"]

if os.getenv("ENVIRONMENT") != "production":
    origins.append("http://localhost:3000")
    print(f"Allowing localhost for CORS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://app.hooptuber.com',
                   'https://www.hooptuber.com',
                   "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)
"""
@app.options("/{path:path}")
async def options_handler(path: str, request: Request):
    # Handle CORS preflight requests
    origin = request.headers.get("origin")
    
    if origin in origins:
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "3600",
            }
        )
    
    return Response(status_code=204)
"""
def user_or_ip_key(request: Request):
    user_id = request.query_params.get("userID")
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)

limiter = Limiter(key_func=user_or_ip_key)

# including routers
app.state.limiter = limiter
app.include_router(vertex_router)
app.include_router(video_router)
app.include_router(folders_router)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Try again later."}
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
        _publish_job(job_id, gcs_uri, user_id=user_id, mode="old")
        _job_doc(job_id).set({
            "status": "queued",
            "queuedAt": firestore.SERVER_TIMESTAMP,
            "mode": "old"
        }, merge=True)
        return {"ok": True, "message": "Job queued successfully"}
    except Exception as e:
        _job_doc(job_id).set({"status": "publish_error", "error": str(e)}, merge=True)
        raise HTTPException(status_code=502, detail=f"Publish failed: {e}")
    



@app.post("/upload")
@limiter.limit("1/minute")
async def upload_video(
    request: Request,
    video: UploadFile = File(...),
    userId: Optional[str] = None,
    videoDurationSec: Optional[int] = None,
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
        #curr_datetime = datetime.now().strftime("%Y%m%d-%H%M%S")

        job_id = str(f"{uuid.uuid4()}")
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
            "videoDurationSec": videoDurationSec or 0,
            "likesCount": 0,
            "viewsCount": 0,
        }, merge=True)

        # 4) Publish to Pub/Sub so the Background Worker starts processing
        try:
            _publish_job(job_id, raw_gcs_uri, user_id=userId, owner_email=owner_email, mode="old")
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
        raw_url = _sign_get_url(data["videoGcsUri"], minutes=30)
        response["sourceVideoUrl"] = raw_url
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
            "videoDurationSec": int(data.get("videoDurationSec")) if data.get("videoDurationSec") is not None else 0,
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

@app.get("/unsubscribe")
async def unsubscribe(email):
    db = firestore_client

    try:
        email_ref = db.collection("waitlist").document(email)
        doc = email.ref
        if not doc.exists:
            return {"error": f"Error @unsubscribe: {email} cannot be found."}
        email.ref.delete()
        return {"success": True}
    except HTTPException as e:
        return {"error": f"Error @unsubscribe: {str(e)}"}
    
@app.get("/stream/{job_id}")
def stream_video(job_id: str):
    """
    Redirects the browser to a valid GCS Signed URL for the ORIGINAL source video.
    This allows the frontend <video> tag to stream and seek (jump to timestamps)
    efficiently by talking directly to Google Cloud Storage.
    """
    # 1. Fetch Job Metadata
    doc = _job_doc(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    
    data = doc.to_dict()
    
    gcs_uri = data.get("videoGcsUri")
    
    if not gcs_uri:
        raise HTTPException(status_code=404, detail="Source video not found for this job")

    try:
        # 3. Generate Signed URL (Valid for 60 minutes)
        # This gives the browser permission to read the private file from GCS
        signed_url = _sign_get_url(gcs_uri, minutes=60)
        
        # 4. Redirect the browser to GCS
        return RedirectResponse(url=signed_url, status_code=307)
        
    except Exception as e:
        print(f"Error signing URL for stream: {e}")
        raise HTTPException(status_code=500, detail="Could not generate stream URL")

@app.get("/jobs/{job_id}/highlight-data")
def highlight_data(job_id: str):
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")

    data = snap.to_dict()

    if data.get("status") != "done":
        raise HTTPException(status_code=409, detail="analysis not ready")
    if data.get("shotEvents"):
        raw_events = data["shotEvents"]
    elif data.get("analysisGcsUri"):
        bucket_name, blob_name = _parse_gs_uri(data["analysisGcsUri"])
        blob = storage_client.bucket(bucket_name).blob(blob_name)
        raw_json = blob.download_as_bytes().decode("utf-8")
        raw_events = json.loads(raw_json)
    else:
        raise HTTPException(status_code=404, detail="No analysis found")

    # 2. Convert timestamps to seconds
    if isinstance(raw_events, dict) and raw_events.get("ok") == False:
        error_msg = raw_events.get("error", "Unknown error")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {error_msg}")
    ranges = []
    for event in raw_events:
        start = ts_to_seconds(event.get("timestamp_start"))
        end = ts_to_seconds(event.get("timestamp_end"))
        ranges.append([start, end])

    # 3. Generate a signed URL for the original video
    video_url = _sign_get_url(data["videoGcsUri"], minutes=60)

    return {
        "ok": True,
        "jobId": job_id,
        "sourceVideoUrl": video_url,
        "rawEvents": raw_events,
        "ranges": ranges,
    }

def _runs_collection():
    return firestore_client.collection(RUNS_COLLECTION)

def _comments_collection():
    return firestore_client.collection(COMMENTS_COLLECTION)

def _folders_collection():
    return firestore_client.collection(FOLDER_COLLECTION)

@app.get("/runs")
def list_runs(
    ownerEmail: Optional[str] = None,
    memberEmail: Optional[str] = None,
):
    """
    List runs.

    - memberEmail → runs where email is in members[]
    - ownerEmail → runs owned by user
    """
    if memberEmail:
        query = _runs_collection().where(
            "members", "array_contains", memberEmail
        )
    elif ownerEmail:
        query = _runs_collection().where(
            "ownerEmail", "==", ownerEmail
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide ownerEmail or memberEmail"
        )

    items = []
    for doc in query.stream():
        data = doc.to_dict() or {}
        data.setdefault("runId", doc.id)
        items.append(data)

    return {"items": items, "count": len(items)}


@app.post("/runs")
def create_run(body: dict = Body(...)):
    """
    Create a new run.
    """
    name = (body.get("name") or "").strip()
    owner_email = (body.get("ownerEmail") or "").strip()
    visibility = (body.get("visibility") or "private").lower()
    max_members = body.get("maxMembers")

    if not name:
        raise HTTPException(status_code=400, detail="Run name is required")
    if not owner_email:
        raise HTTPException(status_code=400, detail="ownerEmail is required")

    if visibility not in ("public", "unlisted", "private"):
        visibility = "private"

    run_id = str(uuid.uuid4())
    now = datetime.utcnow()

    run_doc = {
        "runId": run_id,
        "name": name,
        "ownerEmail": owner_email,
        "visibility": visibility,
        "members": [owner_email],
        "highlightIds": [],
        "createdAt": now,
        "updatedAt": now,
    }

    if max_members is not None:
        run_doc["maxMembers"] = max_members

    _runs_collection().document(run_id).set(run_doc)

    return {"success": True, "run": run_doc}


@app.patch("/runs/{run_id}")
def update_run(run_id: str, body: dict = Body(...)):
    """
    Update run name or visibility.
    """
    doc_ref = _runs_collection().document(run_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Run not found")

    updates = {}

    if "name" in body:
        name = body["name"].strip()
        if name:
            updates["name"] = name

    if "visibility" in body:
        vis = body["visibility"].lower()
        if vis not in ("private", "public", "unlisted"):
            raise HTTPException(status_code=400, detail="Invalid visibility")
        updates["visibility"] = vis

    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields provided")

    updates["updatedAt"] = datetime.utcnow()
    doc_ref.update(updates)

    return {"success": True, "run": doc_ref.get().to_dict()}


@app.delete("/runs/{run_id}")
def delete_run(run_id: str):
    """
    Delete a run (does NOT delete videos).
    """
    doc_ref = _runs_collection().document(run_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Run not found")

    doc_ref.delete()
    return {"success": True}


@app.post("/runs/{run_id}/assignHighlight")
def assign_highlight(run_id: str, body: dict = Body(...)):
    """
    Add highlightId to run.
    """
    highlight_id = (body.get("highlightId") or "").strip()
    if not highlight_id:
        raise HTTPException(status_code=400, detail="highlightId required")

    doc_ref = _runs_collection().document(run_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Run not found")

    data = snap.to_dict() or {}
    highlights = data.get("highlightIds", [])

    if highlight_id not in highlights:
        highlights.append(highlight_id)

    doc_ref.update({
        "highlightIds": highlights,
        "updatedAt": datetime.utcnow(),
    })

    return {"success": True}


# ======================================================
# INVITE LINKS
# ======================================================

@app.post("/runs/{run_id}/invite")
def generate_invite(run_id: str):
    """
    Generate invite token.
    """
    token = str(uuid.uuid4())
    doc_ref = _runs_collection().document(run_id)

    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Run not found")

    doc_ref.update({"inviteToken": token})

    return {
        "success": True,
        "token": token,
        "joinUrl": f"/runs/invite/{token}",
    }


@app.get("/runs/invite/{token}")
def accept_invite(token: str, email: str):
    """
    Accept invite link.
    """
    query = (
        _runs_collection()
        .where("inviteToken", "==", token)
        .limit(1)
        .stream()
    )

    run_doc = None
    run_id = None
    for doc in query:
        run_doc = doc.to_dict()
        run_id = doc.id

    if not run_doc:
        raise HTTPException(status_code=404, detail="Invalid invite token")

    members = run_doc.get("members", [])
    if email not in members:
        members.append(email)

    _runs_collection().document(run_id).update({
        "members": members,
        "updatedAt": datetime.utcnow(),
    })

    return {"success": True, "runId": run_id}

@app.get("/healthz")
def healthz():
    """Used by Render for health checks."""
    return {"ok": True}


#The runs that are public shows up in the 'Join a Run' page - runs set to public visibility
@app.get("/public-runs")
def list_public_runs():
    """Return all PUBLIC runs."""
    try:
        query = (
            firestore_client.collection(RUNS_COLLECTION)
            .where("visibility", "==", "public")
            .stream()
        )

        items = []
        for doc in query:
            d = doc.to_dict()
            d["runId"] = doc.id
            items.append(d)

        return {"items": items}

    except Exception as e:
        print("ERROR list_public_runs:", e)
        raise HTTPException(status_code=500, detail="Failed to load public runs")
#11-22-25 Saturday 12am - For my runs page

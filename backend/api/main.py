#backend/api/main.py AKA fastapi/api/main.py - Tuesday 11-04-25 Version 7:50pm
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Body, Header, Response 
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from typing import List, Optional
from datetime import timedelta
import os, uuid, json, tempfile, subprocess #11-08-25 Saturday 11:42am - For 'Total Footage' stat; added tempfile, subprocess
from dotenv import load_dotenv
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
from pydantic import BaseModel 
from google.cloud import firestore
from google.cloud import storage
from datetime import timedelta
from urllib.parse import urlparse

#typing + datetime helpers for pagination tokens
from typing import Dict, Any                                           
from google.cloud.firestore import Query                                

#load_dotenv()
#load env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

#DEBUGGING:
#debug prints
print("DEBUGGING:")
print(f"GCP_PROJECT_ID: {os.environ.get('GCP_PROJECT_ID')}")
print(f"GOOGLE_APP_CREDS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")
print(f"Credentials file exists: {os.path.exists(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', ''))}")

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
RAW_BUCKET = os.getenv("GCS_RAW_BUCKET")
OUT_BUCKET = os.getenv("GCS_OUT_BUCKET")
TOPIC_NAME = os.getenv("PUBSUB_TOPIC")
COLLECTION = os.getenv("FIRESTORE_COLLECTION", "jobs")
SERVICE_ACCOUNT = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

#clients
storage_client   = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher        = pubsub_v1.PublisherClient()
topic_path       = publisher.topic_path(PROJECT_ID, TOPIC_NAME)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.hooptuber.com",
    ],
    allow_credentials=True,
    allow_methods=["*"], #* is "everything": Includes POST/GET/OPTIONS, etc
    allow_headers=["*"], #* is "everything": Includes custom headers like "content-type", "x-owner-email
)

#GET
@app.get("/")
def root():
    return {"detail": "Server running"}
#Firestore doc handle helper
def _job_doc(job_id: str):
    return firestore_client.collection(COLLECTION).document(job_id)

#name the ingest object (temporary “raw” file in GCS)
def _make_keys(original_name: str, job_id: str) -> tuple[str, str, str]:
    safe_name = original_name or "upload.mp4"
    blob_name = f"uploads/{job_id}/{safe_name}"
    gcs_uri   = f"gs://{RAW_BUCKET}/{blob_name}"
    print(f"DEBUG: uploading to blob_name={blob_name}")
    return blob_name, gcs_uri, safe_name

#include ownerEmail in payload
def _publish_job(job_id: str, raw_gcs_uri: str, *, owner_email: Optional[str], user_id: Optional[str] = None):
    payload = {
        "jobId": job_id,
        "videoGcsUri": raw_gcs_uri,
        "outBucket": OUT_BUCKET,
        "ownerEmail": owner_email,    
        "userId": user_id,           
        "visibility": "private",      #default is private; on dashboard can change later
    }
    publisher.publish(topic_path, json.dumps(payload).encode("utf-8")).result(timeout=10)

#upload helper
def _upload_filelike_to_gcs(bucket: storage.Bucket, blob_name: str, file_obj, content_type: str):
    blob = bucket.blob(blob_name)
    try:
        file_obj.seek(0)
    except Exception:
        pass
    blob.upload_from_file(file_obj, content_type=content_type, timeout=600)

# gs:// parsing + GET signer (used by /jobs/{id}/download)
def _parse_gs_uri(gs_uri: str) -> tuple[str, str]:
    assert gs_uri.startswith("gs://"), "Not a gs:// URI"
    rest = gs_uri[len("gs://"):]
    bucket, _, key = rest.partition("/")
    return bucket, key

def _sign_get_url(gs_uri: str, minutes: int = 15) -> str:
    bucket_name, blob_name = _parse_gs_uri(gs_uri)
    blob = storage_client.bucket(bucket_name).blob(blob_name)
    return blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=minutes),
        method="GET",
    )

#11-08-25 Saturday 11:42am - For 'Total Footage' stat in dashboard page to be accurate
#compute video duration (seconds) from a gs:// URI and cache it into the job doc
def _get_duration_from_gcs_video(gs_uri: str, job_id: str | None = None) -> float:
    try:
        bucket_name, blob_name = _parse_gs_uri(gs_uri)                 # PRESERVED helper
        bucket = storage_client.bucket(bucket_name)                    # PRESERVED client
        blob = bucket.blob(blob_name)

        # Download to a temp file for ffprobe
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:       
            blob.download_to_filename(tmp.name)                        

            # Run ffprobe to get duration
            result = subprocess.run(                                   
                [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "json",
                    tmp.name,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            info = json.loads(result.stdout)                          
            dur = float(info["format"]["duration"])                    
            if dur > 0:
                # Optionally cache back into Firestore so we don't recompute next time
                if job_id:
                    try:
                        _job_doc(job_id).set(                          # PRESERVED helper
                            {"highlightDurationSeconds": dur},
                            merge=True,
                        )
                    except Exception:
                        pass
                return dur

    except Exception as e:
        print(f"DEBUG: _get_duration_from_gcs_video failed for {gs_uri}: {e}")

    return 0.0
#11-08-25 Saturday 11:42am - For 'Total Footage' stat in dashboard page to be accurate

#11-08-25 Saturday 11:42am - For 'Total Footage' stat in dashboard page to be accurate
#best-effort duration extractor for the HIGHLIGHT video (not raw job runtime)
def _guess_duration_seconds(data: dict) -> float:
    # 1) Prefer explicit highlight duration fields on the Firestore doc.          # PRESERVED comment (slightly edited)
    preferred_keys = [
        "highlightDurationSeconds",   # PRESERVED: primary source of truth
        "durationSeconds",            # PRESERVED: optional alias if ever added
    ]
    for key in preferred_keys:
        val = data.get(key)
        if val is None:
            continue
        try:
            if isinstance(val, str):
                val = float(val)
            val = float(val)
            if val > 0:
                return val
        except Exception:
            continue

    # We DO NOT use startedAt/finishedAt here.                                    # PRESERVED idea

    # 2) Minimal fallback - read analysis JSON for highlightDurationSeconds only. # PRESERVED (simplified)
    try:
        analysis_uri = data.get("analysisGcsUri")
        if analysis_uri and analysis_uri.startswith("gs://"):
            bucket_name, blob_name = _parse_gs_uri(analysis_uri)
            blob = storage_client.bucket(bucket_name).blob(blob_name)
            analysis = json.loads(blob.download_as_text())

            candidates = [                                                      # PRESERVED (trimmed)
                analysis.get("highlightDurationSeconds"),
                analysis.get("summary", {}).get("highlightDurationSeconds"),
            ]
            for c in candidates:
                if c is None:
                    continue
                try:
                    if isinstance(c, str):
                        c = float(c)
                    c = float(c)
                    if c > 0:
                        return c
                except Exception:
                    continue
    except Exception:
        pass  # PRESERVED-style swallow

    # 3)As a last resort, compute duration from the highlight video itself.
    try:
        out_uri = data.get("outputGcsUri")
        if out_uri and out_uri.startswith("gs://"):
            job_id = data.get("jobId") or data.get("id")
            dur = _get_duration_from_gcs_video(out_uri, job_id=job_id)  
            if dur > 0:
                return dur
    except Exception:
        pass  # don't break listing on duration error

    # 4) If we still don't know, treat as 0 so it doesn't distort Total Footage.  # PRESERVED
    return 0.0

#11-08-25 Saturday 11:42am - For 'Total Footage' stat in dashboard page to be accurate

#POST
@app.post("/upload")
async def upload_video(
    request: Request,
    video: UploadFile = File(...),             # expects form field name "video"
    userId: Optional[str] = None,              # optional, kept for compatibility
):
    """
    Ingest + enqueue flow. Reads 'x-owner-email' header and stores it with the job.
    """
    try:
        owner_email = request.headers.get("x-owner-email", "")

        if not video or not video.filename:
            raise HTTPException(status_code=400, detail="Missing file/filename")

        job_id = str(uuid.uuid4())
        blob_name, raw_gcs_uri, original_name = _make_keys(video.filename, job_id)

        #Upload to RAW bucket
        bucket = storage_client.bucket(RAW_BUCKET)
        await run_in_threadpool(
            _upload_filelike_to_gcs,
            bucket,
            blob_name,
            video.file,
            (video.content_type or "video/mp4"),
        )

        #also set default visibility (and seed title from file name)
        _job_doc(job_id).set(
            {
                "jobId": job_id,
                "userId": userId,
                "ownerEmail": owner_email,
                "status": "queued",
                "originalFileName": original_name,
                "title": original_name,                 
                "visibility": "private",                
                "videoGcsUri": raw_gcs_uri,
                "createdAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )

        #Publish to worker
        try:
            _publish_job(job_id, raw_gcs_uri, owner_email=owner_email, user_id=userId)
        except Exception as e:
            _job_doc(job_id).set({"status": "publish_error", "error": str(e)}, merge=True)
            raise HTTPException(status_code=502, detail=f"Enqueue failed: {e}")

        print(f"[BACKEND]/upload ok job_id={job_id} ownerEmail={owner_email!r}")
        return {"ok": True, "jobId": job_id, "status": "queued", "videoGcsUri": raw_gcs_uri}

    except Exception as e:
        import traceback
        print(f"Upload failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


#GET
#poll job status
@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    return snap.to_dict()

#GET
#fetch signed URL for finished highlight
@app.get("/jobs/{job_id}/download")
def job_download(job_id: str):
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    data = snap.to_dict()
    if data.get("status") != "done" or not data.get("outputGcsUri"):
        raise HTTPException(status_code=409, detail="job not finished")
    try:
        url = _sign_get_url(data["outputGcsUri"], minutes=30)
        response = {"ok": True, "url": url, "expiresInMinutes": 30}
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

#GET
#list highlights for dashboard (by ownerEmail or userId), with pagination and optional signed URLs
@app.get("/highlights")
def list_highlights(
    ownerEmail: Optional[str] = None,       
    userId: Optional[str] = None,           
    limit: int = 20,                       
    pageToken: Optional[str] = None,         #(document id to start after)
    signed: bool = True,                    #(sign outputGcsUri for direct playback)
):
    """
    NEW:
    Returns finished highlight jobs filtered by ownerEmail (preferred) or userId.
    Ordered by finishedAt desc. pageToken is the last document id from previous page.
    """
    if not ownerEmail and not userId:
        raise HTTPException(status_code=400, detail="ownerEmail or userId is required")

    q = (
        firestore_client
        .collection(COLLECTION)
        .where("status", "==", "done")
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

        #11-08-25 Saturday 11:42am - For 'Total Footage' stat
        #derive a duration for the Total Footage stat
        duration_sec = _guess_duration_seconds(data)  
        #11-08-25 Saturday 11:42am - For 'Total Footage' stat

        # fields + title & visibility (with sensible fallbacks)
        item = {
            "jobId": data.get("jobId") or d.id,
            "originalFileName": data.get("originalFileName"),
            "title": data.get("title") or data.get("originalFileName"),          
            "visibility": data.get("visibility") or "private",                    
            "finishedAt": str(data.get("finishedAt")),
            "createdAt": str(data.get("createdAt")),                   
            "outputGcsUri": data.get("outputGcsUri"),
            "analysisGcsUri": data.get("analysisGcsUri"),
            "ownerEmail": data.get("ownerEmail"),
            "userId": data.get("userId"),
            "status": data.get("status"),
            "durationSeconds": duration_sec, #11-08-25 Saturday 11:42am - For 'Total Footage' stat
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

#Sunday 11-02-25 Update 7:55pm - PATCH & DELETE for highlights
#rename / change visibility / title for a highlight
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
#Sunday 11-02-25 Update 7:55pm - PATCH & DELETE for highlights

@app.get("/healthz")
def healthz():
    return {"ok": True}


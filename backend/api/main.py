#backend/api/main.py AKA fastapi/api/main.py - 11-13-25 Thursday Version 11am 
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Body, Header, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from typing import List, Optional
from datetime import timedelta
import os, uuid, json, tempfile, subprocess #11-08-25 Saturday 11:42am - For 'Total Footage' stat; added tempfile, subprocess
from uuid import uuid4
from dotenv import load_dotenv
from google.cloud import storage, firestore
from google.cloud import pubsub_v1
from pydantic import BaseModel 
from google.cloud import firestore
from google.cloud import storage
from datetime import timedelta
from datetime import datetime
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
#FOLDER_COLLECTION = "highlightFolders" #11-13-25 Thursday 2pm - For future folder support
#You only need os.getenv(...) if:
#The collection name might change between environments, or
#You configured it in your .env and want to keep code generic.
#f your Firestore collection is always called "highlightFolders" and you’re not planning to configure it via env vars, then FOLDER_COLLECTION = "highlightFolders" is okay.
#But you can change it to use an env var if you want symmetry, but it’s not required for correctness
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")
#RUNS_COLLECTION = "runs" #11-21-25 Friday 4pm - For my runs page
RUNS_COLLECTION = os.getenv("FIRESTORE_RUNS_COLLECTION", "runs") #11-22-25 Saturday 12pm - For my runs page

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

#11-13-25 Thursday 2pm - For future folder support
#helper for folder documents
def _folder_doc(folder_id: str):
    return firestore_client.collection(FOLDER_COLLECTION).document(folder_id)
#11-13-25 Thursday 2pm - For future folder support

#11-21-25 Friday 4pm - For my runs page
#helper for run documents (My Runs page)
def _run_doc(run_id: str):
    return firestore_client.collection(RUNS_COLLECTION).document(run_id)
#11-21-25 Friday 4pm - For my runs page

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

#gs:// parsing + GET signer (used by /jobs/{id}/download)
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

#11-13-25 Thusrday 10am - For 'Total Footage' stat in dashboard page to be accurate
#compute video duration (seconds) from a gs:// URI and cache it into the job doc
def _get_duration_from_gcs_video(gs_uri: str, job_id: str | None = None) -> float:
    try:
        bucket_name, blob_name = _parse_gs_uri(gs_uri)                  #helper
        bucket = storage_client.bucket(bucket_name)                     #client
        blob = bucket.blob(blob_name)                                                                                

        # === Windows-safe temp-file handling =========================
        #Use mkstemp to get a path; close the FD immediately so ffprobe
        #can open it without "Permission denied" to _get_duration_from_gcs_video no longer showing on debugging logs on Windows.            
        fd, tmp_path = tempfile.mkstemp(suffix=".mp4")                 
        os.close(fd)                                                    
        try:                                                           
            #Download blob bytes and write them ourselves               
            with open(tmp_path, "wb") as f:                             
                blob.download_to_file(f)                                

            #Run ffprobe on a *closed* file path (Windows-friendly)     #intent/ impl
            result = subprocess.run(
                [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "json",
                    tmp_path,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
            info = json.loads(result.stdout)                            
            dur = float(info["format"]["duration"])                     

            if dur > 0:                                                 
                #Cache back into Firestore so future loads don't recompute
                if job_id:                                             
                    try:                                                
                        _job_doc(job_id).set(                          
                            {
                                "highlightDurationSeconds": dur,        
                                "highlightVideoLength": dur,            
                            },
                            merge=True,
                        )
                    except Exception:
                        pass                                            
                return dur                                             
        finally:
            #Always try to clean up                                    
            try:
                os.remove(tmp_path)
            except Exception:
                pass

    except Exception as e:
        print(f"DEBUG: _get_duration_from_gcs_video failed for {gs_uri}: {e}")  

    return 0.0                                                        
#11-13-25 Thusrday 10am - For 'Total Footage' stat in dashboard page to be accurate

#11-10-25 Saturday 7pm - For 'Total Footage' stat in dashboard page to be accurate
#parse various duration formats into seconds (supports numbers or "mm:ss"/"hh:mm:ss")
def _parse_duration_value(val) -> float:
    try:
        if val is None:
            return 0.0
        # numeric (int/float) -> seconds
        if isinstance(val, (int, float)):
            return float(val) if val > 0 else 0.0
        if isinstance(val, str):
            s = val.strip()
            if not s:
                return 0.0
            # support "hh:mm:ss" or "mm:ss"
            if ":" in s:
                parts = s.split(":")
                if len(parts) == 2:  # mm:ss
                    m, sec = parts
                    return max(0.0, float(m) * 60 + float(sec))
                if len(parts) == 3:  # hh:mm:ss
                    h, m, sec = parts
                    return max(0.0, float(h) * 3600 + float(m) * 60 + float(sec))
            # plain number string -> seconds
            return max(0.0, float(s))
    except Exception:
        return 0.0
    return 0.0
#11-10-25 Monday 7pm  - For 'Total Footage' stat in dashboard page to be accurate

#11-10-25 Monday 7pm  - For 'Total Footage' stat in dashboard page to be accurate
#best-effort duration extractor for the HIGHLIGHT video (not raw job runtime)
def _guess_duration_seconds(data: dict) -> float:
    # 1)Prefer explicit highlight duration fields on the Firestore doc.         
    preferred_keys = [
        "highlightDurationSeconds",   #Primary source of truth
        "highlightVideoLength",       #Custom field you can create (sec or "mm:ss")
        "durationSeconds",            #optional alias if ever added
    ]
    for key in preferred_keys:
        v = data.get(key)
        dur = _parse_duration_value(v)            #normalize formats
        if dur > 0:
            return dur
                                  

    # 2)Minimal fallback - read analysis JSON for highlightDurationSeconds only. 
    try:
        analysis_uri = data.get("analysisGcsUri")
        if analysis_uri and analysis_uri.startswith("gs://"):
            bucket_name, blob_name = _parse_gs_uri(analysis_uri)
            blob = storage_client.bucket(bucket_name).blob(blob_name)
            analysis = json.loads(blob.download_as_text())

            candidates = [
                analysis.get("highlightDurationSeconds"),
                analysis.get("summary", {}).get("highlightDurationSeconds"),
                analysis.get("summary", {}).get("totalDurationSeconds"),         
                analysis.get("clipsSummary", {}).get("totalDurationSeconds"),     
            ]
            for c in candidates:
                dur = _parse_duration_value(c)    #reuse parser
                if dur > 0:
                    return dur
    except Exception:
        pass  #pattern-style swallow

    #3)Fallback: try computing from outputGcsUri (uses ffprobe if available). 
    try:
        out_uri = data.get("outputGcsUri")
        if out_uri and out_uri.startswith("gs://"):
            job_id = data.get("jobId") or data.get("id")
            dur = _get_duration_from_gcs_video(out_uri, job_id=job_id)
            if dur > 0:
                return dur
    except Exception:
        pass  #don't break listing on duration error

    # 4) If we still don't know, treat as 0 so it doesn't distort Total Footage.  # PRESERVED
    return 0.0
#11-10-25 Monday 7pm - For 'Total Footage' stat in dashboard page to be accurate

#POST
@app.post("/upload")
async def upload_video(
    request: Request,
    video: UploadFile = File(...),             #expects form field name "video"
    userId: Optional[str] = None,              #optional, kept for compatibility
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

        #11-13-25 Thursday 10am - For 'Total Footage' stat - Makes old and new jobs pick up a duration the first time they’re listed (via analysis JSON or ffprobe if available, or via any field you later add), 
        #and your dashboard’s Total Footage will always be the sum of all clips currently shown
        #cache duration back into Firestore if missing so future loads have it
        # if duration_sec > 0 and not any(k in data for k in (
        #     "highlightDurationSeconds", "highlightVideoLength", "durationSeconds"
        # )):
        #     try:
        #         _job_doc(data.get("jobId") or d.id).set(
        #             {"highlightVideoLength": duration_sec}, merge=True
        #         )
        #     except Exception:
        #         pass  # don't fail the list call if caching fails

        #write back any missing duration fields so future reads don't recompute
        # if duration_sec > 0:
        #     to_set = {}
        #     if "highlightDurationSeconds" not in data:    
        #         to_set["highlightDurationSeconds"] = duration_sec
        #     if "highlightVideoLength" not in data:        
        #         to_set["highlightVideoLength"] = duration_sec
        #     if to_set:
        #         try:
        #             _job_doc(data.get("jobId") or d.id).set(to_set, merge=True)
        #         except Exception:
        #             pass  #pattern: don't fail listing on cache errors

        #If we still don't have a duration, try computing directly from outputGcsUri
        if duration_sec <= 0:
            out_uri = data.get("outputGcsUri")
            if out_uri and out_uri.startswith("gs://"):
                job_id = data.get("jobId") or d.id
                duration_sec = _get_duration_from_gcs_video(out_uri, job_id=job_id) 

        #write back any missing duration fields so future reads don't recompute
        if duration_sec > 0:
            to_set = {}
            if "highlightDurationSeconds" not in data:
                to_set["highlightDurationSeconds"] = duration_sec
            if "highlightVideoLength" not in data:
                to_set["highlightVideoLength"] = duration_sec
            if to_set:
                try:
                    _job_doc(data.get("jobId") or d.id).set(to_set, merge=True)
                except Exception:
                    pass  #pattern       
        #11-13-25 Thursday 10am - For 'Total Footage' stat
        
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

    #allow updates to highlightVideoLength from your dashboard in the future
    highlight_len = body.get("highlightVideoLength")
    if highlight_len is not None:
        updates["highlightVideoLength"] = highlight_len

    if not updates:
        # no-op
        snap = doc_ref.get()
        return {"ok": True, "updated": False, "item": snap.to_dict()}

    updates["updatedAt"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(updates)

    #read back and return the full, fresh document so the UI has title/visibility
    firestoreFields = doc_ref.get().to_dict() or {}
    return {"ok": True, "updated": True, "item": {
        "jobId": firestoreFields.get("jobId") or job_id,
        "originalFileName": firestoreFields.get("originalFileName"),
        "title": firestoreFields.get("title"),
        "visibility": firestoreFields.get("visibility"),
        "finishedAt": str(firestoreFields.get("finishedAt")),
        "outputGcsUri": firestoreFields.get("outputGcsUri"),
        "analysisGcsUri": firestoreFields.get("analysisGcsUri"),
        "ownerEmail": firestoreFields.get("ownerEmail"),
        "userId": firestoreFields.get("userId"),
        "status": firestoreFields.get("status"),
        "highlightVideoLength": firestoreFields.get("highlightVideoLength"),  #11-10-25 Monday 7pm - For 'Total Footage' stat in dashboard page to be accurate
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

#11-13-25 Thursday 2pm - For future folder support
@app.get("/folders")
def list_folders(ownerEmail: str):
    """List all highlight folders for a user."""
    #query user’s folders ascending by createdAt
    q = (
        firestore_client.collection(FOLDER_COLLECTION)
        .where("ownerEmail", "==", ownerEmail)
        .order_by("createdAt", direction=firestore.Query.ASCENDING)  #pattern
    )
    folders = []
    for doc in q.stream():
        data = doc.to_dict() or {}
        data["folderId"] = doc.id
        folders.append(data)
    return {"items": folders}

@app.post("/folders")
def create_folder(body: dict = Body(...)):
    """Create a new folder."""
    owner = body.get("ownerEmail")
    name = body.get("name") or "New Folder"
    folder_id = str(uuid.uuid4())                              #uuid pattern
    _folder_doc(folder_id).set({
        "folderId": folder_id,
        "ownerEmail": owner,
        "name": name,
        "videoIds": [],                                         #simple membership list
        "createdAt": firestore.SERVER_TIMESTAMP,                #timestamp style
    })
    return {"ok": True, "folderId": folder_id}

@app.patch("/folders/{folder_id}")
def update_folder(folder_id: str, body: dict = Body(...)):
    """Rename or move videos in a folder."""
    doc_ref = _folder_doc(folder_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="folder not found")

    updates = {}
    if "name" in body:
        updates["name"] = body["name"]            #rename
    if "videoIds" in body:
        updates["videoIds"] = body["videoIds"]    #replace membership (id list)

    if not updates:
        return {"ok": True, "updated": False}

    updates["updatedAt"] = firestore.SERVER_TIMESTAMP  
    doc_ref.update(updates)
    return {"ok": True, "updated": True}

@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: str):
    """Delete folder (videos not deleted)."""
    doc_ref = _folder_doc(folder_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="folder not found")
    doc_ref.delete()
    return {"ok": True, "deleted": True}
#11-13-25 Thursday 2pm - For future folder support

# === MY RUNS API (separate from highlightFolders gallery) ===
#11-22-25 Saturday 12am - For my runs page
#My Runs = all runs where this email is in `members` (owner OR invited)
#With def list_runs() - Owner sees their own runs + Users see runs where they are members
@app.get("/runs")
def list_runs(
    ownerEmail: Optional[str] = None,
    memberEmail: Optional[str] = None,
):
    """
    List runs.

    - If memberEmail is provided: return runs where that email is in `members` array.
    - Else if ownerEmail is provided: return runs owned by that email.
    """
    try:
        if memberEmail:
            # member search takes priority
            q = firestore_client.collection(RUNS_COLLECTION).where(
                "members", "array_contains", memberEmail
            )
        elif ownerEmail:
            q = firestore_client.collection(RUNS_COLLECTION).where(
                "ownerEmail", "==", ownerEmail
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide ownerEmail or memberEmail"
            )

        docs = q.stream()
        items = []
        for d in docs:
            doc_data = d.to_dict()
            if not doc_data:
                continue
            if "runId" not in doc_data:
                doc_data["runId"] = d.id
            items.append(doc_data)

        return {"items": items, "count": len(items)}

    except Exception as e:
        print("ERROR in /runs (GET):", e)
        raise HTTPException(status_code=500, detail="Failed to list runs")

@app.post("/runs")
def create_run(body: dict = Body(...)):
    """
    Create a new run.

    Expected body (minimum):
      {
        "name": "Wednesday Run",
        "ownerEmail": "user@example.com"
      }

    Optional:
      "visibility": "public" | "unlisted" | "private"
      "maxMembers": number
    """
    try:
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

        run_id = str(uuid4())
        now = datetime.utcnow()

        run_doc = {
            "runId": run_id,
            "name": name,
            "ownerEmail": owner_email,
            "visibility": visibility,
            "createdAt": now,
            "updatedAt": now,
            #My Runs = anything you’re a member of - owners runs + runs user is a member of.
            #Include the owner in members by default.
            "members": [owner_email],
            #Highlights that belong to this run
            "highlightIds": [],
        }

        if max_members is not None:
            run_doc["maxMembers"] = max_members

        firestore_client.collection(RUNS_COLLECTION).document(run_id).set(run_doc)

        return {"success": True, "run": run_doc}

    except HTTPException:
        #just rethrow HTTP-style errors
        raise
    except Exception as e:
        print("ERROR in /runs (POST):", e)
        raise HTTPException(status_code=500, detail="Failed to create run")

@app.patch("/runs/{run_id}")
def update_run(run_id: str, body: dict = Body(...)):
    """
    Update a run's name or visibility.
    
    Allowed fields:
      - name
      - visibility ("private" | "public" | "unlisted")
    """

    try:
        doc_ref = firestore_client.collection(RUNS_COLLECTION).document(run_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Run not found")

        run = doc.to_dict()

        # Extract the fields allowed to update
        new_name = body.get("name")
        new_visibility = body.get("visibility")

        update_data = {}
        if new_name is not None:
            new_name = new_name.strip()
            if new_name:
                update_data["name"] = new_name

        if new_visibility is not None:
            new_visibility = new_visibility.lower()
            if new_visibility not in ("private", "public", "unlisted"):
                raise HTTPException(status_code=400, detail="Invalid visibility")
            update_data["visibility"] = new_visibility

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields provided")

        update_data["updatedAt"] = datetime.utcnow()

        doc_ref.update(update_data)

        # Return the updated run
        updated = doc_ref.get().to_dict()

        return {"success": True, "run": updated}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR in PATCH /runs/{run_id}:", e)
        raise HTTPException(status_code=500, detail="Failed to update run")

#Rules: Only the owner aka the "User Admin Account" can delete a run + Deleting a run does NOT delete videos, does NOT delete highlightFolders
@app.delete("/runs/{run_id}")
def delete_run(run_id: str):
    """Delete a run."""
    try:
        doc_ref = firestore_client.collection(RUNS_COLLECTION).document(run_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Run not found")

        run = doc.to_dict()

        # Only owner can delete
        owner_email = run.get("ownerEmail")
        if not owner_email:
            raise HTTPException(status_code=403, detail="Owner missing")

        doc_ref.delete()

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR deleting run:", e)
        raise HTTPException(status_code=500, detail="Failed to delete run")

#Used by “Assign Run” dropdown inside Dashboard Highlight Video
@app.post("/runs/{run_id}/assignHighlight")
def add_highlight_to_run(run_id: str, body: dict = Body(...)):
    """
    Add a highlight video ID to a run.
    Expected body: {"highlightId": "..."}
    """
    highlight_id = (body.get("highlightId") or "").strip()
    if not highlight_id:
        raise HTTPException(status_code=400, detail="highlightId required")

    run_ref = firestore_client.collection(RUNS_COLLECTION).document(run_id)
    snap = run_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Run not found")

    data = snap.to_dict() or {}
    highlight_ids = data.get("highlightIds") or []

    if highlight_id not in highlight_ids:
        highlight_ids.append(highlight_id)

    now = datetime.utcnow()
    run_ref.update({
        "highlightIds": highlight_ids,
        "updatedAt": now,
    })

    data["highlightIds"] = highlight_ids
    data["updatedAt"] = now

    return {"success": True, "run": data}

#Invite Link API - We will create a permanent invite token for a run
#Creates token, stores inside run doc
@app.post("/runs/{run_id}/invite")
def generate_invite_link(run_id: str):
    """Generate an invite token for a private or unlisted run."""

    token = str(uuid4())

    try:
        doc_ref = firestore_client.collection(RUNS_COLLECTION).document(run_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Run not found")

        doc_ref.update({"inviteToken": token})

        return {
            "success": True,
            "token": token,
            "joinUrl": f"/runs/invite/{token}"
        }

    except Exception as e:
        print("ERROR invite:", e)
        raise HTTPException(status_code=500, detail="Failed to create invite")

#When a user clicks Join Run! invite link
@app.get("/runs/invite/{token}")
def accept_invite(token: str, email: str):
    """
    email = user who is accepting the invite
    """
    try:
        # Find run with this invite token
        query = (
            firestore_client.collection(RUNS_COLLECTION)
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

        firestore_client.collection(RUNS_COLLECTION).document(run_id).update({
            "members": members,
            "updatedAt": datetime.utcnow()
        })

        return {"success": True, "runId": run_id}

    except HTTPException:
        raise
    except Exception as e:
        print("ERROR accept_invite:", e)
        raise HTTPException(status_code=500, detail="Failed to join run")

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

@app.get("/healthz")
def healthz():
    return {"ok": True}


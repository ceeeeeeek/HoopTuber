# fastapi/api/vertex_service.py
# handles all vertex related endpoints

from fastapi import Body, APIRouter, UploadFile, File, Request, HTTPException
from starlette.concurrency import run_in_threadpool
from slowapi import Limiter
from slowapi.util import get_remote_address

import os, uuid, json
from datetime import datetime, timedelta
from typing import Optional

from google.cloud import storage, firestore
from google.cloud import pubsub_v1

from api.utils import (
    _make_keys,
    _job_doc,
    _publish_job,
    _upload_filelike_to_gcs,
    _sign_get_url,
    _parse_gs_uri,
    ts_to_seconds,
)
from sheetsData import write_to_sheet

# Environment
PROJECT_ID = os.environ["GCP_PROJECT_ID"]
RAW_BUCKET = os.environ["GCS_RAW_BUCKET"]
TOPIC_NAME = os.environ["PUBSUB_TOPIC"]

# GCP clients
storage_client = storage.Client(project=PROJECT_ID)
firestore_client = firestore.Client(project=PROJECT_ID)
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_NAME)

# Router
router = APIRouter(prefix="/vertex", tags=["vertex"])

# Rate limiter
def user_or_ip_key(request: Request):
    user_id = request.query_params.get("userID")
    return f"user:{user_id}" if user_id else get_remote_address(request)

limiter = Limiter(key_func=user_or_ip_key)


@router.post("/upload")
async def vertex_upload(
    request: Request,
    filename: str = Body(...),
    video: UploadFile = File(...),
    userId: Optional[str] = None,
    videoDurationSec: Optional[int] = None,
):
    if not video or not video.filename:
        raise HTTPException(status_code=400, detail="Missing file/filename")

    owner_email = request.headers.get("x-owner-email")

    try:
        # 1. job ID + GCS keys
        curr_datetime = datetime.now().strftime("%Y%m%d-%H%M%S")
        job_id = f"{curr_datetime}--{uuid.uuid4()}"
        blob_name, gcs_uri, original_name = _make_keys(video.filename, job_id)

        # 2. Upload video to GCS
        bucket = storage_client.bucket(RAW_BUCKET)
        video.file.seek(0)
        await run_in_threadpool(
            _upload_filelike_to_gcs,
            bucket,
            blob_name,
            video.file,
            video.content_type or "video/mp4",
        )

        # 3. Create Firestore job metadata
        _job_doc(job_id).set(
            {
                "jobId": job_id,
                "userId": userId,
                "ownerEmail": owner_email,
                "status": "queued",
                "pipeline": "vertex",
                "mode": "vertex",
                "title": original_name,
                "visibility": "private",
                "videoGcsUri": gcs_uri,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "videoDurationSec": videoDurationSec or 0,
            },
            merge=True,
        )

        # 4. Publish to worker
        try:
            _publish_job(
                job_id,
                gcs_uri,
                user_id=userId,
                owner_email=owner_email,
                mode="vertex",
            )
        except Exception as e:
            _job_doc(job_id).update({"status": "publish_error", "error": str(e)})
            raise HTTPException(status_code=502, detail=f"Enqueue failed: {e}")

        return {"ok": True, "jobId": job_id, "status": "queued", "videoGcsUri": gcs_uri}

    except Exception as e:
        print("Vertex upload error:", e)
        raise HTTPException(status_code=500, detail=f"Vertex upload failed: {e}")


@router.get("/jobs/{job_id}/result")
def vertex_result(job_id: str):
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")

    data = snap.to_dict()

    if data.get("status") != "done":
        raise HTTPException(status_code=409, detail="analysis not ready")
    
    video_duration_sec = data.get("videoDurationSec", 0)
    # Load Vertex events
    if data.get("shotEvents"):
        raw_events = data["shotEvents"]
    elif data.get("analysisGcsUri"):
        bucket_name, blob_name = _parse_gs_uri(data["analysisGcsUri"])
        blob = storage_client.bucket(bucket_name).blob(blob_name)
        raw_json = blob.download_as_bytes().decode("utf-8")
        raw_events = json.loads(raw_json)

    else:
        raise HTTPException(status_code=404, detail="No analysis found")

    # Timestamp conversion → numeric ranges
    ranges = []
    for event in raw_events:
        start = event.get("timestamp_start")
        end = event.get("timestamp_end")
        if not start or not end:
            continue
        try:
            ranges.append([ts_to_seconds(start), ts_to_seconds(end)])
        except:
            pass
    # Signed URL to video
    video_uri = data.get("videoGcsUri")
    if not video_uri:
        raise HTTPException(status_code=404, detail="videoGcsUri missing")
    video_url = _sign_get_url(video_uri, minutes=60)
    try:
        write_to_sheet(job_id)
    except Exception as e:
        print("Sheet write error:", e)
    return {
        "ok": True,
        "jobId": job_id,
        "sourceVideoUrl": video_url,
        "rawEvents": raw_events,
        "ranges": ranges,
        "videoDurationSec": video_duration_sec
    }


@router.post("/publish_render_job")
def publish_render_job(body: dict = Body(...)):
    """
    Publishes a rendering job where the user has submitted edited clip ranges.
    Payload Example:
    {
      "jobId": "123",
      "videoGcsUri": "gs://bucket/uploads/123/original.mp4",
      "finalClips": [
         {"start": 10.2, "end": 15.4},
         {"start": 22.0, "end": 28.3}
      ]
    }
    """
    job_id = body.get("jobId")
    gcs_uri = body.get("videoGcsUri")
    final_clips = body.get("finalClips")
    user_id = body.get("userId")
    owner_email = body.get("ownerEmail")

    # Validate incoming payload
    if not job_id or not gcs_uri or not final_clips:
        raise HTTPException(
            status_code=400,
            detail="Missing jobId, videoGcsUri, or finalClips"
        )

    # Build the Pub/Sub payload
    payload = {
        "jobId": job_id,
        "videoGcsUri": gcs_uri,
        "finalClips": final_clips,
        "mode": "render",         # ★ Trigger worker.render pipeline
        "userId": user_id,
        "ownerEmail": owner_email
    }

    # Publish render job to Pub/Sub
    try:
        publisher.publish(
            topic_path,
            json.dumps(payload).encode("utf-8")
        ).result(timeout=10)
    except Exception as e:
        # Save error for UI visibility
        _job_doc(job_id).update({
            "status": "render_publish_error",
            "error": str(e),
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        raise HTTPException(status_code=502, detail=f"Render publish failed: {e}")

    # Update Firestore job status immediately
    _job_doc(job_id).update({
        "status": "render_queued",
        "finalClips": final_clips,
        "renderQueuedAt": firestore.SERVER_TIMESTAMP
    })

    return {
        "ok": True,
        "message": "Render job queued",
        "jobId": job_id
    }


@router.post("/upload/init")
async def init_vertex_upload(
    request: Request,
    body: dict = Body(...),
):
    # fetching params from body param
    filename = body.get("filename")
    contentType = body.get("contentType")
    userId = body.get("userId")
    videoDurationSec = body.get("videoDurationSec")

    owner_email = request.headers.get("x-owner-email")
    curr_datetime = datetime.now().strftime("%Y%m%d-%H%M%S")
    job_id = f"{curr_datetime}--{uuid.uuid4()}"
    blob_name, gcs_uri, original_name = _make_keys(filename, job_id)
    
    # 2. Generate signed upload URL (valid for 1 hour)
    bucket = storage_client.bucket(RAW_BUCKET)
    blob = bucket.blob(blob_name)
    
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=1),
        method="PUT",
        content_type=contentType,
    )
    
    # 3. Create Firestore job doc with "upload_pending" status
    _job_doc(job_id).set({
        "jobId": job_id,
        "userId": userId,
        "ownerEmail": owner_email,
        "status": "upload_pending",  # ← Not queued yet
        "pipeline": "vertex",
        "mode": "vertex",
        "title": original_name,
        "visibility": "private",
        "videoGcsUri": gcs_uri,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "videoDurationSec": videoDurationSec or 0,
        "show": True,
        "deleted": False,
    })
    
    return {
        "ok": True,
        "jobId": job_id,
        "uploadUrl": signed_url,
        "videoGcsUri": gcs_uri,
    }


@router.post("/upload/complete")
async def complete_vertex_upload(
    request: Request,
    body: dict = Body(...)
):
    """
    Called by client after successful direct upload to GCS.
    Triggers the analysis pipeline.
    """
    jobId = body.get("jobId")
    userId = body.get("userId")
    owner_email = request.headers.get("x-owner-email")
    
    # 1. Get job doc
    doc = _job_doc(jobId).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    
    data = doc.to_dict()
    
    # 2. Verify the file actually exists in GCS
    gcs_uri = data.get("videoGcsUri")
    bucket_name, blob_name = _parse_gs_uri(gcs_uri)
    blob = storage_client.bucket(bucket_name).blob(blob_name)
    
    if not blob.exists():
        raise HTTPException(
            status_code=400, 
            detail="Upload incomplete - file not found in GCS"
        )
    
    # 3. Update status to queued
    _job_doc(jobId).update({
        "status": "queued",
        "uploadCompletedAt": firestore.SERVER_TIMESTAMP,
    })
    # 4. Publish to worker for analysis
    try:
        _publish_job(
            jobId,
            gcs_uri,
            user_id=userId,
            owner_email=owner_email,
            mode="vertex",
        )
    except Exception as e:
        _job_doc(jobId).update({"status": "publish_error", "error": str(e)})
        raise HTTPException(status_code=502, detail=f"Enqueue failed: {e}")
    
    return {
        "ok": True,
        "jobId": jobId,
        "status": "queued",
    }
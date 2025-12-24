# handling all /job endpoints
from fastapi import (
    APIRouter,
    Body,
    HTTPException,
    Query,
    Request,
)
from typing import Optional
from datetime import datetime
import os
import uuid
from utils import _job_doc, _parse_gs_uri, _sign_get_url, ts_to_seconds
import json
from google.cloud import firestore, storage
from google.cloud.firestore import Increment


PROJECT_ID = os.environ["GCP_PROJECT_ID"]
storage_client   = storage.Client(project=PROJECT_ID)
RUNS_COLLECTION = os.getenv("FIRESTORE_RUNS_COLLECTION", "runs")
COMMENTS_COLLECTION = os.getenv("FIRESTORE_COMMENTS_COLLECTION", "videoComments")
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")

firestore_client = firestore.Client(project=PROJECT_ID)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)

@router.get("/{job_id}")
def job_status(job_id: str):
    """
    Fetch the Firestore record for this job.
    Frontend can poll this until status becomes 'done' and outputGcsUri is present.
    """
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    return snap.to_dict()

@router.get("/{job_id}/download")
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

@router.get("/{job_id}")
def job_status(job_id: str):
    """
    Fetch the Firestore record for this job.
    Frontend can poll this until status becomes 'done' and outputGcsUri is present.
    """
    snap = _job_doc(job_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="job not found")
    return snap.to_dict()

@router.get("/{job_id}/highlight-data")
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

# adding shot events to a job
@router.post("/{job_id}/shot-events/add")
async def add_shot_event(job_id: str, payload: dict):
    job_ref = firestore_client.collection("jobs").document(job_id)
    doc = job_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    # Basic validation
    if "timestamp_start" not in payload or "timestamp_end" not in payload:
        raise HTTPException(status_code=400, detail="Missing timestamps")
    shot_event = {
        # Use frontend ID if provided, otherwise generate one
        "id": payload.get("id", str(uuid.uuid4())),
        # Normalize outcome (Make -> make)
        "outcome": payload.get("outcome", "other").lower(),
        # Optional nullable fields
        "shot_location": payload.get("shot_location"),
        "shot_type": payload.get("shot_type"),
        "subject": payload.get("subject"),
        "timestamp_end": payload["timestamp_end"],
        "timestamp_start": payload["timestamp_start"],
        "deleted": False,
        "show": True,
    }
    try: 
        job_ref.update({
            "shotEvents": firestore.ArrayUnion([shot_event])
        })
    except Exception as e:
        print(f"Error upodating shot event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return {
        "ok": True,
        "shotEvent": shot_event
    }

# deleting shot events from a job
@router.delete("/{job_id}/shot-events/delete")
async def delete_shot_event(job_id: str, payload: dict = Body(...)):
    event_id = payload.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event_id")

    job_ref = firestore_client.collection("jobs").document(job_id)
    job_doc = job_ref.get()
    
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = job_doc.to_dict()
    shot_events = job_data.get("shotEvents", [])
    # Create a new list excluding the one we want to delete
    updated_events = [event for event in shot_events if event.get("id") != event_id]
    # Update Firestore
    job_ref.update({
        "shotEvents": updated_events
    })
    return {"ok": True,
             "event_id": event_id,
             "shotEvents": updated_events}

# updating shot events from a job
@router.post("/{job_id}/shot-events/update")
async def update_shot_event(job_id: str, payload: dict = Body(...)):
    event_id = payload.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="Missing event_id")
    job_ref = firestore_client.collection("jobs").document(job_id)
    job_doc = job_ref.get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    


    
@router.post("/{job_id}/shot-events/mute")
async def mute_shot_event(job_id: str, event_id: str):
    job_ref = firestore_client.collection("jobs").document(job_id)
    job_doc = job_ref.get()
    if not job_doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    job_data = job_doc.to_dict()
    shot_events = job_data.get("shotEvents", [])
    updated_events = []

    for event in shot_events:
        if event["id"] == event_id:
            event["deleted"] = True
        updated_events.append(event)

    job_ref.update({
        "shotEvents": updated_events
    })
    return {"ok": True, "event_id": event_id}



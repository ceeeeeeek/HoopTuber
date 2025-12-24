# fastapi/runs_router.py
# Handles all /runs-related endpoints

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

from google.cloud import firestore
from google.cloud.firestore import Increment

PROJECT_ID = os.environ["GCP_PROJECT_ID"]

RUNS_COLLECTION = os.getenv("FIRESTORE_RUNS_COLLECTION", "runs")
COMMENTS_COLLECTION = os.getenv("FIRESTORE_COMMENTS_COLLECTION", "videoComments")
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")

firestore_client = firestore.Client(project=PROJECT_ID)

router = APIRouter(
    prefix="/runs",
    tags=["runs"],
)

def _runs_collection():
    return firestore_client.collection(RUNS_COLLECTION)

def _comments_collection():
    return firestore_client.collection(COMMENTS_COLLECTION)

def _folders_collection():
    return firestore_client.collection(FOLDER_COLLECTION)

@router.get("")
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


@router.post("")
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


@router.patch("/runs/{run_id}")
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


@router.delete("/runs/{run_id}")
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

# ======================================================
# RUN MEMBERS / HIGHLIGHTS
# ======================================================

@router.post("/{run_id}/assignHighlight")
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

@router.post("/runs/{run_id}/invite")
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


@router.get("/invite/{token}")
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

# fastapi/folders_router.py
# Handles all /folders-related endpoints

from fastapi import APIRouter, Body, HTTPException
from typing import Optional
import os
import uuid

from google.cloud import firestore


PROJECT_ID = os.environ["GCP_PROJECT_ID"]
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")

firestore_client = firestore.Client(project=PROJECT_ID)

router = APIRouter(
    prefix="/folders",
    tags=["folders"],
)

def _folder_doc(folder_id: str):
    return firestore_client.collection(FOLDER_COLLECTION).document(folder_id)

@router.get("")
def list_folders(ownerEmail: str):
    """
    List all highlight folders for a user.
    """
    query = (
        firestore_client
        .collection(FOLDER_COLLECTION)
        .where("ownerEmail", "==", ownerEmail)
        .order_by("createdAt", direction=firestore.Query.ASCENDING)
    )

    items = []
    for doc in query.stream():
        data = doc.to_dict() or {}
        data["folderId"] = doc.id
        items.append(data)

    return {"items": items}


@router.post("")
def create_folder(body: dict = Body(...)):
    """
    Create a new folder.
    """
    owner_email = (body.get("ownerEmail") or "").strip()
    name = (body.get("name") or "New Folder").strip()

    if not owner_email:
        raise HTTPException(status_code=400, detail="ownerEmail is required")

    folder_id = str(uuid.uuid4())

    folder_doc = {
        "folderId": folder_id,
        "ownerEmail": owner_email,
        "name": name,
        "videoIds": [],
        "createdAt": firestore.SERVER_TIMESTAMP,
    }

    _folder_doc(folder_id).set(folder_doc)

    return {"ok": True, "folderId": folder_id}


@router.patch("/{folder_id}")
def update_folder(folder_id: str, body: dict = Body(...)):
    """
    Rename a folder or update its video membership.
    """
    doc_ref = _folder_doc(folder_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Folder not found")

    updates = {}

    if "name" in body:
        updates["name"] = body["name"]

    if "videoIds" in body:
        updates["videoIds"] = body["videoIds"]

    if not updates:
        return {"ok": True, "updated": False}

    updates["updatedAt"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(updates)

    return {"ok": True, "updated": True}


@router.delete("/{folder_id}")
def delete_folder(folder_id: str):
    """
    Delete a folder (videos are not deleted).
    """
    doc_ref = _folder_doc(folder_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Folder not found")

    doc_ref.delete()
    return {"ok": True, "deleted": True}

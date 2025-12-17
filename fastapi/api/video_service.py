# fastapi/api/video_router.py
# Handles all /video-related endpoints

"""
NOTES:
CHANGED:

/video-engagement/view -> /video/engageement/view
/video-engagement/like -> /video/engageement/like
/video-comments -> /video/comments

"""


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
COMMENTS_COLLECTION = os.getenv("FIRESTORE_COMMENTS_COLLECTION", "videoComments")
firestore_client = firestore.Client(project=PROJECT_ID)

router = APIRouter(
    prefix="/video",
    tags=["video"],
)

def _job_doc(job_id: str):
    return firestore_client.collection("jobs").document(job_id)

def _comments_collection():
    return firestore_client.collection(COMMENTS_COLLECTION)

def _get_viewer_email(request: Request) -> Optional[str]:
    # Match your existing auth pattern (NextAuth / headers / JWT later)
    return request.headers.get("x-user-email")

@router.post("/engagement/view")
def record_view(body: dict = Body(...)):
    """
    Increment viewsCount for a highlight video.
    """
    highlight_id = body.get("highlightId")
    if not highlight_id:
        raise HTTPException(status_code=400, detail="highlightId is required")

    doc_ref = _job_doc(highlight_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Highlight not found")

    doc_ref.update({
        "viewsCount": Increment(1),
        "lastViewedAt": firestore.SERVER_TIMESTAMP,
    })

    updated = doc_ref.get().to_dict() or {}

    return {
        "ok": True,
        "viewsCount": int(updated.get("viewsCount") or 0),
    }


@router.post("/engagement/like")
async def record_like(request: Request):
    """
    Like / unlike a highlight video.
    """
    payload = await request.json()
    highlight_id = payload.get("highlightId")
    delta = int(payload.get("delta", 0))

    if not highlight_id:
        raise HTTPException(status_code=400, detail="highlightId is required")

    viewer_email = _get_viewer_email(request)
    job_ref = _job_doc(highlight_id)

    updates = {
        "lastLikedAt": firestore.SERVER_TIMESTAMP,
    }

    if delta > 0:
        updates["likesCount"] = firestore.Increment(1)
        if viewer_email:
            updates["likedByEmails"] = firestore.ArrayUnion([viewer_email])

    elif delta < 0:
        updates["likesCount"] = firestore.Increment(-1)
        if viewer_email:
            updates["likedByEmails"] = firestore.ArrayRemove([viewer_email])

    else:
        return {"ok": True}

    job_ref.update(updates)

    snap = job_ref.get()
    data = snap.to_dict() or {}

    liked_by_current = False
    if viewer_email and isinstance(data.get("likedByEmails"), list):
        liked_by_current = viewer_email in data["likedByEmails"]

    return {
        "ok": True,
        "likesCount": int(data.get("likesCount", 0)),
        "likedByCurrentUser": liked_by_current,
    }


# get video comments
@router.get("/comments")
def list_video_comments(
    highlightId: str = Query(...),
    limit: int = Query(50, ge=1, le=100),
    pageToken: Optional[str] = None,
):
    """
    List comments for a highlight video (newest first).
    """
    query = (
        _comments_collection()
        .where("highlightId", "==", highlightId)
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
    )

    if pageToken:
        last_doc = _comments_collection().document(pageToken).get()
        if last_doc.exists:
            query = query.start_after(last_doc)

    docs = list(query.limit(limit).stream())

    items = []
    last = None
    for d in docs:
        data = d.to_dict() or {}
        last = d
        items.append({
            "id": d.id,
            "highlightId": data.get("highlightId"),
            "authorEmail": data.get("authorEmail"),
            "text": data.get("text"),
            "createdAt": str(data.get("createdAt")),
        })

    next_token = last.id if last and len(docs) == limit else None

    return {
        "items": items,
        "nextPageToken": next_token,
    }


@router.post("/comments")
def create_video_comment(body: dict = Body(...)):
    """
    Create a new comment on a highlight video.
    """
    highlight_id = (body.get("highlightId") or "").strip()
    author_email = (body.get("authorEmail") or "").strip()
    text = (body.get("text") or "").strip()

    if not highlight_id:
        raise HTTPException(status_code=400, detail="highlightId is required")
    if not author_email:
        raise HTTPException(status_code=400, detail="authorEmail is required")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    job_snap = _job_doc(highlight_id).get()
    if not job_snap.exists:
        raise HTTPException(status_code=404, detail="Highlight not found")

    job_data = job_snap.to_dict() or {}
    visibility = (job_data.get("visibility") or "private").lower()
    owner_email = (job_data.get("ownerEmail") or "").strip()

    if visibility != "public" and author_email != owner_email:
        raise HTTPException(
            status_code=403,
            detail="Only owner can comment on private/unlisted videos",
        )

    doc_ref = _comments_collection().document()
    doc_ref.set({
        "highlightId": highlight_id,
        "authorEmail": author_email,
        "text": text,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "visibilityAtCommentTime": visibility,
    })

    stored = doc_ref.get().to_dict() or {}
    stored["id"] = doc_ref.id

    return {"ok": True, "item": stored}

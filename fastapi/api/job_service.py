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

from google.cloud import firestore
from google.cloud.firestore import Increment

PROJECT_ID = os.environ["GCP_PROJECT_ID"]

RUNS_COLLECTION = os.getenv("FIRESTORE_RUNS_COLLECTION", "runs")
COMMENTS_COLLECTION = os.getenv("FIRESTORE_COMMENTS_COLLECTION", "videoComments")
FOLDER_COLLECTION = os.getenv("FIRESTORE_FOLDER_COLLECTION", "highlightFolders")

firestore_client = firestore.Client(project=PROJECT_ID)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
)


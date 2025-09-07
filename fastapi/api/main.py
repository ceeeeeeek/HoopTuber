from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from VideoInputTest import process_video_and_summarize, client
from typing import List, Dict, Any, Optional
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "videoDataset")
os.makedirs(DATASET_DIR, exist_ok=True)


@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    """
    Handles video upload, processing, and returns a structured response
    or a specific HTTP error for all failure cases.
    """
    os.makedirs(DATASET_DIR, exist_ok=True)
    temp_filename = os.path.join(DATASET_DIR, f"{uuid.uuid4()}.mp4")
    highlight_filename = os.path.join(DATASET_DIR, f"{uuid.uuid4()}_highlightvid.mp4")
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    results = process_video_and_summarize(temp_filename)
    print("DEBUG: returning response to frontend:", results)
    print("DEBUG: type of response: :", type(results))
    if isinstance(results, str):
        try:
            results = json.loads(results)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI model returned invalid JSON")    
    #if results.get("ok") is False:
     #   return {"ok": False, "error": results.get("error", "Unknown error")}
    if isinstance(results, list):
        return {"shot_events": results}
    elif isinstance(results, dict):
        return results
    else:
        raise HTTPException(status_code=500, detail="Unexpected response format from AI model")
    

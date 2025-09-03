from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from VideoInputTest import process_video_and_summarize
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

def reformat_gemini(events):
    return [{
        "subject": e.get("SR", ""),
        "location": e.get("SL", ""),
        "shotType": e.get("ST", ""),
        "timeStamp": e.get("TS", ""),
        "makeOrMiss": e.get("MM", "")
    }
    for e in events
    ]

def ts_to_seconds(ts: str) -> int:
    if not ts:
        return 0
    parts = [int(x) for x in ts.split(":")]
    if len(parts) == 3:
        h, m, s = parts
        return h*3600 + m*60 + s
    m, s = parts
    return m*60 + s

def map_st(st: str) -> str:
    s = (st or "").lower()
    if "three" in s: return "three_pointer"
    if "jump"  in s: return "jump_shot"
    if "layup" in s: return "layup"
    if "dunk"  in s: return "dunk"
    return "jump_shot"

def normalize_events(events: Optional[List[Dict[str, Any]]]) -> Dict[str, Any]:
    events = events or []
    total = len(events)
    made  = sum(1 for e in events if str(e.get("MM","")).lower().startswith("make"))
    pct   = round((made/total)*100) if total else 0

    shots = [{
        "timestamp": ts_to_seconds(e.get("TS","00:00")),
        "shotType": map_st(e.get("ST","")),
        "outcome": "made" if str(e.get("MM","")).lower().startswith("make") else "missed",
        "confidence": 0.9,
        "description": e.get("SR",""),
        "playerPosition": {"x": 0, "y": 0},
    } for e in events]

    return {
        "analysis": {
            "shots": shots,
            "gameStats": {"totalShots": total, "madeShots": made, "shootingPercentage": pct},
            "basketDetection": {"basketsVisible": 1, "courtDimensions": {"width": 28, "height": 15}},
            "playerTracking": {"playersDetected": 1, "movementAnalysis": []},
            "highlights": [],
        }
    }
@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    
    os.makedirs(DATASET_DIR, exist_ok=True)
    temp_filename = os.path.join(DATASET_DIR, f"{uuid.uuid4()}.mp4")
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    results = process_video_and_summarize(temp_filename)
    parsed = json.loads(results)
    return {
        "ok": True,
        "results": {
            "analysis": parsed
        }
    }
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import uuid
from VideoInputTest import process_video_and_summarize

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origin=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    temp_filename = f"videoDataset/{uuid.uuid4()}.mp4"
    with open(temp_filename, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    results = process_video_and_summarize(temp_filename)
    return {"message": "VideoProcessed", "results": results}

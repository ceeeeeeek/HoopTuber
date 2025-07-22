# 🏀 HoopTuber

**HoopTuber** is a web-based application that allows users to upload basketball game videos and uses AI (YOLOv8) to detect basketballs, players, and made shots. The frontend is built with **Next.js** and deployed via **Vercel**, while the backend runs **FastAPI** with **YOLOv8 object detection**, hosted on **Railway**.

---

## 📸 Features

- Upload basketball game videos through a web UI
- Automatically detect basketballs, players, and shot events using AI
- Display detection labels and confidence scores
- Fast and lightweight using `yolov8n` (nano) model
- Fully serverless deployment with CI/CD via GitHub

---

## 🧱 Tech Stack

| Component   | Technology           | Role                          |
|------------|----------------------|-------------------------------|
| Frontend   | Next.js (React)      | User interface & upload form |
| Backend    | FastAPI + YOLOv8     | Inference engine & API       |
| Model      | YOLOv8n              | Object detection (Ultralytics) |
| Deployment | Vercel (Frontend)    | Fast global delivery          |
| Deployment | Railway (Backend)    | Python API & model inference  |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ceeeeeeek/HoopTuber.git
cd HoopTuber


💻 2. Install Frontend Dependencies
bash
Copy
Edit
npm install
▶️ 3. Run Frontend Locally
bash
Copy
Edit
npm run dev
Open browser at: http://localhost:3000

🔗 Connect Frontend to Backend
Deploy the FastAPI backend (instructions below).

Update pages/index.js in the frontend with your backend URL:

js
Copy
Edit
const response = await fetch("https://your-railway-api-url/analyze", {
  method: "POST",
  body: formData,
});
🧠 Backend API (FastAPI + YOLOv8)
Deployed separately (e.g., on Railway)

Create a folder or separate repo with main.py:

python
Copy
Edit
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import shutil, os, uuid

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
model = YOLO("yolov8n.pt")
os.makedirs("uploads", exist_ok=True)

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    path = f"uploads/{file_id}_{file.filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        results = model(path)
        detections = []
        for r in results:
            for b in r.boxes:
                label = model.names[int(b.cls[0])]
                detections.append({
                    "label": label,
                    "confidence": round(float(b.conf[0]), 3)
                })
        return {"status": "success", "detections": detections}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
    finally:
        os.remove(path)
Add requirements.txt:

nginx
Copy
Edit
fastapi
uvicorn
ultralytics
Deploy to Railway (click “New Project → Deploy from GitHub”).

🌐 Deploy Frontend on Vercel
Push your frontend code to GitHub.

Go to https://vercel.com

Click “New Project”, import your GitHub repo.

Vercel auto-deploys your Next.js app.

📂 Folder Structure
php
Copy
Edit
HoopTuber/
├── pages/
│   └── index.js         # Upload form and results UI
├── public/
├── styles/
├── package.json
├── README.md
✅ Example Usage
Upload a basketball clip (.mp4)

Click "Analyze"

View detection results with labels and confidence scores

🧠 Credits
Ultralytics YOLOv8

Vercel

Railway

📄 License
MIT License

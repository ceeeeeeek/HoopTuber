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
git clone https://github.com/your-username/HoopTuber.git
cd HoopTuber
2. Install Frontend Dependencies
bash
Copy
Edit
npm install
3. Run Frontend Locally
bash
Copy
Edit
npm run dev
Access the frontend at: http://localhost:3000

🔁 Connecting to the Backend
The backend must be deployed separately (e.g., on Railway). In your frontend code (see pages/index.js), update the fetch URL to your deployed FastAPI endpoint:

js
Copy
Edit
const response = await fetch("https://your-backend-url.analyze");
Example backend route: https://hooptuber-api-production.up.railway.app/analyze

📁 Project Structure
php
Copy
Edit
HoopTuber/
├── pages/
│   └── index.js          # Main upload and results UI
├── public/               # Static assets
├── styles/               # Optional global styles
├── README.md             # Project documentation
├── package.json          # NPM project config
└── ...
🧠 Backend (YOLOv8 FastAPI)
The backend is in a separate repo (or subfolder) and includes:

FastAPI server with /analyze endpoint

YOLOv8 model loading (yolov8n.pt)

File handling and inference logic

See backend repo or contact your team’s backend dev for access.

🌍 Deployment
Frontend on Vercel
Push this repo to GitHub

Go to https://vercel.com

Import your repo and deploy

Backend on Railway
Push backend repo to GitHub

Go to https://railway.app

Create a new project → Deploy from GitHub

📦 Dependencies
next — React framework

fastapi — Python backend API

ultralytics — YOLOv8 model from Ultralytics

uvicorn — FastAPI server runner

🙌 Credits
Built with ❤️ by [Your Team Name].

YOLOv8 by Ultralytics

Hosting by Vercel & Railway

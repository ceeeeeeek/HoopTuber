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

---

## 🚀 Getting Started


FROM python:3.13-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY worker/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY worker/ .
CMD ["python", "main.py"]

FROM python:3.13-slim

# set working directory inside the container
WORKDIR /app

# install system dependencies
RUN apt-get update && apt-get install -y ffmpeg gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# copy requirements first and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy the rest of the app (everything in fastapi/)
COPY . .

EXPOSE 8000

# run uvicorn pointing to fastapi/api/main.py
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

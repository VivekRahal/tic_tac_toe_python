FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install requirements first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Default environment (can be overridden by compose)
ENV MONGODB_URI=mongodb://mongodb:27017 \
    MONGODB_DB=ukrics \
    OLLAMA_URL=http://ollama:11434/api/generate \
    OLLAMA_MODEL=llava:7b \
    JWT_SECRET=change-me \
    JWT_EXP_DAYS=7 \
    OAUTH_POST_LOGIN_REDIRECT=http://localhost:8080/login \
    GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]


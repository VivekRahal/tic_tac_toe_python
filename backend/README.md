# HomeScan AI Backend (FastAPI + Ollama llava:7b)

This backend exposes a simple API to analyze property photos using the local Ollama model `llava:7b`.

## Prerequisites

- Python 3.10+
- [Ollama](https://ollama.com/) installed and running locally (default: `http://127.0.0.1:11434`).
- Pull the vision model once:

```
ollama pull llava:7b
```

## Install

```
cd tic_tac_toe_python/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## API

- `GET /health` → `{ status: "ok" }`
- `GET /api/questions` → list of available prompts/questions.
- `POST /api/scan` (multipart)
  - `file`: image file
  - `question_id` (optional, default: `rics_analyze`)
  - Response: JSON analysis (structured where possible). If the model returns non‑JSON, the raw text is included.

## Notes

- The backend requests the model to respond as strict JSON for easier rendering on the frontend.
- CORS is enabled for local development (all origins). Adjust in `main.py` for production.


from __future__ import annotations

import base64
import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "llava:7b"


QUESTIONS: Dict[str, str] = {
    "rics_analyze": (
        "Act as a UK RICS residential surveyor. From the image(s), identify visible defects "
        "(e.g., damp, mould, cracking, leaks, roof or joinery issues). Provide concise findings and "
        "solutions aligned with RICS standards and guidance. Respond ONLY as strict JSON with this schema:\n"
        "{\n  \"title\": string,\n  \"summary\": string,\n  \"findings\": string[],\n  \"recommended_actions\": string[],\n  \"risk_level\": one of [\"low\", \"moderate\", \"high\"],\n  \"keywords\": string[]\n}\n"
        "Keep the language clear and professional."
    ),
    "general": (
        "You are a building pathology assistant. Extract visible issues and suggest practical next steps. "
        "Return strict JSON (title, summary, findings[], recommended_actions[], risk_level, keywords[])."
    ),
}


app = FastAPI(title="HomeScan AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/api/questions")
def list_questions() -> Dict[str, Any]:
    return {
        "default": "rics_analyze",
        "items": [{"id": k, "prompt": v[:180] + ("…" if len(v) > 180 else "")} for k, v in QUESTIONS.items()],
    }


def _b64_image(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")


async def call_ollama(prompt: str, b64_images: List[str]) -> Dict[str, Any]:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "images": b64_images,
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(OLLAMA_URL, json=payload)
        r.raise_for_status()
        data = r.json()
        # Ollama returns { response: str, ... }
        return data


@app.post("/api/scan")
async def scan_image(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    question_id: str = Form("rics_analyze"),
) -> JSONResponse:
    if question_id not in QUESTIONS:
        question_id = "rics_analyze"

    prompt = QUESTIONS[question_id]
    to_process: List[UploadFile] = []
    if files:
        to_process.extend(files)
    if file:
        to_process.append(file)
    if not to_process:
        return JSONResponse(status_code=400, content={"ok": False, "error": "No files uploaded"})

    raws: List[str] = []
    try:
        for f in to_process:
            contents = await f.read()
            b64 = _b64_image(contents)
            resp = await call_ollama(prompt, [b64])
            raws.append(resp.get("response", ""))
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"Failed to query Ollama: {e}"})

    payload: Dict[str, Any] = {
        "ok": True,
        "model": MODEL_NAME,
        "question_id": question_id,
        "raws": raws,
    }
    if len(raws) == 1:
        payload["raw"] = raws[0]
    return JSONResponse(content=payload)

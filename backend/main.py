from __future__ import annotations

import base64
import json
from typing import Any, Dict, List, Optional
import os

import httpx
from fastapi import FastAPI, File, Form, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db import mongodb
from prompts import QUESTIONS
from auth import router as auth_router, parse_authorization
from bson import ObjectId
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # type: ignore


# Allow overriding model and Ollama endpoint via environment
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "llava:7b")

# OpenAI provider configuration (optional)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_BASE = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# Prompts are now managed in backend/prompts.py (imported above)


if load_dotenv:
    try:
        load_dotenv()
    except Exception:
        pass

app = FastAPI(title="HomeScan AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def _startup_db() -> None:
    try:
        await mongodb.connect()
    except Exception:
        # Do not crash the app if DB is unavailable; health/db will reflect status
        pass


@app.on_event("shutdown")
async def _shutdown_db() -> None:
    try:
        await mongodb.disconnect()
    except Exception:
        pass


@app.get("/health/db")
async def health_db() -> Dict[str, Any]:
    ok = await mongodb.ping()
    return {"ok": ok}



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


async def call_openai(prompt: str, b64_images: List[str], model: Optional[str] = None) -> Dict[str, Any]:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")
    # Build vision message: text + image URLs (data URIs)
    content: List[Dict[str, Any]] = [{"type": "text", "text": prompt}]
    for b64 in b64_images:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
        })
    payload = {
        "model": model or OPENAI_MODEL,
        "messages": [{"role": "user", "content": content}],
        "temperature": 0.2,
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{OPENAI_API_BASE}/chat/completions", headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        # Normalize to { response: str }
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"response": text}


class OpenAIChatRequest(BaseModel):
    prompt: str
    image_b64: Optional[str] = None
    model: Optional[str] = None


class OpenAIChatResponse(BaseModel):
    ok: bool
    model: str
    response: str


@app.post("/api/openai/chat", response_model=OpenAIChatResponse)
async def openai_chat(body: OpenAIChatRequest) -> JSONResponse:
    if not OPENAI_API_KEY:
        return JSONResponse(status_code=500, content={"ok": False, "model": OPENAI_MODEL, "response": "OPENAI_API_KEY not configured"})
    try:
        images = [body.image_b64] if body.image_b64 else []
        data = await call_openai(body.prompt, images, model=body.model)
        model_used = body.model or OPENAI_MODEL
        return JSONResponse(content={"ok": True, "model": model_used, "response": data.get("response", "")})
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "model": body.model or OPENAI_MODEL, "response": f"Error: {e}"})


@app.post("/api/scan")
async def scan_image(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    question_id: str = Form("rics_analyze"),
    provider: str = Form("ollama"),
    authorization: Optional[str] = Header(default=None),
) -> JSONResponse:
    # Require auth and get user id
    claims = parse_authorization(authorization)
    user_id = claims.get("sub")
    if question_id not in QUESTIONS:
        question_id = "rics_analyze"

    prompt = QUESTIONS[question_id]
    provider = (provider or "ollama").lower()
    to_process: List[UploadFile] = []
    if files:
        to_process.extend(files)
    if file:
        to_process.append(file)
    if not to_process:
        return JSONResponse(status_code=400, content={"ok": False, "error": "No files uploaded"})

    results: List[Dict[str, Any]] = []
    try:
        for f in to_process:
            contents = await f.read()
            b64 = _b64_image(contents)
            if provider == "openai":
                resp = await call_openai(prompt, [b64])
                used_model = OPENAI_MODEL
            else:
                resp = await call_ollama(prompt, [b64])
                used_model = MODEL_NAME
            results.append({
                "image_b64": b64,
                "response": resp.get("response", ""),
            })
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"Failed to query provider: {e}"})

    # Persist scan document
    doc: Dict[str, Any] = {
        "user_id": ObjectId(user_id) if user_id else None,
        "question_id": question_id,
        "model": OPENAI_MODEL if provider == "openai" else MODEL_NAME,
        "provider": provider,
        "results": results,
        "images_count": len(results),
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    scans = mongodb.db["scans"]
    ins = await scans.insert_one(doc)

    payload: Dict[str, Any] = {
        "ok": True,
        "model": OPENAI_MODEL if provider == "openai" else MODEL_NAME,
        "provider": provider,
        "question_id": question_id,
        "scan_id": str(ins.inserted_id),
        "raws": [r.get("response", "") for r in results],
    }
    if len(results) == 1:
        payload["raw"] = results[0].get("response", "")
    return JSONResponse(content=payload)


@app.get("/api/scans")
async def list_scans(authorization: Optional[str] = Header(default=None)) -> JSONResponse:
    claims = parse_authorization(authorization)
    user_id = claims.get("sub")
    scans = mongodb.db["scans"]
    cursor = scans.find({"user_id": ObjectId(user_id)}).sort("created_at", -1).limit(50)
    items: List[Dict[str, Any]] = []
    async for d in cursor:
        items.append({
            "id": str(d.get("_id")),
            "question_id": d.get("question_id"),
            "model": d.get("model"),
            "images_count": d.get("images_count", 0),
            "created_at": d.get("created_at").isoformat() if d.get("created_at") else None,
        })
    return JSONResponse({"ok": True, "items": items})


@app.get("/api/scans/{scan_id}")
async def get_scan(scan_id: str, authorization: Optional[str] = Header(default=None)) -> JSONResponse:
    claims = parse_authorization(authorization)
    user_id = claims.get("sub")
    scans = mongodb.db["scans"]
    d = await scans.find_one({"_id": ObjectId(scan_id), "user_id": ObjectId(user_id)})
    if not d:
        return JSONResponse(status_code=404, content={"ok": False, "error": "Not found"})
    d["id"] = str(d.pop("_id"))
    d["user_id"] = str(d.get("user_id"))
    if d.get("created_at"):
        try:
            d["created_at"] = d["created_at"].isoformat()
        except Exception:
            d["created_at"] = str(d["created_at"])
    # Do not return extremely large payloads; cap base64 length for previews
    for r in d.get("results", []):
        b64 = r.get("image_b64")
        if isinstance(b64, str) and len(b64) > 200:
            r["image_b64_preview"] = b64[:200] + "..."
    return JSONResponse({"ok": True, "scan": d})

from __future__ import annotations

import base64
import json
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, File, Form, UploadFile, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db import mongodb
from auth import router as auth_router, parse_authorization
from bson import ObjectId
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None  # type: ignore


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


@app.post("/api/scan")
async def scan_image(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    question_id: str = Form("rics_analyze"),
    authorization: Optional[str] = Header(default=None),
) -> JSONResponse:
    # Require auth and get user id
    claims = parse_authorization(authorization)
    user_id = claims.get("sub")
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

    results: List[Dict[str, Any]] = []
    try:
        for f in to_process:
            contents = await f.read()
            b64 = _b64_image(contents)
            resp = await call_ollama(prompt, [b64])
            results.append({
                "image_b64": b64,
                "response": resp.get("response", ""),
            })
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"Failed to query Ollama: {e}"})

    # Persist scan document
    doc: Dict[str, Any] = {
        "user_id": ObjectId(user_id) if user_id else None,
        "question_id": question_id,
        "model": MODEL_NAME,
        "results": results,
        "images_count": len(results),
        "created_at": __import__("datetime").datetime.utcnow(),
    }
    scans = mongodb.db["scans"]
    ins = await scans.insert_one(doc)

    payload: Dict[str, Any] = {
        "ok": True,
        "model": MODEL_NAME,
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

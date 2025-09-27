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

# ElevenLabs TTS (optional)
ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_DEFAULT_VOICE = os.getenv("ELEVENLABS_VOICE_ID", "Rachel")  # can be name or voice_id
ELEVEN_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2")
_ELEVEN_VOICES_CACHE: Dict[str, str] = {}


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


async def call_ollama(prompt: str, b64_images: List[str], model: Optional[str] = None) -> Dict[str, Any]:
    payload = {
        "model": model or MODEL_NAME,
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

def _sanitize_model(m: Optional[str]) -> Optional[str]:
    if not m: 
        return None
    val = str(m).strip()
    if not val or val.lower() == 'string':
        return None
    return val


def _select_model(provider: str, model: Optional[str]) -> str:
    """Choose a safe model value per provider.
    - For OpenAI, prefer models starting with 'gpt'. Otherwise use OPENAI_MODEL.
    - For Ollama, avoid passing GPT models; fall back to MODEL_NAME.
    """
    sanitized = _sanitize_model(model)
    p = (provider or "").lower()
    if p == "openai":
        if sanitized and sanitized.lower().startswith("gpt"):
            return sanitized
        return OPENAI_MODEL
    # ollama or others
    if sanitized and not sanitized.lower().startswith("gpt"):
        return sanitized
    return MODEL_NAME


@app.get("/health/openai")
def health_openai() -> Dict[str, Any]:
    return {"ok": bool(OPENAI_API_KEY), "base": OPENAI_API_BASE, "model": OPENAI_MODEL}


@app.post("/api/openai/chat", response_model=OpenAIChatResponse)
async def openai_chat(body: OpenAIChatRequest) -> JSONResponse:
    if not OPENAI_API_KEY:
        return JSONResponse(status_code=500, content={"ok": False, "model": OPENAI_MODEL, "response": "OPENAI_API_KEY not configured"})
    try:
        images = [body.image_b64] if body.image_b64 else []
        chosen = _sanitize_model(body.model) or OPENAI_MODEL
        data = await call_openai(body.prompt, images, model=chosen)
        model_used = chosen
        return JSONResponse(content={"ok": True, "model": model_used, "response": data.get("response", "")})
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "model": body.model or OPENAI_MODEL, "response": f"Error: {e}"})


# ------------------ ElevenLabs Text-to-Speech ------------------
class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    # Optional voice settings
    stability: Optional[float] = None
    similarity_boost: Optional[float] = None
    style: Optional[float] = None
    use_speaker_boost: Optional[bool] = None


@app.get("/health/tts")
def health_tts() -> Dict[str, Any]:
    return {"ok": bool(ELEVEN_API_KEY), "default_voice": ELEVEN_DEFAULT_VOICE, "model": ELEVEN_MODEL_ID}


async def _resolve_eleven_voice_id(name_or_id: str, client: httpx.AsyncClient) -> str:
    # If it already looks like an id (many Eleven voice IDs are 20-30+ chars, alnum), accept it.
    v = (name_or_id or "").strip()
    if not v:
        return v
    if len(v) > 20 and all(c.isalnum() or c in ('-', '_') for c in v):
        return v
    # Try cache by name (case-insensitive)
    key = v.lower()
    if key in _ELEVEN_VOICES_CACHE:
        return _ELEVEN_VOICES_CACHE[key]
    # Fetch voices list and map names -> ids
    headers = {"xi-api-key": ELEVEN_API_KEY or ""}
    r = await client.get("https://api.elevenlabs.io/v1/voices", headers=headers)
    r.raise_for_status()
    data = r.json()
    voices = data.get("voices", []) or []
    for item in voices:
        nm = (item.get("name") or "").strip().lower()
        vid = item.get("voice_id") or ""
        if nm and vid:
            _ELEVEN_VOICES_CACHE[nm] = vid
    return _ELEVEN_VOICES_CACHE.get(key, v)  # fallback to original


@app.get("/api/tts/voices")
async def list_tts_voices():
    if not ELEVEN_API_KEY:
        return JSONResponse(status_code=500, content={"ok": False, "error": "ELEVENLABS_API_KEY not configured"})
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": ELEVEN_API_KEY})
        r.raise_for_status()
        return JSONResponse(content={"ok": True, **r.json()})


@app.get("/api/tts/voices/{voice_id}")
async def get_tts_voice(voice_id: str):
    if not ELEVEN_API_KEY:
        return JSONResponse(status_code=500, content={"ok": False, "error": "ELEVENLABS_API_KEY not configured"})
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"https://api.elevenlabs.io/v1/voices/{voice_id}", headers={"xi-api-key": ELEVEN_API_KEY})
        if r.status_code >= 400:
            return JSONResponse(status_code=r.status_code, content={"ok": False, "detail": r.text})
        return JSONResponse(content={"ok": True, **r.json()})


@app.post("/api/tts")
async def tts_generate(body: TTSRequest):
    if not ELEVEN_API_KEY:
        return JSONResponse(status_code=500, content={"ok": False, "error": "ELEVENLABS_API_KEY not configured"})

    voice_name_or_id = (body.voice_id or ELEVEN_DEFAULT_VOICE).strip()
    model_id = (body.model_id or ELEVEN_MODEL_ID).strip()

    payload: Dict[str, Any] = {
        "text": body.text,
        "model_id": model_id,
    }
    # Attach voice settings if any
    vs: Dict[str, Any] = {}
    if body.stability is not None:
        vs["stability"] = body.stability
    if body.similarity_boost is not None:
        vs["similarity_boost"] = body.similarity_boost
    if body.style is not None:
        vs["style"] = body.style
    if body.use_speaker_boost is not None:
        vs["use_speaker_boost"] = body.use_speaker_boost
    if vs:
        payload["voice_settings"] = vs

    headers = {
        "xi-api-key": ELEVEN_API_KEY,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Resolve voice id if a name was provided
            voice_id = await _resolve_eleven_voice_id(voice_name_or_id, client)
            url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?optimize_streaming_latency=0"
            r = await client.post(url, headers=headers, json=payload)
            if r.status_code >= 400:
                detail = r.text
                if len(detail) > 400:
                    detail = detail[:400] + "…"
                return JSONResponse(status_code=502, content={
                    "ok": False,
                    "error": "TTS upstream error",
                    "status": r.status_code,
                    "detail": detail,
                    "voice_id": voice_id,
                    "model_id": model_id,
                })
            audio = r.content
            from fastapi import Response
            return Response(content=audio, media_type="audio/mpeg", headers={"Content-Disposition": "inline; filename=voice.mp3"})
    except httpx.HTTPError as e:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"TTS failed: {e}"})


# ------------------ TTS Config (admin) ------------------
class TTSConfig(BaseModel):
    default_voice_id: Optional[str] = None
    default_voice_name: Optional[str] = None
    model_id: Optional[str] = None
    effects_enabled: Optional[bool] = True
    stability: Optional[float] = None
    similarity_boost: Optional[float] = None
    style: Optional[float] = None
    use_speaker_boost: Optional[bool] = None
    intro_text: Optional[str] = None
    auto_intro_on_load: Optional[bool] = False
    auto_read_summary: Optional[bool] = True
    auto_read_keywords: Optional[bool] = True


def _default_tts_config() -> Dict[str, Any]:
    return {
        "default_voice_id": None,
        "default_voice_name": ELEVEN_DEFAULT_VOICE,
        "model_id": ELEVEN_MODEL_ID,
        "effects_enabled": True,
        "stability": None,
        "similarity_boost": None,
        "style": None,
        "use_speaker_boost": None,
        "intro_text": (
            "Welcome to UK Survey AI — I’ll guide you through checking a UK home using photos and a simple step-by-step flow. "
            "Start by entering the address and RICS level, upload clear photos, then run analysis."
        ),
        "auto_intro_on_load": False,
        "auto_read_summary": True,
        "auto_read_keywords": True,
    }


@app.get("/api/tts/config")
async def get_tts_config() -> JSONResponse:
    try:
        coll = mongodb.db["settings"]
        doc = await coll.find_one({"_id": "tts_config"})
        if not doc:
            return JSONResponse({"ok": True, "config": _default_tts_config()})
        doc.pop("_id", None)
        return JSONResponse({"ok": True, "config": doc})
    except Exception:
        return JSONResponse({"ok": True, "config": _default_tts_config()})


@app.put("/api/tts/config")
async def put_tts_config(body: TTSConfig, authorization: Optional[str] = Header(default=None)) -> JSONResponse:
    # Require admin
    claims = parse_authorization(authorization)
    if (claims or {}).get("role") not in ("admin",):
        return JSONResponse(status_code=403, content={"ok": False, "error": "Admin only"})
    cfg = {k: v for k, v in body.dict().items() if v is not None or k in ("effects_enabled","auto_intro_on_load","auto_read_summary","auto_read_keywords")}
    try:
        coll = mongodb.db["settings"]
        await coll.update_one({"_id": "tts_config"}, {"$set": cfg}, upsert=True)
        return JSONResponse({"ok": True})
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": f"Failed to save config: {e}"})


@app.post("/api/scan")
async def scan_image(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    question_id: str = Form("rics_analyze"),
    provider: str = Form("ollama"),
    model: Optional[str] = Form(None),
    property_address: Optional[str] = Form(None),
    property_postcode: Optional[str] = Form(None),
    survey_level: Optional[int] = Form(None),
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
                chosen_model = _select_model(provider, model)
                resp = await call_openai(prompt, [b64], model=chosen_model)
                used_model = chosen_model
            else:
                chosen_model = _select_model(provider, model)
                resp = await call_ollama(prompt, [b64], model=chosen_model)
                used_model = chosen_model
            results.append({
                "image_b64": b64,
                "response": resp.get("response", ""),
            })
    except Exception as e:
        return JSONResponse(status_code=502, content={"ok": False, "error": f"Failed to query provider: {e}"})

    # Persist scan document
    now = __import__("datetime").datetime.utcnow()
    doc: Dict[str, Any] = {
        "user_id": ObjectId(user_id) if user_id else None,
        "question_id": question_id,
        "model": used_model if len(results) else (OPENAI_MODEL if provider == "openai" else MODEL_NAME),
        "provider": provider,
        "results": results,
        "images_count": len(results),
        "created_at": now,
    }
    # Optional metadata
    prop: Dict[str, Any] = {}
    if property_address:
        prop["address"] = property_address
    if property_postcode:
        prop["postcode"] = property_postcode
    if prop:
        doc["property"] = prop
    surv: Dict[str, Any] = {}
    if survey_level is not None:
        try:
            surv["level"] = int(survey_level)
        except Exception:
            pass
    if surv:
        doc["survey"] = surv
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
    if prop:
        payload["property"] = prop
    if surv:
        payload["survey"] = surv
    payload["created_at"] = now.isoformat()
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

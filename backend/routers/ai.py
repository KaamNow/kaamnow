from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..ai_service import (
    describe_cert_image,
    describe_job_photo,
    extract_job_fields,
    generate_bio,
    price_stats,
    transcribe_audio,
)
from ..auth import get_current_user
from ..config import settings
from ..db import db

router = APIRouter(prefix="/api/ai", tags=["ai"])


class GenerateJobIn(BaseModel):
    text: str = Field(..., min_length=2, max_length=1000)
    language: Optional[str] = "hi"


class GenerateBioIn(BaseModel):
    skills: List[str] = Field(default_factory=list, max_length=10)
    daily_rate: int = 0
    total_jobs: int = 0
    avg_rating: float = 0.0
    gender: Optional[str] = None
    language: Optional[str] = "hi"


def _ensure_ai_enabled() -> None:
    if not settings.feature_ai:
        raise HTTPException(status_code=503, detail="AI features are disabled")


async def _read_upload(file: UploadFile, allowed: tuple[str, ...], max_bytes: int) -> bytes:
    content_type = file.content_type or ""
    if content_type and not any(content_type.startswith(prefix) for prefix in allowed):
        raise HTTPException(status_code=400, detail="Unsupported file type")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File is empty")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail="File is too large")
    return data


@router.post("/generate-job")
async def generate_job(body: GenerateJobIn, user: dict = Depends(get_current_user)):
    _ensure_ai_enabled()
    fields = extract_job_fields(body.text, body.language or user.get("preferred_language") or "hi")
    if not fields:
        raise HTTPException(status_code=503, detail="AI extraction unavailable")
    return fields


@router.post("/voice-to-job")
async def voice_to_job(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    _ensure_ai_enabled()
    audio = await _read_upload(
        file, ("audio/", "video/webm", "application/octet-stream"), 10 * 1024 * 1024
    )
    transcript = transcribe_audio(audio) or "Need help with local work"
    fields = extract_job_fields(transcript, user.get("preferred_language") or "hi")
    return {"transcript": transcript, "job_fields": fields}


@router.post("/generate-bio")
async def generate_worker_bio(body: GenerateBioIn, user: dict = Depends(get_current_user)):
    _ensure_ai_enabled()
    bio = generate_bio(body.model_dump(), body.language or user.get("preferred_language") or "hi")
    if not bio:
        raise HTTPException(status_code=503, detail="AI bio unavailable")
    return {"bio": bio[:500]}


@router.post("/describe-cert")
async def describe_cert(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    _ensure_ai_enabled()
    image = await _read_upload(file, ("image/",), 5 * 1024 * 1024)
    result = describe_cert_image(image)
    if result is None:
        raise HTTPException(status_code=503, detail="Certificate description unavailable")
    return result


@router.post("/photo-to-job")
async def photo_to_job(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    _ensure_ai_enabled()
    image = await _read_upload(file, ("image/",), 5 * 1024 * 1024)
    result = describe_job_photo(image)
    if result is None:
        raise HTTPException(status_code=503, detail="Photo description unavailable")
    return result


@router.get("/suggest-price")
async def suggest_price(
    skill: str,
    pincode: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    _ensure_ai_enabled()
    query: dict = {"daily_rate": {"$gt": 0}}
    if skill:
        query["$or"] = [
            {"skills": {"$regex": skill, "$options": "i"}},
            {"structured_skills.skill": {"$regex": skill, "$options": "i"}},
        ]
    if pincode:
        query["address.pincode"] = pincode
    workers = await db.workers.find(query, {"_id": 0, "daily_rate": 1}).limit(200).to_list(200)
    return price_stats([w.get("daily_rate") for w in workers])

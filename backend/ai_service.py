import json
import re
import tempfile
from datetime import date, timedelta
from statistics import median
from typing import Any, Optional

from .config import settings

_gemini_model = None
_groq_client = None


class _GeminiWrapper:
    """Thin wrapper around google.genai client to keep call sites unchanged."""

    def __init__(self, client):
        self._client = client

    def generate_content(self, prompt):
        from google.genai import types

        if isinstance(prompt, list):
            # Convert old-style [text, {mime_type, data}] → new parts API
            parts = []
            for item in prompt:
                if isinstance(item, str):
                    parts.append(item)
                elif isinstance(item, dict):
                    parts.append(
                        types.Part.from_bytes(
                            data=item.get("data", b""),
                            mime_type=item.get("mime_type", "image/jpeg"),
                        )
                    )
            response = self._client.models.generate_content(
                model="gemini-2.0-flash", contents=parts
            )
        else:
            response = self._client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt
            )

        class _R:
            def __init__(self, text):
                self.text = text

        return _R(response.text or "")


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not settings.gemini_api_key:
        return None
    try:
        from google import genai

        client = genai.Client(api_key=settings.gemini_api_key)
        _gemini_model = _GeminiWrapper(client)
        return _gemini_model
    except Exception:
        return None


def _get_groq_client():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    if not settings.groq_api_key:
        return None
    try:
        from groq import Groq

        _groq_client = Groq(api_key=settings.groq_api_key)
        return _groq_client
    except Exception:
        return None


def _json_from_text(text: str) -> Optional[dict[str, Any]]:
    match = re.search(r"\{.*\}", text or "", flags=re.S)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _fallback_job_fields(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    lowered = raw.lower()
    skill = "general"
    for candidate in [
        "painter",
        "painting",
        "plumber",
        "electrician",
        "mason",
        "carpenter",
        "cleaning",
        "driver",
        "farm",
        "labour",
    ]:
        if candidate in lowered:
            skill = candidate
            break

    amount_match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d{2,5})", lowered)
    daily_rate = int(amount_match.group(1)) if amount_match else 500
    urgency = (
        "asap" if any(word in lowered for word in ["asap", "urgent", "today", "abhi"]) else "normal"
    )
    job_date = date.today()
    if "tomorrow" in lowered or "kal" in lowered:
        job_date += timedelta(days=1)

    clean_skill = skill.replace("painting", "painter")
    title = raw[:80] or f"Need {clean_skill}"
    return {
        "title": title,
        "category": clean_skill,
        "skill": clean_skill,
        "daily_rate": daily_rate,
        "urgency": urgency,
        "job_date": job_date.isoformat(),
        "description": raw or f"Need help with {clean_skill}.",
    }


def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    client = _get_groq_client()
    if not client:
        return None
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            with open(tmp.name, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",
                )
        return getattr(transcript, "text", None)
    except Exception:
        return None


def extract_job_fields(text: str, language: str = "hi") -> Optional[dict[str, Any]]:
    model = _get_gemini_model()
    if not model:
        return _fallback_job_fields(text)
    prompt = (
        "Extract job posting fields from this Hindi/English text. Return strict JSON with "
        "title, category, skill, daily_rate, urgency(normal|urgent|asap), job_date(YYYY-MM-DD), "
        f"description. Language hint: {language}. Text: {text}"
    )
    try:
        response = model.generate_content(prompt)
        parsed = _json_from_text(getattr(response, "text", "") or "")
        return parsed or _fallback_job_fields(text)
    except Exception:
        return _fallback_job_fields(text)


def generate_bio(worker_data: dict[str, Any], language: str = "hi") -> Optional[str]:
    skills = ", ".join(worker_data.get("skills") or [])
    fallback = (
        f"Experienced Local Expert for {skills or 'general work'} with fair pricing and reliable service. "
        "Available for nearby KaamNow jobs."
    )
    model = _get_gemini_model()
    if not model:
        return fallback
    try:
        response = model.generate_content(
            "Write a respectful 2-sentence Local Expert bio in "
            f"{language}. Worker data: {json.dumps(worker_data, ensure_ascii=False)}"
        )
        return (getattr(response, "text", "") or fallback).strip()[:500]
    except Exception:
        return fallback


def describe_cert_image(image_bytes: bytes) -> Optional[dict[str, Any]]:
    model = _get_gemini_model()
    if not model:
        return {"cert_name": "", "issued_by": "", "year": None, "skill": ""}
    try:
        response = model.generate_content(
            [
                "Read this certificate image and return JSON: cert_name, issued_by, year, skill.",
                {"mime_type": "image/jpeg", "data": image_bytes},
            ]
        )
        return _json_from_text(getattr(response, "text", "") or "") or {
            "cert_name": "",
            "issued_by": "",
            "year": None,
            "skill": "",
        }
    except Exception:
        return None


def describe_job_photo(image_bytes: bytes) -> Optional[dict[str, Any]]:
    model = _get_gemini_model()
    if not model:
        return {
            "title": "Job from photo",
            "category": "general",
            "skill": "general",
            "description": "Please review the photo and describe the work needed.",
        }
    try:
        response = model.generate_content(
            [
                "Identify what work is needed from this job-site photo. Return JSON: title, category, skill, description.",
                {"mime_type": "image/jpeg", "data": image_bytes},
            ]
        )
        return _json_from_text(getattr(response, "text", "") or "")
    except Exception:
        return None


def price_stats(amounts: list[int]) -> dict[str, int]:
    values = sorted(int(v) for v in amounts if v is not None)
    if not values:
        return {"min": 0, "median": 0, "max": 0, "suggested": 0}
    med = int(median(values))
    return {"min": values[0], "median": med, "max": values[-1], "suggested": med}

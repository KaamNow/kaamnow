import json
import logging
import re
import tempfile
from datetime import date, timedelta
from statistics import median
from typing import Any, Optional

from .config import settings

logger = logging.getLogger(__name__)

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
                model="gemini-2.5-flash", contents=parts
            )
        else:
            response = self._client.models.generate_content(
                model="gemini-2.5-flash", contents=prompt
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
        logger.warning("GEMINI_API_KEY not set — Gemini disabled")
        return None
    try:
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        _gemini_model = _GeminiWrapper(client)
        logger.info("Gemini client initialised")
        return _gemini_model
    except Exception as e:
        logger.error("Gemini client init failed: %s", e)
        return None


def _get_groq_client():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    if not settings.groq_api_key:
        logger.warning("GROQ_API_KEY not set — Groq disabled")
        return None
    try:
        from groq import Groq
        _groq_client = Groq(api_key=settings.groq_api_key)
        logger.info("Groq client initialised")
        return _groq_client
    except Exception as e:
        logger.error("Groq client init failed: %s", e)
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
    except Exception as e:
        logger.error("Groq transcription failed: %s", e)
        return None


def _groq_chat(prompt: str, max_tokens: int = 400) -> Optional[str]:
    """Call Groq LLaMA for text tasks. Returns raw text or None."""
    client = _get_groq_client()
    if not client:
        return None
    try:
        r = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
        )
        return r.choices[0].message.content
    except Exception:
        return None


def _groq_vision(image_bytes: bytes, prompt: str, max_tokens: int = 400) -> Optional[str]:
    """Call Groq vision model (llama-4-scout) for image tasks. Returns raw text or None."""
    import base64
    client = _get_groq_client()
    if not client:
        return None
    try:
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        r = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }],
            max_tokens=max_tokens,
        )
        return r.choices[0].message.content
    except Exception as e:
        logger.error("Groq vision failed: %s", e)
        return None


def extract_job_fields(text: str, language: str = "hi") -> Optional[dict[str, Any]]:
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    prompt = (
        f"Extract job posting fields from this Hindi/English text and return strict JSON.\n"
        f"Today is {today}. If user says 'tomorrow' or 'kal' use {tomorrow}.\n"
        f"Required fields: title (string), category (string, e.g. Painting/Plumbing/Electrical/Cleaning/Driving/Farming/General), "
        f"skill (string), daily_rate (integer rupees, 0 if not mentioned), "
        f"urgency (exactly one of: normal, urgent, asap), "
        f"job_date (YYYY-MM-DD format), description (string).\n"
        f"Text: {text}"
    )
    # Try Groq first (fast, free), fall back to Gemini, then keyword fallback
    raw = _groq_chat(prompt)
    if raw:
        parsed = _json_from_text(raw)
        if parsed:
            urg = str(parsed.get("urgency", "")).lower()
            parsed["urgency"] = "asap" if urg in ("asap", "high", "urgent") else ("urgent" if "urgent" in urg else "normal")
            try:
                parsed["daily_rate"] = int(parsed.get("daily_rate") or 0)
            except (ValueError, TypeError):
                parsed["daily_rate"] = 0
            return parsed
        logger.warning("Groq job extraction returned unparseable JSON: %s", raw[:200])

    model = _get_gemini_model()
    if model:
        try:
            response = model.generate_content(prompt)
            parsed = _json_from_text(getattr(response, "text", "") or "")
            if parsed:
                return parsed
        except Exception as e:
            logger.error("Gemini extract_job_fields failed: %s", e)

    logger.info("extract_job_fields using keyword fallback for: %s", text[:80])
    return _fallback_job_fields(text)


def generate_bio(worker_data: dict[str, Any], language: str = "hi") -> Optional[str]:
    skills = ", ".join(worker_data.get("skills") or [])
    fallback = (
        f"Experienced Local Expert for {skills or 'general work'} with fair pricing and reliable service. "
        "Available for nearby KaamNow jobs."
    )
    lang_label = {"hi": "Hindi", "en": "English", "bho": "Bhojpuri", "mai": "Maithili"}.get(language, "Hindi")
    prompt = (
        f"Write a respectful 2-sentence bio in {lang_label} for a blue-collar Local Expert on KaamNow app. "
        f"Use simple, dignified language. Worker details: {json.dumps(worker_data, ensure_ascii=False)}. "
        f"Return JSON with one field: bio (string, max 500 chars)."
    )
    # Try Groq first
    raw = _groq_chat(prompt, max_tokens=200)
    if raw:
        parsed = _json_from_text(raw)
        if parsed and parsed.get("bio"):
            return str(parsed["bio"])[:500]
        logger.warning("Groq bio generation returned unparseable JSON: %s", raw[:200])

    model = _get_gemini_model()
    if model:
        try:
            response = model.generate_content(
                f"Write a respectful 2-sentence Local Expert bio in {lang_label}. "
                f"Worker data: {json.dumps(worker_data, ensure_ascii=False)}"
            )
            return (getattr(response, "text", "") or fallback).strip()[:500]
        except Exception as e:
            logger.error("Gemini generate_bio failed: %s", e)

    return fallback


def describe_cert_image(image_bytes: bytes) -> Optional[dict[str, Any]]:
    empty = {"cert_name": "", "issued_by": "", "year": None, "skill": ""}
    cert_prompt = "Read this certificate image carefully. Return JSON with fields: cert_name (string), issued_by (string), year (integer or null), skill (string)."

    # Try Groq vision first
    raw = _groq_vision(image_bytes, cert_prompt)
    if raw:
        parsed = _json_from_text(raw)
        if parsed:
            return parsed
        logger.warning("Groq vision cert parse failed: %s", raw[:200])

    # Gemini fallback
    model = _get_gemini_model()
    if model:
        try:
            response = model.generate_content(
                [cert_prompt, {"mime_type": "image/jpeg", "data": image_bytes}]
            )
            return _json_from_text(getattr(response, "text", "") or "") or empty
        except Exception as e:
            logger.error("Gemini describe_cert_image failed: %s", e)

    logger.warning("describe_cert_image: all vision backends unavailable")
    return empty


def describe_job_photo(image_bytes: bytes) -> Optional[dict[str, Any]]:
    fallback = {
        "title": "Job from photo",
        "category": "general",
        "skill": "general",
        "description": "Please review the photo and describe the work needed.",
    }
    photo_prompt = "Identify what work is needed from this job-site photo. Return JSON with fields: title (string), category (string), skill (string), description (string)."

    # Try Groq vision first
    raw = _groq_vision(image_bytes, photo_prompt)
    if raw:
        parsed = _json_from_text(raw)
        if parsed:
            return parsed
        logger.warning("Groq vision photo parse failed: %s", raw[:200])

    # Gemini fallback
    model = _get_gemini_model()
    if model:
        try:
            response = model.generate_content(
                [photo_prompt, {"mime_type": "image/jpeg", "data": image_bytes}]
            )
            return _json_from_text(getattr(response, "text", "") or "") or fallback
        except Exception as e:
            logger.error("Gemini describe_job_photo failed: %s", e)

    logger.warning("describe_job_photo: all vision backends unavailable")
    return fallback


_KNOWN_SKILLS = [
    "cleaner", "painter", "electrician", "plumber", "mason", "carpenter",
    "cook", "driver", "farmer", "welder", "tailor", "security guard",
    "gardener", "laundry", "labour", "general",
]

def resolve_skill(query: str) -> Optional[str]:
    """Map any free-text query (Hindi/English) to a standard skill name via Groq.
    Returns a skill string from _KNOWN_SKILLS, or None if unrecognised."""
    if not query or not query.strip():
        return None
    prompt = (
        f"A user searched for '{query}' in a blue-collar job app in India. "
        f"What standard skill does this refer to? "
        f"Reply with ONLY a JSON object like {{\"skill\": \"cleaner\"}}. "
        f"Choose from: {', '.join(_KNOWN_SKILLS)}. "
        f"If none match, use {{\"skill\": \"unknown\"}}."
    )
    raw = _groq_chat(prompt, max_tokens=30)
    if raw:
        parsed = _json_from_text(raw)
        skill = (parsed or {}).get("skill", "").strip().lower()
        if skill and skill != "unknown" and skill in _KNOWN_SKILLS:
            return skill
    return None


def price_stats(amounts: list[int]) -> dict[str, int]:
    values = sorted(int(v) for v in amounts if v is not None)
    if not values:
        return {"min": 0, "median": 0, "max": 0, "suggested": 0}
    med = int(median(values))
    return {"min": values[0], "median": med, "max": values[-1], "suggested": med}

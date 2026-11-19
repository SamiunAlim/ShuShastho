"""Short voice-note transcription via Gemini (inline audio). Used by the native assistant mic."""
import base64
import binascii
import json
import logging
import os
import urllib.request
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

log = logging.getLogger("transcribe")
router = APIRouter(prefix="/v1/ai", tags=["ai"])

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MAX_AUDIO_BYTES = 3_000_000  # ~15 s of compressed speech is well under this
ALLOWED_MIME = ("audio/",)
PROMPT = {
    "bn": "Transcribe this short voice message exactly as spoken, in Bangla script. Return only the transcript text, nothing else. If there is no speech, return an empty string.",
    "en": "Transcribe this short voice message exactly as spoken, in English. Return only the transcript text, nothing else. If there is no speech, return an empty string.",
}


class TranscribeIn(BaseModel):
    audioBase64: str
    mimeType: str = "audio/mp4"
    language: Literal["en", "bn"] = "bn"


@router.post("/transcribe")
def transcribe(body: TranscribeIn):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "Transcription is not configured")
    if not body.mimeType.startswith(ALLOWED_MIME):
        raise HTTPException(400, "Unsupported audio type")
    try:
        raw = base64.b64decode(body.audioBase64, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Invalid audio data")
    if not raw or len(raw) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio is empty or too long")

    payload = {
        "contents": [{"role": "user", "parts": [
            {"text": PROMPT[body.language]},
            {"inlineData": {"mimeType": body.mimeType, "data": body.audioBase64}},
        ]}],
        "generationConfig": {"temperature": 0, "thinkingConfig": {"thinkingBudget": 0}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.load(resp)
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (OSError, KeyError, IndexError, ValueError) as exc:
        log.warning("Transcription failed (%s)", type(exc).__name__)
        raise HTTPException(502, "Transcription failed")
    return {"text": text}

"""Symptom triage: red-flag rules first, then Gemini, then scripted fallback.

Safety: red-flag rules run first and never wait for the AI; the AI never prescribes or
diagnoses ("possible conditions to consider"). Gemini output is validated against the
SymptomAgentReply shape; if it is invalid, slow (>8 s) or failing, the scripted reply
(mirrors mockAssistantReply in src/services/mock.ts) is used.
"""
import json
import logging
import os
import urllib.request
import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ValidationError

from .db import get_db
from .emergency import AlertIn, create_alert

log = logging.getLogger("triage")
GEMINI_TIMEOUT = 8.0
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

SYSTEM_PROMPT = """You are ShuShastho AI, a symptom-guidance assistant for patients in Bangladesh.
Rules (never break them):
- Reply in the language given as "language" ("bn" = Bangla, "en" = English). Keep it short and simple.
- Ask 1-2 short follow-up questions when information is missing (e.g. temperature, duration, other symptoms).
- NEVER prescribe medicine, never give doses, never name a drug to take.
- NEVER confirm a diagnosis. Use the wording "possible conditions to consider" (Bangla: "বিবেচনা করা যেতে পারে") and say it is not a diagnosis.
- Suggest ONE medical specialty to see (suggestedSpecialty), in the reply language, when you have enough information; otherwise omit it.
- Cite relevant guideline TITLES only (e.g. "DGHS National Dengue Guideline", "WHO Dengue Guidelines") in sources. Never invent URLs or doctors, hospitals, prices or availability.
- If anything sounds life-threatening, tell them to call 999 now and set riskLevel to "emergency".
- riskLevel is one of: low, moderate, high, emergency.
Return ONLY JSON: {"reply": string, "riskLevel": string, "requiresUrgentCare": boolean, "suggestedSpecialty": string|null, "sources": [{"title": string}]}"""

router = APIRouter(prefix="/v1/ai/agents/symptom-triage", tags=["ai"])

RED_FLAGS = [
    "chest pain", "trouble breathing", "difficulty breathing", "can't breathe", "cannot breathe",
    "unconscious", "seizure", "severe bleeding", "fainted",
    "বুকে ব্যথা", "শ্বাসকষ্ট", "শ্বাস নিতে", "অজ্ঞান", "খিঁচুনি", "প্রচুর রক্ত",
]

TEXT = {
    "en": {
        "ask": "I am sorry you are unwell. Do you have a thermometer reading? What is your temperature right now, and do you have any headache, vomiting or body pain?",
        "medium": "Thank you. With fever for 3 days and a rash, possible conditions to consider include dengue or a viral fever. This is not a diagnosis. A doctor may suggest tests such as CBC and NS1. Please rest, drink plenty of fluids and see a Medicine specialist today.",
        "red": "These symptoms can be serious. Please call 999 or go to the nearest emergency department right now. Do not wait for more answers here.",
        "specialty": "Medicine specialist",
        "source": "DGHS National Dengue Guideline",
    },
    "bn": {
        "ask": "আপনি অসুস্থ শুনে দুঃখিত। থার্মোমিটারে এখন আপনার জ্বর কত? মাথাব্যথা, বমি বা শরীরে ব্যথা আছে কি?",
        "medium": "ধন্যবাদ। ৩ দিনের জ্বর ও ফুসকুড়ির কারণে ডেঙ্গু বা ভাইরাল জ্বরের সম্ভাবনা বিবেচনা করা যেতে পারে। এটি রোগ নির্ণয় নয়। ডাক্তার সিবিসি (CBC) ও এনএস১ (NS1) পরীক্ষার পরামর্শ দিতে পারেন। বিশ্রাম নিন, প্রচুর তরল পান করুন এবং আজই একজন মেডিসিন বিশেষজ্ঞকে দেখান।",
        "red": "এই উপসর্গগুলো গুরুতর হতে পারে। এখনই ৯৯৯-এ কল করুন বা নিকটস্থ জরুরি বিভাগে যান। এখানে আরও প্রশ্নের উত্তরের জন্য অপেক্ষা করবেন না।",
        "specialty": "মেডিসিন বিশেষজ্ঞ",
        "source": "ডিজিএইচএস জাতীয় ডেঙ্গু গাইডলাইন",
    },
}


class Consent(BaseModel):
    granted: bool = True
    policyVersion: str | None = None


class Source(BaseModel):
    title: str


class SymptomAgentReply(BaseModel):
    reply: str
    riskLevel: Literal["low", "moderate", "high", "emergency"]
    requiresUrgentCare: bool
    suggestedSpecialty: str | None = None
    sources: list[Source] = []


def ask_gemini(history: list[dict], language: str) -> SymptomAgentReply | None:
    """Return a validated reply, or None on any problem (no key, timeout, bad JSON/shape)."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT + f"\nlanguage: {language}"}]},
        "contents": history,
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.3,
                             "thinkingConfig": {"thinkingBudget": 0}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=GEMINI_TIMEOUT) as resp:
            data = json.load(resp)
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        reply = SymptomAgentReply.model_validate(json.loads(text))
    except (OSError, KeyError, IndexError, ValueError, ValidationError) as exc:
        log.warning("Gemini unavailable/invalid (%s); using scripted reply", type(exc).__name__)
        return None
    if not reply.reply.strip():
        return None
    return reply


class MessageIn(BaseModel):
    conversationId: str = ""
    message: str
    language: Literal["en", "bn"] = "bn"
    consent: Consent | None = None


@router.post("/messages")
def send_message(body: MessageIn):
    cid = body.conversationId or uuid.uuid4().hex[:12]
    t = TEXT[body.language]
    lower = body.message.lower()

    if any(flag in lower for flag in RED_FLAGS):
        alert = create_alert(AlertIn(message=body.message[:300], source="ai-triage"))
        return {"conversationId": cid, "reply": t["red"], "riskLevel": "emergency",
                "requiresUrgentCare": True, "sources": [],
                "emergencyNumber": "999", "alertId": alert["id"]}

    conv = get_db().conversations.find_one_and_update(
        {"_id": cid}, {"$inc": {"userMessages": 1}, "$push": {"history": {"role": "user", "parts": [{"text": body.message[:2000]}]}}},
        upsert=True, return_document=True)

    ai = ask_gemini(conv["history"][-12:], body.language)
    if ai:
        get_db().conversations.update_one(
            {"_id": cid}, {"$push": {"history": {"role": "model", "parts": [{"text": ai.reply}]}}})
        out = {"conversationId": cid, "reply": ai.reply, "riskLevel": ai.riskLevel,
               "requiresUrgentCare": ai.requiresUrgentCare or ai.riskLevel == "emergency",
               "sources": [s.model_dump() for s in ai.sources]}
        if ai.suggestedSpecialty:
            out["suggestedSpecialty"] = ai.suggestedSpecialty
        if out["requiresUrgentCare"]:
            out["emergencyNumber"] = "999"
        return out

    if conv["userMessages"] <= 1:
        return {"conversationId": cid, "reply": t["ask"], "riskLevel": "low",
                "requiresUrgentCare": False, "sources": []}
    return {"conversationId": cid, "reply": t["medium"], "riskLevel": "moderate",
            "requiresUrgentCare": False, "suggestedSpecialty": t["specialty"],
            "sources": [{"title": t["source"]}]}

"""Scripted symptom triage for the demo (mirrors mockAssistantReply in src/services/mock.ts).

Safety: red-flag rules run first; the AI never diagnoses ("possible conditions to consider").
"""
import uuid
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from .db import get_db
from .emergency import AlertIn, create_alert

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
        {"_id": cid}, {"$inc": {"userMessages": 1}}, upsert=True, return_document=True)
    if conv["userMessages"] <= 1:
        return {"conversationId": cid, "reply": t["ask"], "riskLevel": "low",
                "requiresUrgentCare": False, "sources": []}
    return {"conversationId": cid, "reply": t["medium"], "riskLevel": "moderate",
            "requiresUrgentCare": False, "suggestedSpecialty": t["specialty"],
            "sources": [{"title": t["source"]}]}

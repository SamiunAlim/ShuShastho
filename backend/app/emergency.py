import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .db import get_db

router = APIRouter(prefix="/v1/emergency", tags=["emergency"])


class AlertIn(BaseModel):
    patientName: str = "Rahim Uddin"
    phone: str | None = None
    message: str = "Emergency help requested"
    location: str | None = None
    source: Literal["sos", "ai-triage", "checkin"] = "sos"


class AlertPatch(BaseModel):
    status: Literal["acknowledged", "resolved"]


def _out(doc: dict) -> dict:
    return {**{k: v for k, v in doc.items() if k != "_id"}, "id": doc["_id"]}


def create_alert(data: AlertIn) -> dict:
    doc = {"_id": uuid.uuid4().hex[:12], **data.model_dump(), "status": "open",
           "createdAt": datetime.now(timezone.utc).isoformat(), "updatedAt": None}
    get_db().emergency_alerts.insert_one(doc)
    return _out(doc)


@router.post("/alerts", status_code=201)
def post_alert(body: AlertIn):
    return create_alert(body)


@router.get("/alerts")
def list_alerts():
    return [_out(d) for d in get_db().emergency_alerts.find().sort("createdAt", -1).limit(100)]


@router.patch("/alerts/{alert_id}")
def patch_alert(alert_id: str, body: AlertPatch):
    doc = get_db().emergency_alerts.find_one_and_update(
        {"_id": alert_id},
        {"$set": {"status": body.status, "updatedAt": datetime.now(timezone.utc).isoformat()}},
        return_document=True,
    )
    if doc is None:
        raise HTTPException(404, detail={"error": {"message": "Alert not found"}})
    return _out(doc)

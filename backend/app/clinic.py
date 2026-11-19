from datetime import datetime, timedelta

from fastapi import APIRouter, Header, HTTPException
from pymongo import ReturnDocument

from .db import get_db
from .schemas import AppointmentIn

router = APIRouter(prefix="/v1", tags=["clinic"])


def _err(status: int, message: str):
    return HTTPException(status, detail={"error": {"message": message}})


def _fmt_time(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _item(doc: dict, now_serving: int) -> dict:
    serial = doc["serialNumber"]
    if doc.get("noShow"):
        status = "no_show"
    elif serial < now_serving:
        status = "done"
    elif serial == now_serving:
        status = "serving"
    else:
        status = "waiting"
    return {
        "appointmentId": doc["_id"], "serialNumber": serial, "patientName": doc["patientName"],
        "phone": doc["phone"], "age": doc["age"], "summary": doc["summary"],
        "checkedIn": doc["checkedIn"], "noShow": doc.get("noShow", False), "status": status,
    }


def _queue(doctor_id: str) -> dict:
    db = get_db()
    state = db.queue_state.find_one({"_id": doctor_id})
    if state is None:
        raise _err(404, "Doctor not found")
    now = state["nowServing"]
    docs = db.queue.find({"doctorId": doctor_id}).sort("serialNumber", 1)
    return {"doctorId": doctor_id, "nowServing": now, "items": [_item(d, now) for d in docs]}


@router.get("/doctors")
def list_doctors():
    return [{**{k: v for k, v in d.items() if k != "_id"}, "id": d["_id"]} for d in get_db().doctors.find()]


@router.post("/appointments")
def create_appointment(body: AppointmentIn, idempotency_key: str | None = Header(default=None)):
    db = get_db()
    doctor = db.doctors.find_one({"_id": body.doctorId})
    if doctor is None or not db.chambers.find_one({"_id": body.chamberId}):
        raise _err(404, "Doctor or chamber not found")

    if idempotency_key:
        existing = db.queue.find_one({"idempotencyKey": idempotency_key})
        if existing:
            return _confirmation(existing)

    # Demo story: the first booking claims the seeded slot #17 (Rahim Uddin).
    doc = db.queue.find_one_and_update(
        {"doctorId": body.doctorId, "demoSlot": True},
        {"$set": {"idempotencyKey": idempotency_key, "date": body.date}, "$unset": {"demoSlot": ""}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        last = db.queue.find_one({"doctorId": body.doctorId}, sort=[("serialNumber", -1)])
        serial = (last["serialNumber"] if last else 0) + 1
        doc = {
            "_id": f"appt-{serial}-{int(datetime.now().timestamp())}", "doctorId": body.doctorId,
            "chamberId": body.chamberId, "serialNumber": serial,
            "patientName": {"en": "Rahim Uddin", "bn": "রহিম উদ্দিন"}, "phone": "1711234567", "age": 34,
            "summary": {"en": "New booking", "bn": "নতুন বুকিং"}, "checkedIn": False, "noShow": False,
            "paymentMethod": body.paymentMethod, "idempotencyKey": idempotency_key, "date": body.date,
        }
        db.queue.insert_one(doc)
    return _confirmation(doc)


def _confirmation(doc: dict) -> dict:
    chamber = get_db().chambers.find_one({"_id": doc["chamberId"]}) or {}
    per = chamber.get("minutesPerPatient", 5)
    base = datetime.strptime("10:30", "%H:%M") + timedelta(minutes=max(doc["serialNumber"] - 17, 0) * per)
    return {"appointmentId": doc["_id"], "serialNumber": str(doc["serialNumber"]),
            "estimatedTime": _fmt_time(base)}


@router.get("/queue/{doctor_id}")
def get_queue(doctor_id: str):
    return _queue(doctor_id)


def _set_flag(appointment_id: str, fields: dict) -> dict:
    doc = get_db().queue.find_one_and_update({"_id": appointment_id}, {"$set": fields},
                                             return_document=ReturnDocument.AFTER)
    if doc is None:
        raise _err(404, "Appointment not found")
    return _queue(doc["doctorId"])


@router.post("/queue/{appointment_id}/check-in")
def check_in(appointment_id: str):
    return _set_flag(appointment_id, {"checkedIn": True, "noShow": False})


@router.post("/queue/{appointment_id}/no-show")
def no_show(appointment_id: str):
    return _set_flag(appointment_id, {"noShow": True})


@router.post("/queue/{appointment_id}/restore")
def restore(appointment_id: str):
    return _set_flag(appointment_id, {"noShow": False})


@router.post("/queue/{doctor_id}/call-next")
def call_next(doctor_id: str):
    db = get_db()
    state = db.queue_state.find_one({"_id": doctor_id})
    if state is None:
        raise _err(404, "Doctor not found")
    nxt = db.queue.find_one(
        {"doctorId": doctor_id, "serialNumber": {"$gt": state["nowServing"]}, "noShow": {"$ne": True},
         "checkedIn": True},
        sort=[("serialNumber", 1)],
    )
    if nxt is None:
        raise _err(409, "No checked-in patients waiting")
    db.queue_state.update_one({"_id": doctor_id}, {"$set": {"nowServing": nxt["serialNumber"]}})
    return _queue(doctor_id)

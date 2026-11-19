"""User accounts: register / login / forgot + reset password / profile (GET, PUT /v1/users/me).

Users live in the MongoDB "users" collection (_id = canonical phone number). Passwords are never stored in
plain text: they are hashed with scrypt and a random salt. Login returns an opaque session token (collection
"sessions") that the app sends as `Authorization: Bearer <token>`.

OTP is mocked for the demo: the code is always 123456 (a real deployment would send an SMS).
"""
import hashlib
import hmac
import os
import re
import secrets
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from pymongo.errors import DuplicateKeyError

from .db import get_db

Role = Literal["patient", "doctor", "receptionist", "pharmacist", "hospitalAdmin"]
Gender = Literal["female", "male", "other", ""]

DEMO_OTP = "123456"
DEMO_PASSWORD = "demo123"
MIN_PASSWORD = 6

router = APIRouter(prefix="/v1/auth", tags=["accounts"])
users_router = APIRouter(prefix="/v1/users", tags=["users"])


def _err(status: int, message: str, code: str | None = None):
    error = {"message": message}
    if code:
        error["code"] = code
    return HTTPException(status, detail={"error": error})


# --------------------------------- hashing ---------------------------------

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = stored.split("$")
        if scheme != "scrypt":
            return False
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


# --------------------------------- models ----------------------------------

class ProfileFields(BaseModel):
    """Everything collected at sign-up. Same shape as `Profile` in src/services/data.ts."""
    name: str
    phone: str
    email: str = ""
    age: str = ""
    dob: str = ""
    gender: Gender = ""
    district: str = ""
    area: str = ""
    # patient
    bloodGroup: str = ""
    allergies: str = ""
    chronic: list[str] = []
    emergencyContact: str = ""
    # doctor
    bmdc: str = ""
    departmentId: str = ""
    hospitalId: str = ""
    degrees: str = ""
    fee: str = ""
    # receptionist / pharmacist / hospital admin
    organization: str = ""
    staffId: str = ""
    designation: str = ""


class ProfileIn(ProfileFields):
    role: Role


class RegisterIn(BaseModel):
    password: str
    profile: ProfileIn


class LoginIn(BaseModel):
    identifier: str
    password: str


class ForgotIn(BaseModel):
    identifier: str


class ResetIn(BaseModel):
    identifier: str
    code: str
    newPassword: str


class ProfilePatch(BaseModel):
    """Editable fields only: role and phone cannot change."""
    name: str | None = None
    email: str | None = None
    age: str | None = None
    dob: str | None = None
    gender: Gender | None = None
    district: str | None = None
    area: str | None = None
    bloodGroup: str | None = None
    allergies: str | None = None
    chronic: list[str] | None = None
    emergencyContact: str | None = None
    bmdc: str | None = None
    departmentId: str | None = None
    hospitalId: str | None = None
    degrees: str | None = None
    fee: str | None = None
    organization: str | None = None
    staffId: str | None = None
    designation: str | None = None


class ChangePasswordIn(BaseModel):
    currentPassword: str
    newPassword: str


# --------------------------------- helpers ---------------------------------

def normalize_phone(value: str) -> str | None:
    """'01711000001', '1711000001', '+8801711000001' -> '01711000001'."""
    digits = re.sub(r"\D", "", value)
    if digits.startswith("880"):
        digits = digits[3:]
    if not digits.startswith("0"):
        digits = "0" + digits
    return digits if re.fullmatch(r"01\d{9}", digits) else None


def _valid_email(value: str) -> bool:
    return re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]{2,}", value.strip()) is not None


def _find_user(identifier: str) -> dict | None:
    users = get_db().users
    if "@" in identifier:
        return users.find_one({"emailLower": identifier.strip().lower()})
    phone = normalize_phone(identifier)
    return users.find_one({"_id": phone}) if phone else None


def _new_session(phone: str) -> str:
    token = secrets.token_urlsafe(32)
    get_db().sessions.insert_one({"_id": token, "userId": phone, "createdAt": datetime.now(timezone.utc)})
    return token


def _check_password(password: str):
    if len(password) < MIN_PASSWORD:
        raise _err(400, f"Password must be at least {MIN_PASSWORD} characters", "password_short")


def current_user(authorization: str | None = Header(default=None)) -> dict:
    """Resolve `Authorization: Bearer <token>` to the user document."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _err(401, "Sign in to continue", "unauthorized")
    db = get_db()
    session = db.sessions.find_one({"_id": authorization[7:].strip()})
    user = db.users.find_one({"_id": session["userId"]}) if session else None
    if user is None:
        raise _err(401, "Your session has expired. Please log in again.", "unauthorized")
    return user


def ensure_indexes():
    # One account per email (many accounts may have no email).
    get_db().users.create_index("emailLower", unique=True, partialFilterExpression={"emailLower": {"$type": "string"}})


# ------------------------------- auth routes -------------------------------

@router.post("/register", status_code=201)
def register(body: RegisterIn):
    profile = body.profile.model_dump()
    phone = normalize_phone(profile["phone"])
    if phone is None:
        raise _err(400, "Enter a valid mobile number", "phone_invalid")
    if not profile["name"].strip():
        raise _err(400, "Name is required", "name_required")
    email = profile["email"].strip()
    if email and not _valid_email(email):
        raise _err(400, "Enter a valid email address", "email_invalid")
    _check_password(body.password)
    profile.update(phone=phone, name=profile["name"].strip(), email=email)

    users = get_db().users
    if users.find_one({"_id": phone}):
        raise _err(409, "An account with this phone number already exists", "phone_taken")
    if email and users.find_one({"emailLower": email.lower()}):
        raise _err(409, "An account with this email already exists", "email_taken")
    doc = {
        "_id": phone, "emailLower": email.lower() or None, "role": profile["role"],
        "passwordHash": hash_password(body.password), "profile": profile,
        "createdAt": datetime.now(timezone.utc),
    }
    try:
        users.insert_one(doc)
    except DuplicateKeyError:
        raise _err(409, "An account with these details already exists", "phone_taken")
    return {"token": _new_session(phone), "profile": profile}


@router.post("/login")
def login(body: LoginIn):
    user = _find_user(body.identifier)
    if user is None or not verify_password(body.password, user["passwordHash"]):
        raise _err(401, "Wrong phone number, email or password", "invalid_credentials")
    return {"token": _new_session(user["_id"]), "profile": user["profile"]}


@router.post("/forgot-password")
def forgot_password(body: ForgotIn):
    if _find_user(body.identifier) is None:
        raise _err(404, "No account found with these details", "not_found")
    # Demo: no SMS is sent; the code is always 123456.
    return {"sent": True}


@router.post("/reset-password")
def reset_password(body: ResetIn):
    user = _find_user(body.identifier)
    if user is None:
        raise _err(404, "No account found with these details", "not_found")
    if body.code != DEMO_OTP:
        raise _err(400, "Wrong code", "invalid_code")
    _check_password(body.newPassword)
    db = get_db()
    db.users.update_one({"_id": user["_id"]}, {"$set": {"passwordHash": hash_password(body.newPassword)}})
    db.sessions.delete_many({"userId": user["_id"]})  # log out everywhere
    return {"ok": True}


# ------------------------------- users routes ------------------------------

@users_router.get("/me")
def get_me(authorization: str | None = Header(default=None)):
    return current_user(authorization)["profile"]


@users_router.put("/me")
def update_me(body: ProfilePatch, authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if "name" in changes and not changes["name"].strip():
        raise _err(400, "Name is required", "name_required")
    email = changes.get("email", user["profile"]["email"]).strip()
    if email and not _valid_email(email):
        raise _err(400, "Enter a valid email address", "email_invalid")
    other = get_db().users.find_one({"emailLower": email.lower(), "_id": {"$ne": user["_id"]}}) if email else None
    if other:
        raise _err(409, "An account with this email already exists", "email_taken")
    profile = {**user["profile"], **changes, "email": email}
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"profile": profile, "emailLower": email.lower() or None}})
    return profile


@users_router.post("/me/change-password")
def change_password(body: ChangePasswordIn, authorization: str | None = Header(default=None)):
    user = current_user(authorization)
    if not verify_password(body.currentPassword, user["passwordHash"]):
        raise _err(400, "The current password is wrong", "wrong_password")
    _check_password(body.newPassword)
    get_db().users.update_one({"_id": user["_id"]}, {"$set": {"passwordHash": hash_password(body.newPassword)}})
    return {"ok": True}


# ---------------------------------- seeding --------------------------------

_BASE = {
    "email": "", "age": "", "dob": "", "gender": "", "district": "Dhaka", "area": "Dhanmondi", "bloodGroup": "",
    "allergies": "", "chronic": [], "emergencyContact": "", "bmdc": "", "departmentId": "", "hospitalId": "",
    "degrees": "", "fee": "", "organization": "", "staffId": "", "designation": "",
}
HOSPITAL = "Dhaka Medicare Hospital, Dhanmondi"

# Same phone numbers / names as DEMO_ACCOUNTS in src/services/data.ts (password demo123).
DEMO_USERS = [
    {**_BASE, "role": "patient", "name": "Rahim Uddin", "phone": "01711000001", "email": "rahim@example.com",
     "age": "34", "gender": "male", "bloodGroup": "B+", "emergencyContact": "01811234567"},
    {**_BASE, "role": "doctor", "name": "Dr. Farhana Ahmed", "phone": "01711000002", "email": "farhana@example.com",
     "age": "41", "gender": "female", "bmdc": "A-48213", "departmentId": "medicine", "hospitalId": "dhaka-medicare",
     "degrees": "MBBS, FCPS (Medicine)", "fee": "800"},
    {**_BASE, "role": "receptionist", "name": "Nasrin Akter", "phone": "01711000003", "age": "29", "gender": "female",
     "organization": HOSPITAL, "staffId": "DMH-R-014"},
    {**_BASE, "role": "pharmacist", "name": "Kamal Hossain", "phone": "01711000004", "age": "36", "gender": "male",
     "organization": "Rahman Pharmacy, Dhanmondi", "staffId": "RP-007"},
    {**_BASE, "role": "hospitalAdmin", "name": "Tanvir Rahman", "phone": "01711000005", "age": "45", "gender": "male",
     "organization": HOSPITAL, "designation": "Hospital Manager"},
]


def seed_users() -> int:
    """Add the demo accounts that are missing (safe to run on every start). Returns how many were added."""
    ensure_indexes()
    users = get_db().users
    added = 0
    for profile in DEMO_USERS:
        if users.find_one({"_id": profile["phone"]}) is None:
            users.insert_one({
                "_id": profile["phone"], "emailLower": profile["email"].lower() or None, "role": profile["role"],
                "passwordHash": hash_password(DEMO_PASSWORD), "profile": profile,
                "createdAt": datetime.now(timezone.utc),
            })
            added += 1
    return added

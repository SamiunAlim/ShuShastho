import secrets
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/v1/auth", tags=["auth"])

Role = Literal["patient", "receptionist", "doctor"]
NAMES = {
    "patient": {"en": "Rahim Uddin", "bn": "রহিম উদ্দিন"},
    "receptionist": {"en": "Nasrin Akter", "bn": "নাসরিন আক্তার"},
    "doctor": {"en": "Dr. Farhana Ahmed", "bn": "ডা. ফারহানা আহমেদ"},
}


class DemoLogin(BaseModel):
    role: Role


@router.post("/demo-login")
def demo_login(body: DemoLogin):
    # Demo only: opaque token, not verified on other routes.
    return {"token": f"demo-{body.role}-{secrets.token_hex(8)}", "role": body.role,
            "name": NAMES[body.role]["en"], "nameBn": NAMES[body.role]["bn"]}

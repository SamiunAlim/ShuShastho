from typing import Literal

from pydantic import BaseModel


class AppointmentIn(BaseModel):
    doctorId: str
    chamberId: str
    date: str
    paymentMethod: Literal["cash_at_chamber"] = "cash_at_chamber"

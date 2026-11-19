from typing import Literal

from pydantic import BaseModel, model_validator


class AppointmentIn(BaseModel):
    doctorId: str
    chamberId: str
    date: str
    paymentMethod: Literal["cash_at_chamber", "bkash", "nagad", "card"] = "cash_at_chamber"
    paymentStatus: Literal["paid", "pay_at_chamber"] = "pay_at_chamber"
    transactionId: str | None = None
    amount: int | None = None

    @model_validator(mode="after")
    def _check_payment(self):
        # Demo payments only: no real money, no PIN/OTP/CVV ever reaches the server.
        if self.paymentStatus == "paid":
            if self.paymentMethod == "cash_at_chamber":
                raise ValueError("Cash at chamber cannot be marked paid online")
            if not (self.transactionId or "").startswith("DEMO-"):
                raise ValueError("A demo transaction ID is required for paid appointments")
        elif self.paymentMethod != "cash_at_chamber":
            raise ValueError("Online payment methods must be paid")
        return self

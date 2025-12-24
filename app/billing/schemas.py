from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Invoice(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    appointment_id: str
    amount: float
    currency: str = "USD"
    status: str  # 'pending', 'paid', 'failed'
    payment_method: Optional[str] = None
    created_at: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class InsuranceInfo(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    provider: str
    policy_number: str
    member_id: str
    group_number: Optional[str] = None
    coverage_start: datetime
    coverage_end: Optional[datetime] = None
    is_active: bool = True

    class Config:
        populate_by_name = True


class Payment(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    invoice_id: str
    amount: float
    payment_method: str
    transaction_id: str
    status: str  # 'completed', 'failed', 'refunded'
    created_at: datetime
    refunded_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

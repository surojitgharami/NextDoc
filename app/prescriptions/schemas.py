from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Prescription(BaseModel):
    id: str = Field(alias="_id")
    patient_id: str
    doctor_id: str
    medication_name: str
    dosage: str
    frequency: str
    duration_days: int
    instructions: str
    status: str  # 'active', 'completed', 'cancelled'
    prescribed_date: datetime
    expiry_date: datetime
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class PrescriptionRefill(BaseModel):
    id: str = Field(alias="_id")
    prescription_id: str
    patient_id: str
    requested_at: datetime
    status: str  # 'pending', 'approved', 'rejected'
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

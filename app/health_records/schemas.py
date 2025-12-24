from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class HealthRecord(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    record_type: str  # 'vital', 'lab_result', 'report', 'condition'
    title: str
    description: str
    file_url: Optional[str] = None
    data: dict = {}
    created_at: datetime
    recorded_date: datetime

    class Config:
        populate_by_name = True


class Vital(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    vital_type: str  # 'blood_pressure', 'heart_rate', 'temperature', 'weight', 'height'
    value: float
    unit: str
    recorded_at: datetime

    class Config:
        populate_by_name = True


class MedicalCondition(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    condition_name: str
    status: str  # 'active', 'resolved'
    diagnosed_date: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True


class HealthRecordCreate(BaseModel):
    record_type: str
    title: str
    description: str
    file_url: Optional[str] = None
    data: dict = {}

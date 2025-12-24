"""Health monitoring feature - Track vitals and metrics"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.database import get_database
from app.dependencies import get_current_user
from app.utils.helpers import utc_now
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/features/monitoring", tags=["Features - Health Monitoring"])


class VitalsRequest(BaseModel):
    """Request to record health vitals"""
    heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Heart rate in BPM")
    systolic_bp: Optional[int] = Field(None, ge=60, le=250, description="Systolic blood pressure")
    diastolic_bp: Optional[int] = Field(None, ge=40, le=150, description="Diastolic blood pressure")
    glucose: Optional[float] = Field(None, ge=20, le=600, description="Blood glucose in mg/dL")
    weight: Optional[float] = Field(None, ge=20, le=500, description="Weight in kg")
    temperature: Optional[float] = Field(None, ge=35, le=43, description="Temperature in Celsius")
    notes: Optional[str] = Field(None, max_length=500)


class VitalsResponse(BaseModel):
    """Vitals record response"""
    id: str
    recorded_at: datetime
    heart_rate: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    glucose: Optional[float] = None
    weight: Optional[float] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None


class VitalsHistoryResponse(BaseModel):
    """History of vitals"""
    records: List[VitalsResponse]
    total_records: int


@router.post("/record", response_model=VitalsResponse)
async def record_vitals(
    request: VitalsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Record health vitals and metrics.
    
    Supports:
    - Heart rate
    - Blood pressure (systolic/diastolic)
    - Blood glucose
    - Weight
    - Temperature
    - Notes
    """
    user_id = current_user.get("sub")
    
    vital_doc = {
        "user_id": user_id,
        "recorded_at": utc_now(),
        "heart_rate": request.heart_rate,
        "systolic_bp": request.systolic_bp,
        "diastolic_bp": request.diastolic_bp,
        "glucose": request.glucose,
        "weight": request.weight,
        "temperature": request.temperature,
        "notes": request.notes
    }
    
    result = await db.monitoring.insert_one(vital_doc)
    vital_doc["id"] = str(result.inserted_id)
    
    # Log activity
    vitals_summary = []
    if request.heart_rate:
        vitals_summary.append(f"HR: {request.heart_rate}")
    if request.systolic_bp and request.diastolic_bp:
        vitals_summary.append(f"BP: {request.systolic_bp}/{request.diastolic_bp}")
    if request.glucose:
        vitals_summary.append(f"Glucose: {request.glucose}")
    
    activity_doc = {
        "user_id": user_id,
        "activity_type": "vitals_recorded",
        "description": f"Recorded vitals: {', '.join(vitals_summary)}",
        "created_at": utc_now()
    }
    await db.activities.insert_one(activity_doc)
    
    logger.info(f"Vitals recorded for user {user_id}")
    
    return VitalsResponse(**vital_doc)


@router.get("/history", response_model=VitalsHistoryResponse)
async def get_vitals_history(
    limit: int = 30,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get history of recorded vitals.
    
    Returns records in reverse chronological order (newest first).
    """
    user_id = current_user.get("sub")
    
    cursor = db.monitoring.find(
        {"user_id": user_id}
    ).sort("recorded_at", -1).limit(limit)
    
    records = await cursor.to_list(length=limit)
    
    vitals_list = [
        VitalsResponse(
            id=str(record["_id"]),
            recorded_at=record["recorded_at"],
            heart_rate=record.get("heart_rate"),
            systolic_bp=record.get("systolic_bp"),
            diastolic_bp=record.get("diastolic_bp"),
            glucose=record.get("glucose"),
            weight=record.get("weight"),
            temperature=record.get("temperature"),
            notes=record.get("notes")
        )
        for record in records
    ]
    
    return VitalsHistoryResponse(
        records=vitals_list,
        total_records=len(vitals_list)
    )

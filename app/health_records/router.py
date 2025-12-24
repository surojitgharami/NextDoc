from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
import logging
from .schemas import HealthRecord, HealthRecordCreate, Vital, MedicalCondition

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health-records", tags=["health-records"])

@router.post("/add", response_model=HealthRecord)
async def add_health_record(user_id: str, record: HealthRecordCreate):
    try:
        record_data = {
            "_id": f"record_{datetime.utcnow().timestamp()}",
            "user_id": user_id,
            "record_type": record.record_type,
            "title": record.title,
            "description": record.description,
            "file_url": record.file_url,
            "data": record.data,
            "created_at": datetime.utcnow(),
            "recorded_date": datetime.utcnow(),
        }
        logger.info(f"Health record added for user {user_id}")
        return HealthRecord(**record_data)
    except Exception as e:
        logger.error(f"Error adding health record: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to add health record")

@router.get("/user/{user_id}", response_model=List[HealthRecord])
async def get_user_records(user_id: str):
    try:
        logger.info(f"Fetching health records for user {user_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching health records: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch health records")

@router.post("/vital", response_model=Vital)
async def record_vital(user_id: str, vital: dict):
    try:
        vital_data = {
            "_id": f"vital_{datetime.utcnow().timestamp()}",
            "user_id": user_id,
            "vital_type": vital.get("vital_type"),
            "value": vital.get("value"),
            "unit": vital.get("unit"),
            "recorded_at": datetime.utcnow(),
        }
        logger.info(f"Vital recorded for user {user_id}")
        return Vital(**vital_data)
    except Exception as e:
        logger.error(f"Error recording vital: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to record vital")

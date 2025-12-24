from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


def calculate_next_dose_time(times: List[Dict[str, str]]) -> Optional[datetime]:
    if not times:
        return None
    
    now = datetime.utcnow()
    current_hour = now.hour
    current_minute = now.minute
    
    upcoming_doses = []
    
    for time_slot in times:
        hour = int(time_slot["hour"])
        minute = int(time_slot["minute"])
        period = time_slot["period"]
        
        if period == "PM" and hour != 12:
            hour += 12
        elif period == "AM" and hour == 12:
            hour = 0
        
        dose_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        if dose_time <= now:
            dose_time += timedelta(days=1)
        
        upcoming_doses.append(dose_time)
    
    if upcoming_doses:
        return min(upcoming_doses)
    
    return None


class TimeSlot(BaseModel):
    hour: str
    minute: str
    period: str = Field(..., description="AM or PM")


class MedicineCreate(BaseModel):
    userId: str
    type: str = Field(..., description="capsule, tablet, drops, vitamin")
    name: str = Field(..., min_length=1, max_length=200)
    dosage: str = Field(..., description="e.g., 500mg, 2 tablets")
    strength: Optional[str] = None
    shape: Optional[str] = None
    times: List[TimeSlot] = Field(..., description="Array of time slots")
    duration: str = Field(..., description="Duration of medication")
    frequency: str = Field(..., description="Frequency of medication")
    instruction: str = Field(..., description="before-food, after-meal, bedtime")
    notification: str = "true"
    sound: str = "true"
    vibration: str = "false"


class MedicineUpdate(BaseModel):
    isActive: Optional[str] = None
    notification: Optional[str] = None
    sound: Optional[str] = None
    vibration: Optional[str] = None


class MedicineResponse(BaseModel):
    id: str
    userId: str
    type: str
    name: str
    dosage: str
    strength: Optional[str] = None
    shape: Optional[str] = None
    times: List[Dict[str, str]]
    duration: str
    frequency: str
    instruction: str
    notification: str
    sound: str
    vibration: str
    isActive: str
    nextDoseTime: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=List[MedicineResponse])
async def get_medicines(
    userId: str = Query(..., description="User ID to filter medicines"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    # Convert both to int for consistent comparison (query param is string, JWT user_id is int)
    try:
        user_id_int = int(userId)
    except (ValueError, TypeError):
        user_id_int = userId
    
    try:
        auth_user_id_int = int(user_id)
    except (ValueError, TypeError):
        auth_user_id_int = user_id
    
    logger.info(f"🔍 [GET /api/medicines] Fetching medicines for user: {userId}")
    logger.info(f"   Auth user_id: {user_id} (converted to: {auth_user_id_int})")
    logger.info(f"   Query userId: {userId} (converted to: {user_id_int})")
    
    if user_id_int != auth_user_id_int:
        logger.warning(f"❌ [GET /api/medicines] userId mismatch: {user_id_int} != {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's medicines"
        )
    
    cursor = db.medicines.find(
        {"userId": str(user_id)}
    ).sort("createdAt", -1)
    
    medicines = await cursor.to_list(length=200)
    logger.info(f"   Found {len(medicines)} medicines in DB for user {userId}")
    
    response = [
        MedicineResponse(
            id=str(med["_id"]),
            userId=med["userId"],
            type=med["type"],
            name=med["name"],
            dosage=med["dosage"],
            strength=med.get("strength"),
            shape=med.get("shape"),
            times=med["times"],
            duration=med["duration"],
            frequency=med["frequency"],
            instruction=med["instruction"],
            notification=med.get("notification", "true"),
            sound=med.get("sound", "true"),
            vibration=med.get("vibration", "false"),
            isActive=med.get("isActive", "true"),
            nextDoseTime=calculate_next_dose_time(med["times"]) if med.get("isActive") == "true" else None,
            createdAt=med.get("createdAt", med.get("created_at", utc_now())),
            updatedAt=med.get("updatedAt", med.get("updated_at", utc_now()))
        )
        for med in medicines
    ]
    
    logger.info(f"✅ [GET /api/medicines] Returning {len(response)} medicines")
    return response


@router.post("", response_model=MedicineResponse)
async def create_medicine(
    medicine: MedicineCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    # Convert both to int for consistent comparison
    try:
        medicine_user_id_int = int(medicine.userId)
    except (ValueError, TypeError):
        medicine_user_id_int = medicine.userId
    
    try:
        auth_user_id_int = int(user_id)
    except (ValueError, TypeError):
        auth_user_id_int = user_id
    
    logger.info(f"💊 [POST /api/medicines] Creating medicine for user: {user_id}")
    logger.info(f"   Medicine name: {medicine.name}, type: {medicine.type}")
    logger.info(f"   Request userId: {medicine.userId} (converted to: {medicine_user_id_int})")
    logger.info(f"   Auth user_id: {user_id} (converted to: {auth_user_id_int})")
    
    if medicine_user_id_int != auth_user_id_int:
        logger.warning(f"❌ [POST /api/medicines] userId mismatch: {medicine_user_id_int} != {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create medicine for other users"
        )
    
    med_doc = {
        "userId": str(user_id),
        "type": medicine.type,
        "name": medicine.name,
        "dosage": medicine.dosage,
        "strength": medicine.strength,
        "shape": medicine.shape,
        "times": [t.model_dump() for t in medicine.times],
        "duration": medicine.duration,
        "frequency": medicine.frequency,
        "instruction": medicine.instruction,
        "notification": medicine.notification,
        "sound": medicine.sound,
        "vibration": medicine.vibration,
        "isActive": "true",
        "createdAt": utc_now(),
        "updatedAt": utc_now()
    }
    
    logger.info(f"   Saving to DB with times: {med_doc['times']}")
    result = await db.medicines.insert_one(med_doc)
    logger.info(f"✅ [POST /api/medicines] Saved medicine with _id: {result.inserted_id}")
    
    response = MedicineResponse(
        id=str(result.inserted_id),
        userId=med_doc["userId"],
        type=med_doc["type"],
        name=med_doc["name"],
        dosage=med_doc["dosage"],
        strength=med_doc.get("strength"),
        shape=med_doc.get("shape"),
        times=med_doc["times"],
        duration=med_doc["duration"],
        frequency=med_doc["frequency"],
        instruction=med_doc["instruction"],
        notification=med_doc["notification"],
        sound=med_doc["sound"],
        vibration=med_doc["vibration"],
        isActive=med_doc["isActive"],
        nextDoseTime=calculate_next_dose_time(med_doc["times"]),
        createdAt=med_doc["createdAt"],
        updatedAt=med_doc["updatedAt"]
    )
    logger.info(f"   Response: {response.model_dump()}")
    return response


@router.patch("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: str,
    update_data: MedicineUpdate,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    # Convert both to int for consistent comparison
    try:
        query_user_id_int = int(userId)
    except (ValueError, TypeError):
        query_user_id_int = userId
    
    try:
        auth_user_id_int = int(user_id)
    except (ValueError, TypeError):
        auth_user_id_int = user_id
    
    if query_user_id_int != auth_user_id_int:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's medicines"
        )
    
    try:
        obj_id = ObjectId(medicine_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid medicine ID"
        )
    
    medicine = await db.medicines.find_one({"_id": obj_id})
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    if medicine["userId"] != str(auth_user_id_int):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's medicines"
        )
    
    update_fields = {}
    if update_data.isActive is not None:
        update_fields["isActive"] = update_data.isActive
    if update_data.notification is not None:
        update_fields["notification"] = update_data.notification
    if update_data.sound is not None:
        update_fields["sound"] = update_data.sound
    if update_data.vibration is not None:
        update_fields["vibration"] = update_data.vibration
    
    update_fields["updatedAt"] = utc_now()
    
    await db.medicines.update_one(
        {"_id": obj_id},
        {"$set": update_fields}
    )
    
    updated_med = await db.medicines.find_one({"_id": obj_id})
    
    if not updated_med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found after update"
        )
    
    return MedicineResponse(
        id=str(updated_med["_id"]),
        userId=updated_med["userId"],
        type=updated_med["type"],
        name=updated_med["name"],
        dosage=updated_med["dosage"],
        strength=updated_med.get("strength"),
        shape=updated_med.get("shape"),
        times=updated_med["times"],
        duration=updated_med["duration"],
        frequency=updated_med["frequency"],
        instruction=updated_med["instruction"],
        notification=updated_med.get("notification", "true"),
        sound=updated_med.get("sound", "true"),
        vibration=updated_med.get("vibration", "false"),
        isActive=updated_med.get("isActive", "true"),
        nextDoseTime=calculate_next_dose_time(updated_med["times"]) if updated_med.get("isActive") == "true" else None,
        createdAt=updated_med.get("createdAt", updated_med.get("created_at", utc_now())),
        updatedAt=updated_med.get("updatedAt", updated_med.get("updated_at", utc_now()))
    )


@router.delete("/{medicine_id}")
async def delete_medicine(
    medicine_id: str,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    # Convert both to int for consistent comparison
    try:
        query_user_id_int = int(userId)
    except (ValueError, TypeError):
        query_user_id_int = userId
    
    try:
        auth_user_id_int = int(user_id)
    except (ValueError, TypeError):
        auth_user_id_int = user_id
    
    if query_user_id_int != auth_user_id_int:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's medicines"
        )
    
    try:
        obj_id = ObjectId(medicine_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid medicine ID"
        )
    
    medicine = await db.medicines.find_one({"_id": obj_id})
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    if medicine["userId"] != str(auth_user_id_int):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's medicines"
        )
    
    await db.medicines.delete_one({"_id": obj_id})
    
    return {"message": "Medicine deleted successfully"}

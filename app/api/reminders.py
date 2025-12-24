from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])


class ReminderCreate(BaseModel):
    userId: str
    medicineId: str
    time: str = Field(..., description="HH:MM format")
    date: str = Field(..., description="YYYY-MM-DD format")


class ReminderUpdate(BaseModel):
    status: Optional[str] = None  # pending | completed | missed


class ReminderResponse(BaseModel):
    id: str
    userId: str
    medicineId: str
    time: str
    date: str
    status: str
    createdAt: datetime


@router.get("", response_model=List[ReminderResponse])
async def get_reminders(
    userId: str = Query(..., description="User ID to filter reminders"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's reminders"
        )
    
    cursor = db.reminders.find(
        {"userId": userId}
    ).sort("date", -1).sort("time", -1)
    
    reminders = await cursor.to_list(length=500)
    
    return [
        ReminderResponse(
            id=str(rem["_id"]),
            userId=rem["userId"],
            medicineId=rem["medicineId"],
            time=rem["time"],
            date=rem["date"],
            status=rem.get("status", "pending"),
            createdAt=rem.get("createdAt", utc_now())
        )
        for rem in reminders
    ]


@router.post("", response_model=ReminderResponse)
async def create_reminder(
    reminder: ReminderCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if reminder.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create reminder for other users"
        )
    
    # Verify medicine exists and belongs to user
    try:
        med_obj_id = ObjectId(reminder.medicineId)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid medicine ID"
        )
    
    medicine = await db.medicines.find_one({"_id": med_obj_id, "userId": user_id})
    
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    
    rem_doc = {
        "userId": reminder.userId,
        "medicineId": reminder.medicineId,
        "time": reminder.time,
        "date": reminder.date,
        "status": "pending",
        "createdAt": utc_now()
    }
    
    result = await db.reminders.insert_one(rem_doc)
    
    return ReminderResponse(
        id=str(result.inserted_id),
        userId=rem_doc["userId"],
        medicineId=rem_doc["medicineId"],
        time=rem_doc["time"],
        date=rem_doc["date"],
        status=rem_doc["status"],
        createdAt=rem_doc["createdAt"]
    )


@router.patch("/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(
    reminder_id: str,
    update_data: ReminderUpdate,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's reminders"
        )
    
    try:
        obj_id = ObjectId(reminder_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reminder ID"
        )
    
    reminder = await db.reminders.find_one({"_id": obj_id})
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    if reminder["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's reminders"
        )
    
    update_fields = {}
    if update_data.status is not None:
        update_fields["status"] = update_data.status
    
    await db.reminders.update_one(
        {"_id": obj_id},
        {"$set": update_fields}
    )
    
    updated_rem = await db.reminders.find_one({"_id": obj_id})
    
    if not updated_rem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found after update"
        )
    
    return ReminderResponse(
        id=str(updated_rem["_id"]),
        userId=updated_rem["userId"],
        medicineId=updated_rem["medicineId"],
        time=updated_rem["time"],
        date=updated_rem["date"],
        status=updated_rem.get("status", "pending"),
        createdAt=updated_rem.get("createdAt", utc_now())
    )


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's reminders"
        )
    
    try:
        obj_id = ObjectId(reminder_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reminder ID"
        )
    
    reminder = await db.reminders.find_one({"_id": obj_id})
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    if reminder["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's reminders"
        )
    
    await db.reminders.delete_one({"_id": obj_id})
    
    return {"message": "Reminder deleted successfully"}

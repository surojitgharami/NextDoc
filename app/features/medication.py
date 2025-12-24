"""Medication reminder feature"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List, Optional
from datetime import datetime, time
from app.database import get_database
from app.dependencies import get_current_user
from app.utils.helpers import generate_reminder_id, utc_now
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/features/medication", tags=["Features - Medication"])


class MedicationReminderRequest(BaseModel):
    """Request to create medication reminder"""
    medicine_name: str = Field(..., min_length=1, max_length=200)
    dosage: Optional[str] = Field(None, max_length=100, description="e.g., 500mg, 2 tablets")
    reminder_time: str = Field(..., description="Time in HH:MM format (24-hour)")
    frequency: Optional[str] = Field("daily", description="daily, weekly, as-needed")
    notes: Optional[str] = Field(None, max_length=500)


class MedicationReminderResponse(BaseModel):
    """Medication reminder response"""
    reminder_id: str
    medicine_name: str
    dosage: Optional[str] = None
    reminder_time: str
    frequency: str
    notes: Optional[str] = None
    created_at: datetime
    active: bool = True


class MedicationListResponse(BaseModel):
    """List of medication reminders"""
    reminders: List[MedicationReminderResponse]
    total_reminders: int


@router.post("/reminder", response_model=MedicationReminderResponse)
async def create_reminder(
    request: MedicationReminderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a medication reminder.
    
    Supports:
    - Medicine name and dosage
    - Specific reminder time
    - Frequency (daily, weekly, as-needed)
    - Additional notes
    """
    user_id = current_user.get("sub")
    
    # Validate time format
    try:
        time.fromisoformat(request.reminder_time)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid time format. Use HH:MM (e.g., 09:00, 21:30)"
        )
    
    reminder_id = generate_reminder_id()
    
    reminder_doc = {
        "reminder_id": reminder_id,
        "user_id": user_id,
        "medicine_name": request.medicine_name,
        "dosage": request.dosage,
        "reminder_time": request.reminder_time,
        "frequency": request.frequency,
        "notes": request.notes,
        "active": True,
        "created_at": utc_now()
    }
    
    await db.reminders.insert_one(reminder_doc)
    
    # Log activity
    activity_doc = {
        "user_id": user_id,
        "activity_type": "medication_reminder_created",
        "description": f"Set reminder: {request.medicine_name} at {request.reminder_time}",
        "created_at": utc_now()
    }
    await db.activities.insert_one(activity_doc)
    
    logger.info(f"Medication reminder created for user {user_id}: {request.medicine_name}")
    
    return MedicationReminderResponse(**reminder_doc)


@router.get("/list", response_model=MedicationListResponse)
async def list_reminders(
    active_only: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all medication reminders for the user.
    
    - active_only: If True, returns only active reminders
    """
    user_id = current_user.get("sub")
    
    query = {"user_id": user_id}
    if active_only:
        query["active"] = True
    
    cursor = db.reminders.find(query).sort("reminder_time", 1)
    reminders = await cursor.to_list(length=100)
    
    reminder_list = [
        MedicationReminderResponse(**reminder)
        for reminder in reminders
    ]
    
    return MedicationListResponse(
        reminders=reminder_list,
        total_reminders=len(reminder_list)
    )


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a medication reminder.
    
    Only the owner can delete their reminders.
    """
    user_id = current_user.get("sub")
    
    result = await db.reminders.delete_one({
        "reminder_id": reminder_id,
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found or unauthorized"
        )
    
    logger.info(f"Deleted reminder {reminder_id} for user {user_id}")
    
    return {"message": "Reminder deleted successfully", "reminder_id": reminder_id}


@router.put("/{reminder_id}/toggle")
async def toggle_reminder(
    reminder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Toggle reminder active status"""
    user_id = current_user.get("sub")
    
    reminder = await db.reminders.find_one({
        "reminder_id": reminder_id,
        "user_id": user_id
    })
    
    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found"
        )
    
    new_status = not reminder.get("active", True)
    
    await db.reminders.update_one(
        {"reminder_id": reminder_id},
        {"$set": {"active": new_status}}
    )
    
    return {"message": "Reminder status updated", "active": new_status}

from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now

router = APIRouter(prefix="/api/notification-settings", tags=["Notification Settings"])


class NotificationSettingsUpdate(BaseModel):
    emailNotifications: Optional[str] = None
    pushNotifications: Optional[str] = None
    medicineReminders: Optional[str] = None
    appointmentReminders: Optional[str] = None
    healthAlerts: Optional[str] = None
    newsAndUpdates: Optional[str] = None


class NotificationSettingsResponse(BaseModel):
    id: Optional[str] = None
    userId: str
    emailNotifications: str = "true"
    pushNotifications: str = "true"
    medicineReminders: str = "true"
    appointmentReminders: str = "true"
    healthAlerts: str = "true"
    newsAndUpdates: str = "false"
    updatedAt: datetime


@router.get("", response_model=NotificationSettingsResponse)
async def get_notification_settings(
    userId: str = Query(..., description="User ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get notification settings for user"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's settings"
        )
    
    settings = await db.notificationSettings.find_one({"userId": userId})
    
    if not settings:
        # Return defaults
        return NotificationSettingsResponse(
            userId=userId,
            emailNotifications="true",
            pushNotifications="true",
            medicineReminders="true",
            appointmentReminders="true",
            healthAlerts="true",
            newsAndUpdates="false",
            updatedAt=utc_now()
        )
    
    return NotificationSettingsResponse(
        id=str(settings.get("_id")),
        userId=settings["userId"],
        emailNotifications=settings.get("emailNotifications", "true"),
        pushNotifications=settings.get("pushNotifications", "true"),
        medicineReminders=settings.get("medicineReminders", "true"),
        appointmentReminders=settings.get("appointmentReminders", "true"),
        healthAlerts=settings.get("healthAlerts", "true"),
        newsAndUpdates=settings.get("newsAndUpdates", "false"),
        updatedAt=settings.get("updatedAt", utc_now())
    )


@router.put("", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    update_data: NotificationSettingsUpdate,
    userId: str = Query(..., description="User ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update notification settings"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's settings"
        )
    
    # Build update fields from non-None values
    update_fields = {k: v for k, v in update_data.dict().items() if v is not None}
    update_fields["updatedAt"] = utc_now()
    
    # Check if settings exist
    existing = await db.notificationSettings.find_one({"userId": userId})
    
    if existing:
        # Update existing
        await db.notificationSettings.update_one(
            {"userId": userId},
            {"$set": update_fields}
        )
        settings = await db.notificationSettings.find_one({"userId": userId})
        if not settings:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Settings not found after update"
            )
    else:
        # Create new with defaults + updates
        settings_doc = {
            "userId": userId,
            "emailNotifications": "true",
            "pushNotifications": "true",
            "medicineReminders": "true",
            "appointmentReminders": "true",
            "healthAlerts": "true",
            "newsAndUpdates": "false",
            "updatedAt": utc_now()
        }
        settings_doc.update(update_fields)
        result = await db.notificationSettings.insert_one(settings_doc)
        settings = await db.notificationSettings.find_one({"_id": result.inserted_id})
    
    return NotificationSettingsResponse(
        id=str(settings.get("_id")),
        userId=settings["userId"],
        emailNotifications=settings.get("emailNotifications", "true"),
        pushNotifications=settings.get("pushNotifications", "true"),
        medicineReminders=settings.get("medicineReminders", "true"),
        appointmentReminders=settings.get("appointmentReminders", "true"),
        healthAlerts=settings.get("healthAlerts", "true"),
        newsAndUpdates=settings.get("newsAndUpdates", "false"),
        updatedAt=settings.get("updatedAt", utc_now())
    )

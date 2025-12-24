"""User Notifications API - View and manage notifications"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId
from bson.errors import InvalidId

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class NotificationCreate(BaseModel):
    userId: str
    type: str = Field(..., description="message, appointment, report, achievement, comment, reminder, admin_notification")
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    avatarUrl: Optional[str] = None
    iconType: Optional[str] = None


class NotificationUpdate(BaseModel):
    isRead: str = Field(..., description="true or false")


class NotificationResponse(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    message: str
    avatarUrl: Optional[str] = None
    iconType: Optional[str] = None
    isRead: str
    createdAt: datetime


def notification_to_response(notif: dict) -> NotificationResponse:
    """Convert notification document to response model"""
    return NotificationResponse(
        id=str(notif["_id"]),
        userId=notif.get("userId", ""),
        type=notif.get("type", "general"),
        title=notif.get("title", ""),
        message=notif.get("message", ""),
        avatarUrl=notif.get("avatarUrl"),
        iconType=notif.get("iconType"),
        isRead=notif.get("isRead", "false"),
        createdAt=notif.get("createdAt", notif.get("created_at", utc_now()))
    )


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get all notifications for current user"""
    user_id = str(current_user.get("sub"))
    
    cursor = db.notifications.find(
        {"userId": user_id}
    ).sort("createdAt", -1).limit(100)
    
    notifications = await cursor.to_list(length=100)
    
    return [notification_to_response(notif) for notif in notifications]


@router.get("/unread-count")
async def get_unread_count(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get unread notification count for current user"""
    user_id = str(current_user.get("sub"))
    
    count = await db.notifications.count_documents(
        {"userId": user_id, "isRead": "false"}
    )
    
    return {"count": count, "unreadCount": count}


@router.post("", response_model=NotificationResponse)
async def create_notification(
    notification: NotificationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a notification for current user"""
    user_id = str(current_user.get("sub"))
    
    if notification.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create notification for other users"
        )
    
    notif_doc = {
        "userId": user_id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "avatarUrl": notification.avatarUrl,
        "iconType": notification.iconType,
        "isRead": "false",
        "createdAt": utc_now()
    }
    
    result = await db.notifications.insert_one(notif_doc)
    notif_doc["_id"] = result.inserted_id
    
    logger.info(f"Created notification {result.inserted_id} for user {user_id}")
    
    return notification_to_response(notif_doc)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    update_data: NotificationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark a notification as read/unread"""
    user_id = str(current_user.get("sub"))
    
    try:
        obj_id = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID"
        )
    
    notification = await db.notifications.find_one({"_id": obj_id})
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's notifications"
        )
    
    await db.notifications.update_one(
        {"_id": obj_id},
        {"$set": {"isRead": update_data.isRead}}
    )
    
    updated_notif = await db.notifications.find_one({"_id": obj_id})
    
    if not updated_notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found after update"
        )
    
    return notification_to_response(updated_notif)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read_put(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark a notification as read (PUT method for compatibility)"""
    user_id = str(current_user.get("sub"))
    
    try:
        obj_id = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID"
        )
    
    notification = await db.notifications.find_one({"_id": obj_id})
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's notifications"
        )
    
    await db.notifications.update_one(
        {"_id": obj_id},
        {"$set": {"isRead": "true"}}
    )
    
    updated_notif = await db.notifications.find_one({"_id": obj_id})
    
    if not updated_notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found after update"
        )
    
    return notification_to_response(updated_notif)


@router.post("/mark-read")
async def mark_notification_read_post(
    notification_id: str = Query(..., description="Notification ID to mark as read"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark a specific notification as read (POST method)"""
    user_id = str(current_user.get("sub"))
    
    try:
        obj_id = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID"
        )
    
    notification = await db.notifications.find_one({"_id": obj_id})
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's notifications"
        )
    
    await db.notifications.update_one(
        {"_id": obj_id},
        {"$set": {"isRead": "true"}}
    )
    
    return {"message": "Notification marked as read", "success": True}


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark all notifications as read for current user"""
    user_id = str(current_user.get("sub"))
    
    result = await db.notifications.update_many(
        {"userId": user_id, "isRead": "false"},
        {"$set": {"isRead": "true"}}
    )
    
    logger.info(f"Marked {result.modified_count} notifications as read for user {user_id}")
    
    return {
        "message": "All notifications marked as read",
        "success": True,
        "count": result.modified_count
    }


@router.post("/mark-all-read")
async def mark_all_notifications_read_post(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Mark all notifications as read for current user (POST method)"""
    user_id = str(current_user.get("sub"))
    
    result = await db.notifications.update_many(
        {"userId": user_id, "isRead": "false"},
        {"$set": {"isRead": "true"}}
    )
    
    logger.info(f"Marked {result.modified_count} notifications as read for user {user_id}")
    
    return {
        "message": "All notifications marked as read",
        "success": True,
        "count": result.modified_count
    }


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete a notification"""
    user_id = str(current_user.get("sub"))
    
    try:
        obj_id = ObjectId(notification_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid notification ID"
        )
    
    notification = await db.notifications.find_one({"_id": obj_id})
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification.get("userId") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's notifications"
        )
    
    await db.notifications.delete_one({"_id": obj_id})
    
    return {"message": "Notification deleted successfully", "success": True}

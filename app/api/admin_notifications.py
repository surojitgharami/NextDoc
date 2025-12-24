"""Admin Notifications API - Send emails and notifications to users"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId
import logging
import html

from app.dependencies import get_database
from app.auth.mongo_dependencies import require_admin
from app.utils.helpers import utc_now
from app.email.service import EmailService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/notifications", tags=["Admin Notifications"])

email_service = EmailService()


class NotificationSend(BaseModel):
    user_ids: Optional[List[str]] = Field(None, description="List of user IDs to notify, empty for broadcast")
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=2000)
    via: List[Literal["email", "push"]] = Field(default=["email"], description="Send via email and/or push")


class NotificationResponse(BaseModel):
    id: str
    title: str
    body: str
    sent_via: List[str]
    user_count: int
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None


async def create_audit_log(
    db: AsyncIOMotorDatabase,
    actor_id: str,
    action: str,
    details: Dict[str, Any]
):
    """Create an audit log entry"""
    try:
        log_entry = {
            "actor_id": ObjectId(actor_id),
            "action": action,
            "details": details,
            "created_at": utc_now()
        }
        await db.audit_logs.insert_one(log_entry)
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")


async def send_notification_emails(
    db: AsyncIOMotorDatabase,
    notification_id: str,
    user_emails: List[str],
    title: str,
    body: str
):
    """Background task to send notification emails"""
    try:
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">{html.escape(title)}</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">{html.escape(body)}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">This is a notification from AI Doctor 3.0</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        success_count = 0
        failed_count = 0
        
        for email in user_emails:
            try:
                sent = await email_service.send_email(
                    to_email=email,
                    subject=title,
                    html_content=html_body
                )
                if sent:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {email}: {e}")
                failed_count += 1
        
        status_val = "sent" if failed_count == 0 else ("partial" if success_count > 0 else "failed")
        
        await db.admin_notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {
                "status": status_val,
                "sent_at": utc_now(),
                "success_count": success_count,
                "failed_count": failed_count
            }}
        )
        
        logger.info(f"Notification {notification_id}: sent to {success_count} users, {failed_count} failed")
        
    except Exception as e:
        logger.error(f"Error in send_notification_emails: {e}")
        await db.admin_notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"status": "failed", "error": str(e)}}
        )


@router.post("/send", response_model=NotificationResponse)
async def send_admin_notification(
    payload: NotificationSend,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Send notification/email to specific users or broadcast to all"""
    admin_id = current_user.get("sub")
    
    user_emails = []
    user_count = 0
    
    if payload.user_ids and len(payload.user_ids) > 0:
        for uid in payload.user_ids:
            try:
                user = await db.users.find_one({"_id": ObjectId(uid)})
                if user and user.get("email"):
                    user_emails.append(user["email"])
            except InvalidId:
                continue
        user_count = len(user_emails)
    else:
        cursor = db.users.find({"is_active": True, "email": {"$exists": True}}, {"email": 1})
        async for user in cursor:
            if user.get("email"):
                user_emails.append(user["email"])
        user_count = len(user_emails)
    
    if user_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid users found to send notification"
        )
    
    notification_doc = {
        "user_ids": [ObjectId(uid) for uid in payload.user_ids] if payload.user_ids else [],
        "is_broadcast": not payload.user_ids or len(payload.user_ids) == 0,
        "title": html.escape(payload.title),
        "body": html.escape(payload.body),
        "sent_via": payload.via,
        "created_by": ObjectId(admin_id),
        "created_at": utc_now(),
        "sent_at": None,
        "status": "pending",
        "user_count": user_count
    }
    
    result = await db.admin_notifications.insert_one(notification_doc)
    notification_id = str(result.inserted_id)
    
    if "push" in payload.via:
        if payload.user_ids and len(payload.user_ids) > 0:
            for uid in payload.user_ids:
                try:
                    notif_doc = {
                        "userId": uid,
                        "type": "admin_notification",
                        "title": html.escape(payload.title),
                        "message": html.escape(payload.body),
                        "isRead": "false",
                        "createdAt": utc_now()
                    }
                    await db.notifications.insert_one(notif_doc)
                except Exception as e:
                    logger.error(f"Failed to create push notification for {uid}: {e}")
        else:
            cursor = db.users.find({"is_active": True}, {"_id": 1})
            async for user in cursor:
                try:
                    notif_doc = {
                        "userId": str(user["_id"]),
                        "type": "admin_notification",
                        "title": html.escape(payload.title),
                        "message": html.escape(payload.body),
                        "isRead": "false",
                        "createdAt": utc_now()
                    }
                    await db.notifications.insert_one(notif_doc)
                except Exception as e:
                    logger.error(f"Failed to create push notification for {user['_id']}: {e}")
    
    if "email" in payload.via:
        background_tasks.add_task(
            send_notification_emails,
            db,
            notification_id,
            user_emails,
            payload.title,
            payload.body
        )
    else:
        await db.admin_notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"status": "sent", "sent_at": utc_now()}}
        )
    
    await create_audit_log(
        db,
        admin_id,
        "admin_notification_sent",
        {
            "notification_id": notification_id,
            "title": payload.title,
            "user_count": user_count,
            "via": payload.via,
            "is_broadcast": not payload.user_ids
        }
    )
    
    return NotificationResponse(
        id=notification_id,
        title=notification_doc["title"],
        body=notification_doc["body"],
        sent_via=notification_doc["sent_via"],
        user_count=user_count,
        status="pending" if "email" in payload.via else "sent",
        created_at=notification_doc["created_at"],
        sent_at=notification_doc.get("sent_at")
    )


@router.get("/history")
async def get_notification_history(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get history of admin-sent notifications"""
    cursor = db.admin_notifications.find().sort("created_at", -1).skip(skip).limit(limit)
    notifications = await cursor.to_list(length=limit)
    
    result = []
    for notif in notifications:
        admin = await db.users.find_one({"_id": notif.get("created_by")})
        admin_email = admin.get("email") if admin else "Unknown"
        
        result.append({
            "id": str(notif["_id"]),
            "title": notif["title"],
            "body": notif["body"][:100] + "..." if len(notif["body"]) > 100 else notif["body"],
            "sent_via": notif.get("sent_via", []),
            "user_count": notif.get("user_count", 0),
            "is_broadcast": notif.get("is_broadcast", False),
            "status": notif.get("status", "unknown"),
            "created_by_email": admin_email,
            "created_at": notif["created_at"].isoformat() if notif.get("created_at") else None,
            "sent_at": notif["sent_at"].isoformat() if notif.get("sent_at") else None
        })
    
    total = await db.admin_notifications.count_documents({})
    
    return {
        "notifications": result,
        "skip": skip,
        "limit": limit,
        "total": total
    }

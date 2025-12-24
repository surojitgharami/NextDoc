"""Message Reporting API - Report AI responses for review"""
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, status, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from bson.errors import InvalidId
import logging
import html

from app.dependencies import get_current_user, get_database
from app.auth.mongo_dependencies import require_admin
from app.utils.helpers import utc_now

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/message-reports", tags=["Message Reports"])

RATE_LIMIT_REPORTS_PER_HOUR = 10


class ReportCreate(BaseModel):
    message_id: str = Field(..., description="ID of the message being reported")
    session_id: str = Field(..., description="Chat session ID")
    reason: Literal["incorrect_info", "offensive", "privacy", "other"] = Field(..., description="Report reason")
    comment: Optional[str] = Field(None, max_length=1000, description="Optional user comment")


class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    message_id: str
    session_id: str
    message_text: str
    reason: str
    comment: Optional[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    admin_action: Optional[Dict[str, Any]] = None


class AdminReportReview(BaseModel):
    status: Literal["reviewed", "dismissed", "actioned"] = Field(..., description="New status")
    admin_action: Optional[Dict[str, Any]] = Field(None, description="Admin action details")
    notify_user: bool = Field(False, description="Send notification to reporting user")
    notification_text: Optional[str] = Field(None, max_length=500, description="Notification message")


async def check_rate_limit(user_id: str, db: AsyncIOMotorDatabase) -> bool:
    """Check if user has exceeded report rate limit"""
    one_hour_ago = datetime.utcnow() - __import__('datetime').timedelta(hours=1)
    
    count = await db.message_reports.count_documents({
        "reporter_id": ObjectId(user_id),
        "created_at": {"$gte": one_hour_ago}
    })
    
    return count < RATE_LIMIT_REPORTS_PER_HOUR


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


@router.post("", response_model=ReportResponse)
async def create_message_report(
    payload: ReportCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create a new message report"""
    user_id = current_user.get("sub")
    
    if not await check_rate_limit(user_id, db):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    message = None
    message_text = ""
    
    try:
        msg_id = ObjectId(payload.message_id)
        message = await db.messages.find_one({"_id": msg_id})
        if message:
            message_text = message.get("content", message.get("text", ""))[:1000]
    except InvalidId:
        pass
    
    if not message:
        try:
            chats = await db.chats.find_one({"session_id": payload.session_id})
            if chats and chats.get("messages"):
                for msg in chats["messages"]:
                    if str(msg.get("_id", "")) == payload.message_id or msg.get("timestamp") == payload.message_id:
                        message_text = msg.get("content", "")[:1000]
                        break
        except Exception:
            pass
    
    if not message_text:
        message_text = "[Message content unavailable]"
    
    comment_sanitized = html.escape(payload.comment) if payload.comment else None
    
    report_doc = {
        "reporter_id": ObjectId(user_id),
        "message_id": payload.message_id,
        "session_id": payload.session_id,
        "message_text": message_text,
        "reason": payload.reason,
        "comment": comment_sanitized,
        "status": "open",
        "assigned_to": None,
        "created_at": utc_now(),
        "reviewed_at": None,
        "admin_action": None
    }
    
    result = await db.message_reports.insert_one(report_doc)
    
    logger.info(f"Message report created: {result.inserted_id} by user {user_id}")
    
    await create_audit_log(
        db,
        user_id,
        "message_report_created",
        {
            "report_id": str(result.inserted_id),
            "reason": payload.reason,
            "message_id": payload.message_id
        }
    )
    
    return ReportResponse(
        id=str(result.inserted_id),
        reporter_id=str(report_doc["reporter_id"]),
        message_id=report_doc["message_id"],
        session_id=report_doc["session_id"],
        message_text=report_doc["message_text"],
        reason=report_doc["reason"],
        comment=report_doc["comment"],
        status=report_doc["status"],
        created_at=report_doc["created_at"]
    )


@router.get("/mine", response_model=List[ReportResponse])
async def get_my_reports(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's submitted reports"""
    user_id = current_user.get("sub")
    
    try:
        user_oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    cursor = db.message_reports.find({"reporter_id": user_oid}).sort("created_at", -1).limit(50)
    reports = await cursor.to_list(length=50)
    
    return [
        ReportResponse(
            id=str(report["_id"]),
            reporter_id=str(report["reporter_id"]),
            message_id=report["message_id"],
            session_id=report["session_id"],
            message_text=report["message_text"],
            reason=report["reason"],
            comment=report.get("comment"),
            status=report["status"],
            created_at=report["created_at"],
            reviewed_at=report.get("reviewed_at"),
            admin_action=report.get("admin_action")
        )
        for report in reports
    ]


router_admin = APIRouter(prefix="/api/admin/message-reports", tags=["Admin Message Reports"])


@router_admin.get("")
async def admin_list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    reason_filter: Optional[str] = Query(None, alias="reason"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: List all message reports with filtering"""
    query: Dict[str, Any] = {}
    
    if status_filter:
        query["status"] = status_filter
    if reason_filter:
        query["reason"] = reason_filter
    
    cursor = db.message_reports.find(query).sort("created_at", -1).skip(skip).limit(limit)
    reports = await cursor.to_list(length=limit)
    
    result = []
    for report in reports:
        reporter = await db.users.find_one({"_id": report["reporter_id"]})
        reporter_email = reporter.get("email", "Unknown") if reporter else "Unknown"
        
        result.append({
            "id": str(report["_id"]),
            "reporter_id": str(report["reporter_id"]),
            "reporter_email": reporter_email,
            "message_id": report["message_id"],
            "session_id": report["session_id"],
            "message_text": report["message_text"][:200] + "..." if len(report["message_text"]) > 200 else report["message_text"],
            "full_message_text": report["message_text"],
            "reason": report["reason"],
            "comment": report.get("comment"),
            "status": report["status"],
            "created_at": report["created_at"].isoformat() if report.get("created_at") else None,
            "reviewed_at": report["reviewed_at"].isoformat() if report.get("reviewed_at") else None,
            "admin_action": report.get("admin_action")
        })
    
    total = await db.message_reports.count_documents(query)
    
    return {
        "reports": result,
        "skip": skip,
        "limit": limit,
        "total": total
    }


@router_admin.get("/{report_id}")
async def admin_get_report(
    report_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Get detailed report information"""
    try:
        report_oid = ObjectId(report_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report ID"
        )
    
    report = await db.message_reports.find_one({"_id": report_oid})
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    reporter = await db.users.find_one({"_id": report["reporter_id"]})
    
    session_messages = []
    try:
        chats = await db.chats.find_one({"session_id": report["session_id"]})
        if chats and chats.get("messages"):
            session_messages = [
                {
                    "role": msg.get("role"),
                    "content": msg.get("content", "")[:500],
                    "timestamp": msg.get("timestamp")
                }
                for msg in chats["messages"][-10:]
            ]
    except Exception:
        pass
    
    return {
        "id": str(report["_id"]),
        "reporter": {
            "id": str(report["reporter_id"]),
            "email": reporter.get("email") if reporter else "Unknown",
            "full_name": reporter.get("full_name") if reporter else "Unknown"
        },
        "message_id": report["message_id"],
        "session_id": report["session_id"],
        "message_text": report["message_text"],
        "reason": report["reason"],
        "comment": report.get("comment"),
        "status": report["status"],
        "created_at": report["created_at"].isoformat() if report.get("created_at") else None,
        "reviewed_at": report["reviewed_at"].isoformat() if report.get("reviewed_at") else None,
        "admin_action": report.get("admin_action"),
        "session_context": session_messages
    }


@router_admin.post("/{report_id}/review")
async def admin_review_report(
    report_id: str,
    review: AdminReportReview,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Review and take action on a report"""
    try:
        report_oid = ObjectId(report_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report ID"
        )
    
    report = await db.message_reports.find_one({"_id": report_oid})
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found"
        )
    
    admin_id = current_user.get("sub")
    
    update_data = {
        "status": review.status,
        "reviewed_at": utc_now(),
        "reviewed_by": ObjectId(admin_id),
        "admin_action": review.admin_action
    }
    
    await db.message_reports.update_one({"_id": report_oid}, {"$set": update_data})
    
    if review.notify_user and review.notification_text:
        notification_doc = {
            "userId": str(report["reporter_id"]),
            "type": "report_response",
            "title": "Report Update",
            "message": html.escape(review.notification_text),
            "isRead": "false",
            "createdAt": utc_now()
        }
        await db.notifications.insert_one(notification_doc)
        logger.info(f"Notification sent to user {report['reporter_id']} for report {report_id}")
    
    if review.admin_action and review.admin_action.get("type") == "delete_message":
        try:
            await db.messages.update_one(
                {"_id": ObjectId(report["message_id"])},
                {"$set": {"deleted": True, "deleted_by": admin_id, "deleted_at": utc_now()}}
            )
        except Exception as e:
            logger.warning(f"Could not delete message: {e}")
    
    await create_audit_log(
        db,
        admin_id,
        "message_report_reviewed",
        {
            "report_id": report_id,
            "new_status": review.status,
            "action": review.admin_action,
            "notified_user": review.notify_user
        }
    )
    
    return {"ok": True, "message": "Report reviewed successfully"}


@router_admin.get("/stats/summary")
async def admin_reports_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Get report statistics summary"""
    status_counts = {}
    for s in ["open", "reviewed", "dismissed", "actioned"]:
        status_counts[s] = await db.message_reports.count_documents({"status": s})
    
    reason_counts = {}
    for r in ["incorrect_info", "offensive", "privacy", "other"]:
        reason_counts[r] = await db.message_reports.count_documents({"reason": r})
    
    total = sum(status_counts.values())
    
    return {
        "total": total,
        "by_status": status_counts,
        "by_reason": reason_counts
    }

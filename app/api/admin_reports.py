"""Admin Reports API - Real-time platform analytics and metrics"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.dependencies import get_current_user, get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin/reports", tags=["Admin Reports"])


class ReportCardResponse(BaseModel):
    id: str
    title: str
    description: str
    metric_key: str
    icon: str
    value: Optional[str] = None


class ActivityItem(BaseModel):
    label: str
    value: str
    trend: Optional[str] = None


class SystemActivityResponse(BaseModel):
    items: List[ActivityItem]


class SystemSummaryResponse(BaseModel):
    total_users: int
    active_subscriptions: int
    chat_sessions_30d: int
    total_messages: int
    verified_users: int
    medicine_reminders: int


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Ensure user has admin role"""
    roles = current_user.get("roles", [])
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


@router.get("/summary", response_model=SystemSummaryResponse)
async def get_system_summary(
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: Dict[str, Any] = Depends(require_admin)
):
    """Get high-level system metrics summary"""
    try:
        users_coll = db["users"]
        conversations_coll = db["conversations"]
        messages_coll = db["messages"]
        medicines_coll = db["medicines"]
        
        since_30d = datetime.utcnow() - timedelta(days=30)
        
        total_users = await users_coll.count_documents({})
        
        active_subscriptions = await users_coll.count_documents({
            "$or": [
                {"subscription.status": "active"},
                {"subscription.plan": {"$in": ["monthly", "annual"]}}
            ]
        })
        
        chat_sessions_30d = await conversations_coll.count_documents({
            "created_at": {"$gte": since_30d}
        })
        
        total_messages = await messages_coll.count_documents({})
        
        verified_users = await users_coll.count_documents({
            "email_verified": True
        })
        
        medicine_reminders = await medicines_coll.count_documents({})
        
        return SystemSummaryResponse(
            total_users=total_users,
            active_subscriptions=active_subscriptions,
            chat_sessions_30d=chat_sessions_30d,
            total_messages=total_messages,
            verified_users=verified_users,
            medicine_reminders=medicine_reminders
        )
    except Exception as e:
        logger.error(f"Error fetching system summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system summary"
        )


@router.get("/cards", response_model=List[ReportCardResponse])
async def get_report_cards(
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: Dict[str, Any] = Depends(require_admin)
):
    """Get report cards with real metrics"""
    try:
        users_coll = db["users"]
        conversations_coll = db["conversations"]
        medicines_coll = db["medicines"]
        
        since_30d = datetime.utcnow() - timedelta(days=30)
        
        new_users_30d = await users_coll.count_documents({
            "created_at": {"$gte": since_30d}
        })
        
        active_subs = await users_coll.count_documents({
            "$or": [
                {"subscription.status": "active"},
                {"subscription.plan": {"$in": ["monthly", "annual"]}}
            ]
        })
        
        total_sessions = await conversations_coll.count_documents({})
        
        total_medicines = await medicines_coll.count_documents({})
        
        current_month = datetime.utcnow().strftime("%b %Y")
        
        message_reports_coll = db["message_reports"]
        total_reports = await message_reports_coll.count_documents({})
        pending_reports = await message_reports_coll.count_documents({"status": "pending"})
        
        total_users = await users_coll.count_documents({})
        
        return [
            ReportCardResponse(
                id="user_growth",
                title="User Growth Report",
                description=f"New registrations (30 days): {new_users_30d} | Total users: {total_users}",
                metric_key="user_growth",
                icon="TrendingUp",
                value=f"+{new_users_30d}"
            ),
            ReportCardResponse(
                id="subscription_usage",
                title="Subscription & Usage Report",
                description=f"Active paid subscriptions across all tiers",
                metric_key="subscription_usage",
                icon="CreditCard",
                value=str(active_subs)
            ),
            ReportCardResponse(
                id="moderation_reports",
                title="Content Moderation",
                description=f"User-submitted AI message reports | Pending: {pending_reports}",
                metric_key="moderation_reports",
                icon="Activity",
                value=str(total_reports)
            ),
            ReportCardResponse(
                id="user_engagement",
                title="User Engagement",
                description=f"Total chat sessions: {total_sessions} | Medicine reminders: {total_medicines}",
                metric_key="user_engagement",
                icon="MessageSquare",
                value=str(total_sessions)
            ),
        ]
    except Exception as e:
        logger.error(f"Error fetching report cards: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch report cards"
        )


@router.get("/activity", response_model=SystemActivityResponse)
async def get_system_activity(
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: Dict[str, Any] = Depends(require_admin)
):
    """Get system activity metrics for dashboard"""
    try:
        users_coll = db["users"]
        conversations_coll = db["conversations"]
        messages_coll = db["messages"]
        medicines_coll = db["medicines"]
        
        since_30d = datetime.utcnow() - timedelta(days=30)
        since_7d = datetime.utcnow() - timedelta(days=7)
        
        new_users_30d = await users_coll.count_documents({
            "created_at": {"$gte": since_30d}
        })
        
        active_subscriptions = await users_coll.count_documents({
            "$or": [
                {"subscription.status": "active"},
                {"subscription.plan": {"$in": ["monthly", "annual"]}}
            ]
        })
        
        chat_sessions_total = await conversations_coll.count_documents({})
        chat_sessions_7d = await conversations_coll.count_documents({
            "created_at": {"$gte": since_7d}
        })
        
        total_messages = await messages_coll.count_documents({})
        
        medicine_reminders = await medicines_coll.count_documents({})
        
        verified_users = await users_coll.count_documents({"email_verified": True})
        
        message_reports_coll = db["message_reports"]
        pending_reports = await message_reports_coll.count_documents({"status": "pending"})
        
        total_users = await users_coll.count_documents({})
        
        return SystemActivityResponse(
            items=[
                ActivityItem(
                    label="New users (30 days)",
                    value=f"+{new_users_30d}",
                    trend="up" if new_users_30d > 0 else "neutral"
                ),
                ActivityItem(
                    label="Total registered users",
                    value=f"{total_users:,}",
                    trend="up" if total_users > 0 else "neutral"
                ),
                ActivityItem(
                    label="Active subscriptions",
                    value=str(active_subscriptions),
                    trend="up" if active_subscriptions > 0 else "neutral"
                ),
                ActivityItem(
                    label="Chat sessions (total)",
                    value=f"{chat_sessions_total:,}",
                    trend="up"
                ),
                ActivityItem(
                    label="Chat sessions (7 days)",
                    value=f"+{chat_sessions_7d}",
                    trend="up" if chat_sessions_7d > 0 else "neutral"
                ),
                ActivityItem(
                    label="Total AI messages",
                    value=f"{total_messages:,}",
                    trend="up"
                ),
                ActivityItem(
                    label="Medicine reminders",
                    value=str(medicine_reminders),
                    trend="neutral"
                ),
                ActivityItem(
                    label="Verified users",
                    value=str(verified_users),
                    trend="up" if verified_users > 0 else "neutral"
                ),
                ActivityItem(
                    label="Pending moderation reports",
                    value=str(pending_reports),
                    trend="neutral" if pending_reports == 0 else "up"
                ),
            ]
        )
    except Exception as e:
        logger.error(f"Error fetching system activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system activity"
        )


@router.get("/download/{report_id}")
async def download_report(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    admin: Dict[str, Any] = Depends(require_admin)
):
    """Generate and return report data as JSON (can be extended to CSV)"""
    try:
        users_coll = db["users"]
        conversations_coll = db["conversations"]
        messages_coll = db["messages"]
        medicines_coll = db["medicines"]
        
        since_30d = datetime.utcnow() - timedelta(days=30)
        
        if report_id == "user_growth":
            pipeline = [
                {"$match": {"created_at": {"$gte": since_30d}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1}
                }},
                {"$sort": {"_id": 1}}
            ]
            data = await users_coll.aggregate(pipeline).to_list(length=100)
            return {
                "report_id": report_id,
                "title": "User Growth Report",
                "period": "Last 30 days",
                "data": data,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        elif report_id == "subscription_usage":
            pipeline = [
                {"$group": {
                    "_id": "$subscription.plan",
                    "count": {"$sum": 1}
                }}
            ]
            data = await users_coll.aggregate(pipeline).to_list(length=100)
            return {
                "report_id": report_id,
                "title": "Subscription & Usage Report",
                "data": data,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        elif report_id == "moderation_reports":
            message_reports_coll = db["message_reports"]
            
            status_pipeline = [
                {"$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }}
            ]
            status_data = await message_reports_coll.aggregate(status_pipeline).to_list(length=100)
            
            reason_pipeline = [
                {"$group": {
                    "_id": "$reason",
                    "count": {"$sum": 1}
                }}
            ]
            reason_data = await message_reports_coll.aggregate(reason_pipeline).to_list(length=100)
            
            total_reports = await message_reports_coll.count_documents({})
            
            return {
                "report_id": report_id,
                "title": "Content Moderation Report",
                "total_reports": total_reports,
                "by_status": status_data,
                "by_reason": reason_data,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        elif report_id == "user_engagement":
            total_sessions = await conversations_coll.count_documents({})
            total_messages = await messages_coll.count_documents({})
            total_medicines = await medicines_coll.count_documents({})
            
            return {
                "report_id": report_id,
                "title": "User Engagement Report",
                "total_chat_sessions": total_sessions,
                "total_messages": total_messages,
                "medicine_reminders": total_medicines,
                "generated_at": datetime.utcnow().isoformat()
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{report_id}' not found"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report {report_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate report"
        )

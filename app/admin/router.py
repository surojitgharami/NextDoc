"""Admin Dashboard API Routes - MongoDB-based (no doctor role)"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.auth.mongo_dependencies import require_admin, get_auth_service
from app.auth.mongo_service import MongoAuthService
from app.dependencies import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from bson.errors import InvalidId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_admin_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get dashboard statistics for admin"""
    try:
        total_users = await db.users.count_documents({"is_active": True})
        
        active_subscriptions = await db.users.count_documents({
            "subscription.status": {"$in": ["active", "trial"]}
        })
        
        verified_users = await db.users.count_documents({"email_verified": True})
        
        total_conversations = await db.conversations.count_documents({})
        
        total_messages = await db.messages.count_documents({})
        
        return {
            "total_users": total_users or 0,
            "active_subscriptions": active_subscriptions or 0,
            "verified_users": verified_users or 0,
            "total_conversations": total_conversations or 0,
            "total_messages": total_messages or 0
        }
    except Exception as e:
        logger.error(f"Error fetching admin stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch admin statistics"
        )


@router.get("/users/count")
async def get_users_count(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get total active users count"""
    try:
        count = await db.users.count_documents({"is_active": True})
        return {"count": count or 0}
    except Exception as e:
        logger.error(f"Error fetching users count: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users count"
        )


@router.get("/subscriptions/stats")
async def get_subscription_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get subscription statistics"""
    try:
        plan_stats = {}
        for plan in ["free", "monthly", "annual"]:
            count = await db.users.count_documents({"subscription.plan": plan})
            plan_stats[plan] = count
        
        status_stats = {}
        for sub_status in ["active", "trial", "expired", "cancelled"]:
            count = await db.users.count_documents({"subscription.status": sub_status})
            status_stats[sub_status] = count
        
        return {
            "by_plan": plan_stats,
            "by_status": status_stats
        }
    except Exception as e:
        logger.error(f"Error fetching subscription stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription statistics"
        )


@router.get("/system-health")
async def get_system_health(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get system health status"""
    try:
        await db.command('ping')
        
        return {
            "status": "healthy",
            "database": "connected",
            "uptime_percentage": 100.0
        }
    except Exception as e:
        logger.error(f"Error checking system health: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "uptime_percentage": 0.0
        }


@router.get("/recent-users")
async def get_recent_users(
    limit: int = 10,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get recently registered users"""
    try:
        cursor = db.users.find(
            {},
            {"password_hash": 0}
        ).sort("created_at", -1).limit(limit)
        
        users = []
        async for user in cursor:
            user['id'] = str(user['_id'])
            del user['_id']
            users.append(user)
        
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching recent users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch recent users"
        )


@router.get("/activity-summary")
async def get_activity_summary(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get activity summary for admin dashboard"""
    try:
        from datetime import datetime, timedelta
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        today_users = await db.users.count_documents({
            "created_at": {"$gte": today}
        })
        
        week_users = await db.users.count_documents({
            "created_at": {"$gte": week_ago}
        })
        
        today_messages = await db.messages.count_documents({
            "timestamp": {"$gte": today}
        })
        
        week_messages = await db.messages.count_documents({
            "timestamp": {"$gte": week_ago}
        })
        
        return {
            "new_users_today": today_users,
            "new_users_this_week": week_users,
            "messages_today": today_messages,
            "messages_this_week": week_messages
        }
    except Exception as e:
        logger.error(f"Error fetching activity summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch activity summary"
        )


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get audit logs with filtering and pagination"""
    try:
        query: dict = {}
        
        if action:
            query["action"] = action
        if actor_id:
            try:
                query["actor_id"] = ObjectId(actor_id)
            except InvalidId:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid actor_id format"
                )
        
        logs = await db.audit_logs.find(query).sort(
            "created_at", -1
        ).skip(skip).limit(limit).to_list(length=limit)
        
        for log in logs:
            log['id'] = str(log.get('_id', ''))
            log.pop('_id', None)
            if log.get('actor_id'):
                actor_oid = log['actor_id']
                log['actor_id'] = str(actor_oid)
                actor = await db.users.find_one({"_id": actor_oid})
                log['actor_email'] = actor.get('email') if actor else 'Unknown'
                log['actor_name'] = actor.get('full_name') if actor else 'Unknown'
        
        total = await db.audit_logs.count_documents(query)
        
        return {
            "logs": logs,
            "skip": skip,
            "limit": limit,
            "total": total
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit logs"
        )


@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Get detailed user information including activity stats"""
    try:
        try:
            oid = ObjectId(user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format"
            )
        
        user = await auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.pop('password_hash', None)
        
        conversation_count = await db.conversations.count_documents({"userId": user_id})
        message_count = await db.messages.count_documents({"userId": user_id})
        medicine_count = await db.medicines.count_documents({"userId": user_id})
        
        last_activity = None
        last_message = await db.messages.find_one(
            {"userId": user_id},
            sort=[("timestamp", -1)]
        )
        if last_message:
            last_activity = last_message.get('timestamp')
        
        audit_logs = await db.audit_logs.find(
            {"$or": [{"actor_id": oid}, {"target": {"$regex": user_id}}]}
        ).sort("created_at", -1).limit(10).to_list(length=10)
        
        for log in audit_logs:
            log['id'] = str(log.get('_id', ''))
            log.pop('_id', None)
            if log.get('actor_id'):
                log['actor_id'] = str(log['actor_id'])
        
        return {
            "user": user,
            "stats": {
                "conversation_count": conversation_count,
                "message_count": message_count,
                "medicine_count": medicine_count,
                "last_activity": last_activity
            },
            "recent_audit_logs": audit_logs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    days: int = Query(7, ge=1, le=90),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get user activity over time"""
    try:
        since = datetime.utcnow() - timedelta(days=days)
        
        messages_by_day = []
        cursor = db.messages.aggregate([
            {"$match": {"userId": user_id, "timestamp": {"$gte": since}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ])
        
        async for doc in cursor:
            messages_by_day.append({
                "date": doc['_id'],
                "count": doc['count']
            })
        
        symptom_checks = await db.conversations.count_documents({
            "userId": user_id,
            "mode": "symptom_checker",
            "createdAt": {"$gte": since}
        })
        
        return {
            "user_id": user_id,
            "period_days": days,
            "messages_by_day": messages_by_day,
            "total_messages": sum(d['count'] for d in messages_by_day),
            "symptom_checks": symptom_checks
        }
    except Exception as e:
        logger.error(f"Error fetching user activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user activity"
        )

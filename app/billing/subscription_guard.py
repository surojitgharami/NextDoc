"""Subscription Guard Middleware - Protect premium features"""
from fastapi import Depends, HTTPException
from starlette import status as http_status
from functools import wraps
from datetime import datetime
from typing import Optional, Callable
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.auth.mongo_dependencies import get_current_user
from app.dependencies import get_database
from .razorpay_service import FREE_TIER_LIMITS
import logging

logger = logging.getLogger(__name__)


class SubscriptionGuard:
    """Guard for checking subscription status and enforcing limits"""
    
    @staticmethod
    async def check_active_subscription(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
    ) -> dict:
        """Dependency to require active premium subscription"""
        subscription = current_user.get("subscription", {})
        sub_status = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        end_date = subscription.get("end_date")
        
        is_active = sub_status in ["active", "trial"]
        is_premium = plan in ["monthly", "annual"]
        
        if is_active and end_date:
            if isinstance(end_date, datetime):
                is_active = end_date > datetime.utcnow()
        
        if not is_active or not is_premium:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "premium_required",
                    "message": "This feature requires an active premium subscription",
                    "upgrade_url": "/subscription"
                }
            )
        
        return current_user
    
    @staticmethod
    async def check_ai_consultation_limit(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
    ) -> dict:
        """Check if user has remaining AI consultations"""
        subscription = current_user.get("subscription", {})
        status_val = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        
        is_premium = plan in ["monthly", "annual"] and status_val in ["active", "trial"]
        
        if is_premium:
            return current_user
        
        user_id = current_user.get("_id") or current_user.get("id") or current_user.get("sub")
        
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        consultation_count = await db.conversations.count_documents({
            "$and": [
                {"$or": [
                    {"user_id": str(user_id)},
                    {"userId": str(user_id)}
                ]},
                {"$or": [
                    {"created_at": {"$gte": start_of_month}},
                    {"createdAt": {"$gte": start_of_month}}
                ]}
            ]
        })
        
        limit = FREE_TIER_LIMITS["ai_consultations_per_month"]
        
        if consultation_count >= limit:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've used all {limit} free AI consultations this month",
                    "used": consultation_count,
                    "limit": limit,
                    "upgrade_url": "/subscription"
                }
            )
        
        return current_user
    
    @staticmethod
    async def check_medicine_reminder_limit(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
    ) -> dict:
        """Check if user can add more medicine reminders"""
        subscription = current_user.get("subscription", {})
        status_val = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        
        is_premium = plan in ["monthly", "annual"] and status_val in ["active", "trial"]
        
        if is_premium:
            return current_user
        
        reminders = current_user.get("reminders", [])
        active_reminders = [r for r in reminders if r.get("enabled", True)]
        
        limit = FREE_TIER_LIMITS["medicine_reminders"]
        
        if len(active_reminders) >= limit:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "limit_exceeded",
                    "message": f"Free plan allows up to {limit} medicine reminders",
                    "used": len(active_reminders),
                    "limit": limit,
                    "upgrade_url": "/subscription"
                }
            )
        
        return current_user
    
    @staticmethod
    async def check_symptom_check_limit(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
    ) -> dict:
        """Check if user has remaining symptom checks today"""
        subscription = current_user.get("subscription", {})
        status_val = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        
        is_premium = plan in ["monthly", "annual"] and status_val in ["active", "trial"]
        
        if is_premium:
            return current_user
        
        user_id = current_user.get("_id") or current_user.get("id") or current_user.get("sub")
        
        start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        check_count = await db.symptom_checks.count_documents({
            "$and": [
                {"$or": [
                    {"user_id": str(user_id)},
                    {"userId": str(user_id)}
                ]},
                {"$or": [
                    {"created_at": {"$gte": start_of_day}},
                    {"createdAt": {"$gte": start_of_day}}
                ]}
            ]
        })
        
        limit = FREE_TIER_LIMITS["symptom_checks_per_day"]
        
        if check_count >= limit:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "limit_exceeded",
                    "message": f"You've used all {limit} free symptom checks today",
                    "used": check_count,
                    "limit": limit,
                    "upgrade_url": "/subscription"
                }
            )
        
        return current_user
    
    @staticmethod
    async def get_user_limits(
        current_user: dict = Depends(get_current_user),
        db: AsyncIOMotorDatabase = Depends(get_database)
    ) -> dict:
        """Get user's current usage and limits"""
        subscription = current_user.get("subscription", {})
        status_val = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        
        is_premium = plan in ["monthly", "annual"] and status_val in ["active", "trial"]
        
        user_id = current_user.get("_id") or current_user.get("id") or current_user.get("sub")
        
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_day = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        consultation_count = await db.conversations.count_documents({
            "$and": [
                {"$or": [{"user_id": str(user_id)}, {"userId": str(user_id)}]},
                {"$or": [{"created_at": {"$gte": start_of_month}}, {"createdAt": {"$gte": start_of_month}}]}
            ]
        })
        
        symptom_count = await db.symptom_checks.count_documents({
            "$and": [
                {"$or": [{"user_id": str(user_id)}, {"userId": str(user_id)}]},
                {"$or": [{"created_at": {"$gte": start_of_day}}, {"createdAt": {"$gte": start_of_day}}]}
            ]
        })
        
        reminders = current_user.get("reminders", [])
        active_reminders = len([r for r in reminders if r.get("enabled", True)])
        
        if is_premium:
            return {
                "is_premium": True,
                "plan": plan,
                "usage": {
                    "ai_consultations": consultation_count,
                    "symptom_checks_today": symptom_count,
                    "medicine_reminders": active_reminders
                },
                "limits": None
            }
        
        return {
            "is_premium": False,
            "plan": plan,
            "usage": {
                "ai_consultations": consultation_count,
                "symptom_checks_today": symptom_count,
                "medicine_reminders": active_reminders
            },
            "limits": FREE_TIER_LIMITS,
            "remaining": {
                "ai_consultations": max(0, FREE_TIER_LIMITS["ai_consultations_per_month"] - consultation_count),
                "symptom_checks_today": max(0, FREE_TIER_LIMITS["symptom_checks_per_day"] - symptom_count),
                "medicine_reminders": max(0, FREE_TIER_LIMITS["medicine_reminders"] - active_reminders)
            }
        }


require_premium = SubscriptionGuard.check_active_subscription
require_ai_consultation = SubscriptionGuard.check_ai_consultation_limit
require_medicine_reminder = SubscriptionGuard.check_medicine_reminder_limit
require_symptom_check = SubscriptionGuard.check_symptom_check_limit
get_user_limits = SubscriptionGuard.get_user_limits

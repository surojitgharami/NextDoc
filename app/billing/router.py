"""Billing and Subscription API Routes - MongoDB with Razorpay"""
from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List, Optional
from datetime import datetime
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.auth.mongo_dependencies import get_current_user, require_admin
from app.dependencies import get_database
from .razorpay_service import razorpay_service, SUBSCRIPTION_PLANS, FREE_TIER_LIMITS
from .subscription_guard import get_user_limits
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["Billing"])


class CreateOrderRequest(BaseModel):
    plan_type: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_type: str


class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_premium: bool


@router.get("/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {
        "plans": list(SUBSCRIPTION_PLANS.values()),
        "free_tier_limits": FREE_TIER_LIMITS
    }


@router.get("/subscription")
async def get_subscription_status(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's subscription status"""
    user_id = current_user.get("_id") or current_user.get("id")
    status_result = await razorpay_service.check_subscription_status(db, str(user_id))
    return status_result


@router.get("/limits")
async def get_usage_limits(
    limits: dict = Depends(get_user_limits)
):
    """Get user's current usage and limits"""
    return limits


@router.post("/create-order")
async def create_subscription_order(
    request: CreateOrderRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create Razorpay order for subscription purchase"""
    user_id = current_user.get("_id") or current_user.get("id")
    
    if request.plan_type not in SUBSCRIPTION_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type. Choose from: {list(SUBSCRIPTION_PLANS.keys())}"
        )
    
    if request.plan_type == "free":
        now = datetime.utcnow()
        await db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "subscription": {
                        "plan": "free",
                        "status": "active",
                        "start_date": now,
                        "end_date": None
                    },
                    "updated_at": now
                }
            }
        )
        return {
            "type": "free",
            "message": "Free plan activated successfully",
            "plan": SUBSCRIPTION_PLANS["free"]
        }
    
    if not razorpay_service.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service not configured. Please contact support."
        )
    
    try:
        order = await razorpay_service.create_subscription_order(
            user_id=str(user_id),
            plan_type=request.plan_type,
            db=db
        )
        return order
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment order"
        )


@router.post("/verify-payment")
async def verify_payment(
    request: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Verify Razorpay payment and activate subscription"""
    user_id = current_user.get("_id") or current_user.get("id")
    
    stored_order = await db.pending_orders.find_one({
        "order_id": request.razorpay_order_id,
        "user_id": str(user_id),
        "status": "pending"
    })
    
    if not stored_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order not found or already processed"
        )
    
    if stored_order["plan_type"] != request.plan_type:
        logger.warning(f"Plan type mismatch for user {user_id}: stored={stored_order['plan_type']}, submitted={request.plan_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Plan mismatch detected."
        )
    
    if not razorpay_service.verify_payment_signature(
        request.razorpay_order_id,
        request.razorpay_payment_id,
        request.razorpay_signature
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid signature."
        )
    
    try:
        await db.pending_orders.update_one(
            {"order_id": request.razorpay_order_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )
        
        subscription = await razorpay_service.activate_subscription(
            db=db,
            user_id=str(user_id),
            plan_type=stored_order["plan_type"],
            payment_id=request.razorpay_payment_id,
            order_id=request.razorpay_order_id
        )
        
        return {
            "success": True,
            "message": f"{stored_order['plan_type'].capitalize()} subscription activated successfully!",
            "subscription": subscription
        }
    except Exception as e:
        logger.error(f"Failed to activate subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate subscription"
        )


@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Cancel user's subscription"""
    user_id = current_user.get("_id") or current_user.get("id")
    
    success = await razorpay_service.cancel_subscription(db, str(user_id))
    
    if success:
        return {"success": True, "message": "Subscription cancelled successfully"}
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="No active subscription to cancel"
    )


@router.get("/payment-history")
async def get_payment_history(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get user's payment history"""
    user_id = current_user.get("_id") or current_user.get("id")
    
    payments = await razorpay_service.get_payment_history(db, str(user_id))
    return {"payments": payments}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncIOMotorDatabase = Depends(get_database)):
    """Handle Razorpay webhook events"""
    try:
        body = await request.body()
        signature = request.headers.get("X-Razorpay-Signature", "")
        
        if not razorpay_service.verify_webhook_signature(body, signature):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature"
            )
        
        payload = await request.json()
        event = payload.get("event")
        
        logger.info(f"Received Razorpay webhook: {event}")
        
        if event == "payment.captured":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})
            
            user_id = notes.get("user_id")
            plan_type = notes.get("plan_type")
            
            if user_id and plan_type:
                await razorpay_service.activate_subscription(
                    db=db,
                    user_id=user_id,
                    plan_type=plan_type,
                    payment_id=payment_entity.get("id"),
                    order_id=payment_entity.get("order_id")
                )
        
        elif event == "payment.failed":
            payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment_entity.get("notes", {})
            user_id = notes.get("user_id")
            
            if user_id:
                await db.payment_history.insert_one({
                    "user_id": user_id,
                    "type": "subscription",
                    "status": "failed",
                    "razorpay_payment_id": payment_entity.get("id"),
                    "error_code": payment_entity.get("error_code"),
                    "error_description": payment_entity.get("error_description"),
                    "created_at": datetime.utcnow()
                })
        
        return {"status": "ok"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}


@router.get("/admin/subscriptions")
async def admin_get_subscriptions(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Get all user subscriptions"""
    query = {}
    if status_filter:
        query["subscription.status"] = status_filter
    
    skip = (page - 1) * limit
    
    cursor = db.users.find(
        query,
        {"password_hash": 0}
    ).skip(skip).limit(limit).sort("created_at", -1)
    
    users = await cursor.to_list(length=limit)
    total = await db.users.count_documents(query)
    
    for user in users:
        user["_id"] = str(user["_id"])
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.post("/admin/update-subscription")
async def admin_update_subscription(
    user_id: str,
    plan: str,
    status_val: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Update user subscription"""
    if plan not in ["free", "monthly", "annual"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan type"
        )
    
    if status_val not in ["active", "expired", "cancelled", "trial"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status"
        )
    
    now = datetime.utcnow()
    
    result = await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {
                "subscription.plan": plan,
                "subscription.status": status_val,
                "subscription.updated_by_admin": True,
                "subscription.admin_update_at": now,
                "updated_at": now
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"success": True, "message": "Subscription updated successfully"}


@router.get("/admin/revenue")
async def admin_get_revenue(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Admin: Get revenue statistics"""
    pipeline = [
        {"$match": {"status": "completed"}},
        {
            "$group": {
                "_id": None,
                "total_revenue": {"$sum": "$amount"},
                "total_transactions": {"$sum": 1}
            }
        }
    ]
    
    result = await db.payment_history.aggregate(pipeline).to_list(length=1)
    
    plan_breakdown = await db.payment_history.aggregate([
        {"$match": {"status": "completed"}},
        {
            "$group": {
                "_id": "$plan",
                "revenue": {"$sum": "$amount"},
                "count": {"$sum": 1}
            }
        }
    ]).to_list(length=10)
    
    total_data = result[0] if result else {"total_revenue": 0, "total_transactions": 0}
    
    return {
        "total_revenue": total_data.get("total_revenue", 0) / 100,
        "total_transactions": total_data.get("total_transactions", 0),
        "currency": "INR",
        "plan_breakdown": [
            {
                "plan": item["_id"],
                "revenue": item["revenue"] / 100,
                "count": item["count"]
            }
            for item in plan_breakdown
        ]
    }


@router.get("/check-subscription")
async def check_subscription_legacy(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Legacy endpoint: Check if user has active subscription"""
    subscription = current_user.get("subscription", {})
    status_val = subscription.get("status", "trial")
    plan = subscription.get("plan", "free")
    end_date = subscription.get("end_date")
    
    is_active = status_val in ["active", "trial"]
    
    if is_active and end_date:
        if isinstance(end_date, datetime):
            is_active = end_date > datetime.utcnow()
    
    return {
        "has_active_subscription": is_active or plan in ["monthly", "annual"],
        "status": status_val,
        "plan": plan,
        "next_billing_date": end_date
    }

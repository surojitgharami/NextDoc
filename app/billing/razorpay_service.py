"""Razorpay Integration Service for Subscription Management"""
import razorpay
import hmac
import hashlib
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

SUBSCRIPTION_PLANS = {
    "monthly": {
        "id": "monthly",
        "name": "Monthly Premium",
        "amount": 29900,
        "currency": "INR",
        "period": "monthly",
        "interval": 1,
        "description": "Full access to AI Doctor features",
        "features": [
            "Unlimited AI consultations",
            "Advanced symptom checker",
            "Medicine reminders",
            "Health monitoring",
            "Priority support"
        ]
    },
    "annual": {
        "id": "annual",
        "name": "Annual Premium",
        "amount": 299900,
        "currency": "INR",
        "period": "yearly",
        "interval": 1,
        "description": "Best value - Save 16%",
        "features": [
            "Everything in Monthly",
            "2 months free",
            "Early access to new features",
            "Exclusive health reports"
        ]
    },
    "free": {
        "id": "free",
        "name": "Free Plan",
        "amount": 0,
        "currency": "INR",
        "period": "monthly",
        "interval": 1,
        "description": "Basic access",
        "features": [
            "Limited AI consultations (5/month)",
            "Basic symptom checker",
            "Medicine reminders (up to 3)"
        ]
    }
}

FREE_TIER_LIMITS = {
    "ai_consultations_per_month": 5,
    "medicine_reminders": 3,
    "symptom_checks_per_day": 3
}


class RazorpayService:
    def __init__(self):
        self.key_id = os.getenv("RAZORPAY_KEY_ID", "")
        self.key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        self.webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
        self._client = None
    
    @property
    def client(self):
        if not self._client and self.key_id and self.key_secret:
            self._client = razorpay.Client(auth=(self.key_id, self.key_secret))
        return self._client
    
    @property
    def is_configured(self) -> bool:
        return bool(self.key_id and self.key_secret)
    
    async def create_order(
        self,
        amount: int,
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a Razorpay order for one-time payment"""
        if not self.is_configured:
            raise ValueError("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET")
        
        order_data = {
            "amount": amount,
            "currency": currency,
            "receipt": receipt or f"order_{datetime.utcnow().timestamp()}",
            "notes": notes or {}
        }
        
        try:
            client = self.client
            if client is None:
                raise ValueError("Razorpay client not initialized")
            order = client.order.create(data=order_data)
            logger.info(f"Created Razorpay order: {order['id']}")
            return order
        except Exception as e:
            logger.error(f"Failed to create Razorpay order: {e}")
            raise
    
    async def create_subscription_order(
        self,
        user_id: str,
        plan_type: str,
        db: AsyncIOMotorDatabase = None
    ) -> Dict[str, Any]:
        """Create order for subscription purchase"""
        if plan_type not in SUBSCRIPTION_PLANS:
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        plan = SUBSCRIPTION_PLANS[plan_type]
        
        if plan["amount"] == 0:
            return {"type": "free", "plan": plan}
        
        order = await self.create_order(
            amount=plan["amount"],
            currency=plan["currency"],
            receipt=f"sub_{user_id}_{plan_type}_{int(datetime.utcnow().timestamp())}",
            notes={
                "user_id": user_id,
                "plan_type": plan_type,
                "purpose": "subscription"
            }
        )
        
        if db:
            await db.pending_orders.insert_one({
                "order_id": order["id"],
                "user_id": user_id,
                "plan_type": plan_type,
                "amount": plan["amount"],
                "currency": plan["currency"],
                "status": "pending",
                "created_at": datetime.utcnow()
            })
        
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": self.key_id,
            "plan": plan
        }
    
    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str
    ) -> bool:
        """Verify Razorpay payment signature"""
        if not self.key_secret:
            logger.error("Razorpay key secret not configured")
            return False
        
        try:
            message = f"{order_id}|{payment_id}"
            generated_signature = hmac.new(
                self.key_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(generated_signature, signature)
        except Exception as e:
            logger.error(f"Signature verification failed: {e}")
            return False
    
    def verify_webhook_signature(self, body: bytes, signature: str) -> bool:
        """Verify Razorpay webhook signature"""
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, skipping verification")
            return True
        
        try:
            generated_signature = hmac.new(
                self.webhook_secret.encode(),
                body,
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(generated_signature, signature)
        except Exception as e:
            logger.error(f"Webhook signature verification failed: {e}")
            return False
    
    async def activate_subscription(
        self,
        db: AsyncIOMotorDatabase,
        user_id: str,
        plan_type: str,
        payment_id: str,
        order_id: str
    ) -> Dict[str, Any]:
        """Activate user subscription after successful payment"""
        plan = SUBSCRIPTION_PLANS.get(plan_type)
        if not plan:
            raise ValueError(f"Invalid plan type: {plan_type}")
        
        now = datetime.utcnow()
        
        if plan_type == "monthly":
            end_date = now + timedelta(days=30)
        elif plan_type == "annual":
            end_date = now + timedelta(days=365)
        else:
            end_date = None
        
        subscription_data = {
            "plan": plan_type,
            "status": "active",
            "start_date": now,
            "end_date": end_date,
            "provider_subscription_id": payment_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id
        }
        
        await db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "subscription": subscription_data,
                    "updated_at": now
                }
            }
        )
        
        await db.payment_history.insert_one({
            "user_id": user_id,
            "type": "subscription",
            "plan": plan_type,
            "amount": plan["amount"],
            "currency": plan["currency"],
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "status": "completed",
            "created_at": now
        })
        
        logger.info(f"Activated {plan_type} subscription for user {user_id}")
        
        return subscription_data
    
    async def cancel_subscription(
        self,
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> bool:
        """Cancel user subscription"""
        now = datetime.utcnow()
        
        result = await db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "subscription.status": "cancelled",
                    "subscription.cancelled_at": now,
                    "updated_at": now
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"Cancelled subscription for user {user_id}")
            return True
        return False
    
    async def check_subscription_status(
        self,
        db: AsyncIOMotorDatabase,
        user_id: str
    ) -> Dict[str, Any]:
        """Check user's current subscription status"""
        user = await db.users.find_one({"_id": user_id})
        
        if not user:
            return {"has_active_subscription": False, "status": "no_user"}
        
        subscription = user.get("subscription", {})
        status = subscription.get("status", "trial")
        plan = subscription.get("plan", "free")
        end_date = subscription.get("end_date")
        
        is_active = status in ["active", "trial"]
        
        if is_active and end_date:
            if isinstance(end_date, datetime):
                is_active = end_date > datetime.utcnow()
                if not is_active:
                    await db.users.update_one(
                        {"_id": user_id},
                        {"$set": {"subscription.status": "expired"}}
                    )
                    status = "expired"
        
        return {
            "has_active_subscription": is_active,
            "status": status,
            "plan": plan,
            "end_date": end_date,
            "limits": None if is_active and plan != "free" else FREE_TIER_LIMITS
        }
    
    async def get_payment_history(
        self,
        db: AsyncIOMotorDatabase,
        user_id: str,
        limit: int = 10
    ) -> list:
        """Get user's payment history"""
        cursor = db.payment_history.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)
        
        payments = await cursor.to_list(length=limit)
        
        for payment in payments:
            payment["_id"] = str(payment["_id"])
        
        return payments


razorpay_service = RazorpayService()

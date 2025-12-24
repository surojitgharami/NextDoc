"""Billing and Subscription Models"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class PaymentRequest(BaseModel):
    appointment_id: Optional[int] = None
    doctor_id: int
    amount: float
    currency: str = "INR"
    purpose: str  # appointment, chat, subscription

class PaymentResponse(BaseModel):
    razorpay_order_id: str
    amount: float
    currency: str
    key_id: str

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    amount: float
    currency: str = "INR"
    period: str  # monthly, annual
    description: str

class SubscriptionRequest(BaseModel):
    plan_type: str  # monthly, annual

class SubscriptionResponse(BaseModel):
    razorpay_subscription_id: str
    status: str

class PaymentWebhookEvent(BaseModel):
    event: str
    payload: dict

class UserSubscriptionStatus(BaseModel):
    user_id: int
    status: str  # active, expired, cancelled, trial
    next_billing_date: Optional[datetime] = None
    plan_type: Optional[str] = None
    trial_days_left: int = 0

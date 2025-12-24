"""MongoDB Auth Models and Schemas - User and Admin roles only (no doctor role)"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
import re


class RoleEnum(str, Enum):
    USER = "user"
    ADMIN = "admin"


class SubscriptionPlan(str, Enum):
    FREE = "free"
    MONTHLY = "monthly"
    ANNUAL = "annual"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    TRIAL = "trial"


class Subscription(BaseModel):
    plan: str = "free"
    status: str = "trial"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    provider_subscription_id: Optional[str] = None


class MedicineReminder(BaseModel):
    id: str
    name: str
    dose: str
    times: List[str] = []
    timezone: str = "Asia/Kolkata"
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserDocument(BaseModel):
    """MongoDB User Document Schema"""
    id: Optional[str] = Field(None, alias="_id")
    email: str
    full_name: str
    phone: Optional[str] = None
    password_hash: str
    roles: List[str] = ["user"]
    is_active: bool = True
    email_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    token_version: int = 0
    subscription: Subscription = Field(default_factory=Subscription)
    reminders: List[MedicineReminder] = []
    avatar_url: Optional[str] = None
    
    class Config:
        populate_by_name = True
        from_attributes = True


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = None
    terms_accepted: bool = True

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v

    @field_validator('terms_accepted')
    @classmethod
    def must_accept_terms(cls, v):
        if not v:
            raise ValueError('You must accept the terms and conditions')
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """Public user data returned to frontend"""
    id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    email_verified: bool
    roles: List[str]
    subscription: Subscription
    avatar_url: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    @field_validator('confirm_new_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Za-z]', v):
            raise ValueError('Password must contain at least one letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')
        return v

    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


class SubscriptionUpdate(BaseModel):
    """Admin subscription update"""
    user_id: str
    plan: str = Field(..., pattern="^(free|monthly|annual)$")
    status: str = Field(..., pattern="^(active|expired|cancelled|trial)$")
    end_date: Optional[datetime] = None


TokenResponse.model_rebuild()

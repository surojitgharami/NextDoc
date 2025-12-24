"""Auth Models and Schemas"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
import re


class RoleEnum(str, Enum):
    USER = "user"
    DOCTOR = "doctor"
    ADMIN = "admin"


class DoctorVerificationStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Role(BaseModel):
    id: int
    name: str
    description: Optional[str] = None


class User(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    is_active: bool = True
    is_doctor_requested: bool = False
    doctor_verification_status: str = "none"
    license_file_path: Optional[str] = None
    token_version: int = 0
    created_at: datetime
    updated_at: datetime
    roles: List[str] = []

    class Config:
        from_attributes = True


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    is_doctor: bool = False
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


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserPublic"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserPublic(BaseModel):
    id: int
    email: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    is_active: bool
    is_doctor_requested: bool
    doctor_verification_status: str
    roles: List[str]
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None


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


class DoctorVerificationRequest(BaseModel):
    user_id: int
    action: str = Field(..., pattern="^(approve|reject)$")
    notes: Optional[str] = None


TokenResponse.model_rebuild()

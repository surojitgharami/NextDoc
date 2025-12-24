"""Pydantic schemas for user module"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserProfile(BaseModel):
    """User profile information"""
    clerk_user_id: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    created_at: datetime
    preferences: Optional[dict] = Field(default_factory=dict)


class UserProfileUpdate(BaseModel):
    """Update user preferences"""
    preferences: Optional[dict] = None


class UserStatsResponse(BaseModel):
    """User statistics and activity summary"""
    total_sessions: int
    total_messages: int
    total_symptom_checks: int
    total_vitals_recorded: int
    total_reminders: int
    member_since: datetime

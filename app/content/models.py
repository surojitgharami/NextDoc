"""Content Management Models - Pydantic schemas for Terms & Privacy Policy"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    """Content type enumeration"""
    TERMS = "terms"
    PRIVACY = "privacy_policy"


class ContentUpdate(BaseModel):
    """Schema for updating content"""
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)


class ContentResponse(BaseModel):
    """Schema for content response"""
    content_type: str
    title: str
    content: str
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "content_type": "terms",
                "title": "Terms & Conditions",
                "content": "# Terms & Conditions\n\nWelcome to NextDoc...",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        }

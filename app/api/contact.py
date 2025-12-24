from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now

router = APIRouter(prefix="/api/contact", tags=["Contact"])


class ContactMessage(BaseModel):
    email: EmailStr
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    userId: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    email: str
    subject: str
    message: str
    userId: Optional[str] = None
    status: str = "received"
    createdAt: datetime


@router.post("/send", response_model=ContactResponse)
async def send_contact_message(
    contact: ContactMessage,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Submit contact form message"""
    user_id = current_user.get("sub")
    
    contact_doc = {
        "email": contact.email,
        "subject": contact.subject,
        "message": contact.message,
        "userId": contact.userId or user_id,
        "status": "received",
        "createdAt": utc_now()
    }
    
    result = await db.contactMessages.insert_one(contact_doc)
    
    return ContactResponse(
        id=str(result.inserted_id),
        email=contact_doc["email"],
        subject=contact_doc["subject"],
        message=contact_doc["message"],
        userId=contact_doc.get("userId"),
        status=contact_doc["status"],
        createdAt=contact_doc["createdAt"]
    )

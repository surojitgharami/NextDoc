from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MessageCreate(BaseModel):
    recipient_id: str
    content: str
    attachment_url: Optional[str] = None
    visit_context: Optional[str] = None


class Message(BaseModel):
    id: str = Field(alias="_id")
    sender_id: str
    recipient_id: str
    content: str
    attachment_url: Optional[str] = None
    visit_context: Optional[str] = None
    is_encrypted: bool = True
    created_at: datetime
    is_read: bool = False

    class Config:
        populate_by_name = True


class ConversationThread(BaseModel):
    id: str = Field(alias="_id")
    patient_id: str
    doctor_id: str
    messages: List[Message] = []
    last_message_at: datetime
    is_active: bool = True
    visit_id: Optional[str] = None

    class Config:
        populate_by_name = True


class SupportTicketCreate(BaseModel):
    subject: str
    description: str
    category: str  # 'login', 'prescription', 'billing', 'appointment', 'other'
    priority: str = 'medium'  # 'low', 'medium', 'high'


class SupportTicket(BaseModel):
    id: str = Field(alias="_id")
    user_id: str
    subject: str
    description: str
    category: str
    priority: str
    status: str = 'open'  # 'open', 'in_progress', 'resolved', 'closed'
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolution_notes: Optional[str] = None

    class Config:
        populate_by_name = True

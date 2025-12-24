"""Pydantic schemas for chat module"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ChatMessageRequest(BaseModel):
    """Request schema for sending a chat message"""
    message: str = Field(..., min_length=1, max_length=5000, description="User's message")
    session_id: Optional[str] = Field(None, description="Existing session ID or None for new session")


class ChatMessageResponse(BaseModel):
    """Response schema for chat message"""
    model_config = {"protected_namespaces": ()}
    
    reply: str = Field(..., description="AI's response")
    session_id: str = Field(..., description="Session ID for conversation continuity")
    thinking: Optional[str] = Field(None, description="AI's reasoning process")
    timestamp: datetime = Field(..., description="Response timestamp")
    model: Optional[str] = Field(None, description="Model used for inference")
    model_id: Optional[str] = Field(None, description="Model ID from inference engine")


class ChatHistoryItem(BaseModel):
    """Single message in chat history"""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(..., description="Message timestamp")
    thinking: Optional[str] = Field(None, description="AI reasoning if available")


class SessionSummary(BaseModel):
    """Summary of a chat session"""
    session_id: str
    user_id: str
    session_name: Optional[str] = Field(None, description="User-editable session name")
    created_at: datetime
    updated_at: datetime
    message_count: int
    preview: Optional[str] = Field(None, description="First user message preview")
    summary: Optional[str] = Field(None, description="AI-generated session summary")
    is_active: bool = Field(True, description="Whether session is active")
    is_pinned: bool = Field(False, description="Whether session is pinned by user")


class ChatHistoryResponse(BaseModel):
    """Response with full chat history"""
    session_id: str
    messages: List[ChatHistoryItem]
    total_messages: int
    session_name: Optional[str] = None
    summary: Optional[str] = None


class SessionListResponse(BaseModel):
    """List of user's chat sessions"""
    sessions: List[SessionSummary]
    total_sessions: int


class StartSessionRequest(BaseModel):
    """Request to start a new chat session"""
    session_name: Optional[str] = Field(None, max_length=100, description="Optional name for the session")


class StartSessionResponse(BaseModel):
    """Response after starting a new session"""
    session_id: str
    session_name: str
    created_at: datetime


class ResumeSessionResponse(BaseModel):
    """Response when resuming a session"""
    session_id: str
    session_name: str
    summary: Optional[str] = None
    recent_messages: List[ChatHistoryItem]
    is_active: bool


class RenameSessionRequest(BaseModel):
    """Request to rename a session"""
    session_name: str = Field(..., min_length=1, max_length=100, description="New session name")


class PinSessionRequest(BaseModel):
    """Request to pin/unpin a session"""
    pinned: bool = Field(..., description="Pin status")


class SessionActionResponse(BaseModel):
    """Generic response for session actions"""
    success: bool
    message: str
    session_id: str

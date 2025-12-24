from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/messages", tags=["Messages"])


class ChatMessageResponse(BaseModel):
    id: str
    conversationId: str
    userId: str
    content: str
    role: str
    isThinking: str = "false"
    thinkingContent: Optional[str] = None
    timestamp: datetime


@router.get("", response_model=List[ChatMessageResponse])
async def get_messages(
    conversationId: str = Query(..., description="Conversation ID to get messages from"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    try:
        conv_obj_id = ObjectId(conversationId)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    conversation = await db.conversations.find_one({"_id": conv_obj_id})
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's messages"
        )
    
    # Get session_id from conversation to query messages
    session_id = conversation.get("session_id")
    
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation has no associated session"
        )
    
    # Query messages using session_id from the chats collection
    cursor = db.chats.find(
        {"session_id": session_id}
    ).sort("created_at", 1)
    
    messages = await cursor.to_list(length=500)
    
    return [
        ChatMessageResponse(
            id=str(msg["_id"]),
            conversationId=conversationId,
            userId=msg["user_id"],
            content=msg["content"],
            role=msg["role"],
            isThinking=msg.get("isThinking", "false"),
            thinkingContent=msg.get("thinkingContent"),
            timestamp=msg.get("created_at", utc_now())
        )
        for msg in messages
    ]

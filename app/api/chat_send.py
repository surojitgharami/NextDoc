"""
Chat Send API — with chat-memory injection and clean response pipeline.

Flow:
  1. Validate user & conversation ownership.
  2. Fetch previous session summary from DB (if any).
  3. Build context from recent messages.
  4. Call inference engine with memory injection.
  5. Store clean response — no reasoning tokens ever persisted.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from app.utils.sanitizer import sanitize_user_input
from app.ai_engine.inference import deepseek_engine
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/chat', tags=['Chat'])


# ── Request / Response Schemas ──────────────────────────────────────────────

class ChatSendRequest(BaseModel):
    conversationId: str
    userId: str
    content: str = Field(..., min_length=1, max_length=5000)
    mode: str = Field(default='simple', description='"simple" or "symptom_checker"')


class ChatMessageResponse(BaseModel):
    id: str
    conversationId: str
    userId: str
    content: str
    role: str
    isThinking: str = 'false'
    thinkingContent: Optional[str] = None
    timestamp: datetime


class ChatSendResponse(BaseModel):
    message: ChatMessageResponse
    thinking: Optional[List[str]] = None


# ── Helpers ─────────────────────────────────────────────────────────────────

async def _get_previous_summary(db: AsyncIOMotorDatabase, user_id: str) -> Optional[str]:
    """
    Retrieve the most recent session summary for a user.
    Used to inject patient history context into the prompt.
    """
    try:
        session = await db.chat_sessions.find_one(
            {'user_id': user_id, 'summary': {'$exists': True, '$ne': None}},
            sort=[('updated_at', -1)],
        )
        if session:
            return session.get('summary')
    except Exception as e:
        logger.warning(f'Could not fetch previous summary for user {user_id}: {e}')
    return None


# ── Endpoint ────────────────────────────────────────────────────────────────

@router.post('/send', response_model=ChatSendResponse)
async def send_chat_message(
    request: ChatSendRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    user_id = current_user.get('sub')

    if request.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Cannot send message as another user',
        )

    try:
        conv_obj_id = ObjectId(request.conversationId)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid conversation ID',
        )

    conversation = await db.conversations.find_one({'_id': conv_obj_id})
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Conversation not found',
        )
    if conversation['userId'] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's conversations",
        )

    clean_message = sanitize_user_input(request.content)

    # Persist user message
    user_msg_doc = {
        'conversationId': request.conversationId,
        'userId': request.userId,
        'content': clean_message,
        'role': 'user',
        'isThinking': 'false',
        'thinkingContent': None,
        'timestamp': utc_now(),
    }
    await db.chatMessages.insert_one(user_msg_doc)

    # Fetch recent context (last 10 messages, excluding the one just inserted)
    cursor = db.chatMessages.find(
        {'conversationId': request.conversationId}
    ).sort('timestamp', 1).limit(10)
    context_messages = await cursor.to_list(length=10)
    context = [
        {'role': msg['role'], 'content': msg['content']}
        for msg in context_messages[:-1]
    ]

    # Fetch previous session summary for chat-memory injection
    previous_summary = await _get_previous_summary(db, user_id)

    # ── Call inference ──────────────────────────────────────────────────────
    if request.mode == 'symptom_checker':
        ai_response = await deepseek_engine.analyze_symptoms(clean_message)
        response_text = ai_response['recommendations']
    else:
        ai_response = await deepseek_engine.generate_medical_response(
            query=clean_message,
            conversation_history=context,
            previous_summary=previous_summary,
        )
        response_text = ai_response['response']

    # Persist assistant message — thinking is always empty (never stored)
    assistant_msg_doc = {
        'conversationId': request.conversationId,
        'userId': request.userId,
        'content': response_text,
        'role': 'assistant',
        'isThinking': 'false',
        'thinkingContent': None,
        'timestamp': utc_now(),
    }
    result = await db.chatMessages.insert_one(assistant_msg_doc)
    assistant_msg_id = str(result.inserted_id)

    await db.conversations.update_one(
        {'_id': conv_obj_id},
        {'$set': {'updatedAt': utc_now()}},
    )

    return ChatSendResponse(
        message=ChatMessageResponse(
            id=assistant_msg_id,
            conversationId=request.conversationId,
            userId=request.userId,
            content=response_text,
            role='assistant',
            isThinking='false',
            thinkingContent=None,
            timestamp=assistant_msg_doc['timestamp'],
        ),
        thinking=None,
    )

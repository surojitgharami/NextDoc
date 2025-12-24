"""Chat API endpoints with subscription guards"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional
from datetime import datetime
from app.database import get_database
from app.dependencies import get_current_user
from app.chat.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatHistoryResponse,
    SessionListResponse,
    ChatHistoryItem,
    SessionSummary,
    StartSessionRequest,
    StartSessionResponse,
    ResumeSessionResponse,
    RenameSessionRequest,
    PinSessionRequest,
    SessionActionResponse
)
from app.chat.logic import ChatLogic
from app.chat.services import ChatService
from app.chat.summarizer import SessionSummarizer, maybe_summarize_session
from app.ai_engine.streaming_logic import stream_answer_only, StreamingAIError
from app.utils.helpers import sanitize_user_input
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(
    request: Optional[StartSessionRequest] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Create a new chat session.
    
    - Optionally accepts a session name
    - Returns session ID for subsequent messages
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    session_name = request.session_name if request else None
    
    session_id = await chat_service.create_session(
        user_id=str(user_id),
        session_name=session_name
    )
    
    return StartSessionResponse(
        session_id=session_id,
        session_name=session_name or "New Chat",
        created_at=datetime.utcnow()
    )


@router.post("/resume-session/{session_id}", response_model=ResumeSessionResponse)
async def resume_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Resume an existing chat session.
    
    - Returns session context including summary and recent messages
    - Marks session as active
    - Use this before continuing a conversation
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    
    session = await chat_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    await chat_service.update_session(session_id, message_increment=0)
    
    recent_messages = await chat_service.get_recent_context(session_id, limit=5)
    
    chat_items = [
        ChatHistoryItem(
            role=msg["role"],
            content=msg["content"],
            timestamp=datetime.utcnow(),
            thinking=None
        )
        for msg in recent_messages
    ]
    
    return ResumeSessionResponse(
        session_id=session_id,
        session_name=session.get("session_name", "Chat"),
        summary=session.get("summary"),
        recent_messages=chat_items,
        is_active=True
    )


@router.patch("/session/{session_id}/rename", response_model=SessionActionResponse)
async def rename_session(
    session_id: str,
    request: RenameSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Rename a chat session"""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    success = await chat_service.rename_session(
        session_id=session_id,
        user_id=str(user_id),
        new_name=request.session_name
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or unauthorized"
        )
    
    return SessionActionResponse(
        success=True,
        message=f"Session renamed to '{request.session_name}'",
        session_id=session_id
    )


@router.patch("/session/{session_id}/pin", response_model=SessionActionResponse)
async def toggle_pin_session(
    session_id: str,
    request: PinSessionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Pin or unpin a chat session"""
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    success = await chat_service.toggle_pin_session(
        session_id=session_id,
        user_id=str(user_id),
        pinned=request.pinned
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or unauthorized"
        )
    
    action = "pinned" if request.pinned else "unpinned"
    return SessionActionResponse(
        success=True,
        message=f"Session {action} successfully",
        session_id=session_id
    )


@router.post("/message")
async def send_message(
    request: ChatMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a message to the AI doctor and receive a response.
    
    - Creates new session if session_id is not provided
    - Maintains conversation context within session
    - Auto-generates summary every 5 messages
    - Returns AI reasoning and response
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_logic = ChatLogic(db)
    
    result = await chat_logic.process_message(
        user_id=str(user_id),
        message=request.message,
        session_id=request.session_id
    )
    
    await maybe_summarize_session(db, result["session_id"])
    
    return ChatMessageResponse(**result)


@router.post("/stream")
async def stream_message(
    request: ChatMessageRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Stream AI response token-by-token to UI (ChatGPT-style typing animation).
    
    - Streams ONLY the <answer> section to frontend
    - <thinking> section is logged server-side for debugging
    - Returns Server-Sent Events (SSE) format
    - Creates/updates session like regular /message endpoint
    - Auto-generates summary every 5 messages
    
    Example response stream:
    data: {"token": "It", "session_id": "abc123"}
    data: {"token": " might", "session_id": "abc123"}
    data: {"token": " be", "session_id": "abc123"}
    data: {"type": "done", "session_id": "abc123"}
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    clean_message = sanitize_user_input(request.message)
    chat_service = ChatService(db)
    summarizer = SessionSummarizer(db)
    
    if not request.session_id:
        session_id = await chat_service.create_session(str(user_id))
        resume_context = None
    else:
        session = await chat_service.get_session(request.session_id)
        if not session or session["user_id"] != user_id:
            session_id = await chat_service.create_session(str(user_id))
            resume_context = None
        else:
            session_id = request.session_id
            resume_context = await summarizer.get_resume_context(session_id)
    
    context = await chat_service.get_recent_context(session_id, limit=5)
    
    if resume_context and not context:
        full_message = f"{resume_context}\n\nPatient's new message: {clean_message}"
    elif context:
        context_text = "\n".join([
            f"{msg['role'].title()}: {msg['content']}"
            for msg in context
        ])
        full_message = f"Previous conversation:\n{context_text}\n\nNew question: {clean_message}"
    else:
        full_message = clean_message
    
    await chat_service.save_message(
        session_id=session_id,
        user_id=str(user_id),
        role="user",
        content=clean_message
    )
    
    async def generate_stream():
        """Generator function for SSE streaming"""
        full_answer = ""
        
        try:
            async for token in stream_answer_only(user_message=full_message, max_tokens=800):
                full_answer += token
                
                event_data = {
                    "token": token,
                    "session_id": session_id
                }
                yield f"data: {json.dumps(event_data)}\n\n"
            
            await chat_service.save_message(
                session_id=session_id,
                user_id=str(user_id),
                role="assistant",
                content=full_answer,
                metadata={"streaming": True}
            )
            
            await chat_service.update_session(session_id)
            
            await maybe_summarize_session(db, session_id)
            
            done_data = {
                "type": "done",
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            yield f"data: {json.dumps(done_data)}\n\n"
            
        except StreamingAIError as e:
            logger.error(f"Streaming error: {e}")
            error_data = {
                "type": "error",
                "message": str(e),
                "session_id": session_id
            }
            yield f"data: {json.dumps(error_data)}\n\n"
        except Exception as e:
            logger.error(f"Unexpected streaming error: {e}")
            error_data = {
                "type": "error",
                "message": "An unexpected error occurred",
                "session_id": session_id
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/history")
async def get_sessions(
    include_inactive: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all chat sessions for the current user.
    
    - Returns session summaries with preview of first message
    - Pinned sessions appear first
    - Optionally include inactive sessions
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    
    await chat_service.mark_sessions_inactive(hours=24)
    
    sessions = await chat_service.get_user_sessions(
        str(user_id),
        include_inactive=include_inactive
    )
    
    session_summaries = []
    for session in sessions:
        try:
            summary = SessionSummary(
                session_id=session["session_id"],
                user_id=session["user_id"],
                session_name=session.get("session_name"),
                created_at=session["created_at"],
                updated_at=session["updated_at"],
                message_count=session.get("message_count", 0),
                preview=session.get("preview"),
                summary=session.get("summary"),
                is_active=session.get("is_active", True),
                is_pinned=session.get("is_pinned", False)
            )
            session_summaries.append(summary)
        except Exception as e:
            logger.warning(f"Failed to parse session: {e}")
            continue
    
    return SessionListResponse(
        sessions=session_summaries,
        total_sessions=len(session_summaries)
    )


@router.get("/history/{session_id}")
async def get_session_history(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get full conversation history for a specific session.
    
    - Returns all visible messages in chronological order
    - Includes session summary and name
    - Includes AI reasoning where available
    """
    user_id = current_user.get("sub")
    
    chat_service = ChatService(db)
    
    session = await chat_service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    messages = await chat_service.get_conversation_history(session_id, visible_only=True)
    
    chat_items = [
        ChatHistoryItem(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg["created_at"],
            thinking=msg.get("thinking")
        )
        for msg in messages
    ]
    
    return ChatHistoryResponse(
        session_id=session_id,
        messages=chat_items,
        total_messages=len(chat_items),
        session_name=session.get("session_name"),
        summary=session.get("summary")
    )


@router.delete("/session/{session_id}")
async def delete_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a chat session and all its messages.
    
    - Only the session owner can delete it
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    success = await chat_service.delete_session(session_id, str(user_id))
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or unauthorized"
        )
    
    return {"message": "Session deleted successfully", "session_id": session_id}


@router.post("/session/{session_id}/summarize")
async def force_summarize_session(
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Force generate a summary for a session.
    
    - Useful for manually triggering summary generation
    """
    user_id = current_user.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    chat_service = ChatService(db)
    
    session = await chat_service.get_session(session_id)
    if not session or session["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or unauthorized"
        )
    
    summarizer = SessionSummarizer(db)
    summary = await summarizer.generate_summary(session_id)
    
    return {
        "session_id": session_id,
        "summary": summary,
        "success": summary is not None
    }


@router.get("/runtime-info")
async def get_runtime_info():
    """
    Get current AI runtime configuration (for debugging).
    
    Shows custom API endpoint configuration.
    """
    from app.ai_engine import ai_logic
    return ai_logic.get_runtime_info()

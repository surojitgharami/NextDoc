"""Chat service layer for database operations"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.utils.helpers import generate_session_id, utc_now
import logging

logger = logging.getLogger(__name__)


class ChatService:
    """Service for chat and session management"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def create_session(
        self, 
        user_id: str,
        session_name: Optional[str] = None
    ) -> str:
        """Create new chat session"""
        session_id = generate_session_id()
        
        session_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "session_name": session_name or "New Chat",
            "created_at": utc_now(),
            "updated_at": utc_now(),
            "last_activity": utc_now(),
            "message_count": 0,
            "is_active": True,
            "is_pinned": False,
            "summary": None
        }
        
        await self.db.sessions.insert_one(session_doc)
        
        await self._create_conversation_for_session(session_id, user_id, session_name)
        
        logger.info(f"Created session {session_id} for user {user_id}")
        
        return session_id
    
    async def _create_conversation_for_session(
        self, 
        session_id: str, 
        user_id: str,
        title: Optional[str] = None
    ):
        """Create a conversation record linked to a session"""
        from bson import ObjectId
        conv_doc = {
            "_id": ObjectId(),
            "session_id": session_id,
            "userId": user_id,
            "title": title or "New Chat",
            "mode": "simple",
            "isBookmarked": "false",
            "isFavorite": "false",
            "isDeleted": "false",
            "createdAt": utc_now(),
            "updatedAt": utc_now()
        }
        
        await self.db.conversations.insert_one(conv_doc)
        logger.info(f"Created conversation for session {session_id}")
    
    async def update_conversation_title(self, session_id: str, title: str):
        """Update conversation title based on first user message"""
        await self.db.conversations.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "title": title,
                    "updatedAt": utc_now()
                }
            }
        )
        await self.db.sessions.update_one(
            {"session_id": session_id},
            {"$set": {"session_name": title}}
        )
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        return await self.db.sessions.find_one({"session_id": session_id})
    
    async def update_session(self, session_id: str, message_increment: int = 2):
        """Update session timestamp and increment message count"""
        await self.db.sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "updated_at": utc_now(),
                    "last_activity": utc_now(),
                    "is_active": True
                },
                "$inc": {"message_count": message_increment}
            }
        )
    
    async def update_session_summary(self, session_id: str, summary: str):
        """Update session summary"""
        await self.db.sessions.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "summary": summary,
                    "updated_at": utc_now()
                }
            }
        )
        logger.info(f"Updated summary for session {session_id}")
    
    async def rename_session(self, session_id: str, user_id: str, new_name: str) -> bool:
        """Rename a session"""
        result = await self.db.sessions.update_one(
            {"session_id": session_id, "user_id": user_id},
            {
                "$set": {
                    "session_name": new_name,
                    "updated_at": utc_now()
                }
            }
        )
        
        if result.modified_count > 0:
            await self.db.conversations.update_one(
                {"session_id": session_id},
                {"$set": {"title": new_name, "updatedAt": utc_now()}}
            )
            return True
        return False
    
    async def toggle_pin_session(self, session_id: str, user_id: str, pinned: bool) -> bool:
        """Pin or unpin a session"""
        result = await self.db.sessions.update_one(
            {"session_id": session_id, "user_id": user_id},
            {"$set": {"is_pinned": pinned, "updated_at": utc_now()}}
        )
        return result.modified_count > 0
    
    async def mark_sessions_inactive(self, hours: int = 24):
        """Mark sessions as inactive after specified hours of no activity"""
        threshold = utc_now() - timedelta(hours=hours)
        
        result = await self.db.sessions.update_many(
            {
                "is_active": True,
                "last_activity": {"$lt": threshold}
            },
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count > 0:
            logger.info(f"Marked {result.modified_count} sessions as inactive")
        
        return result.modified_count
    
    async def save_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        thinking: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        visible: bool = True,
        is_system: bool = False
    ):
        """Save a chat message to database"""
        message_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "thinking": thinking,
            "metadata": metadata or {},
            "created_at": utc_now(),
            "visible": visible,
            "is_system": is_system
        }
        
        await self.db.chats.insert_one(message_doc)
    
    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 100,
        visible_only: bool = True
    ) -> List[Dict[str, Any]]:
        """Get messages for a session"""
        query = {"session_id": session_id}
        if visible_only:
            query["visible"] = True
        
        cursor = self.db.chats.find(query).sort("created_at", 1).limit(limit)
        
        messages = await cursor.to_list(length=limit)
        return messages
    
    async def get_user_sessions(
        self,
        user_id: str,
        limit: int = 50,
        include_inactive: bool = False
    ) -> List[Dict[str, Any]]:
        """Get all sessions for a user with summaries"""
        query = {"user_id": user_id}
        if not include_inactive:
            query["is_active"] = True
        
        cursor = self.db.sessions.find(query).sort([
            ("is_pinned", -1),
            ("updated_at", -1)
        ]).limit(limit)
        
        sessions = await cursor.to_list(length=limit)
        
        for session in sessions:
            if not session.get("summary"):
                first_message = await self.db.chats.find_one(
                    {"session_id": session["session_id"], "role": "user", "visible": True},
                    sort=[("created_at", 1)]
                )
                if first_message:
                    session["preview"] = first_message["content"][:100]
        
        return sessions
    
    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a session and its messages"""
        session = await self.get_session(session_id)
        if not session or session["user_id"] != user_id:
            return False
        
        await self.db.chats.delete_many({"session_id": session_id})
        await self.db.sessions.delete_one({"session_id": session_id})
        await self.db.conversations.delete_one({"session_id": session_id})
        
        logger.info(f"Deleted session {session_id}")
        return True
    
    async def get_recent_context(
        self,
        session_id: str,
        limit: int = 5
    ) -> List[Dict[str, str]]:
        """Get recent visible messages for AI context"""
        messages = await self.get_conversation_history(
            session_id, 
            limit * 2, 
            visible_only=True
        )
        
        context = []
        for msg in messages[-limit * 2:]:
            context.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        return context
    
    async def get_session_with_context(
        self,
        session_id: str,
        message_limit: int = 5
    ) -> Optional[Dict[str, Any]]:
        """Get session with summary and recent messages for resume"""
        session = await self.get_session(session_id)
        if not session:
            return None
        
        recent_messages = await self.get_recent_context(session_id, limit=message_limit)
        
        return {
            "session": session,
            "recent_messages": recent_messages,
            "summary": session.get("summary"),
            "session_name": session.get("session_name", "Chat")
        }
    
    async def get_message_count(self, session_id: str) -> int:
        """Get visible message count for a session"""
        return await self.db.chats.count_documents({
            "session_id": session_id,
            "visible": True
        })

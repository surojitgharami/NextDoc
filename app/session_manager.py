"""Session Management with MongoDB Storage"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.config import settings
import secrets
import logging

logger = logging.getLogger(__name__)


class SessionManager:
    """Manage user sessions in MongoDB"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.sessions
    
    async def create_indexes(self):
        """Create indexes for session collection"""
        await self.collection.create_index("session_id", unique=True)
        await self.collection.create_index("user_id")
        await self.collection.create_index("clerk_user_id")
        await self.collection.create_index("expires_at")
        await self.collection.create_index(
            [("user_id", 1), ("created_at", -1)]
        )
    
    async def create_session(
        self,
        clerk_user_id: str,
        user_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new session for a user.
        
        Args:
            clerk_user_id: User ID (kept for backward compatibility, can be any user ID)
            user_data: User information from JWT
            metadata: Optional additional metadata (IP, user agent, etc.)
        
        Returns:
            Session document
        """
        session_id = self._generate_session_id()
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        
        session_doc = {
            "session_id": session_id,
            "user_id": clerk_user_id,
            "clerk_user_id": clerk_user_id,
            "email": user_data.get("email"),
            "user_data": user_data,
            "metadata": metadata or {},
            "created_at": now,
            "last_accessed": now,
            "expires_at": expires_at,
            "active": True
        }
        
        await self.collection.insert_one(session_doc)
        logger.info(f"Created session {session_id} for user {clerk_user_id}")
        
        return session_doc
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session by ID and update last accessed time.
        
        Returns None if session doesn't exist or is expired.
        """
        session = await self.collection.find_one({
            "session_id": session_id,
            "active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if session:
            # Update last accessed time and extend expiry
            await self.update_session_activity(session_id)
        
        return session
    
    async def get_user_sessions(
        self,
        clerk_user_id: str,
        active_only: bool = True
    ) -> list:
        """Get all sessions for a user"""
        query = {"clerk_user_id": clerk_user_id}
        
        if active_only:
            query["active"] = True
            query["expires_at"] = {"$gt": datetime.utcnow()}
        
        cursor = self.collection.find(query).sort("created_at", -1)
        return await cursor.to_list(length=100)
    
    async def update_session_activity(self, session_id: str):
        """Update last accessed time and extend expiry"""
        now = datetime.utcnow()
        new_expiry = now + timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        
        await self.collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "last_accessed": now,
                    "expires_at": new_expiry
                }
            }
        )
    
    async def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a specific session"""
        result = await self.collection.update_one(
            {"session_id": session_id},
            {"$set": {"active": False}}
        )
        return result.modified_count > 0
    
    async def invalidate_user_sessions(
        self,
        clerk_user_id: str,
        except_session_id: Optional[str] = None
    ):
        """Invalidate all sessions for a user (except optionally one)"""
        query = {"clerk_user_id": clerk_user_id}
        
        if except_session_id:
            query["session_id"] = {"$ne": except_session_id}
        
        await self.collection.update_many(
            query,
            {"$set": {"active": False}}
        )
        logger.info(f"Invalidated sessions for user {clerk_user_id}")
    
    async def cleanup_expired_sessions(self):
        """Remove expired sessions from database"""
        result = await self.collection.delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        if result.deleted_count > 0:
            logger.info(f"Cleaned up {result.deleted_count} expired sessions")
        return result.deleted_count
    
    async def get_session_stats(self, clerk_user_id: str) -> Dict[str, Any]:
        """Get session statistics for a user"""
        total_sessions = await self.collection.count_documents({
            "clerk_user_id": clerk_user_id
        })
        
        active_sessions = await self.collection.count_documents({
            "clerk_user_id": clerk_user_id,
            "active": True,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        return {
            "total_sessions": total_sessions,
            "active_sessions": active_sessions
        }
    
    def _generate_session_id(self) -> str:
        """Generate a secure random session ID"""
        return f"sess_{secrets.token_urlsafe(32)}"


async def get_session_manager(db: AsyncIOMotorDatabase) -> SessionManager:
    """Dependency to get session manager instance"""
    return SessionManager(db)

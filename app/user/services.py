"""User service layer"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from app.utils.helpers import utc_now
import logging

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_or_create_user(
        self,
        clerk_user_id: str,
        email: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get existing user or create new one"""
        user = await self.db.users.find_one({"clerk_user_id": clerk_user_id})
        
        if user:
            return user
        
        # Create new user
        user_doc = {
            "clerk_user_id": clerk_user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "created_at": utc_now(),
            "preferences": {}
        }
        
        await self.db.users.insert_one(user_doc)
        logger.info(f"Created user profile for {clerk_user_id}")
        
        return user_doc
    
    async def update_preferences(
        self,
        clerk_user_id: str,
        preferences: dict
    ) -> bool:
        """Update user preferences"""
        result = await self.db.users.update_one(
            {"clerk_user_id": clerk_user_id},
            {"$set": {"preferences": preferences}}
        )
        
        return result.modified_count > 0
    
    async def get_user_stats(self, clerk_user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        user = await self.db.users.find_one({"clerk_user_id": clerk_user_id})
        
        if not user:
            return {}
        
        # Count sessions
        total_sessions = await self.db.sessions.count_documents(
            {"user_id": clerk_user_id}
        )
        
        # Count messages
        total_messages = await self.db.chats.count_documents(
            {"user_id": clerk_user_id, "role": "user"}
        )
        
        # Count symptom checks
        total_symptom_checks = await self.db.activities.count_documents(
            {"user_id": clerk_user_id, "activity_type": "symptom_check"}
        )
        
        # Count vitals
        total_vitals = await self.db.monitoring.count_documents(
            {"user_id": clerk_user_id}
        )
        
        # Count reminders
        total_reminders = await self.db.reminders.count_documents(
            {"user_id": clerk_user_id}
        )
        
        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_symptom_checks": total_symptom_checks,
            "total_vitals_recorded": total_vitals,
            "total_reminders": total_reminders,
            "member_since": user["created_at"]
        }

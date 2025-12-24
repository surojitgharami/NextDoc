"""Profile sync service between PostgreSQL and MongoDB"""
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ProfileSyncService:
    """Synchronize user data between PostgreSQL (auth) and MongoDB (profiles)"""
    
    @staticmethod
    async def sync_user_to_profile(
        user_id: int,
        user_data: Dict[str, Any],
        db: AsyncIOMotorDatabase
    ) -> Dict[str, Any]:
        """Sync PostgreSQL user data to MongoDB profile"""
        profile_data = {
            "userId": str(user_id),
            "fullName": user_data.get("full_name"),
            "dateOfBirth": str(user_data.get("date_of_birth")) if user_data.get("date_of_birth") else None,
            "phone": user_data.get("phone_number"),
            "email": user_data.get("email"),
            "updatedAt": datetime.utcnow(),
        }
        
        result = await db.userProfile.update_one(
            {"userId": str(user_id)},
            {
                "$set": profile_data,
                "$setOnInsert": {"createdAt": datetime.utcnow()}
            },
            upsert=True
        )
        
        profile = await db.userProfile.find_one({"userId": str(user_id)})
        logger.info(f"✅ Synced user {user_id} to MongoDB profile")
        return profile
    
    @staticmethod
    async def get_complete_profile(user_id: int, db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
        """Get complete profile from MongoDB"""
        profile = await db.userProfile.find_one({"userId": str(user_id)})
        if profile:
            profile["id"] = str(profile.get("_id", ""))
        return profile
    
    @staticmethod
    async def update_profile_photo(
        user_id: int,
        photo_url: str,
        db: AsyncIOMotorDatabase
    ) -> Dict[str, Any]:
        """Update user profile photo URL in MongoDB"""
        result = await db.userProfile.update_one(
            {"userId": str(user_id)},
            {
                "$set": {
                    "avatarUrl": photo_url,
                    "updatedAt": datetime.utcnow()
                },
                "$setOnInsert": {"createdAt": datetime.utcnow()}
            },
            upsert=True
        )
        profile = await db.userProfile.find_one({"userId": str(user_id)})
        return profile
    
    @staticmethod
    async def update_profile_data(
        user_id: int,
        update_fields: Dict[str, Any],
        db: AsyncIOMotorDatabase
    ) -> Dict[str, Any]:
        """Update profile fields in MongoDB"""
        set_data = {
            "updatedAt": datetime.utcnow()
        }
        set_data.update(update_fields)
        
        result = await db.userProfile.update_one(
            {"userId": str(user_id)},
            {
                "$set": set_data,
                "$setOnInsert": {"createdAt": datetime.utcnow()}
            },
            upsert=True
        )
        profile = await db.userProfile.find_one({"userId": str(user_id)})
        return profile

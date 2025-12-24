"""MongoDB database connection and management"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    """MongoDB database manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    
    @classmethod
    async def connect_db(cls):
        """Establish database connection - gracefully handles connection failures"""
        try:
            cls.client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
            cls.db = cls.client[settings.MONGODB_DB_NAME]
            
            # Ping database to verify connection
            await cls.client.admin.command('ping')
            logger.info(f"✅ Connected to MongoDB: {settings.MONGODB_DB_NAME}")
            
            # Create indexes
            await cls.create_indexes()
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            logger.warning("⚠️  Application starting in degraded mode - database features unavailable")
            logger.warning("⚠️  Please check MONGODB_URL and ensure database is accessible")
            cls.client = None
            cls.db = None
    
    @classmethod
    async def close_db(cls):
        """Close database connection"""
        if cls.client:
            cls.client.close()
            logger.info("🔌 MongoDB connection closed")
    
    @classmethod
    async def create_indexes(cls):
        """Create database indexes for performance"""
        if cls.db is None:
            return
        
        try:
            await cls.db.chats.create_index("session_id", background=True)
            await cls.db.chats.create_index("user_id", background=True)
            await cls.db.chats.create_index([("user_id", 1), ("created_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Chats indexes: {e}")
        
        try:
            await cls.db.chat_sessions.create_index("user_id", background=True)
            await cls.db.chat_sessions.create_index("session_id", unique=True, background=True)
            await cls.db.chat_sessions.create_index([("user_id", 1), ("updated_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Chat sessions indexes: {e}")
        
        try:
            await cls.db.activities.create_index([("user_id", 1), ("created_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Activities indexes: {e}")
        
        try:
            await cls.db.reminders.create_index("user_id", background=True)
            await cls.db.reminders.create_index([("user_id", 1), ("reminder_time", 1)], background=True)
        except Exception as e:
            logger.warning(f"Reminders indexes: {e}")
        
        try:
            await cls.db.monitoring.create_index([("user_id", 1), ("recorded_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Monitoring indexes: {e}")
        
        try:
            await cls.db.conversations.create_index("userId", background=True)
            await cls.db.conversations.create_index([("userId", 1), ("createdAt", -1)], background=True)
        except Exception as e:
            logger.warning(f"Conversations indexes: {e}")
        
        try:
            await cls.db.messages.create_index("conversationId", background=True)
            await cls.db.messages.create_index([("conversationId", 1), ("timestamp", -1)], background=True)
        except Exception as e:
            logger.warning(f"Messages indexes: {e}")
        
        try:
            await cls.db.medicines.create_index("userId", background=True)
        except Exception as e:
            logger.warning(f"Medicines indexes: {e}")
        
        try:
            await cls.db.message_reports.create_index("reporter_id", background=True)
            await cls.db.message_reports.create_index("status", background=True)
            await cls.db.message_reports.create_index([("reporter_id", 1), ("created_at", -1)], background=True)
            await cls.db.message_reports.create_index([("status", 1), ("created_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Message reports indexes: {e}")
        
        try:
            await cls.db.admin_notifications.create_index("created_by", background=True)
            await cls.db.admin_notifications.create_index([("created_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Admin notifications indexes: {e}")
        
        try:
            await cls.db.audit_logs.create_index("actor_id", background=True)
            await cls.db.audit_logs.create_index("action", background=True)
            await cls.db.audit_logs.create_index([("created_at", -1)], background=True)
        except Exception as e:
            logger.warning(f"Audit logs indexes: {e}")
        
        logger.info("📊 Database indexes created successfully")
    
    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance"""
        if cls.db is None:
            raise Exception("Database not initialized. Call connect_db() first.")
        return cls.db


def get_database_instance() -> Optional[AsyncIOMotorDatabase]:
    """Get database instance without raising exception"""
    return Database.db


# Dependency for FastAPI routes
async def get_database() -> AsyncIOMotorDatabase:
    """Dependency to get database in routes"""
    return Database.get_db()

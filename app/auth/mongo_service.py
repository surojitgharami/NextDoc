"""MongoDB Auth Service - Business Logic for MongoDB-based authentication"""
from typing import Optional, List, Tuple
from datetime import datetime, timedelta
from bson import ObjectId
import logging
import secrets

from motor.motor_asyncio import AsyncIOMotorDatabase
from .mongo_models import (
    UserDocument, UserRegister, UserPublic, Subscription,
    SubscriptionPlan, SubscriptionStatus
)
from .security import hash_password, verify_password, hash_token

logger = logging.getLogger(__name__)

TRIAL_DAYS = 7


class MongoAuthService:
    """MongoDB-based authentication service"""

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users = db.users
        self.refresh_tokens = db.refresh_tokens
        self.verification_tokens = db.verification_tokens
        self.password_reset_tokens = db.password_reset_tokens
        self.audit_logs = db.audit_logs

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email"""
        user = await self.users.find_one({"email": email.lower()})
        if user:
            user['id'] = str(user['_id'])
        return user

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        try:
            user = await self.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user['id'] = str(user['_id'])
            return user
        except Exception as e:
            logger.error(f"Error getting user by id: {e}")
            return None

    async def create_user(self, data: UserRegister) -> dict:
        """Create a new user"""
        hashed_pw = hash_password(data.password)
        
        now = datetime.utcnow()
        trial_end = now + timedelta(days=TRIAL_DAYS)
        
        user_doc = {
            "email": data.email.lower(),
            "full_name": data.full_name,
            "phone": data.phone,
            "password_hash": hashed_pw,
            "roles": ["user"],
            "is_active": True,
            "email_verified": False,
            "created_at": now,
            "updated_at": now,
            "token_version": 0,
            "subscription": {
                "plan": "free",
                "status": "trial",
                "start_date": now,
                "end_date": trial_end,
                "provider_subscription_id": None
            },
            "reminders": [],
            "avatar_url": None
        }
        
        result = await self.users.insert_one(user_doc)
        user_doc['_id'] = result.inserted_id
        user_doc['id'] = str(result.inserted_id)
        
        logger.info(f"✅ Created user: {data.email}")
        return user_doc

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not user.get('is_active', True):
            return None
        if not verify_password(password, user.get('password_hash', '')):
            return None
        return user

    async def update_token_version(self, user_id: str) -> int:
        """Increment token version (invalidates all refresh tokens)"""
        result = await self.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$inc": {"token_version": 1}, "$set": {"updated_at": datetime.utcnow()}},
            return_document=True
        )
        return result.get('token_version', 0) if result else 0

    async def store_refresh_token(self, user_id: str, token: str, expires_at: datetime):
        """Store hashed refresh token"""
        token_hash = hash_token(token)
        await self.refresh_tokens.insert_one({
            "user_id": ObjectId(user_id),
            "token_hash": token_hash,
            "expires_at": expires_at,
            "revoked": False,
            "created_at": datetime.utcnow()
        })

    async def verify_refresh_token(self, user_id: str, token: str) -> bool:
        """Verify refresh token exists and is not revoked"""
        token_hash = hash_token(token)
        result = await self.refresh_tokens.find_one({
            "user_id": ObjectId(user_id),
            "token_hash": token_hash,
            "revoked": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        return result is not None

    async def revoke_refresh_token(self, token: str):
        """Revoke a specific refresh token"""
        token_hash = hash_token(token)
        await self.refresh_tokens.update_one(
            {"token_hash": token_hash},
            {"$set": {"revoked": True}}
        )

    async def revoke_all_user_tokens(self, user_id: str):
        """Revoke all refresh tokens for a user"""
        await self.refresh_tokens.update_many(
            {"user_id": ObjectId(user_id)},
            {"$set": {"revoked": True}}
        )
        await self.update_token_version(user_id)

    async def change_password(self, user_id: str, new_password: str):
        """Change user password and invalidate all tokens"""
        hashed_pw = hash_password(new_password)
        await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "password_hash": hashed_pw,
                "updated_at": datetime.utcnow()
            }}
        )
        await self.revoke_all_user_tokens(user_id)

    async def update_user(self, user_id: str, **kwargs) -> Optional[dict]:
        """Update user fields"""
        allowed_fields = ['full_name', 'phone', 'avatar_url']
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields and v is not None}
        
        if not updates:
            return await self.get_user_by_id(user_id)
        
        updates['updated_at'] = datetime.utcnow()
        
        result = await self.users.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result['id'] = str(result['_id'])
        return result

    async def get_all_users(self, skip: int = 0, limit: int = 50) -> Tuple[List[dict], int]:
        """Get all users with pagination (admin only)"""
        total = await self.users.count_documents({})
        
        cursor = self.users.find({}).sort("created_at", -1).skip(skip).limit(limit)
        users = []
        async for user in cursor:
            user['id'] = str(user['_id'])
            del user['password_hash']
            users.append(user)
        
        return users, total

    async def block_user(self, user_id: str) -> bool:
        """Block a user"""
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            await self.revoke_all_user_tokens(user_id)
            return True
        return False

    async def unblock_user(self, user_id: str) -> bool:
        """Unblock a user"""
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": True, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def delete_user(self, user_id: str):
        """Delete a user and all their associated data"""
        oid = ObjectId(user_id)
        await self.refresh_tokens.delete_many({"user_id": oid})
        await self.verification_tokens.delete_many({"user_id": oid})
        await self.password_reset_tokens.delete_many({"user_id": oid})
        await self.users.delete_one({"_id": oid})
        logger.info(f"🗑️ Deleted user: {user_id}")

    async def add_role(self, user_id: str, role: str) -> bool:
        """Add a role to user"""
        if role not in ["user", "admin"]:
            return False
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"roles": role}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def remove_role(self, user_id: str, role: str) -> bool:
        """Remove a role from user"""
        if role == "user":
            return False
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"roles": role}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    async def update_subscription(
        self, 
        user_id: str, 
        plan: str, 
        status: str,
        end_date: Optional[datetime] = None,
        provider_id: Optional[str] = None
    ) -> bool:
        """Update user subscription"""
        updates = {
            "subscription.plan": plan,
            "subscription.status": status,
            "updated_at": datetime.utcnow()
        }
        if end_date:
            updates["subscription.end_date"] = end_date
        if provider_id:
            updates["subscription.provider_subscription_id"] = provider_id
        
        result = await self.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates}
        )
        return result.modified_count > 0

    async def check_subscription_active(self, user_id: str) -> bool:
        """Check if user has active subscription or trial"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        sub = user.get('subscription', {})
        status = sub.get('status', 'expired')
        
        if status == 'active':
            return True
        
        if status == 'trial':
            end_date = sub.get('end_date')
            if end_date and isinstance(end_date, datetime):
                return end_date > datetime.utcnow()
        
        return False

    async def create_email_verification_token(self, user_id: str) -> str:
        """Create email verification token"""
        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        
        await self.verification_tokens.insert_one({
            "user_id": ObjectId(user_id),
            "token_hash": token_hash,
            "expires_at": datetime.utcnow() + timedelta(hours=24),
            "used": False,
            "created_at": datetime.utcnow()
        })
        
        return token

    async def verify_email_token(self, token: str) -> Optional[str]:
        """Verify email token and mark email as verified"""
        token_hash = hash_token(token)
        
        token_doc = await self.verification_tokens.find_one({
            "token_hash": token_hash,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_doc:
            return None
        
        user_id = str(token_doc['user_id'])
        
        await self.verification_tokens.update_one(
            {"_id": token_doc['_id']},
            {"$set": {"used": True}}
        )
        
        await self.users.update_one(
            {"_id": token_doc['user_id']},
            {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}}
        )
        
        return user_id

    async def create_password_reset_token(self, email: str) -> Optional[str]:
        """Create password reset token"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        
        token = secrets.token_urlsafe(32)
        token_hash = hash_token(token)
        
        await self.password_reset_tokens.insert_one({
            "user_id": ObjectId(user['id']),
            "token_hash": token_hash,
            "expires_at": datetime.utcnow() + timedelta(hours=1),
            "used": False,
            "created_at": datetime.utcnow()
        })
        
        return token

    async def reset_password_with_token(self, token: str, new_password: str) -> bool:
        """Reset password using token"""
        token_hash = hash_token(token)
        
        token_doc = await self.password_reset_tokens.find_one({
            "token_hash": token_hash,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not token_doc:
            return False
        
        user_id = str(token_doc['user_id'])
        
        await self.password_reset_tokens.update_one(
            {"_id": token_doc['_id']},
            {"$set": {"used": True}}
        )
        
        await self.change_password(user_id, new_password)
        
        return True

    async def log_audit(
        self, 
        actor_id: str, 
        action: str, 
        target: Optional[str] = None,
        details: Optional[dict] = None
    ):
        """Log audit event"""
        await self.audit_logs.insert_one({
            "actor_id": ObjectId(actor_id) if actor_id else None,
            "action": action,
            "target": target,
            "details": details or {},
            "created_at": datetime.utcnow()
        })

    async def get_audit_logs(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get audit logs with pagination"""
        cursor = self.audit_logs.find({}).sort("created_at", -1).skip(skip).limit(limit)
        logs = []
        async for log in cursor:
            log['id'] = str(log['_id'])
            if log.get('actor_id'):
                log['actor_id'] = str(log['actor_id'])
            logs.append(log)
        return logs

    async def seed_admin(self, email: str, password: str, full_name: str = "Admin"):
        """Seed admin user if not exists"""
        try:
            await self.db.users.drop_index("clerk_user_id_1")
            logger.info("Dropped legacy clerk_user_id index")
        except Exception:
            pass
        
        existing = await self.get_user_by_email(email)
        if existing:
            if "admin" not in existing.get('roles', []):
                await self.add_role(existing['id'], "admin")
                logger.info(f"✅ Added admin role to existing user: {email}")
            else:
                logger.info(f"✅ Admin user already exists: {email}")
            return existing
        
        hashed_pw = hash_password(password)
        now = datetime.utcnow()
        
        user_doc = {
            "email": email.lower(),
            "full_name": full_name,
            "phone": None,
            "password_hash": hashed_pw,
            "roles": ["user", "admin"],
            "is_active": True,
            "email_verified": True,
            "created_at": now,
            "updated_at": now,
            "token_version": 0,
            "subscription": {
                "plan": "annual",
                "status": "active",
                "start_date": now,
                "end_date": now + timedelta(days=365),
                "provider_subscription_id": None
            },
            "reminders": [],
            "avatar_url": None
        }
        
        try:
            result = await self.users.insert_one(user_doc)
            user_doc['_id'] = result.inserted_id
            user_doc['id'] = str(result.inserted_id)
            logger.info(f"✅ Created admin user: {email}")
        except Exception as e:
            if "duplicate key" in str(e).lower():
                existing = await self.get_user_by_email(email)
                if existing:
                    if "admin" not in existing.get('roles', []):
                        await self.add_role(existing['id'], "admin")
                    return existing
            logger.error(f"Error creating admin: {e}")
            raise
        
        return user_doc


async def create_auth_indexes(db: AsyncIOMotorDatabase):
    """Create indexes for auth collections - handles existing indexes gracefully"""
    try:
        existing_indexes = await db.users.index_information()
        if "email_1" in existing_indexes:
            email_idx = existing_indexes["email_1"]
            if not email_idx.get("unique", False):
                await db.users.drop_index("email_1")
                await db.users.create_index("email", unique=True)
        else:
            await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Email index creation: {e}")
    
    try:
        await db.users.create_index("roles", background=True)
        await db.users.create_index("created_at", background=True)
        await db.users.create_index("subscription.status", background=True)
    except Exception as e:
        logger.warning(f"User indexes: {e}")
    
    try:
        await db.refresh_tokens.create_index("user_id", background=True)
        await db.refresh_tokens.create_index("token_hash", background=True)
        await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Refresh token indexes: {e}")
    
    try:
        await db.verification_tokens.create_index("user_id", background=True)
        await db.verification_tokens.create_index("token_hash", background=True)
        await db.verification_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Verification token indexes: {e}")
    
    try:
        await db.password_reset_tokens.create_index("user_id", background=True)
        await db.password_reset_tokens.create_index("token_hash", background=True)
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as e:
        logger.warning(f"Password reset token indexes: {e}")
    
    try:
        await db.audit_logs.create_index("actor_id", background=True)
        await db.audit_logs.create_index("action", background=True)
        await db.audit_logs.create_index("created_at", background=True)
    except Exception as e:
        logger.warning(f"Audit log indexes: {e}")
    
    logger.info("✅ Auth indexes created")

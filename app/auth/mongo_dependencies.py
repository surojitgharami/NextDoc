"""MongoDB Auth Dependencies - FastAPI dependencies for authentication"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import logging

from motor.motor_asyncio import AsyncIOMotorDatabase
from .mongo_models import UserDocument
from .mongo_service import MongoAuthService
from .security import decode_token
from app.dependencies import get_database

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)


async def get_auth_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> MongoAuthService:
    """Get MongoDB auth service instance"""
    return MongoAuthService(db)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: MongoAuthService = Depends(get_auth_service)
) -> dict:
    """Get current authenticated user from JWT token"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user = await auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token_version = payload.get("token_version", 0)
    if token_version != user.get('token_version', 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    logger.info(f"Authenticated user: {user_id} ({user.get('email')})")
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: MongoAuthService = Depends(get_auth_service)
) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, auth_service)
    except HTTPException:
        return None


class RoleChecker:
    """Dependency for role-based access control"""
    
    def __init__(self, required_roles: List[str]):
        self.required_roles = required_roles
    
    async def __call__(self, user: dict = Depends(get_current_user)) -> dict:
        user_roles = user.get('roles', [])
        
        if not any(role in user_roles for role in self.required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {self.required_roles}"
            )
        
        return user


require_admin = RoleChecker(["admin"])
require_user = RoleChecker(["user", "admin"])


async def require_subscription(
    user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
) -> dict:
    """Require active subscription or trial"""
    has_subscription = await auth_service.check_subscription_active(user['id'])
    
    if not has_subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required. Please subscribe to continue."
        )
    
    return user


async def require_verified_email(user: dict = Depends(get_current_user)) -> dict:
    """Require verified email"""
    if not user.get('email_verified', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required. Please verify your email to continue."
        )
    
    return user

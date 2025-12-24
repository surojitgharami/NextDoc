"""Authentication dependencies using custom JWT validation"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional
from app.database import get_database
from app.session_manager import SessionManager
from app.auth.security import decode_token
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """
    Dependency to validate custom JWT, extract user information, and manage sessions.
    Returns user payload with user_id and session_id.
    
    Enhanced with automatic MongoDB session management.
    
    Usage in routes:
    @router.get("/protected")
    async def protected_route(current_user: dict = Depends(get_current_user)):
        user_id = current_user.get("sub")  # User ID (as string for compatibility)
        email = current_user.get("email")
        session_id = current_user.get("session_id")
        ...
    """
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
            detail="Invalid token payload"
        )
    
    from bson import ObjectId
    users_coll = db["users"]
    try:
        user = await users_coll.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    user['id'] = str(user['_id'])
    
    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated"
        )
    
    if payload.get("token_version") != user.get("token_version", 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    
    logger.info(f"Authenticated user: {user_id} ({payload.get('email')})")
    
    try:
        session_manager = SessionManager(db)
        
        sessions = await session_manager.get_user_sessions(
            str(user_id),
            active_only=True
        )
        
        if sessions:
            session_id = sessions[0]["session_id"]
            await session_manager.update_session_activity(session_id)
            logger.debug(f"Updated session {session_id} for user {user_id}")
        else:
            metadata = {
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("User-Agent"),
            }
            
            session = await session_manager.create_session(
                clerk_user_id=str(user_id),
                user_data={
                    "email": payload.get("email"),
                    "roles": payload.get("roles", [])
                },
                metadata=metadata
            )
            session_id = session["session_id"]
            logger.info(f"Created session {session_id} for user {user_id}")
        
        payload["session_id"] = session_id
        
    except Exception as e:
        logger.error(f"Session management error: {e}")
    
    payload["user"] = user
    
    return payload


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Optional[Dict[str, Any]]:
    """
    Optional authentication - returns None if no token provided.
    Useful for endpoints that work differently for authenticated vs anonymous users.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(request=request, credentials=credentials, db=db)
    except (HTTPException, Exception):
        return None

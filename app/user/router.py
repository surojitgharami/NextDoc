"""User API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from app.database import get_database
from app.dependencies import get_current_user
from app.user.schemas import UserProfile, UserProfileUpdate, UserStatsResponse
from app.user.services import UserService
from app.user.clerk_service import ClerkAPIService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/user", tags=["User"])


@router.get("/profile")
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current user's full profile from Clerk API.
    
    Returns user details including email, first_name, last_name, and created_at
    fetched directly from Clerk's API.
    """
    user_id = current_user.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token: missing user ID"
        )
    
    # Fetch full user details from Clerk API
    clerk_service = ClerkAPIService()
    clerk_data = await clerk_service.get_user(user_id)
    
    if not clerk_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in Clerk"
        )
    
    # Extract clean profile data
    profile = clerk_service.extract_user_profile(clerk_data)
    
    # Get or create local user record for preferences
    user_service = UserService(db)
    local_user = await user_service.get_or_create_user(
        clerk_user_id=user_id,
        email=profile.get("email")
    )
    
    # Merge Clerk data with local preferences
    response = {
        "clerk_user_id": profile.get("clerk_user_id"),
        "email": profile.get("email"),
        "first_name": profile.get("first_name"),
        "last_name": profile.get("last_name"),
        "created_at": profile.get("created_at"),
        "preferences": local_user.get("preferences", {})
    }
    
    logger.info(f"Retrieved profile for user {user_id}")
    return response


@router.put("/profile")
async def update_profile(
    update_data: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update user preferences"""
    user_id = current_user.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    user_service = UserService(db)
    
    if update_data.preferences:
        await user_service.update_preferences(str(user_id), update_data.preferences)
    
    return {"message": "Profile updated successfully"}


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get user activity statistics.
    
    Returns counts of sessions, messages, symptom checks, vitals, and reminders.
    """
    user_id = current_user.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user token"
        )
    
    user_service = UserService(db)
    stats = await user_service.get_user_stats(str(user_id))
    
    return UserStatsResponse(**stats)

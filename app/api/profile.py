from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
import aiofiles
from pathlib import Path
import uuid

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

# Configure upload directory
PROFILE_PHOTOS_DIR = Path("./uploads/profile-photos")
PROFILE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB


class UserProfileUpdate(BaseModel):
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    weightKg: Optional[float] = None
    heightCm: Optional[float] = None
    avatarUrl: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    userId: str
    fullName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    weightKg: Optional[float] = None
    heightCm: Optional[float] = None
    avatarUrl: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


@router.get("/")
async def get_profile_query(
    userId: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get profile by query parameter"""
    current_user_id = current_user.get("sub")
    actual_user_id = userId if userId == current_user_id else current_user_id
    
    profile = await db.userProfile.find_one({"userId": str(actual_user_id)})
    
    if not profile:
        return None
    
    return UserProfileResponse(
        id=str(profile["_id"]),
        userId=profile["userId"],
        fullName=profile.get("fullName"),
        dateOfBirth=profile.get("dateOfBirth"),
        gender=profile.get("gender"),
        phone=profile.get("phone"),
        email=profile.get("email"),
        weightKg=profile.get("weightKg"),
        heightCm=profile.get("heightCm"),
        avatarUrl=profile.get("avatarUrl"),
        createdAt=profile.get("createdAt", profile.get("created_at", utc_now())),
        updatedAt=profile.get("updatedAt", profile.get("updated_at", utc_now()))
    )


@router.get("/{user_id}", response_model=Optional[UserProfileResponse])
async def get_profile_path(
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    current_user_id = current_user.get("sub")
    
    # Use authenticated user's ID, allow path parameter override if it matches
    actual_user_id = user_id if user_id == current_user_id else current_user_id
    
    profile = await db.userProfile.find_one({"userId": str(actual_user_id)})
    
    if not profile:
        return None
    
    return UserProfileResponse(
        id=str(profile["_id"]),
        userId=profile["userId"],
        fullName=profile.get("fullName"),
        dateOfBirth=profile.get("dateOfBirth"),
        gender=profile.get("gender"),
        phone=profile.get("phone"),
        email=profile.get("email"),
        weightKg=profile.get("weightKg"),
        heightCm=profile.get("heightCm"),
        avatarUrl=profile.get("avatarUrl"),
        createdAt=profile.get("createdAt", profile.get("created_at", utc_now())),
        updatedAt=profile.get("updatedAt", profile.get("updated_at", utc_now()))
    )


@router.put("/{user_id}", response_model=UserProfileResponse)
async def update_profile(
    user_id: str,
    update_data: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    current_user_id = current_user.get("sub")
    
    # Use authenticated user's ID, allow path parameter override if it matches
    actual_user_id = user_id if user_id == current_user_id else current_user_id
    
    profile = await db.userProfile.find_one({"userId": actual_user_id})
    
    if not profile:
        profile_doc = {
            "userId": actual_user_id,
            "fullName": update_data.fullName,
            "dateOfBirth": update_data.dateOfBirth,
            "gender": update_data.gender,
            "phone": update_data.phone,
            "email": update_data.email,
            "weightKg": update_data.weightKg,
            "heightCm": update_data.heightCm,
            "avatarUrl": update_data.avatarUrl,
            "createdAt": utc_now(),
            "updatedAt": utc_now()
        }
        
        result = await db.userProfile.insert_one(profile_doc)
        
        return UserProfileResponse(
            id=str(result.inserted_id),
            userId=actual_user_id,
            fullName=update_data.fullName,
            dateOfBirth=update_data.dateOfBirth,
            gender=update_data.gender,
            phone=update_data.phone,
            email=update_data.email,
            weightKg=update_data.weightKg,
            heightCm=update_data.heightCm,
            avatarUrl=update_data.avatarUrl,
            createdAt=profile_doc["createdAt"],
            updatedAt=profile_doc["updatedAt"]
        )
    
    update_fields = {}
    if update_data.fullName is not None:
        update_fields["fullName"] = update_data.fullName
    if update_data.dateOfBirth is not None:
        update_fields["dateOfBirth"] = update_data.dateOfBirth
    if update_data.gender is not None:
        update_fields["gender"] = update_data.gender
    if update_data.phone is not None:
        update_fields["phone"] = update_data.phone
    if update_data.email is not None:
        update_fields["email"] = update_data.email
    if update_data.weightKg is not None:
        update_fields["weightKg"] = update_data.weightKg
    if update_data.heightCm is not None:
        update_fields["heightCm"] = update_data.heightCm
    if update_data.avatarUrl is not None:
        update_fields["avatarUrl"] = update_data.avatarUrl
    
    update_fields["updatedAt"] = utc_now()
    
    await db.userProfile.update_one(
        {"userId": actual_user_id},
        {"$set": update_fields}
    )
    
    updated_profile = await db.userProfile.find_one({"userId": actual_user_id})
    
    if not updated_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found after update"
        )
    
    return UserProfileResponse(
        id=str(updated_profile["_id"]),
        userId=updated_profile["userId"],
        fullName=updated_profile.get("fullName"),
        dateOfBirth=updated_profile.get("dateOfBirth"),
        gender=updated_profile.get("gender"),
        phone=updated_profile.get("phone"),
        email=updated_profile.get("email"),
        weightKg=updated_profile.get("weightKg"),
        heightCm=updated_profile.get("heightCm"),
        avatarUrl=updated_profile.get("avatarUrl"),
        createdAt=updated_profile.get("createdAt", updated_profile.get("created_at", utc_now())),
        updatedAt=updated_profile.get("updatedAt", updated_profile.get("updated_at", utc_now()))
    )


@router.post("/{user_id}/photo")
async def upload_profile_photo(
    user_id: str,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Upload profile photo for user"""
    current_user_id = current_user.get("sub")
    
    # Use authenticated user's ID, allow path parameter override if it matches
    actual_user_id = user_id if user_id == current_user_id else current_user_id
    
    # Validate file
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: 5MB"
        )
    
    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file"
        )
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())
    filename = f"{actual_user_id}_{unique_id}{file_ext}"
    file_path = PROFILE_PHOTOS_DIR / filename
    
    try:
        # Save file
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)
        
        # Generate public URL
        photo_url = f"/uploads/profile-photos/{filename}"
        
        # Update profile with new photo URL
        await db.userProfile.update_one(
            {"userId": actual_user_id},
            {"$set": {"avatarUrl": photo_url, "updatedAt": utc_now()}},
            upsert=True
        )
        
        logger.info(f"✅ Profile photo uploaded: {filename}")
        
        return {
            "url": photo_url,
            "fileName": file.filename,
            "size": file_size
        }
    
    except Exception as e:
        logger.error(f"❌ Photo upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload photo"
        )

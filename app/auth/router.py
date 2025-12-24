"""Auth API Routes"""
import os
import aiofiles
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import logging
import uuid

from .models import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    UserPublic, UserUpdate, PasswordChange, DoctorVerificationRequest, User
)
from .service import AuthService
from .security import (
    create_access_token, create_refresh_token, decode_token,
    verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
)
from .dependencies import get_current_user, require_admin
from app.dependencies import get_database
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

UPLOAD_DIR = "uploads/licenses"


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    full_name: str = Form(...),
    phone_number: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    is_doctor: bool = Form(False),
    terms_accepted: bool = Form(True),
    license_file: Optional[UploadFile] = File(None)
):
    """Register a new user"""
    try:
        existing = await AuthService.get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        from datetime import date as date_type
        dob = None
        if date_of_birth:
            try:
                dob = date_type.fromisoformat(date_of_birth)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        data = UserRegister(
            email=email,
            password=password,
            confirm_password=confirm_password,
            full_name=full_name,
            phone_number=phone_number,
            date_of_birth=dob,
            is_doctor=is_doctor,
            terms_accepted=terms_accepted
        )
        
        license_path = None
        if is_doctor and license_file:
            import os
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            
            ext = (license_file.filename or "").split('.')[-1].lower()
            if ext not in ['pdf', 'jpg', 'jpeg', 'png']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="License file must be PDF, JPG, or PNG"
                )
            
            filename = f"{uuid.uuid4()}.{ext}"
            license_path = os.path.join(UPLOAD_DIR, filename)
            
            async with aiofiles.open(license_path, 'wb') as f:
                content = await license_file.read()
                await f.write(content)
        
        user = await AuthService.create_user(data, license_path)
        roles = await AuthService.get_user_roles(user['id'])
        
        # Sync user data to MongoDB profile
        from app.services.profile_sync import ProfileSyncService
        from app.database import Database
        try:
            if Database.db is not None:
                await ProfileSyncService.sync_user_to_profile(user['id'], user, Database.db)
        except Exception as e:
            logger.warning(f"Profile sync failed: {e}")
        
        response = {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "phone_number": user['phone_number'],
            "date_of_birth": str(user['date_of_birth']) if user['date_of_birth'] else None,
            "is_active": user['is_active'],
            "is_doctor_requested": user['is_doctor_requested'],
            "doctor_verification_status": user['doctor_verification_status'],
            "roles": roles,
            "created_at": user['created_at'].isoformat() if hasattr(user['created_at'], 'isoformat') else str(user['created_at'])
        }
        return JSONResponse(content=response, status_code=status.HTTP_201_CREATED)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db = Depends(get_database)):
    """Login and get access/refresh tokens"""
    user = await AuthService.authenticate_user(data.email, data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    roles = await AuthService.get_user_roles(user['id'])
    
    # Sync user data to MongoDB profile on login
    from app.services.profile_sync import ProfileSyncService
    try:
        await ProfileSyncService.sync_user_to_profile(user['id'], user, db)
    except Exception as e:
        logger.error(f"Failed to sync profile: {e}")
    
    token_data = {
        "sub": str(user['id']),
        "email": user['email'],
        "roles": roles,
        "token_version": user['token_version']
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await AuthService.store_refresh_token(user['id'], refresh_token, expires_at)
    
    user_public = UserPublic(
        id=user['id'],
        email=user['email'],
        full_name=user['full_name'],
        phone_number=user['phone_number'],
        date_of_birth=user['date_of_birth'],
        is_active=user['is_active'],
        is_doctor_requested=user['is_doctor_requested'],
        doctor_verification_status=user['doctor_verification_status'],
        roles=roles,
        created_at=user['created_at']
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_public
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    payload = decode_token(data.refresh_token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    user_id = int(sub)
    
    is_valid = await AuthService.verify_refresh_token(user_id, data.refresh_token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    
    user = await AuthService.get_user_by_id(user_id)
    if not user or not user['is_active']:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )
    
    if payload.get("token_version") != user['token_version']:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    
    roles = await AuthService.get_user_roles(user_id)
    
    token_data = {
        "sub": str(user_id),
        "email": user['email'],
        "roles": roles,
        "token_version": user['token_version']
    }
    
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    await AuthService.revoke_refresh_token(data.refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await AuthService.store_refresh_token(user_id, new_refresh_token, expires_at)
    
    user_public = UserPublic(
        id=user['id'],
        email=user['email'],
        full_name=user['full_name'],
        phone_number=user['phone_number'],
        date_of_birth=user['date_of_birth'],
        is_active=user['is_active'],
        is_doctor_requested=user['is_doctor_requested'],
        doctor_verification_status=user['doctor_verification_status'],
        roles=roles,
        created_at=user['created_at']
    )
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_public
    )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout and revoke refresh token"""
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all(current_user: User = Depends(get_current_user)):
    """Logout from all devices by revoking all refresh tokens"""
    await AuthService.revoke_all_user_tokens(current_user.id)
    return {"message": "Successfully logged out from all devices"}


@router.get("/profile/complete")
async def get_complete_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get complete user profile from both PostgreSQL and MongoDB"""
    user_id = current_user.id
    
    # Get user from PostgreSQL
    user = await AuthService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get profile from MongoDB
    from app.services.profile_sync import ProfileSyncService
    profile = await ProfileSyncService.get_complete_profile(user_id, db)
    
    return {
        "user": {
            "id": user['id'],
            "email": user['email'],
            "full_name": user['full_name'],
            "phone_number": user['phone_number'],
            "date_of_birth": user['date_of_birth'],
            "is_active": user['is_active'],
            "roles": await AuthService.get_user_roles(user['id']),
            "created_at": user['created_at']
        },
        "profile": profile or {
            "userId": str(user_id),
            "fullName": user['full_name'],
            "phone": user['phone_number'],
            "email": user['email'],
            "createdAt": user['created_at']
        }
    }


@router.get("/me", response_model=UserPublic)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        phone_number=current_user.phone_number,
        date_of_birth=current_user.date_of_birth,
        is_active=current_user.is_active,
        is_doctor_requested=current_user.is_doctor_requested,
        doctor_verification_status=current_user.doctor_verification_status,
        roles=current_user.roles,
        created_at=current_user.created_at
    )


@router.patch("/me", response_model=UserPublic)
async def update_current_user(
    data: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    updated = await AuthService.update_user(
        current_user.id,
        full_name=data.full_name,
        phone_number=data.phone_number,
        date_of_birth=data.date_of_birth
    )
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    roles = await AuthService.get_user_roles(current_user.id)
    
    return UserPublic(
        id=updated['id'],
        email=updated['email'],
        full_name=updated['full_name'],
        phone_number=updated['phone_number'],
        date_of_birth=updated['date_of_birth'],
        is_active=updated['is_active'],
        is_doctor_requested=updated['is_doctor_requested'],
        doctor_verification_status=updated['doctor_verification_status'],
        roles=roles,
        created_at=updated['created_at']
    )


@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change current user's password"""
    user = await AuthService.get_user_by_id(current_user.id)
    
    if not user or not verify_password(data.current_password, user['hashed_password']):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    await AuthService.change_password(current_user.id, data.new_password)
    
    return {"message": "Password changed successfully. Please login again."}


@router.get("/admin/pending-doctors")
async def get_pending_doctors(current_user: User = Depends(require_admin)):
    """Get all pending doctor verifications (admin only)"""
    pending = await AuthService.get_pending_doctors()
    return {"pending_doctors": pending}


@router.post("/admin/verify-doctor")
async def verify_doctor(
    data: DoctorVerificationRequest,
    current_user: User = Depends(require_admin)
):
    """Approve or reject doctor verification (admin only)"""
    user = await AuthService.get_user_by_id(data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user['is_doctor_requested']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has not requested doctor verification"
        )
    
    approved = data.action == "approve"
    await AuthService.verify_doctor(data.user_id, approved, data.notes)
    
    action_text = "approved" if approved else "rejected"
    return {"message": f"Doctor verification {action_text}"}


@router.get("/admin/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin)
):
    """Get all users (admin only)"""
    users, total = await AuthService.get_all_users(skip, limit)
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/admin/users/{user_id}/roles/{role_name}")
async def add_user_role(
    user_id: int,
    role_name: str,
    current_user: User = Depends(require_admin)
):
    """Add role to user (admin only)"""
    if role_name not in ["user", "doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role name"
        )
    
    await AuthService.add_role_to_user(user_id, role_name)
    return {"message": f"Role '{role_name}' added to user {user_id}"}


@router.delete("/admin/users/{user_id}/roles/{role_name}")
async def remove_user_role(
    user_id: int,
    role_name: str,
    current_user: User = Depends(require_admin)
):
    """Remove role from user (admin only)"""
    if role_name == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove base 'user' role"
        )
    
    await AuthService.remove_role_from_user(user_id, role_name)
    return {"message": f"Role '{role_name}' removed from user {user_id}"}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin)
):
    """Delete a user (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = await AuthService.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await AuthService.delete_user(user_id)
    
    logger.info(f"🗑️ Deleted user: {user_id} ({user['email']})")
    return {"message": f"User {user_id} deleted successfully"}

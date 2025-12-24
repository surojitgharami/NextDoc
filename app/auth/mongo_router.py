"""MongoDB Auth API Routes - User and Admin roles only (no doctor role)"""
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Optional
import logging

from motor.motor_asyncio import AsyncIOMotorDatabase
from .mongo_models import (
    UserRegister, UserLogin, TokenResponse, RefreshTokenRequest,
    UserPublic, UserUpdate, PasswordChange, Subscription,
    ForgotPasswordRequest, ResetPasswordRequest, SubscriptionUpdate
)
from .mongo_service import MongoAuthService
from .mongo_dependencies import (
    get_auth_service, get_current_user, require_admin, require_subscription
)
from .security import (
    create_access_token, create_refresh_token, decode_token,
    verify_password, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
)
from app.dependencies import get_database
from app.email import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


def user_to_public(user: dict) -> UserPublic:
    """Convert user document to public response"""
    sub_data = user.get('subscription', {})
    subscription = Subscription(
        plan=sub_data.get('plan', 'free'),
        status=sub_data.get('status', 'trial'),
        start_date=sub_data.get('start_date'),
        end_date=sub_data.get('end_date'),
        provider_subscription_id=sub_data.get('provider_subscription_id')
    )
    
    return UserPublic(
        id=user.get('id', str(user.get('_id', ''))),
        email=user.get('email', ''),
        full_name=user.get('full_name', ''),
        phone=user.get('phone'),
        is_active=user.get('is_active', True),
        email_verified=user.get('email_verified', False),
        roles=user.get('roles', ['user']),
        subscription=subscription,
        avatar_url=user.get('avatar_url'),
        created_at=user.get('created_at', datetime.utcnow())
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    background_tasks: BackgroundTasks,
    email: str = Form(...),
    password: str = Form(...),
    confirm_password: str = Form(...),
    full_name: str = Form(...),
    phone: Optional[str] = Form(None),
    terms_accepted: bool = Form(True),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Register a new user"""
    try:
        existing = await auth_service.get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        data = UserRegister(
            email=email,
            password=password,
            confirm_password=confirm_password,
            full_name=full_name,
            phone=phone,
            terms_accepted=terms_accepted
        )
        
        user = await auth_service.create_user(data)
        
        verification_token = await auth_service.create_email_verification_token(user['id'])
        logger.info(f"📧 Email verification token created for: {email}")
        
        background_tasks.add_task(
            email_service.send_verification_email,
            email, verification_token, full_name
        )
        
        roles = user.get('roles', ['user'])
        
        token_data = {
            "sub": user['id'],
            "email": user['email'],
            "roles": roles,
            "token_version": user.get('token_version', 0)
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        await auth_service.store_refresh_token(user['id'], refresh_token, expires_at)
        
        user_public = user_to_public(user)
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_public
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again later."
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Login and get access/refresh tokens"""
    user = await auth_service.authenticate_user(data.email, data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    roles = user.get('roles', ['user'])
    
    token_data = {
        "sub": user['id'],
        "email": user['email'],
        "roles": roles,
        "token_version": user.get('token_version', 0)
    }
    
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await auth_service.store_refresh_token(user['id'], refresh_token, expires_at)
    
    user_public = user_to_public(user)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_public
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    auth_service: MongoAuthService = Depends(get_auth_service)
):
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
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format"
        )
    
    is_valid = await auth_service.verify_refresh_token(user_id, data.refresh_token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if not user or not user.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated"
        )
    
    if payload.get("token_version") != user.get('token_version', 0):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked"
        )
    
    roles = user.get('roles', ['user'])
    
    token_data = {
        "sub": user_id,
        "email": user['email'],
        "roles": roles,
        "token_version": user.get('token_version', 0)
    }
    
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)
    
    await auth_service.revoke_refresh_token(data.refresh_token)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    await auth_service.store_refresh_token(user_id, new_refresh_token, expires_at)
    
    user_public = user_to_public(user)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_public
    )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout and revoke refresh token"""
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
async def logout_all(
    current_user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Logout from all devices by revoking all refresh tokens"""
    await auth_service.revoke_all_user_tokens(current_user['id'])
    return {"message": "Successfully logged out from all devices"}


@router.get("/me", response_model=UserPublic)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return user_to_public(current_user)


@router.patch("/me", response_model=UserPublic)
async def update_current_user(
    data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Update current user information"""
    updated = await auth_service.update_user(
        current_user['id'],
        full_name=data.full_name,
        phone=data.phone,
        avatar_url=data.avatar_url
    )
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_to_public(updated)


@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Change current user's password"""
    if not verify_password(data.current_password, current_user.get('password_hash', '')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    await auth_service.change_password(current_user['id'], data.new_password)
    
    return {"message": "Password changed successfully. Please login again."}


@router.get("/verify")
async def verify_email(
    token: str,
    background_tasks: BackgroundTasks,
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Verify email with token"""
    user_id = await auth_service.verify_email_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if user and user.get('email'):
        background_tasks.add_task(
            email_service.send_welcome_email,
            str(user.get('email')),
            user.get('full_name', 'User')
        )
    
    return {
        "message": "Email verified successfully",
        "status": "verified"
    }


@router.post("/resend-verification")
async def resend_verification(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Resend email verification link"""
    if current_user.get('email_verified', False):
        return {"message": "Email is already verified"}
    
    verification_token = await auth_service.create_email_verification_token(current_user['id'])
    
    user_email = current_user.get('email', '')
    background_tasks.add_task(
        email_service.send_verification_email,
        str(user_email),
        verification_token,
        current_user.get('full_name', 'User')
    )
    
    logger.info(f"📧 Verification email resent to: {current_user.get('email')}")
    return {"message": "Verification email sent. Please check your inbox."}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Request password reset"""
    user = await auth_service.get_user_by_email(data.email)
    token = await auth_service.create_password_reset_token(data.email)
    
    if token and user:
        logger.info(f"📧 Password reset token created for: {data.email}")
        background_tasks.add_task(
            email_service.send_password_reset_email,
            data.email,
            token,
            user.get('full_name', 'User')
        )
    
    return {"message": "If the email exists, a password reset link has been sent"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Reset password with token"""
    success = await auth_service.reset_password_with_token(data.token, data.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    return {"message": "Password reset successfully. Please login with your new password."}


@router.get("/subscription/status")
async def get_subscription_status(
    current_user: dict = Depends(get_current_user),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Get current user's subscription status"""
    is_active = await auth_service.check_subscription_active(current_user['id'])
    sub = current_user.get('subscription', {})
    
    return {
        "is_active": is_active,
        "plan": sub.get('plan', 'free'),
        "status": sub.get('status', 'trial'),
        "end_date": sub.get('end_date'),
        "provider_subscription_id": sub.get('provider_subscription_id')
    }


@router.get("/admin/users")
async def get_all_users(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Get all users (admin only)"""
    users, total = await auth_service.get_all_users(skip, limit)
    return {
        "users": users,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/admin/users/{user_id}/block")
async def block_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Block a user (admin only)"""
    if user_id == current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block your own account"
        )
    
    success = await auth_service.block_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await auth_service.log_audit(current_user['id'], "user_blocked", f"userId={user_id}")
    return {"message": f"User {user_id} blocked"}


@router.post("/admin/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Unblock a user (admin only)"""
    success = await auth_service.unblock_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await auth_service.log_audit(current_user['id'], "user_unblocked", f"userId={user_id}")
    return {"message": f"User {user_id} unblocked"}


@router.post("/admin/users/{user_id}/roles/{role_name}")
async def add_user_role(
    user_id: str,
    role_name: str,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Add role to user (admin only)"""
    if role_name not in ["user", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role name. Allowed: user, admin"
        )
    
    success = await auth_service.add_role(user_id, role_name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or role already assigned"
        )
    
    await auth_service.log_audit(
        current_user['id'], 
        "role_added", 
        f"userId={user_id}", 
        {"role": role_name}
    )
    return {"message": f"Role '{role_name}' added to user {user_id}"}


@router.delete("/admin/users/{user_id}/roles/{role_name}")
async def remove_user_role(
    user_id: str,
    role_name: str,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Remove role from user (admin only)"""
    if role_name == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove base 'user' role"
        )
    
    success = await auth_service.remove_role(user_id, role_name)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or role not assigned"
        )
    
    await auth_service.log_audit(
        current_user['id'], 
        "role_removed", 
        f"userId={user_id}", 
        {"role": role_name}
    )
    return {"message": f"Role '{role_name}' removed from user {user_id}"}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Delete a user (admin only)"""
    if user_id == current_user['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await auth_service.delete_user(user_id)
    await auth_service.log_audit(
        current_user['id'], 
        "user_deleted", 
        f"userId={user_id}", 
        {"email": user.get('email')}
    )
    
    return {"message": f"User {user_id} deleted successfully"}


@router.post("/admin/users/{user_id}/subscription")
async def update_user_subscription(
    user_id: str,
    data: SubscriptionUpdate,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Update user subscription (admin only)"""
    success = await auth_service.update_subscription(
        user_id,
        data.plan,
        data.status,
        data.end_date
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await auth_service.log_audit(
        current_user['id'], 
        "subscription_updated", 
        f"userId={user_id}", 
        {"plan": data.plan, "status": data.status}
    )
    
    return {"message": f"Subscription updated for user {user_id}"}


@router.post("/admin/users/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: str,
    new_password: str = Form(..., min_length=8),
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Reset user password (admin only)"""
    user = await auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await auth_service.change_password(user_id, new_password)
    await auth_service.log_audit(
        current_user['id'], 
        "password_reset_by_admin", 
        f"userId={user_id}"
    )
    
    return {"message": f"Password reset for user {user_id}"}


@router.get("/admin/logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service)
):
    """Get audit logs (admin only)"""
    logs = await auth_service.get_audit_logs(skip, limit)
    return {"logs": logs, "skip": skip, "limit": limit}


@router.get("/admin/analytics")
async def get_analytics(
    current_user: dict = Depends(require_admin),
    auth_service: MongoAuthService = Depends(get_auth_service),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get admin analytics (admin only)"""
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    verified_users = await db.users.count_documents({"email_verified": True})
    
    active_subscriptions = await db.users.count_documents({
        "subscription.status": {"$in": ["active", "trial"]}
    })
    
    plan_counts = {}
    for plan in ["free", "monthly", "annual"]:
        count = await db.users.count_documents({"subscription.plan": plan})
        plan_counts[plan] = count
    
    total_chats = await db.conversations.count_documents({})
    total_messages = await db.messages.count_documents({})
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "verified": verified_users
        },
        "subscriptions": {
            "active": active_subscriptions,
            "by_plan": plan_counts
        },
        "usage": {
            "total_chats": total_chats,
            "total_messages": total_messages
        }
    }


@router.get("/test-email")
async def test_email(
    to_email: str = "test@example.com",
    current_user: dict = Depends(get_current_user)
):
    """Test email sending (admin only) - sends a test email to verify configuration"""
    if "admin" not in current_user.get("roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        result = await email_service.send_email(
            to_email=to_email,
            subject="🧪 AI Doctor - Email Test",
            html_content="""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Email Configuration Test ✅</h2>
                <p>This is a test email from your AI Doctor backend.</p>
                <p>If you received this, your email system is working correctly!</p>
                <hr>
                <p><small>Sent at: """ + str(__import__('datetime').datetime.utcnow()) + """</small></p>
            </body>
            </html>
            """,
            text_content="Email configuration test - if you received this, it works!"
        )
        
        return {
            "message": "Test email sent successfully" if result else "Test email failed to send",
            "success": result,
            "recipient": to_email,
            "timestamp": str(__import__('datetime').datetime.utcnow())
        }
    except Exception as e:
        logger.error(f"Test email error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )

"""Custom Authentication Module - MongoDB-based (no doctor role)"""
from .mongo_router import router as auth_router
from .mongo_dependencies import (
    get_current_user, 
    get_optional_user,
    RoleChecker, 
    require_admin, 
    require_user,
    require_subscription,
    require_verified_email,
    get_auth_service
)
from .mongo_models import UserDocument, UserPublic, Subscription
from .mongo_service import MongoAuthService, create_auth_indexes

__all__ = [
    "auth_router",
    "get_current_user",
    "get_optional_user", 
    "RoleChecker",
    "require_admin",
    "require_user",
    "require_subscription",
    "require_verified_email",
    "get_auth_service",
    "UserDocument",
    "UserPublic",
    "Subscription",
    "MongoAuthService",
    "create_auth_indexes"
]

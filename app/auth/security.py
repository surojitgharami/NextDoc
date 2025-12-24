"""Security Utilities - Password Hashing and JWT Tokens"""
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
import jwt
import logging

logger = logging.getLogger(__name__)

BCRYPT_ROUNDS = 12

# JWT Configuration - Read from pydantic settings which loads from .env
def _get_jwt_secret() -> str:
    """Get JWT secret from settings or generate a random one with warning"""
    from app.config import settings
    if settings.JWT_SECRET:
        return settings.JWT_SECRET
    logger.warning("⚠️ JWT_SECRET not set! Using random secret. This will invalidate tokens on restart.")
    return secrets.token_urlsafe(32)

# Lazy initialization to allow settings to load first
_jwt_secret_cache: Optional[str] = None

def get_jwt_secret() -> str:
    """Get the JWT secret (cached after first access)"""
    global _jwt_secret_cache
    if _jwt_secret_cache is None:
        _jwt_secret_cache = _get_jwt_secret()
    return _jwt_secret_cache

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30


def _normalize_password(password: str) -> bytes:
    """Normalize password to bytes, handling bcrypt's 72-byte limit.
    
    For passwords longer than 72 bytes, we SHA-256 hash first.
    This maintains security while supporting any password length.
    """
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = hashlib.sha256(password_bytes).hexdigest().encode('utf-8')
    return password_bytes


def hash_password(password: str) -> str:
    """Hash password using bcrypt with 12 rounds."""
    password_bytes = _normalize_password(password)
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    password_bytes = _normalize_password(plain_password)
    hashed_bytes = hashed_password.encode('utf-8')
    try:
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.warning(f"Password verification error: {e}")
        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create short-lived access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create long-lived refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "iat": datetime.utcnow()
    })
    return jwt.encode(to_encode, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None


def hash_token(token: str) -> str:
    """Hash token for storage (refresh tokens)"""
    return hashlib.sha256(token.encode()).hexdigest()


def generate_secure_token() -> str:
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

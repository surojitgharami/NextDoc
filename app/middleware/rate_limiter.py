"""Rate limiting middleware for security-sensitive endpoints"""
import time
import logging
from typing import Dict, Tuple
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

logger = logging.getLogger(__name__)

class RateLimitStore:
    """In-memory rate limit storage with automatic cleanup"""
    
    def __init__(self):
        self.requests: Dict[str, list] = defaultdict(list)
        self.blocked: Dict[str, float] = {}
        self.last_cleanup = time.time()
    
    def cleanup(self):
        """Remove expired entries"""
        now = time.time()
        if now - self.last_cleanup < 60:
            return
        
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        for key in list(self.requests.keys()):
            self.requests[key] = [t for t in self.requests[key] if now - t < window]
            if not self.requests[key]:
                del self.requests[key]
        
        for key in list(self.blocked.keys()):
            if now > self.blocked[key]:
                del self.blocked[key]
        
        self.last_cleanup = now
    
    def is_blocked(self, key: str) -> bool:
        """Check if key is currently blocked"""
        if key in self.blocked:
            if time.time() < self.blocked[key]:
                return True
            del self.blocked[key]
        return False
    
    def record_request(self, key: str) -> Tuple[bool, int]:
        """Record a request and check if rate limited"""
        self.cleanup()
        
        if self.is_blocked(key):
            return True, 0
        
        now = time.time()
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        limit = settings.RATE_LIMIT_REQUESTS
        
        self.requests[key] = [t for t in self.requests[key] if now - t < window]
        self.requests[key].append(now)
        
        count = len(self.requests[key])
        
        if count > limit:
            self.blocked[key] = now + window
            logger.warning(f"Rate limit exceeded for {key}")
            return True, limit - count
        
        return False, limit - count
    
    def record_auth_failure(self, key: str):
        """Record authentication failure for stricter limiting"""
        now = time.time()
        self.requests[f"auth:{key}"] = self.requests.get(f"auth:{key}", [])
        self.requests[f"auth:{key}"].append(now)
        
        failures = [t for t in self.requests[f"auth:{key}"] if now - t < 300]
        self.requests[f"auth:{key}"] = failures
        
        if len(failures) >= 5:
            self.blocked[key] = now + 900
            logger.warning(f"Auth rate limit: blocking {key} for 15 minutes")


rate_limit_store = RateLimitStore()


RATE_LIMITED_PATHS = {
    "/api/auth/login": (10, 60),
    "/api/auth/register": (5, 60),
    "/api/auth/forgot-password": (3, 60),
    "/api/auth/reset-password": (5, 60),
    "/api/auth/verify": (10, 60),
    "/api/auth/resend-verification": (3, 300),
    "/api/v1/chat/message": (30, 60),
    "/api/v1/chat/stream": (30, 60),
    "/api/symptom-checker": (20, 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for rate limiting requests"""
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        config = None
        for pattern, limits in RATE_LIMITED_PATHS.items():
            if path.startswith(pattern):
                config = limits
                break
        
        if not config:
            return await call_next(request)
        
        limit, window = config
        
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        
        key = f"{path}:{client_ip}"
        
        if rate_limit_store.is_blocked(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window)}
            )
        
        is_limited, remaining = rate_limit_store.record_request(key)
        
        if is_limited:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window)}
            )
        
        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        response.headers["X-RateLimit-Limit"] = str(limit)
        
        return response


def get_rate_limiter():
    """Get rate limit store instance"""
    return rate_limit_store

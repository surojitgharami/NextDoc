"""Helper utility functions"""

from datetime import datetime, timezone
from typing import Any, Dict
import uuid


def generate_session_id() -> str:
    """Generate unique session ID"""
    return f"sess_{uuid.uuid4().hex[:16]}"


def generate_activity_id() -> str:
    """Generate unique activity ID"""
    return f"act_{uuid.uuid4().hex[:16]}"


def generate_reminder_id() -> str:
    """Generate unique reminder ID"""
    return f"rem_{uuid.uuid4().hex[:16]}"


def utc_now() -> datetime:
    """Get current UTC datetime"""
    return datetime.now(timezone.utc)


def format_activity_time(dt: datetime) -> str:
    """Format datetime for activity feed (e.g., '2 hours ago')"""
    now = utc_now()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    else:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days != 1 else ''} ago"


def sanitize_user_input(text: str) -> str:
    """Basic sanitization of user input"""
    return text.strip()[:5000]  # Limit to 5000 characters

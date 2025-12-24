"""Recent activity tracking feature"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List
from datetime import datetime
from app.database import get_database
from app.dependencies import get_current_user
from app.utils.helpers import format_activity_time
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/features/activity", tags=["Features - Activity"])


class ActivityItem(BaseModel):
    """Single activity item"""
    activity_type: str
    description: str
    time_ago: str
    created_at: datetime


class RecentActivityResponse(BaseModel):
    """Recent activity feed"""
    activities: List[ActivityItem]
    total_count: int


@router.get("/recent", response_model=RecentActivityResponse)
async def get_recent_activity(
    limit: int = 20,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get recent activity timeline for the user.
    
    Aggregates all user actions:
    - Chat sessions
    - Symptom checks
    - Vitals recorded
    - Medication reminders created
    
    Returns unified timeline in reverse chronological order.
    """
    user_id = current_user.get("sub")
    
    # Get activities from activities collection
    cursor = db.activities.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(limit)
    
    activities = await cursor.to_list(length=limit)
    
    activity_items = [
        ActivityItem(
            activity_type=activity["activity_type"],
            description=activity["description"],
            time_ago=format_activity_time(activity["created_at"]),
            created_at=activity["created_at"]
        )
        for activity in activities
    ]
    
    return RecentActivityResponse(
        activities=activity_items,
        total_count=len(activity_items)
    )

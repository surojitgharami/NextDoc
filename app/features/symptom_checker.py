"""Symptom checker feature - AI-powered triage"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from app.database import get_database
from app.dependencies import get_current_user
from app.ai_engine.inference import deepseek_engine
from app.utils.helpers import generate_activity_id, utc_now, sanitize_user_input
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/features/symptom-checker", tags=["Features - Symptom Checker"])


class SymptomCheckRequest(BaseModel):
    """Request for symptom analysis"""
    symptoms: str = Field(..., min_length=3, max_length=2000, description="Symptoms description")


class SymptomCheckResponse(BaseModel):
    """Symptom analysis response"""
    symptoms_provided: str
    analysis: str
    urgency: str = Field(..., description="ROUTINE, URGENT, or EMERGENCY")
    activity_id: str


@router.post("/check", response_model=SymptomCheckResponse)
async def check_symptoms(
    request: SymptomCheckRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Analyze symptoms and provide AI-powered triage recommendations.
    
    Returns:
    - Possible conditions
    - Urgency level (ROUTINE, URGENT, EMERGENCY)
    - Recommended actions
    - Red flag warnings
    """
    user_id = current_user.get("sub")
    
    # Sanitize input
    symptoms = sanitize_user_input(request.symptoms)
    
    # Analyze with AI
    analysis = await deepseek_engine.analyze_symptoms(symptoms)
    
    # Generate activity ID
    activity_id = generate_activity_id()
    
    # Log activity
    activity_doc = {
        "activity_id": activity_id,
        "user_id": user_id,
        "activity_type": "symptom_check",
        "description": f"Symptom check: {symptoms[:100]}",
        "data": {
            "symptoms": symptoms,
            "urgency": analysis["urgency"],
            "analysis": analysis["recommendations"][:500]
        },
        "created_at": utc_now()
    }
    
    await db.activities.insert_one(activity_doc)
    logger.info(f"Symptom check completed for user {user_id}, urgency: {analysis['urgency']}")
    
    return SymptomCheckResponse(
        symptoms_provided=symptoms,
        analysis=analysis["recommendations"],
        urgency=analysis["urgency"],
        activity_id=activity_id
    )

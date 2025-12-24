from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from app.utils.sanitizer import sanitize_user_input
from app.ai_engine.inference import deepseek_engine
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/symptom-checker", tags=["Symptom Checker"])


class SymptomCheckRequest(BaseModel):
    conversationId: str
    userId: str
    symptoms: str = Field(..., min_length=3, max_length=2000)


class SymptomAssessmentResponse(BaseModel):
    id: str
    conversationId: str
    userId: str
    symptoms: str
    reasoning: str
    assessment: str
    recommendations: str
    createdAt: datetime


class SymptomCheckResponse(BaseModel):
    assessment: SymptomAssessmentResponse
    reasoning: List[str]
    recommendations: List[str]


@router.post("", response_model=SymptomCheckResponse)
async def check_symptoms(
    request: SymptomCheckRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if request.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot check symptoms for other users"
        )
    
    try:
        conv_obj_id = ObjectId(request.conversationId)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    conversation = await db.conversations.find_one({"_id": conv_obj_id})
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's conversations"
        )
    
    clean_symptoms = sanitize_user_input(request.symptoms)
    
    ai_response = await deepseek_engine.analyze_symptoms(clean_symptoms)
    
    assessment_doc = {
        "conversationId": request.conversationId,
        "userId": request.userId,
        "symptoms": clean_symptoms,
        "reasoning": ai_response.get("reasoning", ""),
        "assessment": ai_response.get("urgency", "ROUTINE"),
        "recommendations": ai_response.get("recommendations", ""),
        "createdAt": utc_now()
    }
    
    result = await db.symptomAssessments.insert_one(assessment_doc)
    
    return SymptomCheckResponse(
        assessment=SymptomAssessmentResponse(
            id=str(result.inserted_id),
            conversationId=request.conversationId,
            userId=request.userId,
            symptoms=clean_symptoms,
            reasoning=assessment_doc["reasoning"],
            assessment=assessment_doc["assessment"],
            recommendations=assessment_doc["recommendations"],
            createdAt=assessment_doc["createdAt"]
        ),
        reasoning=[ai_response.get("reasoning", "")],
        recommendations=[ai_response.get("recommendations", "")]
    )

"""Text-to-Speech API for Read Aloud functionality"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import httpx
import os

from app.dependencies import get_current_user, get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tts", tags=["Text-to-Speech"])

SYNTH_ENDPOINT = os.getenv("SYNTH_ENDPOINT", "")


@router.get("")
async def get_tts_audio(
    text: str = Query(..., min_length=1, max_length=5000, description="Text to convert to speech"),
    voice: str = Query("alloy", description="Voice to use (alloy, echo, fable, onyx, nova, shimmer)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get audio URL or data for text-to-speech.
    
    If SYNTH_ENDPOINT is configured, uses external TTS service.
    Otherwise, returns instructions for client-side Web Speech API fallback.
    """
    
    if SYNTH_ENDPOINT:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    SYNTH_ENDPOINT,
                    json={
                        "text": text,
                        "voice": voice
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "audio_url": data.get("audio_url"),
                        "method": "synth_service",
                        "voice": voice
                    }
                else:
                    logger.warning(f"Synth service returned {response.status_code}")
        except Exception as e:
            logger.error(f"Synth service error: {e}")
    
    return {
        "audio_url": None,
        "method": "web_speech_api",
        "text": text,
        "voice": voice,
        "instructions": "Use browser's SpeechSynthesis API for text-to-speech"
    }


@router.get("/voices")
async def get_available_voices(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of available TTS voices"""
    
    voices = [
        {"id": "alloy", "name": "Alloy", "description": "Neutral and balanced"},
        {"id": "echo", "name": "Echo", "description": "Warm and conversational"},
        {"id": "fable", "name": "Fable", "description": "Expressive and dynamic"},
        {"id": "onyx", "name": "Onyx", "description": "Deep and authoritative"},
        {"id": "nova", "name": "Nova", "description": "Bright and energetic"},
        {"id": "shimmer", "name": "Shimmer", "description": "Soft and gentle"}
    ]
    
    return {
        "voices": voices,
        "default": "alloy",
        "note": "If external TTS service is unavailable, browser's Web Speech API will be used as fallback"
    }

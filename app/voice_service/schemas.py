"""Pydantic schemas for voice service endpoints."""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class TranscribeResponse(BaseModel):
    """Response from transcribe endpoint."""
    text: str
    source: str  # "openai" or "colab"


class SynthesizeRequest(BaseModel):
    """Request body for synthesize endpoint."""
    text: str
    voice_options: Optional[Dict[str, Any]] = None
    language: Optional[str] = "en"


class SynthesizeResponse(BaseModel):
    """Response from synthesize endpoint."""
    audio_url: str
    duration_ms: Optional[int] = None
    format: str = "audio/wav"


class S2SResponse(BaseModel):
    """Response from speech-to-speech endpoint."""
    request_text: str
    reply_text: str
    audio_url: str
    duration_ms: Optional[int] = None


class VoiceTextReplyResponse(BaseModel):
    """Response from voice-to-text-reply endpoint."""
    request_text: str
    reply_text: str

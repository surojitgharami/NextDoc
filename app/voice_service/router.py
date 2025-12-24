"""FastAPI router for voice service endpoints."""
import re
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from app.config import settings
from .schemas import TranscribeResponse, SynthesizeRequest, SynthesizeResponse, S2SResponse, VoiceTextReplyResponse
from .client import (
    forward_to_remote_transcribe,
    forward_to_remote_synthesize,
    call_ai_model_reply
)

router = APIRouter()


def sanitize_reply_text(text: str) -> str:
    """
    Sanitize AI model reply by removing chain-of-thought content and internal reasoning markers.
    
    Removes:
    - Content inside <think>...</think> tags
    - Common chain-of-thought prefixes (case-insensitive)
    - Leading "Expert Medical Answer:" and similar prefixes
    - Extra whitespace and repeated newlines
    
    Args:
        text: Raw model output text
        
    Returns:
        Cleaned text safe for display and TTS
    """
    if not text:
        return ""
    
    cleaned = text
    
    # Remove <think>...</think> blocks (DOTALL mode for multiline)
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL | re.IGNORECASE)
    
    # Remove other XML/HTML-like tags
    cleaned = re.sub(r'<\/[^>]+>', '', cleaned)
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    
    # Remove common chain-of-thought leading phrases (case-insensitive)
    phrases_to_remove = [
        r'^[\s*]*expert\s+medical\s+answer\s*:?\s*',
        r'^[\s*]*expert\s+medical\s+response\s*:?\s*',
        r'^[\s*]*medical\s+advice\s*:?\s*',
        r'^[\s*]*analysis\s*:?\s*',
        r'^[\s*]*let(?:\'s|\s+)(?:think|me\s+think)\s*:?\s*',
        r'^[\s*]*thinking\.\.\.\s*',
        r'^[\s*]*hmm\s*:?\s*',
        r'^[\s*]*now\s+let(?:\'s|\s+)(?:think|see)\s*:?\s*',
    ]
    
    for phrase in phrases_to_remove:
        cleaned = re.sub(phrase, '', cleaned, flags=re.IGNORECASE)
    
    # Collapse repeated whitespace and newlines
    cleaned = re.sub(r'\n\n+', '\n\n', cleaned)
    cleaned = re.sub(r' +', ' ', cleaned)
    
    # Trim leading/trailing whitespace
    cleaned = cleaned.strip()
    
    return cleaned


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)) -> TranscribeResponse:
    """
    Transcribe audio file to text using local Colab Whisper service.
    
    Uses remote VOICE_REMOTE_URL for transcription.
    """
    try:
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        if not settings.VOICE_REMOTE_URL:
            raise HTTPException(
                status_code=503,
                detail="Voice service not configured (set VOICE_REMOTE_URL to your Colab ngrok URL)"
            )
        
        try:
            text = forward_to_remote_transcribe(content)
            return TranscribeResponse(text=text, source="colab")
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"Transcription failed: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")


@router.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize(req: SynthesizeRequest) -> SynthesizeResponse:
    """
    Synthesize text to speech using Colab Coqui XTTS v2 service.
    
    Forwards to remote VOICE_REMOTE_URL for text-to-speech.
    """
    try:
        if not settings.VOICE_REMOTE_URL:
            raise HTTPException(
                status_code=503,
                detail="Voice service not configured (set VOICE_REMOTE_URL to your Colab ngrok URL)"
            )
        
        try:
            result = forward_to_remote_synthesize(req.text, req.language or "en")
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"TTS failed: {str(e)}")
        
        return SynthesizeResponse(
            audio_url=result.get("audio_url", ""),
            duration_ms=result.get("duration_ms"),
            format=result.get("format", "audio/wav")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis error: {str(e)}")


@router.post("/s2s", response_model=S2SResponse)
async def speech_to_speech(file: UploadFile = File(...)) -> S2SResponse:
    """
    Full speech-to-speech pipeline using Colab service:
    1. Transcribe user audio to text (STT via Colab Whisper)
    2. Send text to AI model for reply
    3. Sanitize reply to remove chain-of-thought content
    4. Synthesize cleaned AI reply to audio (TTS via Colab Coqui)
    """
    try:
        if not settings.VOICE_REMOTE_URL:
            raise HTTPException(
                status_code=503,
                detail="Voice service not configured (set VOICE_REMOTE_URL)"
            )
        
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Step 1: Transcribe
        try:
            user_text = forward_to_remote_transcribe(content)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"STT failed: {str(e)}")
        
        # Step 2: Get AI reply
        try:
            reply_text_raw = call_ai_model_reply(user_text)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"AI model failed: {str(e)}")
        
        # Step 3: Sanitize reply
        reply_text = sanitize_reply_text(reply_text_raw)
        
        # Step 4: Synthesize cleaned reply
        try:
            audio_result = forward_to_remote_synthesize(reply_text, "en")
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"TTS failed: {str(e)}")
        
        return S2SResponse(
            request_text=user_text,
            reply_text=reply_text,
            audio_url=audio_result.get("audio_url", ""),
            duration_ms=audio_result.get("duration_ms")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"S2S error: {str(e)}")


@router.post("/voice-text-reply", response_model=VoiceTextReplyResponse)
async def voice_text_reply(file: UploadFile = File(...)) -> VoiceTextReplyResponse:
    """
    Voice input to text reply:
    1. Transcribe user audio to text (STT via Colab Whisper)
    2. Send text to AI model for reply (returns text only, no audio synthesis)
    
    Returns transcribed user text and AI model's text reply.
    """
    try:
        if not settings.VOICE_REMOTE_URL:
            raise HTTPException(
                status_code=503,
                detail="Voice service not configured (set VOICE_REMOTE_URL)"
            )
        
        content = await file.read()
        
        if not content:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Step 1: Transcribe
        try:
            user_text = forward_to_remote_transcribe(content)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"STT failed: {str(e)}")
        
        # Step 2: Get AI reply
        try:
            reply_text = call_ai_model_reply(user_text)
        except ValueError as e:
            raise HTTPException(status_code=503, detail=f"AI model failed: {str(e)}")
        
        return VoiceTextReplyResponse(
            request_text=user_text,
            reply_text=reply_text
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice-to-text-reply error: {str(e)}")

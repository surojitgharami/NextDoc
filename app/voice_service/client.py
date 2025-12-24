"""Client utilities for forwarding to external voice services and AI endpoints."""
import requests
import tempfile
from typing import Optional
from app.config import settings
import logging
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# Suppress SSL verification warnings for ngrok endpoints
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Create session with connection pooling and better timeout handling
session = requests.Session()
session.headers.update({
    'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Connection': 'keep-alive',
    'ngrok-skip-browser-warning': 'true',
    'Accept': '*/*'
})

# For ngrok endpoints: disable SSL verification (self-signed certificates)
session.verify = False

# Configure connection pooling
adapter = HTTPAdapter(pool_connections=10,
                      pool_maxsize=10,
                      max_retries=Retry(total=1,
                                        backoff_factor=0.1,
                                        status_forcelist=[500, 502, 503, 504]))
session.mount('https://', adapter)
session.mount('http://', adapter)


def forward_to_remote_transcribe(file_bytes: bytes) -> str:
    """
    Forward audio to remote Colab transcribe service.

    Args:
        file_bytes: Raw audio file bytes

    Returns:
        Transcribed text

    Raises:
        ValueError: If VOICE_REMOTE_URL not set or service fails
    """
    if not settings.VOICE_REMOTE_URL:
        raise ValueError("VOICE_REMOTE_URL not configured")

    url = f"{settings.VOICE_REMOTE_URL.rstrip('/')}/transcribe"
    files = {"file": ("audio.webm", file_bytes, "audio/webm")}

    try:
        logger.info(f"Sending transcribe request to: {url}")
        response = session.post(url, files=files, timeout=60)
        response.raise_for_status()
        return response.json().get("text", "")
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error to {url}: {str(e)}")
        raise ValueError(
            f"Remote transcribe failed: Connection error - {str(e)}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error to {url}: {str(e)}")
        raise ValueError(f"Remote transcribe failed: {str(e)}")


def forward_to_remote_synthesize(text: str, language: str = "en") -> dict:
    """
    Forward text to remote Coqui XTTS v2 synthesis service.

    Args:
        text: Text to synthesize
        language: Language code (default: "en")

    Returns:
        Dict with audio_url and duration_ms

    Raises:
        ValueError: If VOICE_REMOTE_URL not set or synthesis fails
    """
    if not settings.VOICE_REMOTE_URL:
        raise ValueError("VOICE_REMOTE_URL not configured")

    url = f"{settings.VOICE_REMOTE_URL.rstrip('/')}/synthesize"
    payload = {"text": text, "language": language}

    try:
        logger.info(f"Sending synthesize request to: {url}")
        response = session.post(url, json=payload, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error to {url}: {str(e)}")
        raise ValueError(
            f"Remote synthesize failed: Connection error - {str(e)}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error to {url}: {str(e)}")
        raise ValueError(f"Remote synthesize failed: {str(e)}")


def call_ai_model_reply(user_text: str,
                        session_id: Optional[str] = None) -> str:
    """
    Call AI model to generate reply text from user message.

    Args:
        user_text: User's input text
        session_id: Optional session ID for conversation context

    Returns:
        AI model's reply text

    Raises:
        ValueError: If AI endpoint fails or returns invalid response
    """
    if not settings.CUSTOM_API_URL:
        raise ValueError("CUSTOM_API_URL not configured")

    # Headers for ngrok and general requests
    headers = {
        'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'ngrok-skip-browser-warning': 'true',
        'Accept': 'application/json'
    }
    if settings.AI_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {settings.AI_AUTH_TOKEN}"

    # Prepare payload for Colab AI model endpoint
    payload = {
        "message": user_text,
        "session_id": session_id or "voice_session"
    }

    try:
        ai_endpoint = settings.CUSTOM_API_URL
        logger.info(f"Calling AI model at: {ai_endpoint}")
        response = requests.post(ai_endpoint,
                                 json=payload,
                                 headers=headers,
                                 timeout=120,
                                 verify=False)
        response.raise_for_status()

        body = response.json()

        # Try common response fields from AI model
        reply = body.get("reply") or body.get("message") or body.get(
            "text") or body.get("response")

        if isinstance(reply, dict):
            reply = reply.get("text") or reply.get("content") or str(reply)

        if reply:
            return str(reply)

        return str(body)

    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error to AI model: {str(e)}")
        raise ValueError(f"AI model call failed: Connection error - {str(e)}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error to AI model: {str(e)}")
        raise ValueError(f"AI model call failed: {str(e)}")

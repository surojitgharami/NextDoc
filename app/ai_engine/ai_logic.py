"""
AI Inference Logic - Custom API Endpoint Only

Uses a custom inference endpoint (Colab Ngrok or HuggingFace) for all AI operations.
No OpenRouter or model switching - single unified interface.
"""

import httpx
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)


class AIInferenceError(Exception):
    """Custom exception for AI inference errors"""
    pass


async def generate_medical_reply(
    user_message: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 800
) -> Dict[str, Any]:
    """
    Generate medical AI response using custom API endpoint.
    
    This is the ONLY inference function - sends all requests to CUSTOM_API_URL.
    Supports both:
    - Colab Ngrok: https://your-ngrok-id.ngrok-free.dev
    - HuggingFace: https://api-inference.huggingface.co/models/...
    
    Args:
        user_message: Patient's question or message
        system_prompt: Optional system prompt (ignored - endpoint handles its own prompting)
        max_tokens: Maximum tokens to generate
        
    Returns:
        Dictionary with:
        - reply: Generated response text
        - thinking: Reasoning/thinking process from model
        - model: "custom-api"
        - model_id: "custom-endpoint"
        
    Raises:
        AIInferenceError: If CUSTOM_API_URL is not configured or inference fails
    """
    if not settings.CUSTOM_API_URL:
        raise AIInferenceError(
            "CUSTOM_API_URL environment variable is not configured. "
            "Set it to your Colab Ngrok endpoint (https://xxx.ngrok-free.dev) "
            "or HuggingFace inference URL."
        )
    
    endpoint_url = None
    try:
        # Construct full endpoint URL
        endpoint_url = settings.CUSTOM_API_URL
        # If URL doesn't contain /api/v1/chat/message, append it (for Colab Ngrok)
        if "/api/v1/chat/message" not in endpoint_url:
            endpoint_url = endpoint_url.rstrip("/") + "/api/v1/chat/message"
        
        logger.info(f"🔌 Sending inference request to: {endpoint_url}")
        
        payload = {
            "message": user_message,
            "max_tokens": max_tokens
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(endpoint_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            logger.info(f"✅ AI response received ({len(data.get('reply', ''))} chars)")
            
            return {
                "reply": data.get("reply", ""),
                "thinking": data.get("thinking", ""),
                "model": "custom-api",
                "model_id": "custom-endpoint"
            }
            
    except httpx.TimeoutException:
        logger.error(f"❌ Timeout: No response from {endpoint_url or settings.CUSTOM_API_URL} within 120s")
        raise AIInferenceError("AI service timeout - endpoint took too long to respond")
        
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ API Error: {e.response.status_code}\n{e.response.text}")
        raise AIInferenceError(f"AI service error: HTTP {e.response.status_code} - {e.response.reason_phrase}")
        
    except httpx.RequestError as e:
        logger.error(f"❌ Connection failed: {e}")
        raise AIInferenceError(f"Cannot reach AI endpoint: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise AIInferenceError(f"AI service error: {str(e)}")


def get_runtime_info() -> Dict[str, Any]:
    """
    Get information about current AI runtime configuration.
    
    Returns:
        Dictionary with runtime configuration details
    """
    return {
        "runtime": "custom-api",
        "endpoint": settings.CUSTOM_API_URL if settings.CUSTOM_API_URL else "NOT CONFIGURED",
        "endpoint_configured": bool(settings.CUSTOM_API_URL),
        "inference_mode": "single-endpoint-only"
    }

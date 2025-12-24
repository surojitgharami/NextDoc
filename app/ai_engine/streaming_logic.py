"""
Streaming AI Logic - Custom API Endpoint Only

Handles token-by-token streaming from custom inference endpoint (Colab Ngrok or HuggingFace).
No OpenRouter or model switching - unified custom API interface only.
"""

import httpx
import logging
import json
from typing import AsyncGenerator, Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class StreamingAIError(Exception):
    """Custom exception for streaming AI errors"""
    pass


async def stream_answer_only(
    user_message: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 800
) -> AsyncGenerator[str, None]:
    """
    Stream ONLY the answer text token-by-token from custom API endpoint.
    
    This is what the frontend sees - clean response tokens for typing animation.
    
    Args:
        user_message: Patient's question
        system_prompt: Optional system prompt (ignored - endpoint handles its own prompting)
        max_tokens: Maximum tokens to generate
        
    Yields:
        Individual tokens from the model response
        
    Raises:
        StreamingAIError: If CUSTOM_API_URL not configured or streaming fails
    """
    if not settings.CUSTOM_API_URL:
        raise StreamingAIError(
            "CUSTOM_API_URL environment variable is not configured. "
            "Set it to your Colab Ngrok endpoint or HuggingFace inference URL."
        )
    
    try:
        logger.info(f"Starting stream to CUSTOM_API_URL: {settings.CUSTOM_API_URL}")
        
        payload = {
            "message": user_message,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", settings.CUSTOM_API_URL, json=payload) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            # Try to parse as JSON (streaming format)
                            if line.startswith("data: "):
                                data_str = line[6:]
                                if data_str == "[DONE]":
                                    break
                                data = json.loads(data_str)
                                token = data.get("token", "")
                                if token:
                                    yield token
                            else:
                                # Fallback: treat as plain text token
                                yield line
                        except json.JSONDecodeError:
                            # If not JSON, yield as-is
                            if line and line != "[DONE]":
                                yield line
                
                logger.info(f"✅ Stream completed")
                
    except httpx.TimeoutException:
        logger.error("❌ Custom API stream timeout")
        raise StreamingAIError("AI service timeout - please try again")
        
    except httpx.HTTPStatusError as e:
        logger.error(f"❌ Custom API stream HTTP error: {e.response.status_code}")
        raise StreamingAIError(f"AI service error: HTTP {e.response.status_code}")
        
    except httpx.RequestError as e:
        logger.error(f"❌ Custom API stream request error: {e}")
        raise StreamingAIError(f"Failed to connect to AI service: {str(e)}")
        
    except Exception as e:
        logger.error(f"❌ Unexpected streaming error: {e}")
        raise StreamingAIError(f"Streaming failed: {str(e)}")

"""
AI Inference Logic — Custom API Endpoint with Clean Response Pipeline

Sends all requests to CUSTOM_API_URL (Lightning.AI / Colab Ngrok / HuggingFace).
All reasoning tokens (<think>, Medical Reasoning Process, etc.) are stripped
before any response reaches the caller.
"""

import httpx
import logging
from typing import Dict, Any, Optional, List
from app.config import settings
from app.ai_engine.inference import clean_response

logger = logging.getLogger(__name__)


class AIInferenceError(Exception):
    pass


async def generate_medical_reply(
    user_message: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 512,
    previous_summary: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Generate a clean medical AI response using the custom API endpoint.

    Chat memory is injected when previous_summary is provided:

        Patient History:
        {summary}

        Current Question:
        {user_message}

        Provide a medical response.

    Args:
        user_message         : Patient's question or message.
        system_prompt        : Ignored — endpoint manages its own system prompt.
        max_tokens           : Maximum tokens to generate.
        previous_summary     : Summarized history from prior chat sessions.
        conversation_history : Recent in-session turns [{role, content}].

    Returns:
        {
            'reply'    : '<clean doctor response>',
            'thinking' : '',            # always empty — reasoning is never exposed
            'model'    : 'custom-api',
            'model_id' : 'custom-endpoint',
        }

    Raises:
        AIInferenceError: If CUSTOM_API_URL is not configured or request fails.
    """
    if not settings.CUSTOM_API_URL:
        raise AIInferenceError(
            'CUSTOM_API_URL is not configured. '
            'Set it to your Lightning.AI / Colab Ngrok endpoint.'
        )

    endpoint_url = settings.CUSTOM_API_URL
    if '/api/v1/chat/message' not in endpoint_url:
        endpoint_url = endpoint_url.rstrip('/') + '/api/v1/chat/message'

    payload = {
        'message': user_message,
        'previous_summary': previous_summary or '',
        'context': conversation_history or [],
        'max_tokens': max_tokens,
    }

    logger.info(f'🔌 Sending inference request → {endpoint_url}')

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(endpoint_url, json=payload)
            response.raise_for_status()

            data = response.json()
            raw_reply = data.get('reply', '')

            cleaned = clean_response(raw_reply)

            logger.info(f'✅ AI response received ({len(cleaned)} chars, reasoning stripped)')

            return {
                'reply': cleaned,
                'thinking': '',
                'model': 'custom-api',
                'model_id': 'custom-endpoint',
            }

    except httpx.TimeoutException:
        logger.error(f'❌ Timeout: no response from {endpoint_url} within 120s')
        raise AIInferenceError('AI service timeout — endpoint took too long to respond')

    except httpx.HTTPStatusError as e:
        logger.error(f'❌ API error: {e.response.status_code}\n{e.response.text}')
        raise AIInferenceError(
            f'AI service error: HTTP {e.response.status_code} — {e.response.reason_phrase}'
        )

    except httpx.RequestError as e:
        logger.error(f'❌ Connection failed: {e}')
        raise AIInferenceError(f'Cannot reach AI endpoint: {str(e)}')

    except Exception as e:
        logger.error(f'❌ Unexpected error: {e}')
        raise AIInferenceError(f'AI service error: {str(e)}')


def get_runtime_info() -> Dict[str, Any]:
    return {
        'runtime': 'custom-api',
        'endpoint': settings.CUSTOM_API_URL or 'NOT CONFIGURED',
        'endpoint_configured': bool(settings.CUSTOM_API_URL),
        'inference_mode': 'single-endpoint-only',
        'reasoning_exposed': False,
    }

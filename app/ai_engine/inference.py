"""AI inference engine — Custom API endpoint (Lightning.AI / Colab Ngrok / HuggingFace)"""

import re
import httpx
import logging
from typing import List, Dict, Optional
from app.config import settings
from datetime import datetime

logger = logging.getLogger(__name__)


# ── Reasoning-token patterns to strip from ANY response ────────────────────
_THINK_PATTERNS = [
    re.compile(r'<think>.*?</think>', re.DOTALL | re.IGNORECASE),
    re.compile(r'<thinking>.*?</thinking>', re.DOTALL | re.IGNORECASE),
    re.compile(r'<think>.*?$', re.DOTALL | re.IGNORECASE),
    re.compile(r'^.*?</think>', re.DOTALL | re.IGNORECASE),
    re.compile(r'Medical Reasoning Process:.*?(?=\n[A-Z]|$)', re.DOTALL),
    re.compile(r'Internal Reasoning:.*?(?=\n[A-Z]|$)', re.DOTALL),
    re.compile(r'Chain of Thought:.*?(?=\n[A-Z]|$)', re.DOTALL),
    re.compile(r'Step-by-step reasoning:.*?(?=\n[A-Z]|$)', re.DOTALL | re.IGNORECASE),
    re.compile(r'Let me think.*?(?=\n[A-Z]|$)', re.DOTALL | re.IGNORECASE),
]

_RESPONSE_HEADERS = [
    'Expert Medical Answer:', 'Medical Answer:', 'Answer:',
    'Doctor:', 'Response:', 'Final Answer:',
]

MEDICAL_DISCLAIMER = (
    "\n\n---\n"
    "*This information is for educational purposes only and does not replace professional "
    "medical advice. Please consult a qualified healthcare provider for diagnosis and treatment.*"
)


def clean_response(raw_output: str, add_disclaimer: bool = True) -> str:
    """
    Strip all reasoning / think tokens from model output.
    Returns a clean, professional doctor response.
    """
    text = raw_output

    for pattern in _THINK_PATTERNS:
        text = pattern.sub('', text)

    for header in _RESPONSE_HEADERS:
        stripped = text.lstrip()
        if stripped.startswith(header):
            text = stripped[len(header):]

    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()

    if not text:
        text = (
            'I was unable to generate a clear response for your question. '
            'Please consult a qualified healthcare provider for this concern.'
        )

    if add_disclaimer:
        text += MEDICAL_DISCLAIMER

    return text


class CustomAPIEngine:
    """
    Inference engine that forwards requests to the Lightning.AI / Colab Ngrok
    custom endpoint.  All responses are cleaned of reasoning tokens before
    being returned to callers.
    """

    def __init__(self):
        self.api_url = settings.CUSTOM_API_URL
        self.timeout = 120

    # ── Internal helpers ───────────────────────────────────────────────────

    def _build_url(self) -> str:
        url = self.api_url
        if url and '/api/v1/chat/message' not in url:
            url = url.rstrip('/') + '/api/v1/chat/message'
        return url

    def _build_payload(
        self,
        query: str,
        previous_summary: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 512,
        temperature: float = 0.6,
        mode: str = 'medical',
    ) -> dict:
        """
        Build the JSON body sent to the inference endpoint.

        Chat memory injection:
            If previous_summary is present it is passed as 'previous_summary'
            so the inference server can prepend:

                Patient History:
                {summary}

                Current Question:
                {query}

                Provide a medical response.
        """
        return {
            'message': query,
            'previous_summary': previous_summary or '',
            'context': conversation_history or [],
            'max_tokens': max_tokens,
            'temperature': temperature,
            'mode': mode,
        }

    # ── Public interface ───────────────────────────────────────────────────

    async def generate_medical_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        previous_summary: Optional[str] = None,
        max_tokens: int = 512,
        temperature: float = 0.6,
    ) -> Dict[str, str]:
        """
        Generate a clean medical AI response.

        Args:
            query                : Patient's current message.
            conversation_history : Recent in-session turns [{role, content}].
            previous_summary     : Summarized history from prior sessions.
            max_tokens           : Maximum tokens to generate.
            temperature          : Sampling temperature.

        Returns:
            {'thinking': '', 'response': '<clean doctor reply>'}
        """
        endpoint = self._build_url()
        payload = self._build_payload(
            query=query,
            previous_summary=previous_summary,
            conversation_history=conversation_history,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()

                data = response.json()
                raw_reply = data.get('reply', '')
                cleaned = clean_response(raw_reply)

                logger.info(f'✅ Medical response generated ({len(cleaned)} chars)')
                return {'thinking': '', 'response': cleaned}

        except httpx.TimeoutException:
            logger.error('❌ AI inference timeout')
            return {
                'thinking': '',
                'response': (
                    'I apologize, but the AI service is taking longer than expected. '
                    'Please try again in a moment.'
                ),
            }
        except httpx.HTTPError as e:
            logger.error(f'❌ AI inference HTTP error: {e}')
            return {
                'thinking': '',
                'response': (
                    'I apologize, but I am having trouble connecting to the AI service. '
                    'Please try again shortly.'
                ),
            }
        except Exception as e:
            logger.error(f'❌ AI inference error: {e}')
            return {
                'thinking': '',
                'response': (
                    'I apologize, but I am unable to process your request right now. '
                    'Please try again or contact support if the issue persists.'
                ),
            }

    async def analyze_symptoms(
        self,
        symptoms: str,
        max_tokens: int = 512,
        temperature: float = 0.5,
    ) -> Dict[str, str]:
        """
        Analyze symptoms — delegates to generate_medical_response with symptom_checker mode.
        """
        result = await self.generate_medical_response(
            query=symptoms,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        cleaned = result['response']
        return {
            'raw_analysis': cleaned,
            'symptoms_provided': symptoms,
            'urgency': self._extract_urgency(cleaned),
            'reasoning': '',
            'recommendations': cleaned,
        }

    def _extract_urgency(self, text: str) -> str:
        text_upper = text.upper()
        if 'EMERGENCY' in text_upper or '911' in text_upper or 'IMMEDIATELY' in text_upper:
            return 'EMERGENCY'
        elif 'URGENT' in text_upper or 'SOON AS POSSIBLE' in text_upper:
            return 'URGENT'
        else:
            return 'ROUTINE'


# Global singleton
deepseek_engine = CustomAPIEngine()

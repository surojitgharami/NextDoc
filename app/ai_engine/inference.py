"""AI inference engine using custom API endpoint (Colab Ngrok or HuggingFace)"""

import httpx
import logging
from typing import List, Dict, Optional
from app.config import settings
from datetime import datetime

logger = logging.getLogger(__name__)


class CustomAPIEngine:
    """Custom AI inference engine that calls external API (Colab/HuggingFace)"""
    
    def __init__(self):
        """Initialize HTTP client for custom API endpoint"""
        self.api_url = settings.CUSTOM_API_URL
        self.timeout = 120  # 2 minutes timeout for long-running inference
    
    async def generate_medical_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        max_tokens: int = 1200,
        temperature: float = 0.6
    ) -> Dict[str, str]:
        """
        Generate medical AI response by calling custom API endpoint.
        
        Args:
            query: User's medical question
            conversation_history: Previous messages for context
            max_tokens: Maximum response length (ignored by custom endpoint)
            temperature: Creativity (ignored by custom endpoint)
        
        Returns:
            Dict with 'thinking' (reasoning) and 'response' (final answer)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "message": query,
                    "context": conversation_history or [],
                    "mode": "medical"
                }
                
                response = await client.post(self.api_url, json=payload)
                response.raise_for_status()
                
                data = response.json()
                
                logger.info(f"✅ Generated medical response ({len(data.get('reply', ''))} chars)")
                return {
                    "thinking": data.get("thinking", ""),
                    "response": data.get("reply", "")
                }
                
        except httpx.TimeoutException:
            logger.error("❌ AI inference timeout: Request took too long")
            return {
                "thinking": "",
                "response": "I apologize, but I'm taking longer than expected to process your request. Please try again."
            }
        except httpx.HTTPError as e:
            logger.error(f"❌ AI inference HTTP error: {e}")
            return {
                "thinking": "",
                "response": "I apologize, but I'm having trouble connecting to the AI service. Please try again in a moment."
            }
        except Exception as e:
            logger.error(f"❌ AI inference error: {e}")
            return {
                "thinking": "",
                "response": "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact support if the issue persists."
            }
    
    async def analyze_symptoms(
        self,
        symptoms: str,
        max_tokens: int = 1000,
        temperature: float = 0.5
    ) -> Dict[str, str]:
        """
        Analyze symptoms for triage and recommendations.
        
        Args:
            symptoms: Comma-separated or natural language symptom description
            max_tokens: Maximum response length (ignored by custom endpoint)
            temperature: Lower for more focused medical analysis (ignored by custom endpoint)
        
        Returns:
            Dict with structured symptom analysis
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload = {
                    "message": symptoms,
                    "mode": "symptom_checker"
                }
                
                response = await client.post(self.api_url, json=payload)
                response.raise_for_status()
                
                data = response.json()
                
                analysis = {
                    "raw_analysis": data.get("reply", ""),
                    "symptoms_provided": symptoms,
                    "urgency": self._extract_urgency(data.get("reply", "")),
                    "reasoning": data.get("thinking", ""),
                    "recommendations": data.get("reply", "")
                }
                
                logger.info(f"✅ Symptom analysis completed")
                return analysis
                
        except httpx.TimeoutException:
            logger.error("❌ Symptom analysis timeout")
            return {
                "raw_analysis": "Error analyzing symptoms - service timeout",
                "symptoms_provided": symptoms,
                "urgency": "UNKNOWN",
                "reasoning": "",
                "recommendations": "Please consult a healthcare provider for symptom evaluation."
            }
        except Exception as e:
            logger.error(f"❌ Symptom analysis error: {e}")
            return {
                "raw_analysis": "Error analyzing symptoms",
                "symptoms_provided": symptoms,
                "urgency": "UNKNOWN",
                "reasoning": "",
                "recommendations": "Please consult a healthcare provider for symptom evaluation."
            }
    
    def _extract_urgency(self, text: str) -> str:
        """Extract urgency level from AI response"""
        text_upper = text.upper()
        
        if "EMERGENCY" in text_upper:
            return "EMERGENCY"
        elif "URGENT" in text_upper:
            return "URGENT"
        elif "ROUTINE" in text_upper:
            return "ROUTINE"
        else:
            return "ROUTINE"


# Global instance
deepseek_engine = CustomAPIEngine()

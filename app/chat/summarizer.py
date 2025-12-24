"""Session summarization service for chat system"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Optional
from app.chat.services import ChatService
from app.ai_engine import ai_logic
import logging

logger = logging.getLogger(__name__)

SUMMARIZE_EVERY_N_MESSAGES = 5
MAX_SUMMARY_LENGTH = 300

SUMMARY_PROMPT_TEMPLATE = """Summarize the following medical consultation conversation in 2-3 concise sentences. 
Focus on:
- Main health concern discussed
- Key advice or recommendations given
- Any follow-up actions mentioned

Keep the summary factual and professional. Do not include any personal identifiers.

Conversation:
{conversation}

Summary:"""


class SessionSummarizer:
    """Service for generating and managing session summaries"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.chat_service = ChatService(db)
    
    async def should_generate_summary(self, session_id: str) -> bool:
        """Check if summary should be generated based on message count"""
        session = await self.chat_service.get_session(session_id)
        if not session:
            return False
        
        message_count = session.get("message_count", 0)
        
        if message_count >= SUMMARIZE_EVERY_N_MESSAGES and message_count % SUMMARIZE_EVERY_N_MESSAGES < 2:
            return True
        
        return False
    
    async def generate_summary(self, session_id: str) -> Optional[str]:
        """Generate a summary for the session using AI"""
        try:
            messages = await self.chat_service.get_conversation_history(
                session_id, 
                limit=20, 
                visible_only=True
            )
            
            if len(messages) < 2:
                return None
            
            conversation_text = self._format_conversation(messages)
            prompt = SUMMARY_PROMPT_TEMPLATE.format(conversation=conversation_text)
            
            try:
                result = await ai_logic.generate_medical_reply(
                    user_message=prompt,
                    max_tokens=150
                )
                summary = result.get("reply", "").strip()
                
                if "</think>" in summary:
                    parts = summary.split("</think>")
                    summary = parts[-1].strip()
                
                if "Expert Medical Answer:" in summary:
                    summary = summary.split("Expert Medical Answer:")[-1].strip()
                
                summary = summary[:MAX_SUMMARY_LENGTH]
                
                await self.chat_service.update_session_summary(session_id, summary)
                
                logger.info(f"Generated summary for session {session_id}")
                return summary
                
            except Exception as e:
                logger.error(f"AI summarization failed: {e}")
                fallback_summary = self._generate_fallback_summary(messages)
                await self.chat_service.update_session_summary(session_id, fallback_summary)
                return fallback_summary
                
        except Exception as e:
            logger.error(f"Summary generation failed for session {session_id}: {e}")
            return None
    
    def _format_conversation(self, messages: List[Dict]) -> str:
        """Format messages into conversation text for summarization"""
        formatted = []
        for msg in messages[-10:]:
            role = "User" if msg["role"] == "user" else "Doctor"
            content = msg["content"][:500]
            formatted.append(f"{role}: {content}")
        
        return "\n".join(formatted)
    
    def _generate_fallback_summary(self, messages: List[Dict]) -> str:
        """Generate a simple fallback summary without AI"""
        user_messages = [m for m in messages if m["role"] == "user"]
        
        if not user_messages:
            return "Medical consultation session"
        
        topics = []
        for msg in user_messages[:3]:
            content = msg["content"][:50].strip()
            if content:
                topics.append(content)
        
        if topics:
            return f"Discussion about: {'; '.join(topics)}"
        
        return "Medical consultation session"
    
    async def get_resume_context(self, session_id: str) -> Optional[str]:
        """Get context prompt for resuming a session"""
        session_data = await self.chat_service.get_session_with_context(session_id)
        
        if not session_data:
            return None
        
        summary = session_data.get("summary")
        recent_messages = session_data.get("recent_messages", [])
        session_name = session_data.get("session_name", "Medical consultation")
        
        context_parts = []
        
        context_parts.append(f"You are continuing a previous medical discussion about '{session_name}'.")
        
        if summary:
            context_parts.append(f"Previous session summary: {summary}")
        
        if recent_messages:
            context_parts.append("Recent conversation context:")
            for msg in recent_messages[-3:]:
                role = "Patient" if msg["role"] == "user" else "Doctor"
                context_parts.append(f"  {role}: {msg['content'][:200]}")
        
        context_parts.append("Please continue the medical conversation from where it left off.")
        
        return "\n".join(context_parts)


async def maybe_summarize_session(db: AsyncIOMotorDatabase, session_id: str):
    """Helper function to check and generate summary if needed"""
    summarizer = SessionSummarizer(db)
    
    if await summarizer.should_generate_summary(session_id):
        await summarizer.generate_summary(session_id)

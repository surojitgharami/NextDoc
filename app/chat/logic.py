"""Business logic for chat operations"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from app.chat.services import ChatService
from app.ai_engine import ai_logic
from app.utils.helpers import sanitize_user_input, utc_now
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class ChatLogic:
    """Core business logic for chat"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.chat_service = ChatService(db)
    
    async def process_message(
        self,
        user_id: str,
        message: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process user message and generate AI response.
        
        Uses custom API endpoint (Colab Ngrok or HuggingFace inference).
        
        Steps:
        1. Create or retrieve session
        2. Sanitize user input
        3. Get conversation context
        4. Generate AI response (via ai_logic to custom API)
        5. Save both messages to database
        6. Update session
        7. Return response with metadata
        """
        
        # Sanitize input
        clean_message = sanitize_user_input(message)
        
        # Get or create session
        is_new_session = False
        if not session_id:
            session_id = await self.chat_service.create_session(user_id)
            is_new_session = True
        else:
            # Verify session exists and belongs to user
            session = await self.chat_service.get_session(session_id)
            if not session or session["user_id"] != user_id:
                session_id = await self.chat_service.create_session(user_id)
                is_new_session = True
        
        # Update conversation title on first message
        if is_new_session and clean_message:
            title = clean_message[:50] if len(clean_message) > 50 else clean_message
            await self.chat_service.update_conversation_title(session_id, title)
        
        # Get conversation context
        context = await self.chat_service.get_recent_context(session_id, limit=5)
        
        # Build context-aware prompt
        if context:
            context_text = "\n".join([
                f"{msg['role'].title()}: {msg['content']}"
                for msg in context
            ])
            full_message = f"Previous conversation:\n{context_text}\n\nNew question: {clean_message}"
        else:
            full_message = clean_message
        
        # Generate AI response using custom API endpoint
        try:
            ai_result = await ai_logic.generate_medical_reply(
                user_message=full_message,
                max_tokens=800
            )
            
            response_text = ai_result["reply"]
            model_used = ai_result.get("model", "custom-api")
            model_id = ai_result.get("model_id", "custom-endpoint")
            
        except ai_logic.AIInferenceError as e:
            logger.error(f"AI inference error: {e}")
            response_text = f"I apologize, but I'm having trouble processing your request right now. {str(e)}"
            model_used = "error"
            model_id = None
        
        # Parse response to separate thinking and answer
        thinking_content = None
        answer_content = response_text
        
        # Extract thinking if present (format: thinking_content\n</think>\n\nExpert Medical Answer:\nanswer_content)
        if "</think>" in response_text:
            try:
                think_end = response_text.find("</think>")
                # Everything before </think> is thinking content
                thinking_content = response_text[:think_end].strip()
                
                # Extract answer after "Expert Medical Answer:"
                answer_marker = "Expert Medical Answer:"
                if answer_marker in response_text:
                    answer_start = response_text.find(answer_marker) + len(answer_marker)
                    answer_content = response_text[answer_start:].strip()
                else:
                    # Fallback: remove the thinking part including </think> tag
                    answer_content = response_text[think_end + 8:].strip()
            except Exception as e:
                logger.warning(f"Failed to parse thinking/answer: {e}")
                answer_content = response_text
        
        # Save user message
        await self.chat_service.save_message(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=clean_message
        )
        
        # Save AI response with separated thinking and answer
        # Note: If client cancels request before this completes, response won't be saved
        await self.chat_service.save_message(
            session_id=session_id,
            user_id=user_id,
            role="assistant",
            content=answer_content,
            thinking=thinking_content,
            metadata={
                "model": model_used,
                "model_id": model_id
            }
        )
        
        # Update session only if response was successfully saved
        await self.chat_service.update_session(session_id)
        
        return {
            "reply": answer_content,
            "session_id": session_id,
            "timestamp": utc_now(),
            "model": model_used,
            "model_id": model_id
        }

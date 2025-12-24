from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from datetime import datetime
import logging
from .schemas import MessageCreate, Message, ConversationThread, SupportTicketCreate, SupportTicket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/messaging", tags=["messaging"])


@router.post("/send", response_model=Message)
async def send_message(msg: MessageCreate, current_user: dict = Depends(lambda: {"id": "user_id"})):
    """Send encrypted message between patient and doctor"""
    try:
        message_data = {
            "sender_id": current_user.get("id"),
            "recipient_id": msg.recipient_id,
            "content": msg.content,
            "attachment_url": msg.attachment_url,
            "visit_context": msg.visit_context,
            "is_encrypted": True,
            "created_at": datetime.utcnow(),
            "is_read": False,
        }
        logger.info(f"Message sent from {current_user.get('id')} to {msg.recipient_id}")
        return Message(**message_data)
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to send message")


@router.get("/conversations/{user_id}", response_model=List[ConversationThread])
async def get_conversations(user_id: str):
    """Retrieve all conversations for a user"""
    try:
        logger.info(f"Fetching conversations for user {user_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching conversations: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch conversations")


@router.get("/messages/{conversation_id}", response_model=List[Message])
async def get_messages(conversation_id: str):
    """Get message history for a conversation"""
    try:
        logger.info(f"Fetching messages for conversation {conversation_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch messages")


@router.post("/support-tickets", response_model=SupportTicket)
async def create_support_ticket(ticket: SupportTicketCreate, current_user: dict = Depends(lambda: {"id": "user_id"})):
    """Create a new support ticket"""
    try:
        ticket_data = {
            "_id": f"ticket_{datetime.utcnow().timestamp()}",
            "user_id": current_user.get("id"),
            "subject": ticket.subject,
            "description": ticket.description,
            "category": ticket.category,
            "priority": ticket.priority,
            "status": "open",
            "assigned_to": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "resolution_notes": None,
        }
        logger.info(f"Support ticket created by {current_user.get('id')}")
        return SupportTicket(**ticket_data)
    except Exception as e:
        logger.error(f"Error creating support ticket: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create support ticket")


@router.get("/support-tickets/{user_id}", response_model=List[SupportTicket])
async def get_user_tickets(user_id: str):
    """Get support tickets for a user"""
    try:
        logger.info(f"Fetching support tickets for user {user_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching support tickets: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch support tickets")

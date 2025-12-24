from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
import uuid

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


class ConversationCreate(BaseModel):
    userId: str = Field(..., description="User ID")
    title: str = Field(..., min_length=1, max_length=200, description="Conversation title")
    mode: str = Field(..., description="Mode: 'simple' or 'symptom_checker'")


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    isBookmarked: Optional[str] = None
    isFavorite: Optional[str] = None
    isDeleted: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    userId: str
    title: str
    mode: str
    isBookmarked: str
    isFavorite: str
    isDeleted: str
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=List[ConversationResponse])
async def get_conversations(
    userId: Optional[str] = Query(None, description="User ID to filter conversations (optional, defaults to current user)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    target_user_id = userId if userId else user_id
    
    if target_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's conversations"
        )
    
    # Get conversations from conversations collection
    cursor = db.conversations.find(
        {"userId": target_user_id, "isDeleted": {"$ne": "true"}}
    ).sort("updatedAt", -1)
    
    conversations = await cursor.to_list(length=100)
    
    # Convert to response format
    response_list = [
        ConversationResponse(
            id=str(conv["_id"]),
            userId=conv["userId"],
            title=conv["title"],
            mode=conv.get("mode", "simple"),
            isBookmarked=conv.get("isBookmarked", "false"),
            isFavorite=conv.get("isFavorite", "false"),
            isDeleted=conv.get("isDeleted", "false"),
            createdAt=conv.get("createdAt", conv.get("created_at", utc_now())),
            updatedAt=conv.get("updatedAt", conv.get("updated_at", utc_now()))
        )
        for conv in conversations
    ]
    
    return response_list


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if conversation.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create conversation for other users"
        )
    
    conv_doc = {
        "userId": conversation.userId,
        "title": conversation.title,
        "mode": conversation.mode,
        "isBookmarked": "false",
        "isFavorite": "false",
        "isDeleted": "false",
        "createdAt": utc_now(),
        "updatedAt": utc_now()
    }
    
    result = await db.conversations.insert_one(conv_doc)
    conv_doc["id"] = str(result.inserted_id)
    
    return ConversationResponse(
        id=str(result.inserted_id),
        userId=conv_doc["userId"],
        title=conv_doc["title"],
        mode=conv_doc["mode"],
        isBookmarked=conv_doc["isBookmarked"],
        isFavorite=conv_doc["isFavorite"],
        isDeleted=conv_doc["isDeleted"],
        createdAt=conv_doc["createdAt"],
        updatedAt=conv_doc["updatedAt"]
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    from bson import ObjectId
    try:
        obj_id = ObjectId(conversation_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    conversation = await db.conversations.find_one({"_id": obj_id})
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's conversations"
        )
    
    update_fields = {}
    if update_data.title is not None:
        update_fields["title"] = update_data.title
    if update_data.isBookmarked is not None:
        update_fields["isBookmarked"] = update_data.isBookmarked
    if update_data.isFavorite is not None:
        update_fields["isFavorite"] = update_data.isFavorite
    if update_data.isDeleted is not None:
        update_fields["isDeleted"] = update_data.isDeleted
    
    update_fields["updatedAt"] = utc_now()
    
    await db.conversations.update_one(
        {"_id": obj_id},
        {"$set": update_fields}
    )
    
    updated_conv = await db.conversations.find_one({"_id": obj_id})
    
    if not updated_conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found after update"
        )
    
    return ConversationResponse(
        id=str(updated_conv["_id"]),
        userId=updated_conv["userId"],
        title=updated_conv["title"],
        mode=updated_conv.get("mode", "simple"),
        isBookmarked=updated_conv.get("isBookmarked", "false"),
        isFavorite=updated_conv.get("isFavorite", "false"),
        isDeleted=updated_conv.get("isDeleted", "false"),
        createdAt=updated_conv.get("createdAt", updated_conv.get("created_at", utc_now())),
        updatedAt=updated_conv.get("updatedAt", updated_conv.get("updated_at", utc_now()))
    )


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    from bson import ObjectId
    try:
        obj_id = ObjectId(conversation_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )
    
    conversation = await db.conversations.find_one({"_id": obj_id})
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's conversations"
        )
    
    # Soft delete by marking isDeleted as true
    await db.conversations.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "isDeleted": "true",
                "updatedAt": utc_now()
            }
        }
    )
    
    return {"success": True, "message": "Conversation deleted successfully"}

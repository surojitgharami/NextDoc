from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/daily-notes", tags=["Daily Notes"])


class DailyNoteCreate(BaseModel):
    userId: str
    date: str = Field(..., description="YYYY-MM-DD format")
    content: str = Field(..., min_length=1, max_length=2000)


class DailyNoteUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class DailyNoteResponse(BaseModel):
    id: str
    userId: str
    date: str
    content: str
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=Optional[DailyNoteResponse])
async def get_daily_note(
    userId: str = Query(..., description="User ID"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get daily note for a specific date"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's notes"
        )
    
    note = await db.dailyNotes.find_one({
        "userId": userId,
        "date": date
    })
    
    if not note:
        return None
    
    return DailyNoteResponse(
        id=str(note["_id"]),
        userId=note["userId"],
        date=note["date"],
        content=note["content"],
        createdAt=note.get("createdAt", utc_now()),
        updatedAt=note.get("updatedAt", utc_now())
    )


@router.post("", response_model=DailyNoteResponse)
async def create_daily_note(
    note_data: DailyNoteCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create or update daily note"""
    user_id = current_user.get("sub")
    
    if note_data.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create note for other users"
        )
    
    # Check if note already exists for this date
    existing = await db.dailyNotes.find_one({
        "userId": note_data.userId,
        "date": note_data.date
    })
    
    if existing:
        # Update existing note
        await db.dailyNotes.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "content": note_data.content,
                "updatedAt": utc_now()
            }}
        )
        
        updated = await db.dailyNotes.find_one({"_id": existing["_id"]})
        if updated:
            return DailyNoteResponse(
                id=str(updated["_id"]),
                userId=updated["userId"],
                date=updated["date"],
                content=updated["content"],
                createdAt=updated.get("createdAt", utc_now()),
                updatedAt=updated.get("updatedAt", utc_now())
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve updated note"
        )
    else:
        # Create new note
        note_doc = {
            "userId": note_data.userId,
            "date": note_data.date,
            "content": note_data.content,
            "createdAt": utc_now(),
            "updatedAt": utc_now()
        }
        
        result = await db.dailyNotes.insert_one(note_doc)
        
        return DailyNoteResponse(
            id=str(result.inserted_id),
            userId=note_doc["userId"],
            date=note_doc["date"],
            content=note_doc["content"],
            createdAt=note_doc["createdAt"],
            updatedAt=note_doc["updatedAt"]
        )


@router.delete("")
async def delete_daily_note(
    userId: str = Query(..., description="User ID"),
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete daily note"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's notes"
        )
    
    note = await db.dailyNotes.find_one({
        "userId": userId,
        "date": date
    })
    
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    await db.dailyNotes.delete_one({
        "userId": userId,
        "date": date
    })
    
    return {"message": "Daily note deleted successfully"}

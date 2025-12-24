from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/medicine-notes", tags=["Medicine Notes"])


class MedicineNoteCreate(BaseModel):
    userId: str
    medicineId: str
    date: str = Field(..., description="YYYY-MM-DD format")
    note: str = Field(..., min_length=1, max_length=2000)


class MedicineNoteUpdate(BaseModel):
    note: str = Field(..., min_length=1, max_length=2000)


class MedicineNoteResponse(BaseModel):
    id: str
    userId: str
    medicineId: str
    date: str
    note: str
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=List[MedicineNoteResponse])
async def get_medicine_notes(
    userId: str = Query(..., description="User ID"),
    medicineId: Optional[str] = Query(None, description="Filter by medicine ID"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get medicine notes with optional filters"""
    user_id = current_user.get("sub")
    
    # Convert userId to int for comparison
    try:
        user_id_int = int(userId)
    except (ValueError, TypeError):
        user_id_int = userId
    
    if user_id_int != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's notes"
        )
    
    query = {"userId": str(user_id)}
    if medicineId:
        query["medicineId"] = medicineId
    if date:
        query["date"] = date
    
    cursor = db.medicineNotes.find(query).sort("date", -1).sort("createdAt", -1)
    notes = await cursor.to_list(length=500)
    
    return [
        MedicineNoteResponse(
            id=str(note["_id"]),
            userId=note["userId"],
            medicineId=note["medicineId"],
            date=note["date"],
            note=note["note"],
            createdAt=note.get("createdAt", utc_now()),
            updatedAt=note.get("updatedAt", utc_now())
        )
        for note in notes
    ]


@router.post("", response_model=MedicineNoteResponse)
async def create_medicine_note(
    note_data: MedicineNoteCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Create medicine note"""
    user_id = current_user.get("sub")
    
    # Convert userId to int for comparison (query param is string, JWT user_id is int)
    try:
        note_user_id_int = int(note_data.userId)
    except (ValueError, TypeError):
        note_user_id_int = note_data.userId
    
    if note_user_id_int != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create note for other users"
        )
    
    note_doc = {
        "userId": str(user_id),
        "medicineId": note_data.medicineId,
        "date": note_data.date,
        "note": note_data.note,
        "createdAt": utc_now(),
        "updatedAt": utc_now()
    }
    
    result = await db.medicineNotes.insert_one(note_doc)
    
    return MedicineNoteResponse(
        id=str(result.inserted_id),
        userId=note_doc["userId"],
        medicineId=note_doc["medicineId"],
        date=note_doc["date"],
        note=note_doc["note"],
        createdAt=note_doc["createdAt"],
        updatedAt=note_doc["updatedAt"]
    )


@router.patch("/{note_id}", response_model=MedicineNoteResponse)
async def update_medicine_note(
    note_id: str,
    update_data: MedicineNoteUpdate,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update medicine note"""
    user_id = current_user.get("sub")
    
    # Convert userId to int for comparison
    try:
        user_id_int = int(userId)
    except (ValueError, TypeError):
        user_id_int = userId
    
    if user_id_int != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's notes"
        )
    
    try:
        obj_id = ObjectId(note_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID"
        )
    
    note = await db.medicineNotes.find_one({"_id": obj_id})
    
    if not note or note["userId"] != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    await db.medicineNotes.update_one(
        {"_id": obj_id},
        {"$set": {"note": update_data.note, "updatedAt": utc_now()}}
    )
    
    updated = await db.medicineNotes.find_one({"_id": obj_id})
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found after update"
        )
    
    return MedicineNoteResponse(
        id=str(updated["_id"]),
        userId=updated["userId"],
        medicineId=updated["medicineId"],
        date=updated["date"],
        note=updated["note"],
        createdAt=updated.get("createdAt", utc_now()),
        updatedAt=updated.get("updatedAt", utc_now())
    )


@router.delete("/{note_id}")
async def delete_medicine_note(
    note_id: str,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete medicine note"""
    user_id = current_user.get("sub")
    
    # Convert userId to int for comparison
    try:
        user_id_int = int(userId)
    except (ValueError, TypeError):
        user_id_int = userId
    
    if user_id_int != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's notes"
        )
    
    try:
        obj_id = ObjectId(note_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid note ID"
        )
    
    note = await db.medicineNotes.find_one({"_id": obj_id})
    
    if not note or note["userId"] != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found"
        )
    
    await db.medicineNotes.delete_one({"_id": obj_id})
    
    return {"message": "Medicine note deleted successfully"}

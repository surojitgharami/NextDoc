from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/medicine-intake", tags=["Medicine Intake"])


class MedicineIntakeCreate(BaseModel):
    userId: str
    medicineId: str
    date: str = Field(..., description="YYYY-MM-DD format")
    time: str = Field(..., description="HH:MM format")
    quantity: str = Field(..., description="e.g., 1, 2, 0.5")
    notes: Optional[str] = None


class MedicineIntakeUpdate(BaseModel):
    time: Optional[str] = None
    quantity: Optional[str] = None
    notes: Optional[str] = None


class MedicineIntakeResponse(BaseModel):
    id: str
    userId: str
    medicineId: str
    date: str
    time: str
    quantity: str
    notes: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


@router.get("", response_model=List[MedicineIntakeResponse])
async def get_medicine_intakes(
    userId: str = Query(..., description="User ID"),
    medicineId: Optional[str] = Query(None, description="Filter by medicine ID"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get medicine intake records with optional filters"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's medicine intakes"
        )
    
    query = {"userId": userId}
    if medicineId:
        query["medicineId"] = medicineId
    if date:
        query["date"] = date
    
    cursor = db.medicineIntakes.find(query).sort("date", -1).sort("time", -1)
    intakes = await cursor.to_list(length=500)
    
    return [
        MedicineIntakeResponse(
            id=str(intake["_id"]),
            userId=intake["userId"],
            medicineId=intake["medicineId"],
            date=intake["date"],
            time=intake["time"],
            quantity=intake["quantity"],
            notes=intake.get("notes"),
            createdAt=intake.get("createdAt", utc_now()),
            updatedAt=intake.get("updatedAt", utc_now())
        )
        for intake in intakes
    ]


@router.post("", response_model=MedicineIntakeResponse)
async def create_medicine_intake(
    intake: MedicineIntakeCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Record medicine intake"""
    user_id = current_user.get("sub")
    
    if intake.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create intake for other users"
        )
    
    intake_doc = {
        "userId": intake.userId,
        "medicineId": intake.medicineId,
        "date": intake.date,
        "time": intake.time,
        "quantity": intake.quantity,
        "notes": intake.notes,
        "createdAt": utc_now(),
        "updatedAt": utc_now()
    }
    
    result = await db.medicineIntakes.insert_one(intake_doc)
    
    # Get medicine details for notification
    try:
        med_obj_id = ObjectId(intake.medicineId)
        medicine = await db.medicines.find_one({"_id": med_obj_id})
        medicine_name = medicine.get("name", "Medicine") if medicine else "Medicine"
    except:
        medicine_name = "Medicine"
    
    # Create notification for medicine intake
    notification_doc = {
        "userId": str(user_id),
        "type": "reminder",
        "title": f"Medicine Taken",
        "message": f"You took {medicine_name} ({intake.quantity}x) at {intake.time}",
        "avatarUrl": None,
        "iconType": "pill",
        "isRead": "false",
        "createdAt": utc_now()
    }
    
    try:
        result = await db.notifications.insert_one(notification_doc)
        print(f"✅ [MEDICINE-INTAKE] Notification created: {result.inserted_id}")
    except Exception as e:
        print(f"❌ [MEDICINE-INTAKE] Notification creation failed: {str(e)}")
    
    return MedicineIntakeResponse(
        id=str(result.inserted_id),
        userId=intake_doc["userId"],
        medicineId=intake_doc["medicineId"],
        date=intake_doc["date"],
        time=intake_doc["time"],
        quantity=intake_doc["quantity"],
        notes=intake_doc.get("notes"),
        createdAt=intake_doc["createdAt"],
        updatedAt=intake_doc["updatedAt"]
    )


@router.patch("/{intake_id}", response_model=MedicineIntakeResponse)
async def update_medicine_intake(
    intake_id: str,
    update_data: MedicineIntakeUpdate,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update medicine intake record"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's intakes"
        )
    
    try:
        obj_id = ObjectId(intake_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid intake ID"
        )
    
    intake = await db.medicineIntakes.find_one({"_id": obj_id})
    
    if not intake or intake["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake not found"
        )
    
    update_fields = {}
    if update_data.time:
        update_fields["time"] = update_data.time
    if update_data.quantity:
        update_fields["quantity"] = update_data.quantity
    if update_data.notes is not None:
        update_fields["notes"] = update_data.notes
    
    update_fields["updatedAt"] = utc_now()
    
    await db.medicineIntakes.update_one({"_id": obj_id}, {"$set": update_fields})
    updated = await db.medicineIntakes.find_one({"_id": obj_id})
    
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake not found after update"
        )
    
    return MedicineIntakeResponse(
        id=str(updated["_id"]),
        userId=updated["userId"],
        medicineId=updated["medicineId"],
        date=updated["date"],
        time=updated["time"],
        quantity=updated["quantity"],
        notes=updated.get("notes"),
        createdAt=updated.get("createdAt", utc_now()),
        updatedAt=updated.get("updatedAt", utc_now())
    )


@router.delete("/{intake_id}")
async def delete_medicine_intake(
    intake_id: str,
    userId: str = Query(..., description="User ID for authorization"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Delete medicine intake record"""
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete other user's intakes"
        )
    
    try:
        obj_id = ObjectId(intake_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid intake ID"
        )
    
    intake = await db.medicineIntakes.find_one({"_id": obj_id})
    
    if not intake or intake["userId"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intake not found"
        )
    
    await db.medicineIntakes.delete_one({"_id": obj_id})
    
    return {"message": "Medicine intake deleted successfully"}

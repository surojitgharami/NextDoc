from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.dependencies import get_current_user, get_database
from app.utils.helpers import utc_now
from bson import ObjectId

router = APIRouter(prefix="/api/reports", tags=["Medical Reports"])


class ReportCreate(BaseModel):
    userId: str
    reportType: str = Field(..., description="xray, mri, ct, blood_test, etc.")
    reportUrl: str = Field(..., description="URL to the report file")
    analysis: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    userId: str
    reportType: str
    reportUrl: str
    analysis: Optional[str] = None
    uploadedAt: datetime


@router.get("", response_model=List[ReportResponse])
async def get_reports(
    userId: str = Query(..., description="User ID to filter reports"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's reports"
        )
    
    cursor = db.medicalReports.find(
        {"userId": userId}
    ).sort("uploadedAt", -1)
    
    reports = await cursor.to_list(length=200)
    
    return [
        ReportResponse(
            id=str(report["_id"]),
            userId=report["userId"],
            reportType=report["reportType"],
            reportUrl=report["reportUrl"],
            analysis=report.get("analysis"),
            uploadedAt=report.get("uploadedAt", report.get("created_at", utc_now()))
        )
        for report in reports
    ]


@router.post("/upload", response_model=ReportResponse)
async def upload_report(
    report: ReportCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    user_id = current_user.get("sub")
    
    if report.userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload report for other users"
        )
    
    report_doc = {
        "userId": report.userId,
        "reportType": report.reportType,
        "reportUrl": report.reportUrl,
        "analysis": report.analysis,
        "uploadedAt": utc_now()
    }
    
    result = await db.medicalReports.insert_one(report_doc)
    
    return ReportResponse(
        id=str(result.inserted_id),
        userId=report_doc["userId"],
        reportType=report_doc["reportType"],
        reportUrl=report_doc["reportUrl"],
        analysis=report_doc.get("analysis"),
        uploadedAt=report_doc["uploadedAt"]
    )

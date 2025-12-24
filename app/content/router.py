"""Content Management API Routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_database
from app.auth.mongo_dependencies import get_current_user, require_admin
from .models import ContentType, ContentUpdate, ContentResponse
from .service import ContentService

router = APIRouter(prefix="/content", tags=["Content Management"])


@router.get("/{content_type}", response_model=ContentResponse)
async def get_content(
    content_type: ContentType,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get content by type (Public endpoint)
    
    - **content_type**: 'terms' or 'privacy_policy'
    """
    content = await ContentService.get_content(db, content_type)
    
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Content not found for type: {content_type.value}"
        )
    
    return content


@router.put("/{content_type}", response_model=ContentResponse)
async def update_content(
    content_type: ContentType,
    data: ContentUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_admin)
):
    """
    Update content (Admin only)
    
    - **content_type**: 'terms' or 'privacy_policy'
    - **data**: Content update data (title and content)
    """
    try:
        updated_content = await ContentService.update_content(db, content_type, data)
        return updated_content
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update content: {str(e)}"
        )


@router.get("/", response_model=list[ContentResponse])
async def get_all_content(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: dict = Depends(require_admin)
):
    """
    Get all content pages (Admin only)
    """
    return await ContentService.get_all_content(db)

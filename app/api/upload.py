from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
import aiofiles
import os
from pathlib import Path

from app.dependencies import get_current_user, get_database
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["File Upload"])

# Configure upload directories
UPLOAD_DIR = Path("./uploads")
CHAT_IMAGES_DIR = UPLOAD_DIR / "chat-images"
VOICE_MESSAGES_DIR = UPLOAD_DIR / "voice-messages"

# Create directories if they don't exist
for directory in [CHAT_IMAGES_DIR, VOICE_MESSAGES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# File size limits (in bytes)
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10MB

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm"}


class UploadResponse(BaseModel):
    url: str
    fileName: str
    type: str
    size: int


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    type: str = Form(...),
    userId: str = Form(...),
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Upload images or audio files for chat attachments"""
    
    user_id = current_user.get("sub")
    
    if userId != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot upload files for other users"
        )
    
    # Validate file type
    if type not in ["image", "audio"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type must be 'image' or 'audio'"
        )
    
    # Determine upload directory and validate extension
    if type == "image":
        upload_dir = CHAT_IMAGES_DIR
        max_size = MAX_IMAGE_SIZE
        allowed_extensions = ALLOWED_IMAGE_EXTENSIONS
    else:  # audio
        upload_dir = VOICE_MESSAGES_DIR
        max_size = MAX_AUDIO_SIZE
        allowed_extensions = ALLOWED_AUDIO_EXTENSIONS
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file extension. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check file size
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size / 1024 / 1024:.1f}MB"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}{file_ext}"
    file_path = upload_dir / filename
    
    # Save file
    try:
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_content)
        
        # Generate public URL (adjust based on your deployment)
        public_url = f"/uploads/{type}s/{filename}"
        
        # Store upload metadata in database
        upload_metadata = {
            "userId": userId,
            "fileName": file.filename,
            "uploadedAs": filename,
            "type": type,
            "size": file_size,
            "url": public_url,
            "uploadedAt": __import__("datetime").datetime.utcnow()
        }
        
        await db.fileUploads.insert_one(upload_metadata)
        
        logger.info(f"✅ File uploaded: {filename} ({file_size} bytes)")
        
        return UploadResponse(
            url=public_url,
            fileName=file.filename,
            type=type,
            size=file_size
        )
    
    except Exception as e:
        logger.error(f"❌ Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )

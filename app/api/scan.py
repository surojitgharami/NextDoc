"""
Image Scanning API Endpoints
Proxy endpoints for the cloud image processing microservice
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Depends
from pydantic import BaseModel, Field
import logging

from app.dependencies import get_current_user
from app.services.image_service import image_service_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/scan", tags=["Image Scanning"])


class OCRResponse(BaseModel):
    success: bool
    text: str = ""
    lines: list = Field(default_factory=list)
    confidence: float = 0.0
    processing_time_ms: float = 0.0


class DetectionBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    label: str
    confidence: float


class PillDetectionResponse(BaseModel):
    success: bool
    detections: list = Field(default_factory=list)
    count: int = 0
    annotated_image_base64: Optional[str] = None
    processing_time_ms: float = 0.0


class SkinAnalysisResponse(BaseModel):
    success: bool
    prediction: str = ""
    confidence: float = 0.0
    all_predictions: list = Field(default_factory=list)
    processing_time_ms: float = 0.0
    recommendation: str = ""


class ServiceStatusResponse(BaseModel):
    available: bool
    status: str
    models: Dict[str, bool] = Field(default_factory=dict)
    message: str = ""


@router.get("/status", response_model=ServiceStatusResponse)
async def check_service_status(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Check if the image processing microservice is available
    """
    if not image_service_client.is_configured:
        return ServiceStatusResponse(
            available=False,
            status="not_configured",
            message="Image processing service URL not configured"
        )
    
    result = await image_service_client.health_check()
    
    if result.get("status") == "healthy":
        return ServiceStatusResponse(
            available=True,
            status="healthy",
            models=result.get("models", {}),
            message="Image processing service is available"
        )
    else:
        return ServiceStatusResponse(
            available=False,
            status=result.get("status", "unknown"),
            message=result.get("error", "Service unavailable")
        )


@router.post("/prescription", response_model=OCRResponse)
async def scan_prescription(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Scan a prescription image and extract text using OCR
    
    - Accepts JPEG, PNG, or WebP images
    - Maximum file size: 10MB
    - Returns extracted text with confidence scores
    """
    if not image_service_client.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image processing service not configured. Please contact administrator."
        )
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (JPEG, PNG, or WebP)"
        )
    
    try:
        result = await image_service_client.call_ocr_service(file)
        
        return OCRResponse(
            success=result.get("success", False),
            text=result.get("text", ""),
            lines=result.get("lines", []),
            confidence=result.get("confidence", 0.0),
            processing_time_ms=result.get("processing_time_ms", 0.0)
        )
        
    except TimeoutError as e:
        logger.error(f"OCR service timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Image processing service timed out. Please try again."
        )
    except ValueError as e:
        logger.error(f"OCR service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"OCR scan failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process prescription image"
        )


@router.post("/pills", response_model=PillDetectionResponse)
async def scan_pills(
    file: UploadFile = File(...),
    include_annotated: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Detect and identify pills/medicines in an image
    
    - Accepts JPEG, PNG, or WebP images
    - Returns detected pills with bounding boxes
    - Optionally returns annotated image with boxes drawn
    """
    if not image_service_client.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image processing service not configured. Please contact administrator."
        )
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (JPEG, PNG, or WebP)"
        )
    
    try:
        result = await image_service_client.call_pill_detection_service(
            file, 
            include_annotated=include_annotated
        )
        
        return PillDetectionResponse(
            success=result.get("success", False),
            detections=result.get("detections", []),
            count=result.get("count", 0),
            annotated_image_base64=result.get("annotated_image_base64"),
            processing_time_ms=result.get("processing_time_ms", 0.0)
        )
        
    except TimeoutError as e:
        logger.error(f"Pill detection service timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Image processing service timed out. Please try again."
        )
    except ValueError as e:
        logger.error(f"Pill detection service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Pill detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze pill image"
        )


@router.post("/skin", response_model=SkinAnalysisResponse)
async def scan_skin(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze skin lesions in an image
    
    - Accepts JPEG, PNG, or WebP images
    - Returns analysis with confidence scores
    - Includes basic recommendation based on findings
    
    **Disclaimer**: This is not a medical diagnosis. 
    Always consult a healthcare professional.
    """
    if not image_service_client.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image processing service not configured. Please contact administrator."
        )
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (JPEG, PNG, or WebP)"
        )
    
    try:
        result = await image_service_client.call_skin_detection_service(file)
        
        prediction = result.get("prediction", "")
        confidence = result.get("confidence", 0.0)
        
        recommendation = ""
        if confidence > 0.7:
            recommendation = "Based on the analysis, we recommend consulting a dermatologist for a professional evaluation."
        elif confidence > 0.4:
            recommendation = "The analysis is inconclusive. Consider taking another photo with better lighting or consult a healthcare professional."
        else:
            recommendation = "No significant findings detected. If you have concerns, please consult a healthcare professional."
        
        return SkinAnalysisResponse(
            success=result.get("success", False),
            prediction=prediction,
            confidence=confidence,
            all_predictions=result.get("all_predictions", []),
            processing_time_ms=result.get("processing_time_ms", 0.0),
            recommendation=recommendation
        )
        
    except TimeoutError as e:
        logger.error(f"Skin detection service timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Image processing service timed out. Please try again."
        )
    except ValueError as e:
        logger.error(f"Skin detection service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Skin analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze skin image"
        )


@router.post("/medical-objects", response_model=PillDetectionResponse)
async def scan_medical_objects(
    file: UploadFile = File(...),
    include_annotated: bool = True,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Detect medical objects and devices in an image
    
    - Accepts JPEG, PNG, or WebP images
    - Returns detected objects with bounding boxes
    """
    if not image_service_client.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image processing service not configured. Please contact administrator."
        )
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image (JPEG, PNG, or WebP)"
        )
    
    try:
        result = await image_service_client.call_medical_object_detection_service(
            file,
            include_annotated=include_annotated
        )
        
        return PillDetectionResponse(
            success=result.get("success", False),
            detections=result.get("detections", []),
            count=result.get("count", 0),
            annotated_image_base64=result.get("annotated_image_base64"),
            processing_time_ms=result.get("processing_time_ms", 0.0)
        )
        
    except TimeoutError as e:
        logger.error(f"Medical object detection timeout: {e}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Image processing service timed out. Please try again."
        )
    except ValueError as e:
        logger.error(f"Medical object detection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Medical object detection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze image"
        )

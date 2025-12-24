"""
Image Processing Service Client
Connects to the external image processing microservice via ngrok
"""
import os
import logging
from typing import Optional, Dict, Any, BinaryIO
from io import BytesIO

import httpx
from fastapi import UploadFile

logger = logging.getLogger(__name__)

IMAGE_SERVICE_URL = os.getenv("IMAGE_SERVICE_URL", "")
REQUEST_TIMEOUT = 60.0


class ImageServiceClient:
    """Client for communicating with the Image Processing Microservice"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = (base_url or IMAGE_SERVICE_URL).rstrip("/")
        self.timeout = httpx.Timeout(REQUEST_TIMEOUT, connect=10.0)
    
    @property
    def is_configured(self) -> bool:
        """Check if the service URL is configured"""
        return bool(self.base_url)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check if the image processing service is available"""
        if not self.is_configured:
            return {"status": "not_configured", "error": "IMAGE_SERVICE_URL not set"}
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/health")
                response.raise_for_status()
                return response.json()
        except httpx.TimeoutException:
            logger.error("Image service health check timed out")
            return {"status": "timeout", "error": "Service did not respond in time"}
        except httpx.HTTPError as e:
            logger.error(f"Image service health check failed: {e}")
            return {"status": "error", "error": str(e)}
        except Exception as e:
            logger.error(f"Image service health check error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def call_ocr_service(
        self,
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        Send image to OCR service for prescription text extraction
        
        Args:
            file: The uploaded image file
            
        Returns:
            OCR result with extracted text and confidence
        """
        if not self.is_configured:
            raise ValueError("Image service URL not configured. Set IMAGE_SERVICE_URL environment variable.")
        
        try:
            file_content = await file.read()
            await file.seek(0)
            
            files = {
                "file": (file.filename or "image.jpg", BytesIO(file_content), file.content_type or "image/jpeg")
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/ocr/prescription",
                    files=files
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error("OCR service request timed out")
            raise TimeoutError("OCR service did not respond in time")
        except httpx.HTTPStatusError as e:
            logger.error(f"OCR service returned error: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"OCR service error: {e.response.text}")
        except Exception as e:
            logger.error(f"OCR service call failed: {e}")
            raise
    
    async def call_pill_detection_service(
        self,
        file: UploadFile,
        include_annotated: bool = True
    ) -> Dict[str, Any]:
        """
        Send image to pill detection service
        
        Args:
            file: The uploaded image file
            include_annotated: Whether to include annotated image in response
            
        Returns:
            Detection result with bounding boxes and labels
        """
        if not self.is_configured:
            raise ValueError("Image service URL not configured. Set IMAGE_SERVICE_URL environment variable.")
        
        try:
            file_content = await file.read()
            await file.seek(0)
            
            files = {
                "file": (file.filename or "image.jpg", BytesIO(file_content), file.content_type or "image/jpeg")
            }
            
            params = {"include_annotated": str(include_annotated).lower()}
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/detect/pills",
                    files=files,
                    params=params
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error("Pill detection service request timed out")
            raise TimeoutError("Pill detection service did not respond in time")
        except httpx.HTTPStatusError as e:
            logger.error(f"Pill detection service returned error: {e.response.status_code}")
            raise RuntimeError(f"Pill detection service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Pill detection service call failed: {e}")
            raise
    
    async def call_skin_detection_service(
        self,
        file: UploadFile
    ) -> Dict[str, Any]:
        """
        Send image to skin lesion detection service
        
        Args:
            file: The uploaded image file
            
        Returns:
            Skin analysis result with predictions
        """
        if not self.is_configured:
            raise ValueError("Image service URL not configured. Set IMAGE_SERVICE_URL environment variable.")
        
        try:
            file_content = await file.read()
            await file.seek(0)
            
            files = {
                "file": (file.filename or "image.jpg", BytesIO(file_content), file.content_type or "image/jpeg")
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/detect/skin",
                    files=files
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error("Skin detection service request timed out")
            raise TimeoutError("Skin detection service did not respond in time")
        except httpx.HTTPStatusError as e:
            logger.error(f"Skin detection service returned error: {e.response.status_code}")
            raise RuntimeError(f"Skin detection service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Skin detection service call failed: {e}")
            raise
    
    async def call_medical_object_detection_service(
        self,
        file: UploadFile,
        include_annotated: bool = True
    ) -> Dict[str, Any]:
        """
        Send image to medical object detection service
        
        Args:
            file: The uploaded image file
            include_annotated: Whether to include annotated image in response
            
        Returns:
            Detection result with medical objects found
        """
        if not self.is_configured:
            raise ValueError("Image service URL not configured. Set IMAGE_SERVICE_URL environment variable.")
        
        try:
            file_content = await file.read()
            await file.seek(0)
            
            files = {
                "file": (file.filename or "image.jpg", BytesIO(file_content), file.content_type or "image/jpeg")
            }
            
            params = {"include_annotated": str(include_annotated).lower()}
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/detect/medical-objects",
                    files=files,
                    params=params
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            logger.error("Medical object detection service request timed out")
            raise TimeoutError("Medical object detection service did not respond in time")
        except httpx.HTTPStatusError as e:
            logger.error(f"Medical object detection service returned error: {e.response.status_code}")
            raise RuntimeError(f"Medical object detection service error: {e.response.text}")
        except Exception as e:
            logger.error(f"Medical object detection service call failed: {e}")
            raise


image_service_client = ImageServiceClient()

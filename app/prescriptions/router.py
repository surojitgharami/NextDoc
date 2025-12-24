from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
import logging
from .schemas import Prescription, PrescriptionRefill

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])

@router.get("/patient/{patient_id}", response_model=List[Prescription])
async def get_patient_prescriptions(patient_id: str):
    try:
        logger.info(f"Fetching prescriptions for patient {patient_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching prescriptions: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch prescriptions")

@router.post("/refill-request", response_model=PrescriptionRefill)
async def request_refill(prescription_id: str, patient_id: str):
    try:
        refill = {
            "_id": f"refill_{datetime.utcnow().timestamp()}",
            "prescription_id": prescription_id,
            "patient_id": patient_id,
            "requested_at": datetime.utcnow(),
            "status": "pending",
            "approved_by": None,
            "approved_at": None,
        }
        logger.info(f"Refill requested for prescription {prescription_id}")
        return PrescriptionRefill(**refill)
    except Exception as e:
        logger.error(f"Error requesting refill: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to request refill")

@router.get("/refill-requests/{doctor_id}", response_model=List[PrescriptionRefill])
async def get_pending_refills(doctor_id: str):
    try:
        logger.info(f"Fetching pending refills for doctor {doctor_id}")
        return []
    except Exception as e:
        logger.error(f"Error fetching refills: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to fetch refills")

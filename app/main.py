"""AI Doctor 3.0 - Main FastAPI Application"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.config import settings
from app.database import Database
from app.utils.logger import setup_logging
from app.session_manager import SessionManager
from app.middleware.rate_limiter import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
import logging
import os

from app.auth.mongo_router import router as mongo_auth_router
from app.auth.mongo_service import MongoAuthService, create_auth_indexes

from app.chat.router import router as chat_router
from app.user.router import router as user_router
from app.features.symptom_checker import router as symptom_router
from app.features.monitoring import router as monitoring_router
from app.features.medication import router as medication_router
from app.features.recent_activity import router as activity_router

# Import new API routers for UI compatibility
from app.api.conversations import router as conversations_router
from app.api.messages import router as messages_router
from app.api.medicines import router as medicines_router
# Appointments feature removed
from app.api.reports import router as reports_router
from app.api.notifications import router as notifications_router
from app.api.chat_send import router as chat_send_router
from app.api.symptom_checker import router as symptom_checker_router
from app.api.profile import router as profile_router
from app.api.contact import router as contact_router
from app.api.medicine_intake import router as medicine_intake_router
from app.api.medicine_notes import router as medicine_notes_router
from app.api.daily_notes import router as daily_notes_router
from app.api.notification_settings import router as notification_settings_router
from app.api.reminders import router as reminders_router
from app.api.upload import router as upload_router

# Import message reporting and admin notification routers
from app.api.message_reports import router as message_reports_router
from app.api.message_reports import router_admin as message_reports_admin_router
from app.api.admin_notifications import router as admin_notifications_router
from app.api.admin_reports import router as admin_reports_router
from app.api.tts import router as tts_router

# Import voice service router
from app.voice_service.router import router as voice_router

# Import new feature routers
from app.messaging.router import router as messaging_router
from app.health_records.router import router as health_records_router
from app.billing.router import router as billing_router
from app.prescriptions.router import router as prescriptions_router

# Import admin router
from app.admin.router import router as admin_router

# Import scan router for image processing
from app.api.scan import router as scan_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("🚀 Starting AI Doctor 3.0 Backend...")
    
    try:
        await Database.connect_db()
        
        if Database.db is not None:
            await create_auth_indexes(Database.db)
            logger.info("✅ MongoDB auth indexes created")
            
            auth_service = MongoAuthService(Database.db)
            admin_email = os.getenv("ADMIN_EMAIL", "admin@aidoctor.com")
            admin_password = os.getenv("ADMIN_PASSWORD", "Admin123!")
            admin_name = os.getenv("ADMIN_NAME", "Admin")
            await auth_service.seed_admin(admin_email, admin_password, admin_name)
            logger.info("✅ Admin user seeded")
            
            session_manager = SessionManager(Database.db)
            await session_manager.create_indexes()
            logger.info("✅ Session management initialized")
        
        os.makedirs("uploads/profile-photos", exist_ok=True)
        
        logger.info("✅ Application startup complete")
        yield
    finally:
        logger.info("🔌 Shutting down application...")
        await Database.close_db()
        logger.info("👋 Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Enterprise Medical AI Platform with DeepSeek R1 and Custom Auth",
    lifespan=lifespan
)

# Rate limiting middleware (must be added before CORS)
app.add_middleware(RateLimitMiddleware)

# Security headers middleware (adds X-Frame-Options, X-Content-Type-Options, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include auth router (MongoDB-based authentication)
app.include_router(mongo_auth_router, prefix="/api")

# Include admin router
app.include_router(admin_router, prefix="/api")

# Include original routers
app.include_router(chat_router, prefix=settings.API_V1_PREFIX)
app.include_router(user_router, prefix=settings.API_V1_PREFIX)
app.include_router(symptom_router, prefix=settings.API_V1_PREFIX)
app.include_router(monitoring_router, prefix=settings.API_V1_PREFIX)
app.include_router(medication_router, prefix=settings.API_V1_PREFIX)
app.include_router(activity_router, prefix=settings.API_V1_PREFIX)

# Include new API routers for UI compatibility
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(medicines_router)
# Appointments router removed
app.include_router(reports_router)
app.include_router(notifications_router)
app.include_router(chat_send_router)
app.include_router(symptom_checker_router)
app.include_router(profile_router)
app.include_router(contact_router)
app.include_router(medicine_intake_router)
app.include_router(medicine_notes_router)
app.include_router(daily_notes_router)
app.include_router(notification_settings_router)
app.include_router(reminders_router)
app.include_router(upload_router)

# Include voice service router
app.include_router(voice_router, prefix="/api/voice")

# Include new feature routers
app.include_router(messaging_router)
app.include_router(health_records_router)
app.include_router(billing_router)
app.include_router(prescriptions_router)

# Include message reporting and admin notification routers
app.include_router(message_reports_router)
app.include_router(message_reports_admin_router)
app.include_router(admin_notifications_router)
app.include_router(admin_reports_router)
app.include_router(tts_router)

# Include image scanning router
app.include_router(scan_router)


@app.get("/")
async def root():
    """Root endpoint - Returns 200 for deployment health checks"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "message": "AI Doctor 3.0 Backend is running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Detailed health check - returns 503 if database unavailable"""
    health_status = {"api_version": settings.API_V1_PREFIX}
    
    try:
        # Check database connection
        db = Database.get_db()
        if db is None:
            health_status["status"] = "unhealthy"
            health_status["database"] = "not initialized"
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=503, content=health_status)
        
        await db.command('ping')
        health_status["status"] = "healthy"
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database"] = f"error: {str(e)}"
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=health_status)
    
    return health_status

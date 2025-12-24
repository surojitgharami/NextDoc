# AI Doctor 3.0 - HealthChatAI

## Overview
AI Doctor 3.0 (HealthChatAI) is a comprehensive medical AI chatbot platform offering conversational health assistance, symptom checking, medication management, and health monitoring. It features a FastAPI backend powered by a custom fine-tuned DeepSeek R1 medical reasoning model and a React TypeScript frontend with MongoDB-based authentication. The platform provides a tiered subscription system (Free, Monthly, Annual) with varying limits on AI consultations, medicine reminders, and symptom checks. Key capabilities include secure user authentication, email verification, password reset, robust chat session management with AI summarization, and an admin dashboard for user and platform activity management. The project aims to provide accessible and intelligent health support to users.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (December 4, 2025)
- **Image Processing Microservice**: Complete standalone service for prescription OCR, pill identification, and skin analysis
- **Backend Scan Integration**: Proxy endpoints `/api/scan/prescription`, `/api/scan/pills`, `/api/scan/skin` with timeout handling and error propagation
- **Frontend Scanner Pages**: Three new pages (prescription-scanner, pill-identifier, skin-analyzer) with drag-and-drop file upload
- **GCP Deployment Scripts**: setup_gcp.sh, start_with_ngrok.sh, and DEPLOYMENT.md for cloud deployment
- **Email System Overhaul**: Fixed all email sending logic with unified SMTP + Resend API support with console fallback
- **SMTP Implementation**: Full SMTP support with TLS/SSL, authentication, and async thread pool execution
- **Email Templates**: Fixed welcome email dashboard URL (changed from `/user-dashboard` to `/dashboard`), added admin announcement email template
- **Batch Email Support**: Added `send_batch_emails()` for admin mass email notifications with success/failure tracking
- **Test Endpoint**: Added `/auth/test-email` endpoint (admin-only) to verify email configuration
- **Development Mode**: When SMTP/Resend not configured, emails print to console for development testing
- **Appointments Feature Removed**: Completely removed appointment features from backend and frontend (API routes, pages, navigation, dashboard cards)
- **Dashboard Routing Fixed**: Changed all `/user-dashboard` redirects to `/dashboard`, removed orphaned user-dashboard.tsx
- **Navigation Cleanup**: Updated navItems.ts to use correct dashboard path and removed appointment navigation items
- **Token Authentication Core Fix**: Fixed 401 "User not found" errors by correcting MongoDB user lookup in dependencies.py

## System Architecture

### Backend Architecture
The backend is built with **FastAPI (Python 3.11+)** using async/await patterns, providing a RESTful API with Pydantic for validation and a modular structure. The **AI Engine** uses a custom medical reasoning system with a fine-tuned DeepSeek R1 model (via Unsloth LoRA) for inference, supporting both streaming and non-streaming responses. **MongoDB** is used for all data storage, including chat sessions, conversations, messages, medication records, appointments, and user profiles. Authentication is managed via **Clerk** (with a recent migration to MongoDB-only authentication using bcrypt and JWT for enhanced security), handling JWT validation and user context. The system incorporates robust error handling, rate limiting for auth endpoints, and comprehensive logging.

### Frontend Architecture
The frontend is developed with **React 18+ and TypeScript**, utilizing Vite for fast development. It follows a component-based architecture with **shadcn/ui** components, **React Query** for server state management, and **Tailwind CSS** for styling. It supports dark mode and includes pages for the chat interface, dashboard, user profile, medicine reminders, symptom checker, appointment scheduling, and health monitoring. Authentication is integrated with Clerk, ensuring secure user sessions.

### API Design Patterns
The API employs **RESTful endpoints** with resource-based URLs and consistent response formats using Pydantic models. **Server-Sent Events (SSE)** are used for real-time AI responses, enabling token-by-token streaming from the custom AI inference endpoint for a dynamic chat experience.

### Database Schema Design
**MongoDB** serves as the primary data store with collections for:
- **sessions**: User authentication.
- **conversations**: Chat threads with metadata.
- **messages**: Individual chat messages with content and role.
- **medicines**: User medication records and schedules.
- **appointments**: Medical appointment details.
- **medicalReports**: Uploaded health documents and AI analysis.
- **notificationSettings**: User preferences for notifications.
- **userProfiles**: Extended user demographic and vital information.
- **message_reports**: User-submitted reports for AI messages (with rate limiting).
- **admin_notifications**: Admin-sent broadcast notifications history.
Indexes are strategically applied for efficient querying and data management, including TTL indexes for session cleanup.

### Message Reporting System
Users can report AI messages for issues like incorrect information, offensive content, or privacy concerns. The system includes:
- **Rate limiting**: 10 reports per hour per user to prevent abuse.
- **Report reasons**: incorrect_info, offensive, privacy, other.
- **Admin review workflow**: Pending > Reviewed/Dismissed/Actioned.
- **User notification**: Optional email notification when report is reviewed.

### Text-to-Speech (TTS)
AI messages include a read-aloud feature with:
- **Backend TTS endpoint**: `/api/tts` calls external SYNTH_ENDPOINT if configured.
- **Web Speech API fallback**: Uses browser's SpeechSynthesis when backend unavailable.
- **Voice options**: alloy, echo, fable, onyx, nova, shimmer.

### Admin Notification System
Admins can broadcast notifications to all users via:
- **Email**: Uses configured SMTP/Resend API.
- **In-App**: Push notifications (infrastructure-dependent).
- **Background processing**: Emails sent asynchronously with audit logging.

### Admin Reports Dashboard
Real-time platform analytics dashboard with:
- **User Growth Report**: New registrations (30 days), total users from MongoDB queries.
- **Subscription & Usage Report**: Active paid subscriptions across all tiers.
- **Content Moderation**: User-submitted AI message reports with pending count.
- **User Engagement**: Total chat sessions, medicine reminders from database.
- **System Activity Feed**: Live metrics including users, subscriptions, chat sessions, messages, verified users, pending moderation reports.
- **Report Downloads**: JSON export for all report types with aggregated data.
- All metrics are sourced from real MongoDB queries (no hardcoded placeholder values).

### Image Processing Microservice
A standalone microservice deployed on GCP for medical image analysis:
- **Architecture**: Separate FastAPI service running on GCP VM with ngrok tunnel for public access
- **OCR (Prescription Scanning)**: Uses PaddleOCR for text extraction from prescription images
- **Pill Detection**: Uses YOLOv8 object detection to identify pills with bounding boxes
- **Skin Analysis**: Uses YOLO-based detection for skin lesion classification
- **Backend Integration**: Main backend proxies requests via `ImageServiceClient` in `app/services/image_service.py`
- **Endpoints**: `/api/scan/prescription`, `/api/scan/pills`, `/api/scan/skin`, `/api/scan/status`
- **Environment Variable**: Requires `IMAGE_SERVICE_URL` pointing to the microservice ngrok URL
- **Deployment**: See `image-processor/DEPLOYMENT.md` for GCP setup instructions

### Continual Fine-Tuning Pipeline
A data pipeline is established for collecting approved chat interactions (with PII scrubbing), merging with existing datasets, and performing **fine-tuning on Google Colab** using Unsloth + LoRA. **WandB** is used for experiment tracking, and **HuggingFace Hub** for model deployment.

## External Dependencies

### Third-Party Services
- **Clerk**: User authentication and session management.
- **MongoDB Atlas**: Primary database for data persistence.
- **Custom Inference Endpoint**: For serving the medical AI model (e.g., Colab Ngrok, HuggingFace Inference API).
- **WandB (Weights & Biases)**: For model training tracking.
- **HuggingFace Hub**: Model repository and version control.
- **Unsloth**: Efficient model fine-tuning framework.
- **Razorpay**: For subscription payment processing and webhooks.
- **Resend API / SMTP**: For email services (verification, password reset).

### Python Dependencies
- **FastAPI**, **uvicorn**, **gunicorn**: Web framework and servers.
- **pydantic**, **pydantic-settings**, **python-dotenv**: Data validation and configuration.
- **motor**, **pymongo**: Async MongoDB driver.
- **PyJWT**, **cryptography**: JWT handling and security.
- **httpx**: Async HTTP client.
- **openai**: SDK for OpenAI-compatible APIs.
- **python-multipart**, **aiofiles**, **email-validator**: Utilities.

### Frontend Dependencies
- **react**, **react-dom**, **typescript**, **vite**: Core UI framework and build tools.
- **@radix-ui/\***, **@clerk/clerk-react**, **@tanstack/react-query**, **tailwindcss**, **framer-motion**, **lucide-react**: UI libraries and state management.
- **react-hook-form**, **@hookform/resolvers**, **zod**: Form management and validation.
- **clsx**, **class-variance-authority**, **date-fns**, **next-themes**: Utilities.
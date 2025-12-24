# NextDoc - AI Doctor Healthcare Platform

<div align="center">

![NextDoc](https://img.shields.io/badge/NextDoc-AI%20Doctor%203.0-blue?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10+-green?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)

**A comprehensive AI-powered healthcare platform for medical consultations, health monitoring, and patient management.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [API Documentation](#-api-endpoints) • [Screenshots](#-screenshots)

</div>

---

## 🌟 Features

### 👤 Patient Features
- **AI Doctor Chat** - AI-powered medical consultation with DeepSeek R1
- **Symptom Checker** - Intelligent symptom analysis
- **Medicine Reminders** - Track medications and set reminders
- **Health Monitoring** - Monitor vital signs and health metrics
- **Medical Scanner** - Scan prescriptions and medical documents
- **Health Records** - Manage personal health records
- **Skin Analyzer** - AI-powered skin condition analysis
- **Pill Identifier** - Identify pills using AI vision
- **Subscription Plans** - Monthly/annual subscription with Razorpay

### 🔐 Admin Features
- **User Management** - Manage all users
- **Admin Dashboard** - System-wide KPIs and metrics
- **Message Reports** - Review reported messages
- **Content Management** - Manage platform content
- **Payment Tracking** - Monitor transactions and refunds
- **System Reports** - Generate platform analytics

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **Python 3.10+** | Core language |
| **MongoDB** | Database (via Motor async driver) |
| **JWT** | Authentication tokens |
| **Razorpay** | Payment processing |
| **Pydantic** | Data validation |
| **Resend** | Email notifications |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe JavaScript |
| **Vite** | Fast build tool |
| **TailwindCSS** | Utility-first CSS |
| **Radix UI** | Accessible component primitives |
| **Framer Motion** | Smooth animations |
| **React Hook Form** | Form handling |
| **TanStack Query** | Server state management |
| **Clerk** | Authentication |

### Mobile App
| Technology | Purpose |
|------------|---------|
| **React Native** | Cross-platform mobile |
| **Expo** | Development framework |
| **Redux Toolkit** | State management |

---

## 📁 Project Structure

```
NextDoc/
├── app/                          # Backend (FastAPI)
│   ├── api/                      # API endpoints (21 routers)
│   ├── auth/                     # JWT authentication
│   ├── billing/                  # Razorpay integration
│   ├── chat/                     # AI chat functionality
│   ├── health_records/           # Medical records
│   ├── messaging/                # Secure messaging
│   ├── prescriptions/            # Prescription management
│   ├── voice_service/            # Voice interactions
│   ├── config.py                 # App configuration
│   ├── database.py               # MongoDB connection
│   └── main.py                   # FastAPI app entry
│
├── frontend/                     # Web Frontend (React)
│   ├── client/src/
│   │   ├── components/           # Reusable UI components
│   │   ├── context/              # React context providers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # 41 application pages
│   │   └── utils/                # Utility functions
│   ├── package.json
│   └── vite.config.ts
│
├── mobile-app/                   # Mobile App (React Native)
│   ├── app/                      # Expo Router pages
│   ├── components/               # Mobile components
│   ├── services/                 # API services
│   └── store/                    # Redux store
│
├── .env.example                  # Environment template
├── requirements.txt              # Python dependencies
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/surojitgharami/NextDoc.git
cd NextDoc
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 4. Mobile App Setup
```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo
npx expo start
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Application
APP_NAME=AI Doctor 3.0
DEBUG=False

# MongoDB
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=ai_doctor_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!

# AI Configuration
CUSTOM_API_URL=https://your-ai-endpoint.ngrok-free.dev/api/v1/chat/message

# Voice Services
VOICE_REMOTE_URL=https://your-voice-service.ngrok-free.dev/

# Payments
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-secret-key

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:5000
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Chat & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/message` | Send message to AI |
| GET | `/api/conversations` | Get chat history |
| POST | `/api/symptom-checker` | Analyze symptoms |
| POST | `/api/scan` | Scan medical documents |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | List user medicines |
| POST | `/api/medicines` | Add new medicine |
| PUT | `/api/medicines/{id}` | Update medicine |
| DELETE | `/api/medicines/{id}` | Delete medicine |
| POST | `/api/medicine-intake` | Log medicine intake |

### Profile & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/avatar` | Upload avatar |
| GET | `/api/notification-settings` | Get notification preferences |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/billing/create-order` | Create Razorpay order |
| POST | `/api/billing/verify-payment` | Verify payment |
| GET | `/api/billing/subscription` | Get subscription status |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/reports` | Get system reports |
| GET | `/api/admin/message-reports` | Get reported messages |

---

## 🎨 Screenshots

### Landing Page
Modern, animated welcome page with dark/light mode support.

### AI Chat Interface
Clean chat interface with markdown support, voice input, and image upload.

### Dashboard
Comprehensive dashboard with health metrics, reminders, and quick actions.

### Medicine Tracker
Track medications, set reminders, and log intake history.

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt
- **Rate Limiting** - API request throttling
- **CORS Protection** - Configurable origins
- **Input Validation** - Pydantic schemas
- **Session Management** - Timeout and refresh

---

## 📱 Mobile App

The mobile app is built with React Native and Expo, featuring:
- Native navigation with Expo Router
- Redux Toolkit for state management
- Secure token storage
- Push notifications
- Voice recording and playback
- Camera integration for scanning

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Surojit Gharami**

- GitHub: [@surojitgharami](https://github.com/surojitgharami)

---

<div align="center">

**Built with ❤️ for better healthcare**

</div>

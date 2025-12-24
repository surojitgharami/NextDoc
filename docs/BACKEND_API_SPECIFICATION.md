# Backend API Specification for CareBot Frontend

This document contains all the API endpoints that your FastAPI backend needs to implement based on the UI requirements.

## 📁 Files to Share with Your Backend Developer

Share these folders/files from your frontend codebase:

```
client/src/
├── lib/
│   ├── api-hooks.ts          ← ALL API ENDPOINTS & USAGE
│   ├── aiDoctorApi.ts         ← CHAT API INTERFACES
│   └── queryClient.ts         ← BASE URL CONFIG
├── pages/
│   ├── ai-doctor-chat.tsx     ← Chat UI requirements
│   ├── medicine-reminder.tsx  ← Medicine data structure
│   ├── add-medicine.tsx       ← Medicine form fields
│   ├── health-monitoring.tsx  ← Health metrics
│   ├── appointments.tsx       ← Appointment data
│   └── symptom-checker.tsx    ← Symptom checker flow
└── types/ (if exists)         ← TypeScript interfaces
```

---

## 🌐 Base URL Configuration

```typescript
BACKEND_URL = http://localhost:8000
```

**Environment Variable:** `VITE_BACKEND_URL`

All requests include:
- `credentials: "include"` for session management
- `Content-Type: application/json` for POST/PUT requests

---

## 📋 Complete API Endpoints List

### 1️⃣ **CHAT ENDPOINTS**

#### GET `/chat/history`
**Purpose:** Get all conversations for a user  
**Query Params:** `user_id={userId}`  
**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "title": "string",
    "mode": "simple | symptom_checker",
    "isBookmarked": "boolean",
    "isFavorite": "boolean",
    "isDeleted": "boolean",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

#### POST `/chat/conversation`
**Purpose:** Create a new conversation  
**Request Body:**
```json
{
  "title": "string",
  "userId": "string"
}
```
**Response:** Single conversation object (same structure as above)

#### GET `/chat/messages/{conversationId}`
**Purpose:** Get all messages in a conversation  
**Response:**
```json
[
  {
    "id": "string",
    "conversationId": "string",
    "userId": "string",
    "content": "string",
    "role": "user | assistant",
    "isThinking": "boolean",
    "thinkingContent": "string (optional)",
    "timestamp": "timestamp",
    "attachment": {
      "type": "image | audio",
      "fileName": "string",
      "url": "string"
    }
  }
]
```

#### POST `/chat/send`
**Purpose:** Send a message and get AI response  
**Request Body:**
```json
{
  "conversationId": "string",
  "userId": "string",
  "content": "string",
  "mode": "simple | symptom_checker"
}
```
**Response:**
```json
{
  "message": {
    "id": "string",
    "conversationId": "string",
    "userId": "string",
    "content": "string (AI response)",
    "role": "assistant",
    "isThinking": "boolean",
    "thinkingContent": "string[]",
    "timestamp": "timestamp"
  },
  "thinking": ["step1", "step2", "step3"]
}
```

---

### 2️⃣ **MEDICINE ENDPOINTS**

#### GET `/medicine`
**Purpose:** Get all medicines for a user  
**Query Params:** `user_id={userId}`  
**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "type": "Capsule | Tablet | Drops | Vitamin",
    "name": "string",
    "dosage": "string",
    "strength": "string",
    "shape": "Round | Oval | Capsule | Square",
    "times": ["09:00", "13:00", "21:00"],
    "duration": "string (e.g., '7 days', '2 weeks')",
    "frequency": "Daily | Weekly | Monthly",
    "instruction": "Before Food | After Meal | At Bedtime",
    "notification": "boolean",
    "sound": "boolean",
    "vibration": "boolean",
    "isActive": "boolean",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
]
```

#### POST `/medicine`
**Purpose:** Create a new medicine  
**Request Body:** Same as medicine object above (without id, createdAt, updatedAt)

#### PUT `/medicine/{id}`
**Purpose:** Update a medicine  
**Request Body:** Partial medicine object (any fields to update)

#### DELETE `/medicine/{id}`
**Purpose:** Delete a medicine  
**Response:** Success message

---

### 3️⃣ **REMINDER ENDPOINTS**

#### GET `/reminder`
**Purpose:** Get all reminders for a user  
**Query Params:** `user_id={userId}`  
**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "medicineId": "string",
    "time": "HH:MM",
    "date": "YYYY-MM-DD",
    "status": "pending | completed | missed",
    "createdAt": "timestamp"
  }
]
```

#### POST `/reminder`
**Purpose:** Create a new reminder  
**Request Body:** Reminder object (without id, createdAt)

---

### 4️⃣ **USER PROFILE ENDPOINTS**

#### GET `/user/{userId}`
**Purpose:** Get user profile  
**Response:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string",
  "avatar": "string (URL)",
  "age": "number",
  "gender": "Male | Female | Other",
  "bloodGroup": "A+ | A- | B+ | B- | AB+ | AB- | O+ | O-",
  "height": "number",
  "weight": "number",
  "phoneNumber": "string",
  "address": "string",
  "emergencyContact": {
    "name": "string",
    "phone": "string",
    "relation": "string"
  },
  "medicalHistory": ["condition1", "condition2"],
  "allergies": ["allergy1", "allergy2"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### PUT `/user/{userId}`
**Purpose:** Update user profile  
**Request Body:** Partial user object (any fields to update)

---

### 5️⃣ **FILE UPLOAD ENDPOINTS**

#### POST `/upload`
**Purpose:** Upload images or audio files  
**Request:** `multipart/form-data`  
**Form Fields:**
- `file`: The file to upload
- `type`: "image" | "audio"
- `userId`: User ID

**Response:**
```json
{
  "url": "string (public URL to access file)",
  "fileName": "string",
  "type": "image | audio",
  "size": "number (bytes)"
}
```

**File Storage:**
- Images: `/uploads/chat-images/{filename}`
- Audio: `/uploads/voice-messages/{filename}`
- Max size: 5MB for images, 10MB for audio

---

### 6️⃣ **APPOINTMENT ENDPOINTS**

#### GET `/appointment`
**Purpose:** Get all appointments for a user  
**Query Params:** `user_id={userId}`  
**Response:**
```json
[
  {
    "id": "string",
    "userId": "string",
    "doctorName": "string",
    "specialty": "string",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "location": "string",
    "status": "scheduled | completed | cancelled",
    "notes": "string",
    "createdAt": "timestamp"
  }
]
```

#### POST `/appointment`
**Purpose:** Create a new appointment  
**Request Body:** Appointment object (without id, createdAt)

---

### 7️⃣ **SYMPTOM CHECKER ENDPOINTS**

#### POST `/symptom-check`
**Purpose:** Check symptoms and get AI analysis  
**Request Body:**
```json
{
  "userId": "string",
  "symptoms": ["symptom1", "symptom2", "symptom3"]
}
```
**Response:**
```json
{
  "analysis": "string (AI analysis)",
  "possibleConditions": [
    {
      "name": "string",
      "probability": "number (0-100)",
      "description": "string"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "urgency": "low | medium | high | emergency"
}
```

---

### 8️⃣ **AI DOCTOR CHAT (Alternative API)**

These endpoints use `/api` prefix and Bearer token authentication:

#### POST `/api/conversations`
**Headers:** `Authorization: Bearer {clerkToken}`  
**Request Body:**
```json
{
  "userId": "string",
  "title": "string",
  "mode": "simple"
}
```

#### POST `/api/chat/send`
**Headers:** `Authorization: Bearer {clerkToken}`  
**Request Body:**
```json
{
  "conversationId": "string",
  "userId": "string",
  "content": "string",
  "mode": "simple"
}
```

#### GET `/api/messages?conversationId={id}`
**Headers:** `Authorization: Bearer {clerkToken}`

#### GET `/api/conversations?userId={id}`
**Headers:** `Authorization: Bearer {clerkToken}`

---

## 🔒 Authentication

The frontend uses **Clerk** for authentication:

1. User logs in via Clerk (Google OAuth, Email/Password)
2. Clerk provides a JWT token
3. Frontend can send token in two ways:
   - **Session cookies** (automatic with `credentials: "include"`)
   - **Bearer token** in `Authorization` header

Your backend should:
- Validate Clerk JWT tokens
- Extract `userId` from token
- Ensure users can only access their own data

---

## 🎨 Data Validation Requirements

### Medicine Form Validation:
- `type`: Required, one of 4 types
- `name`: Required, min 2 characters
- `dosage`: Required
- `times`: Array of at least 1 time
- `duration`: Required
- `instruction`: One of 3 options

### Chat Message Validation:
- `content`: Required, min 1 character
- `conversationId`: Required UUID
- `userId`: Required, matches authenticated user

### User Profile Validation:
- `email`: Valid email format
- `phoneNumber`: Valid phone format
- `age`: Number between 0-120
- `bloodGroup`: One of 8 valid types

---

## 📊 Response Status Codes

- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid authentication
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "error": "string (error message)",
  "details": "string (optional detailed message)"
}
```

---

## 🔗 CORS Configuration

Your FastAPI backend needs:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📦 Next Steps for Backend Developer

1. **Review this specification** with your frontend team
2. **Implement FastAPI endpoints** matching these contracts
3. **Set up MongoDB** for data persistence
4. **Integrate AI model** (ChatGPT/Gemini) for chat responses
5. **Test with frontend** by running both servers together:
   - Frontend: `http://localhost:5000`
   - Backend: `http://localhost:8000`

---

## 📞 Integration Testing Checklist

- [ ] Chat conversation creation works
- [ ] Chat messages send and receive AI responses
- [ ] Medicine CRUD operations work
- [ ] File upload (images/audio) works
- [ ] User profile updates persist
- [ ] Appointments can be created
- [ ] Symptom checker returns AI analysis
- [ ] Authentication validates Clerk tokens
- [ ] CORS allows frontend requests
- [ ] Error responses match format

---

**Questions?** Contact your frontend team with this specification!

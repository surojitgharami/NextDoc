# AI Doctor 3.0 - Complete UI Pages Guide

## 📱 GETTING STARTED (Public/Unauthenticated)

| Page | Route | File Path |
|------|-------|-----------|
| **Splash Screen** | `/splash` | `frontend/client/src/pages/splash.tsx` |
| **Welcome/Landing** | `/welcome` | `frontend/client/src/pages/new-welcome.tsx` |
| **Sign In** | `/sign-in` | `frontend/client/src/pages/custom-auth.tsx` |
| **Sign Up (Patient)** | `/sign-up` | `frontend/client/src/pages/custom-auth.tsx` |
| **Sign Up (Doctor)** | `/sign-up-doctor` | `frontend/client/src/pages/custom-auth.tsx` |
| **SSO Callback** | `/sso-callback` | `frontend/client/src/pages/sso-callback.tsx` |

---

## 👤 PATIENT/USER PAGES (Role: User) - 28 Pages

### Dashboard & Core Features
| Page | Route | File Path |
|------|-------|-----------|
| **User Dashboard** | `/dashboard` / `/` | `frontend/client/src/pages/user-dashboard.tsx` |
| **New Dashboard (Alternative)** | `/new-dashboard` | `frontend/client/src/pages/new-dashboard.tsx` |

### Healthcare Services
| Page | Route | File Path |
|------|-------|-----------|
| **AI Doctor Chat** | `/ai-doctor-chat` | `frontend/client/src/pages/ai-doctor-chat.tsx` |
| **New Chat** | `/chat` | `frontend/client/src/pages/new-chat.tsx` |
| **Chat History** | `/history` | `frontend/client/src/pages/history.tsx` |
| **Symptom Checker** | `/symptom-checker` | `frontend/client/src/pages/symptom-checker.tsx` |
| **Health Monitoring** | `/health-monitoring` | `frontend/client/src/pages/health-monitoring.tsx` |
| **Medical Profile** | `/medical-profile` | `frontend/client/src/pages/medical-profile.tsx` |

### Appointments & Consultations
| Page | Route | File Path |
|------|-------|-----------|
| **Appointments** | `/appointments` | `frontend/client/src/pages/appointments.tsx` |
| **Book Doctor Appointment** | `/doctor/:id` | `frontend/client/src/pages/doctor-profile.tsx` |
| **Doctor Profile** | `/doctor/:id` | `frontend/client/src/pages/doctor-profile.tsx` |

### Records & Medications
| Page | Route | File Path |
|------|-------|-----------|
| **Health Records** | `/health-records` | `frontend/client/src/pages/health-records.tsx` |
| **Prescriptions** | `/prescriptions` | `frontend/client/src/pages/prescriptions.tsx` |
| **Medicine Reminder** | `/medicine-reminder` | `frontend/client/src/pages/medicine-reminder.tsx` |
| **Add Medicine** | `/add-medicine` | `frontend/client/src/pages/add-medicine.tsx` |
| **Medical Scanner** | `/scanner` | `frontend/client/src/pages/scanner.tsx` |

### Communication & Support
| Page | Route | File Path |
|------|-------|-----------|
| **Messaging** | `/messaging` | `frontend/client/src/pages/messaging.tsx` |
| **Support Tickets** | `/support` | `frontend/client/src/pages/support-tickets.tsx` |
| **Help Center** | `/help-center` | `frontend/client/src/pages/help-center.tsx` |

### Account & Billing
| Page | Route | File Path |
|------|-------|-----------|
| **Profile** | `/profile` | `frontend/client/src/pages/profile.tsx` |
| **Profile Details** | `/profile-details` | `frontend/client/src/pages/profile-details.tsx` |
| **Settings** | `/settings` | `frontend/client/src/pages/settings.tsx` |
| **Billing** | `/billing` | `frontend/client/src/pages/billing.tsx` |
| **Subscription Plans** | `/subscription` | `frontend/client/src/pages/subscription.tsx` |

---

## 👨‍⚕️ DOCTOR PAGES (Role: Doctor) - 7 Pages

### Dashboard & Management
| Page | Route | File Path |
|------|-------|-----------|
| **Doctor Dashboard** | `/doctor-dashboard` | `frontend/client/src/pages/doctor-dashboard.tsx` |

### Patient Management
| Page | Route | File Path |
|------|-------|-----------|
| **My Patients** | `/doctor/patients` | `frontend/client/src/pages/doctor/patients.tsx` |
| **Manage Appointments** | `/doctor/appointments` | `frontend/client/src/pages/doctor/appointments.tsx` |

### Consultation Tools
| Page | Route | File Path |
|------|-------|-----------|
| **Prescriptions** | `/doctor/prescriptions` | `frontend/client/src/pages/doctor/prescriptions.tsx` |
| **Visit Notes** | `/doctor/visit-notes` | `frontend/client/src/pages/doctor/visit-notes.tsx` |

### Analytics & Earnings
| Page | Route | File Path |
|------|-------|-----------|
| **Analytics Dashboard** | `/doctor/analytics` | `frontend/client/src/pages/doctor/analytics.tsx` |
| **Earnings & Revenue** | `/doctor/earnings` | `frontend/client/src/pages/doctor/earnings.tsx` |

---

## 🔐 ADMIN PAGES (Role: Admin) - 9 Pages

### System Management
| Page | Route | File Path |
|------|-------|-----------|
| **Admin Dashboard** | `/admin` | `frontend/client/src/pages/admin-dashboard.tsx` |

### User & Doctor Management
| Page | Route | File Path |
|------|-------|-----------|
| **Doctor Verification** | `/admin/doctor-verification` | `frontend/client/src/pages/admin-doctor-verification.tsx` |
| **User Management** | `/admin/user-management` | `frontend/client/src/pages/admin-user-management.tsx` |

### Transactions & Payouts
| Page | Route | File Path |
|------|-------|-----------|
| **Payment Management** | `/admin/payments` | `frontend/client/src/pages/admin-payments.tsx` |
| **Doctor Payouts** | `/admin/payouts` | `frontend/client/src/pages/admin/payout-management.tsx` |

### Monitoring & Reports
| Page | Route | File Path |
|------|-------|-----------|
| **Appointments** | `/admin/appointments` | `frontend/client/src/pages/admin-appointments.tsx` |
| **Reports** | `/admin/reports` | `frontend/client/src/pages/admin-reports.tsx` |
| **Support Tickets** | `/admin/support` | `frontend/client/src/pages/admin-support.tsx` |
| **Notifications** | `/admin/notifications` | `frontend/client/src/pages/admin-notifications.tsx` |

---

## 📋 LEGAL & INFO PAGES (Public) - 3 Pages

| Page | Route | File Path |
|------|-------|-----------|
| **Terms & Conditions** | `/terms-conditions` | `frontend/client/src/pages/terms-conditions.tsx` |
| **Privacy Policy** | `/privacy-policy` | `frontend/client/src/pages/privacy-policy.tsx` |
| **Not Found (404)** | `*` (any unknown route) | `frontend/client/src/pages/not-found.tsx` |

---

## 📊 QUICK STATS

- **Total Pages**: 47
- **Getting Started Pages**: 6 (Public)
- **Patient/User Pages**: 28
- **Doctor Pages**: 7
- **Admin Pages**: 9
- **Legal/Info Pages**: 3

---

## 📁 Directory Structure

```
frontend/client/src/pages/
├── splash.tsx                           # Splash screen
├── new-welcome.tsx                      # Welcome/landing page
├── custom-auth.tsx                      # Sign in/Sign up (all variants)
├── sso-callback.tsx                     # SSO callback handler
│
├── user-dashboard.tsx                   # User main dashboard
├── new-dashboard.tsx                    # Alternative dashboard
│
├── new-chat.tsx                         # AI chat
├── ai-doctor-chat.tsx                   # AI doctor chat
├── history.tsx                          # Chat history
├── symptom-checker.tsx                  # Symptom checker tool
├── health-monitoring.tsx                # Health monitoring
│
├── appointments.tsx                     # Book/view appointments
├── doctor-profile.tsx                   # View doctor & book
│
├── health-records.tsx                   # View health records
├── prescriptions.tsx                    # Patient prescriptions
├── medicine-reminder.tsx                # Medicine reminders
├── add-medicine.tsx                     # Add medication
├── scanner.tsx                          # Medical record scanner
│
├── medical-profile.tsx                  # Medical profile setup
├── messaging.tsx                        # Secure messaging
├── support-tickets.tsx                  # Support system
├── help-center.tsx                      # Help & documentation
│
├── profile.tsx                          # View profile
├── profile-details.tsx                  # Edit profile details
├── settings.tsx                         # User settings
├── billing.tsx                          # Billing history
├── subscription.tsx                     # Subscription plans
│
├── doctor-dashboard.tsx                 # Doctor main dashboard
├── doctor/
│   ├── patients.tsx                     # Doctor's patients list
│   ├── appointments.tsx                 # Doctor's appointments
│   ├── prescriptions.tsx                # Doctor's prescriptions
│   ├── visit-notes.tsx                  # Visit notes management
│   ├── analytics.tsx                    # Doctor analytics
│   └── earnings.tsx                     # Doctor earnings
│
├── admin-dashboard.tsx                  # Admin main dashboard
├── admin-doctor-verification.tsx        # Doctor verification
├── admin-user-management.tsx            # User management
├── admin-payments.tsx                   # Payment management
├── admin-appointments.tsx               # Appointment management
├── admin-reports.tsx                    # System reports
├── admin-support.tsx                    # Support management
├── admin-notifications.tsx              # Notification management
├── admin/
│   └── payout-management.tsx            # Doctor payouts
│
├── terms-conditions.tsx                 # Terms & conditions
├── privacy-policy.tsx                   # Privacy policy
└── not-found.tsx                        # 404 page
```

---

## 🔑 Key Features by Role

### 👤 PATIENT/USER (28 pages)
- ✅ AI Doctor consultation via chat
- ✅ Symptom checker
- ✅ Book doctor appointments
- ✅ Health monitoring & records
- ✅ Prescription management
- ✅ Medicine reminders & tracking
- ✅ Medical record scanning
- ✅ Secure messaging with doctors
- ✅ Subscription management (monthly/annual plans)
- ✅ Razorpay payment integration
- ✅ Support tickets
- ✅ Medical profile setup
- ✅ Profile customization & settings

### 👨‍⚕️ DOCTOR (7 pages)
- ✅ Dashboard with patient overview
- ✅ Patient management & list
- ✅ Appointment scheduling & management
- ✅ Prescription writing & tracking
- ✅ Visit notes & consultation records
- ✅ Performance analytics
- ✅ Earnings tracking & revenue reports
- ✅ Razorpay payment settlement

### 🔐 ADMIN (9 pages)
- ✅ System-wide dashboard with KPIs
- ✅ Doctor verification & onboarding
- ✅ User management & verification
- ✅ Payment processing & tracking
- ✅ Doctor payout management with CSV export
- ✅ Appointment oversight
- ✅ System reports & analytics
- ✅ Support ticket management
- ✅ Notification management

---

## 🛣️ Route Protection & Access Control

### Public Routes (No Authentication Required)
- `/splash` - Splash screen
- `/welcome` - Landing page
- `/sign-in` - Sign in page
- `/sign-up` - Patient registration
- `/sign-up-doctor` - Doctor registration
- `/terms-conditions` - Terms & conditions
- `/privacy-policy` - Privacy policy

### Protected Routes (Authentication Required)
- All other routes require valid JWT token
- User must be logged in to access

### Role-Based Access Control
- **User Routes**: `/dashboard`, `/chat`, `/appointments`, `/prescriptions`, `/subscription`, `/billing`, etc.
- **Doctor Routes**: `/doctor-dashboard`, `/doctor/patients`, `/doctor/earnings`, `/doctor/analytics`, etc.
- **Admin Routes**: `/admin`, `/admin/doctor-verification`, `/admin/payouts`, `/admin/user-management`, etc.

---

## 🔐 Razorpay Payment Integration

### User-Facing Payment Pages
- **Subscription Plans** (`/subscription`) - Choose and purchase subscription plans
  - Monthly Plan
  - Annual Plan
- **Billing History** (`/billing`) - View past transactions

### Doctor Payment Pages
- **Earnings** (`/doctor/earnings`) - View consultation fees and earnings

### Admin Payment Pages
- **Payments** (`/admin/payments`) - Track all system payments
- **Payouts** (`/admin/payouts`) - Manage doctor earnings and payouts

---

## 💡 Navigation Tips

### For Patients
1. Start at `/splash` or `/welcome`
2. Sign up at `/sign-up`
3. Go to `/dashboard` after login
4. Use `/chat` for AI consultations
5. Book appointments at `/appointments`
6. Manage subscription at `/subscription`

### For Doctors
1. Sign up at `/sign-up-doctor`
2. Verify at admin dashboard
3. Go to `/doctor-dashboard` after login
4. View patients at `/doctor/patients`
5. Check earnings at `/doctor/earnings`

### For Admins
1. Use pre-configured admin account
2. Login to access `/admin`
3. Verify doctors at `/admin/doctor-verification`
4. Manage payouts at `/admin/payouts`
5. View system reports at `/admin/reports`

---

## ✅ Testing Checklist

- [ ] All public pages load without authentication
- [ ] Authentication redirects work correctly
- [ ] Role-based access control enforced
- [ ] Patient pages only accessible to users
- [ ] Doctor pages only accessible to doctors
- [ ] Admin pages only accessible to admins
- [ ] Razorpay payment flows work
- [ ] Doctor earnings calculated correctly
- [ ] Admin payout reports generated correctly
- [ ] Subscription expiry checks prevent chat access

---

*Last Updated: December 2, 2025*
*AI Doctor 3.0 Platform v1.0*

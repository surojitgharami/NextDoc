# 📱 Quick Start Guide - Testing on Your Phone

## ✅ Current Status
- ✅ Expo dev server is running
- ✅ Config updated for physical device

## 🔧 Setup Steps

### 1. Install Expo Go on Your Phone
- Open **Google Play Store**
- Search for **"Expo Go"**
- Install the app

### 2. Find Your Computer's IP Address
Run this command in a new terminal:
```bash
ipconfig
```
Look for **"IPv4 Address"** under your WiFi/Ethernet adapter (e.g., `192.168.31.100`)

### 3. Update API Configuration
Open: `mobile-app/constants/config.ts`

Change line 7:
```typescript
const YOUR_COMPUTER_IP = '192.168.31.XXX'; // Replace XXX with your IP
```

### 4. Make Sure Backend is Accessible
Your backend must listen on `0.0.0.0` (not just `localhost`):
```bash
# In a new terminal
cd c:/Users/Conne/Downloads/AIDoctorCareBotImage/AIDoctorCareBotCopy
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Connect Your Phone
In the Expo Go app:
- Tap **"Scan QR code"**
- Scan the QR code from your terminal

OR

- Look for the URL in terminal (e.g., `exp://192.168.31.1:8081`)
- Enter it manually in Expo Go

---

## 🧪 Test the App

1. **Sign In** with:
   - Email: `admin@aidoctor.com`
   - Password: `Admin123!`

2. **Test Navigation**:
   - Open drawer menu (hamburger icon)
   - Navigate between screens

3. **Verify Backend Connection**:
   - If login fails with "Network Error", check:
     - ✅ Backend is running on `0.0.0.0:8000`
     - ✅ IP address in `config.ts` matches your computer
     - ✅ Phone and computer are on same WiFi network

---

## 🚫 Troubleshooting

### "Network Error" on Login
1. Verify backend is accessible from phone:
   - Open browser on phone
   - Go to `http://YOUR_IP:8000`
   - Should see: `{"service":"AI Doctor 3.0",...}`

2. Check firewall:
   - Windows Firewall might block port 8000
   - Allow Python/uvicorn through firewall

### Can't Scan QR Code
- Use manual URL entry in Expo Go
- Make sure phone and computer are on same network

---

## 📝 Current Configuration
- **API URL**: `http://192.168.31.1:8000` (update this!)
- **Dev Server**: Running on port 8081
- **Backend**: Should run on `0.0.0.0:8000`

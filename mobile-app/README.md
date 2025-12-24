# AI Doctor - Android App Setup Guide

## Quick Start

### 1. Navigate to Project
```bash
cd c:/Users/Conne/Downloads/AIDoctorCareBotImage/AIDoctorCareBotCopy/mobile-app
```

### 2. Start Development Server
```bash
npx expo start
```

### 3. Run on Android
- Press `a` in the terminal, OR
- Scan QR code with Expo Go app on your phone

---

## Backend Configuration

### For Android Emulator
✅ Already configured to use `10.0.2.2:8000` (host machine's localhost)

### For Physical Device
1. Find your computer's IP address:
   ```bash
   # Windows
   ipconfig
   
   # Look for "IPv4 Address" under your active network adapter
   # Example: 192.168.1.100
   ```

2. Update `mobile-app/constants/config.ts`:
   ```typescript
   export const API_BASE_URL = 'http://192.168.1.XXX:8000';
   ```

3. Ensure backend is accessible:
   ```bash
   # Start backend with host 0.0.0.0
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## Testing the App

### 1. Start Backend
```bash
cd c:/Users/Conne/Downloads/AIDoctorCareBotImage/AIDoctorCareBotCopy
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Test Login
- Email: `admin@aidoctor.com`
- Password: `Admin123!`

---

## Building APK

### Option 1: EAS Build (Recommended)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build APK
eas build --platform android --profile preview
```

### Option 2: Local Build
```bash
# Generate native code
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## Project Structure

```
mobile-app/
├── app/
│   ├── _layout.tsx           # Root layout with auth
│   ├── sign-in.tsx           # Login screen
│   ├── sign-up.tsx           # Registration
│   └── (app)/                # Protected screens
│       ├── dashboard.tsx     # Main dashboard
│       ├── profile.tsx       # User profile
│       └── chat.tsx          # AI chat
├── store/
│   ├── index.ts              # Redux store
│   └── authSlice.ts          # Auth state
├── api/
│   └── axiosInstance.ts      # API client
└── constants/
    ├── Colors.ts             # Theme
    └── config.ts             # API URL
```

---

## Troubleshooting

### "Network Error" on Login
- ✅ Check backend is running on port 8000
- ✅ Verify API URL in `constants/config.ts`
- ✅ For physical device, use computer's IP address

### "Expo Go" vs "Development Build"
- **Expo Go**: Quick testing, limited native features
- **Development Build**: Full features, requires `npx expo prebuild`

### Android Emulator Not Connecting
```bash
# Check emulator can reach host
adb shell ping 10.0.2.2
```

---

## Next Steps

1. ✅ Test authentication (login/register)
2. ✅ Verify navigation (drawer menu)
3. 🔄 Implement Chat screen
4. 🔄 Add file upload for Scanner
5. 🔄 Build production APK

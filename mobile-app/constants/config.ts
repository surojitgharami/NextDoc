import { Platform } from 'react-native';

// Base API URL configuration
// IMPORTANT: For physical device testing, replace YOUR_COMPUTER_IP with your actual IP
// Find it by running 'ipconfig' (Windows) and look for IPv4 Address (e.g., 192.168.1.100)

const YOUR_COMPUTER_IP = '192.168.31.40'; // ✅ Your computer's IP address

export const API_BASE_URL = __DEV__
    ? Platform.OS === 'android'
        ? `http://${YOUR_COMPUTER_IP}:8000`  // For physical device
        : 'http://localhost:8000'             // For iOS Simulator
    : 'https://your-production-api.com';    // Replace with production URL

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Use 10.0.2.2 for Android Emulator to access host localhost
// Use localhost for iOS Simulator
// Use your machine's IP for physical device
const BASE_URL = Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to add Token
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh (Simplified)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = await SecureStore.getItemAsync('refresh_token');
                if (refreshToken) {
                    // Call your refresh endpoint
                    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
                        refresh_token: refreshToken
                    });

                    const { access_token } = response.data;
                    await SecureStore.setItemAsync('access_token', access_token);

                    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Logout if refresh fails
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;

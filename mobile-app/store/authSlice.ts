import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../api/axiosInstance';
import { Alert } from 'react-native';

interface User {
    id: string;
    email: string;
    name: string;
    roles: string[];
    avatar_url?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isLoading: true, // Start loading to check for stored token
    error: null,
    isAuthenticated: false,
};

// Async Thunk to load user from storage
export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
    try {
        const token = await SecureStore.getItemAsync('access_token');
        if (!token) return null;

        // Verify token with backend 'me' endpoint
        const response = await api.get('/api/auth/me');
        return { user: response.data, token };
    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            // Token invalid
            await SecureStore.deleteItemAsync('access_token');
            await SecureStore.deleteItemAsync('refresh_token');
        }
        return rejectWithValue('Session expired or invalid');
    }
});

// Async Thunk for Login
export const login = createAsyncThunk('auth/login', async (credentials: any, { rejectWithValue }) => {
    try {
        const response = await api.post('/api/auth/login', credentials);
        const { access_token, refresh_token, user } = response.data;

        await SecureStore.setItemAsync('access_token', access_token);
        await SecureStore.setItemAsync('refresh_token', refresh_token);

        return { user, token: access_token };
    } catch (error: any) {
        const message = error.response?.data?.detail || 'Login failed';
        Alert.alert('Login Error', message);
        return rejectWithValue(message);
    }
});

// Async Thunk for Logout
export const logout = createAsyncThunk('auth/logout', async () => {
    try {
        await api.post('/api/auth/logout');
    } catch (e) {
        // ignore error
    }
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Load User
            .addCase(loadUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(loadUser.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload) {
                    state.user = action.payload.user;
                    state.token = action.payload.token;
                    state.isAuthenticated = true;
                } else {
                    state.isAuthenticated = false;
                    state.user = null;
                    state.token = null;
                }
            })
            .addCase(loadUser.rejected, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
            })
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
            });
    },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;

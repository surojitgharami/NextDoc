import { Stack } from 'expo-router';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from '../store';
import { useEffect } from 'react';
import { loadUser } from '../store/authSlice';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { setAuthTokenGetter } from '../services/api';

function InitialLayout() {
  const { isAuthenticated, isLoading, token } = useSelector((state: RootState) => state.auth);
  const segments = useSegments();
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser() as any);
  }, [dispatch]);

  // Initialize API auth token getter
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    if (isLoading) return;

    // Safety check for navigation readiness
    const inAuthGroup = segments[0] === '(app)';
    const inPublicGroup = segments[0] === 'sign-in' || segments[0] === 'sign-up' || segments[0] === 'welcome' || segments[0] === 'forgot-password' || segments[0] === 'reset-password' || segments[0] === 'verify-email' || segments.length === 0;

    if (isAuthenticated && !inAuthGroup) {
      router.replace('/(app)/dashboard');
    } else if (!isAuthenticated && !inPublicGroup) {
      router.replace('/welcome');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <InitialLayout />
    </Provider>
  );
}

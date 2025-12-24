import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography, spacing } from '@/constants/Theme';
import { TouchableOpacity } from 'react-native';
import api from '../api/axiosInstance';

const THEME = {
  light: {
    background: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#4F46E5',
    success: '#10B981',
    error: '#EF4444',
  },
  dark: {
    background: ['#000000', '#0F172A', '#020617'],
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    primary: '#6366F1',
    success: '#34D399',
    error: '#F87171',
  },
};

export default function VerifyEmail() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? THEME.dark : THEME.light;

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await api.get(`/auth/verify?token=${verificationToken}`);

      if (response.status === 200) {
        setStatus('success');
        setMessage('Email verified successfully! You can now sign in.');
        setTimeout(() => router.replace('/sign-in'), 3000);
      } else {
        setStatus('expired');
        setMessage('Invalid or expired verification link.');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      if (error.response?.status === 400) {
        setStatus('expired');
        setMessage('Invalid or expired verification link.');
      } else {
        setStatus('error');
        setMessage('Verification failed. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.background as any}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {status === 'loading' && (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
            {status === 'success' && (
              <CheckCircle2 size={80} color={colors.success} />
            )}
            {(status === 'error' || status === 'expired') && (
              <XCircle size={80} color={colors.error} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {status === 'loading' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'expired' && 'Link Expired'}
            {status === 'error' && 'Verification Failed'}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          {status === 'success' && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/sign-in')}
            >
              <Text style={styles.buttonText}>Go to Sign In</Text>
            </TouchableOpacity>
          )}

          {(status === 'expired' || status === 'error') && (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton, { borderColor: colors.primary }]}
                onPress={() => router.replace('/sign-in')}
              >
                <Text style={[styles.buttonText, { color: colors.primary }]}>Back to Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={() => router.replace('/sign-up')}
              >
                <Text style={styles.buttonText}>Sign Up Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    maxWidth: 320,
    lineHeight: 24,
  },
  button: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonGroup: {
    width: '100%',
    gap: spacing.md,
  },
});

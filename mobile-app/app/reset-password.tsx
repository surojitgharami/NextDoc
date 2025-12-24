import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { typography, spacing, borderRadius } from '@/constants/Theme';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay, 
    Easing, 
} from 'react-native-reanimated';
import api from '../api/axiosInstance';
import { CustomAlert } from '../components/ui/CustomAlert';

// Theme Configuration
const THEME = {
  light: {
    background: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    text: '#0F172A',
    textSecondary: '#64748B',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.6)',
    inputBg: 'rgba(255, 255, 255, 0.6)',
    inputBorder: '#E2E8F0',
    primary: '#4F46E5',
    primaryGradient: ['#4F46E5', '#6366F1'],
    iconColor: '#94A3B8',
    success: '#10B981',
  },
  dark: {
    background: ['#000000', '#0F172A', '#020617'],
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    cardBg: 'rgba(30, 41, 59, 0.7)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    inputBg: 'rgba(15, 23, 42, 0.5)',
    inputBorder: '#334155',
    primary: '#6366F1',
    primaryGradient: ['#6366F1', '#8B5CF6'],
    iconColor: '#64748B',
    success: '#34D399',
  },
};

export default function ResetPassword() {
    const params = useLocalSearchParams();
    const token = params.token as string;
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        title: string;
        message: string;
        buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: '',
        buttons: [],
    });
    
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? THEME.dark : THEME.light;

    // Animations
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(50);
    
    useEffect(() => {
        // Check if token exists
        if (!token) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Link',
                message: 'This password reset link is invalid or has expired. Please request a new one.',
                buttons: [{
                    text: 'Request New Link',
                    onPress: () => router.replace('/forgot-password'),
                    style: 'default'
                }],
            });
            return;
        }

        cardOpacity.value = withTiming(1, { duration: 800 });
        cardTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
    }, [token]);

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }]
    }));

    const validatePassword = (password: string): string | null => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[A-Za-z]/.test(password)) {
            return 'Password must contain at least one letter';
        }
        if (!/\d/.test(password)) {
            return 'Password must contain at least one number';
        }
        return null;
    };

    const handleResetPassword = async () => {
        // Validation
        if (!newPassword || !confirmPassword) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Fields Required',
                message: 'Please fill in all fields.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Password',
                message: passwordError,
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Passwords Don\'t Match',
                message: 'Please make sure both passwords match.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/api/auth/reset-password', {
                token,
                new_password: newPassword,
                confirm_new_password: confirmPassword,
            });
            
            // Success
            setAlertConfig({
                visible: true,
                type: 'success',
                title: 'Password Reset Successful',
                message: 'Your password has been reset successfully. You can now sign in with your new password.',
                buttons: [{
                    text: 'Sign In',
                    onPress: () => router.replace('/sign-in'),
                    style: 'default'
                }],
            });
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.detail || error.response.data?.message;
                
                if (status === 400) {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Invalid or Expired Link',
                        message: message || 'This reset link is invalid or has expired. Please request a new one.',
                        buttons: [{
                            text: 'Request New Link',
                            onPress: () => router.replace('/forgot-password'),
                            style: 'default'
                        }],
                    });
                } else {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Error',
                        message: message || 'Failed to reset password. Please try again.',
                        buttons: [{ text: 'OK', style: 'default' }],
                    });
                }
            } else {
                setAlertConfig({
                    visible: true,
                    type: 'error',
                    title: 'Connection Error',
                    message: 'Unable to connect to the server. Please check your internet connection.',
                    buttons: [{ text: 'OK', style: 'default' }],
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            <LinearGradient
                colors={colors.background as any}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={() => router.replace('/sign-in')}
                    >
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Animated.View style={[cardStyle, styles.cardContainer]}>
                        <BlurView 
                            intensity={isDark ? 30 : 50} 
                            tint={isDark ? 'dark' : 'light'} 
                            style={[
                                styles.blurCard, 
                                { 
                                    backgroundColor: colors.cardBg, 
                                    borderColor: colors.cardBorder 
                                }
                            ]}
                        >
                            <View style={styles.iconContainer}>
                                <View style={[styles.iconBubble, { backgroundColor: `${colors.primary}15` }]}>
                                    <Lock size={32} color={colors.primary} />
                                </View>
                            </View>

                            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Enter your new password below.
                            </Text>

                            <View style={styles.form}>
                                {/* New Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Lock size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Min 8 characters"
                                            placeholderTextColor={colors.textSecondary}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                            {showNewPassword ? (
                                                <EyeOff size={20} color={colors.iconColor} />
                                            ) : (
                                                <Eye size={20} color={colors.iconColor} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Check size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Re-enter password"
                                            placeholderTextColor={colors.textSecondary}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirmPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                            {showConfirmPassword ? (
                                                <EyeOff size={20} color={colors.iconColor} />
                                            ) : (
                                                <Eye size={20} color={colors.iconColor} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Password Requirements */}
                                <View style={[styles.requirementsBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(79, 70, 229, 0.05)', borderColor: `${colors.primary}30` }]}>
                                    <Text style={[styles.requirementsTitle, { color: colors.text }]}>Password must contain:</Text>
                                    <Text style={[styles.requirement, { color: colors.textSecondary }]}>• At least 8 characters</Text>
                                    <Text style={[styles.requirement, { color: colors.textSecondary }]}>• At least one letter</Text>
                                    <Text style={[styles.requirement, { color: colors.textSecondary }]}>• At least one number</Text>
                                </View>

                                {/* Reset Button */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                    style={styles.buttonContainer}
                                >
                                    <LinearGradient
                                        colors={colors.primaryGradient as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.buttonText}>Reset Password</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>

            {/* Custom Alert Modal */}
            <CustomAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    cardContainer: {
        width: '100%',
        marginTop: spacing.xl,
    },
    blurCard: {
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.xl,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: spacing.lg,
    },
    iconBubble: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    form: {
        width: '100%',
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: typography.fontSize.base,
    },
    eyeIcon: {
        padding: spacing.xs,
    },
    requirementsBox: {
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
    },
    requirementsTitle: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    requirement: {
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    buttonContainer: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    buttonText: {
        color: '#fff',
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
    },
});

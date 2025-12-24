import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, StatusBar, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, Send, KeyRound } from 'lucide-react-native';
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

// Theme Configuration (matching other screens)
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
    iconColor: '#94A3B8'
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
    iconColor: '#64748B'
  },
};

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
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
        cardOpacity.value = withTiming(1, { duration: 800 });
        cardTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }]
    }));

    const handleSendReset = async () => {
        if (!email) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Email Required',
                message: 'Please enter your email address to continue.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Email',
                message: 'Please enter a valid email address.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/api/auth/forgot-password', { email });
            
            // Success
            setAlertConfig({
                visible: true,
                type: 'success',
                title: 'Email Sent',
                message: 'If an account exists with this email, you will receive a password reset link shortly. Please check your inbox and spam folder.',
                buttons: [{ 
                    text: 'OK', 
                    onPress: () => router.replace('/sign-in'),
                    style: 'default'
                }],
            });
        } catch (error: any) {
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.detail || error.response.data?.message;
                
                if (status === 404 || status === 400) {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Email Not Found',
                        message: 'No account exists with this email address. Please check your email or create a new account.',
                        buttons: [
                            { text: 'Try Again', style: 'cancel' },
                            { 
                                text: 'Sign Up', 
                                onPress: () => router.push('/sign-up'),
                                style: 'default'
                            }
                        ],
                    });
                } else if (status === 429) {
                    setAlertConfig({
                        visible: true,
                        type: 'warning',
                        title: 'Too Many Requests',
                        message: 'Please wait a moment before trying again.',
                        buttons: [{ text: 'OK', style: 'default' }],
                    });
                } else {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Server Error',
                        message: message || 'Something went wrong. Please try again later.',
                        buttons: [{ text: 'OK', style: 'default' }],
                    });
                }
            } else if (error.request) {
                setAlertConfig({
                    visible: true,
                    type: 'error',
                    title: 'Connection Error',
                    message: 'Unable to connect to the server. Please check your internet connection and try again.',
                    buttons: [{ text: 'OK', style: 'default' }],
                });
            } else {
                setAlertConfig({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: 'An unexpected error occurred. Please try again.',
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
                        onPress={() => router.back()}
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
                                <View style={[styles.iconBubble, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)' }]}>
                                    <KeyRound size={32} color={colors.primary} />
                                </View>
                            </View>

                            <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
                            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                Enter your email address and we'll send you a link to reset your password.
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Mail size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="your@email.com"
                                            placeholderTextColor={colors.textSecondary}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleSendReset}
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
                                            <>
                                                <Text style={styles.buttonText}>Send Reset Link</Text>
                                                <Send size={20} color="#fff" />
                                            </>
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
        paddingHorizontal: spacing.md,
        lineHeight: 20,
    },
    form: {
        width: '100%',
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
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

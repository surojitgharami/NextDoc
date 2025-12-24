import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, useColorScheme, StatusBar, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/authSlice';
import { useRouter } from 'expo-router';
import { AppDispatch, RootState } from '../store';
import { Colors } from '../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Check, Sparkles, Brain, LogIn } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { typography, spacing, borderRadius } from '@/constants/Theme';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay, 
    withSpring, 
    Easing, 
    interpolate,
    withSequence,
    withRepeat
} from 'react-native-reanimated';

// Theme Configuration (matching welcome screen)
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
    accent: '#818CF8',
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
    accent: '#A78BFA',
    iconColor: '#64748B'
  },
};

import * as SecureStore from 'expo-secure-store';

export default function SignIn() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const dispatch = useDispatch<AppDispatch>();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);
    const router = useRouter();
    
    // Theme
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? THEME.dark : THEME.light;

    // Animations
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(50);
    const titleOpacity = useSharedValue(0);
    const formTranslateY = useSharedValue(20);
    const formOpacity = useSharedValue(0);
    
    useEffect(() => {
        // Load remembered email
        const loadRememberedEmail = async () => {
            try {
                const savedEmail = await SecureStore.getItemAsync('remembered_email');
                if (savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                }
            } catch (e) {
                console.log('Failed to load email', e);
            }
        };
        loadRememberedEmail();

        // Entrance Animations
        cardOpacity.value = withTiming(1, { duration: 800 });
        cardTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
        
        titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
        formOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
        formTranslateY.value = withDelay(600, withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1.5)) }));
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }]
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value
    }));

    const formStyle = useAnimatedStyle(() => ({
        opacity: formOpacity.value,
        transform: [{ translateY: formTranslateY.value }]
    }));

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const result = await dispatch(login({ email, password }));
        if (login.fulfilled.match(result)) {
            // Handle Remember Me
            try {
                if (rememberMe) {
                    await SecureStore.setItemAsync('remembered_email', email);
                } else {
                    await SecureStore.deleteItemAsync('remembered_email');
                }
            } catch (e) {
                console.log('Failed to save email', e);
            }
            router.replace('/(app)/dashboard');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            
            {/* Background */}
            <LinearGradient
                colors={colors.background}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                        onPress={() => router.replace('/welcome')}
                    >
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
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
                            <Animated.View style={[styles.titleContainer, titleStyle]}>
                                <View style={[styles.iconBubble, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(79, 70, 229, 0.1)' }]}>
                                    <Brain size={32} color={colors.primary} />
                                </View>
                                <Text style={[styles.welcomeText, { color: colors.text }]}>Welcome Back</Text>
                                <Text style={[styles.subText, { color: colors.textSecondary }]}>
                                    Sign in to <Text style={{ fontWeight: '700', color: colors.primary }}>NextDoc</Text>
                                </Text>
                            </Animated.View>

                            <Animated.View style={[styles.formContainer, formStyle]}>
                                {/* Email Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
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

                                {/* Password Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Lock size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Min 8 characters"
                                            placeholderTextColor={colors.textSecondary}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                            {showPassword ? (
                                                <EyeOff size={20} color={colors.iconColor} />
                                            ) : (
                                                <Eye size={20} color={colors.iconColor} />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Options */}
                                <View style={styles.optionsRow}>
                                    <TouchableOpacity 
                                        style={styles.rememberMe}
                                        onPress={() => setRememberMe(!rememberMe)}
                                    >
                                        <View style={[
                                            styles.checkbox, 
                                            { borderColor: rememberMe ? colors.primary : colors.iconColor, backgroundColor: rememberMe ? colors.primary : 'transparent' }
                                        ]}>
                                            {rememberMe && <Check size={12} color="#fff" />}
                                        </View>
                                        <Text style={[styles.optionText, { color: colors.textSecondary }]}>Remember me</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                                        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Login Button */}
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    style={styles.buttonContainer}
                                >
                                    <LinearGradient
                                        colors={colors.primaryGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.gradientButton}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <Text style={styles.buttonText}>Sign In</Text>
                                                <LogIn size={20} color="#fff" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                            </Animated.View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account?</Text>
                                <TouchableOpacity onPress={() => router.push('/sign-up')}>
                                    <Text style={[styles.createAccountText, { color: colors.primary }]}>Create Account</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </Animated.View>
                </ScrollView>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    blurCard: {
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.xl,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconBubble: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    subText: {
        fontSize: typography.fontSize.sm,
    },
    formContainer: {
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
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rememberMe: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: {
        fontSize: typography.fontSize.sm,
    },
    forgotText: {
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: spacing.sm,
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
    footer: {
        marginTop: spacing.xl,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.xs,
    },
    footerText: {
        fontSize: typography.fontSize.sm,
    },
    createAccountText: {
        fontSize: typography.fontSize.sm,
        fontWeight: 'bold',
    },
});

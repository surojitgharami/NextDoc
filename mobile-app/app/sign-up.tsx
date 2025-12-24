import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useColorScheme, StatusBar, TextInput, ActivityIndicator, Platform, Modal } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../store/authSlice';
import { useRouter } from 'expo-router';
import { AppDispatch, RootState } from '../store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Mail, ArrowLeft, User, Phone, Calendar, Check, AlertCircle, CheckCircle2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { typography, spacing } from '@/constants/Theme';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay, 
    Easing,
    withSequence,
    withRepeat,
} from 'react-native-reanimated';
import { CustomAlert } from '../components/ui/CustomAlert';
import { ContentModal } from '../components/ui/ContentModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/axiosInstance';

// Theme Configuration (keeping existing theme)
const THEME = {
  light: {
    background: ['#F8FAFC', '#F1F5F9', '#E2E8F0'],
    text: '#0F172A',
    textSecondary: '#64748B',
    cardBg: 'rgba(255, 255, 255, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.6)',
    inputBg: 'rgba(255, 255, 255, 0.6)',
    inputBorder: '#E2E8F0',
    inputBorderFocus: '#4F46E5',
    inputBorderError: '#EF4444',
    inputBorderSuccess: '#10B981',
    primary: '#4F46E5',
    primaryGradient: ['#4F46E5', '#6366F1'],
    iconColor: '#94A3B8',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  dark: {
    background: ['#000000', '#0F172A', '#020617'],
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    cardBg: 'rgba(30, 41, 59, 0.7)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    inputBg: 'rgba(15, 23, 42, 0.5)',
    inputBorder: '#334155',
    inputBorderFocus: '#6366F1',
    inputBorderError: '#F87171',
    inputBorderSuccess: '#34D399',
    primary: '#6366F1',
    primaryGradient: ['#6366F1', '#8B5CF6'],
    iconColor: '#64748B',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },
};

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

export default function SignUp() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dob: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Validation states
    const [emailValid, setEmailValid] = useState<boolean | null>(null);
    const [phoneValid, setPhoneValid] = useState<boolean | null>(null);
    const [dobValid, setDobValid] = useState<boolean | null>(null);
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });
    const [emailTouched, setEmailTouched] = useState(false);
    const [phoneTouched, setPhoneTouched] = useState(false);
    const [dobTouched, setDobTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    
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
    const [contentModal, setContentModal] = useState<{ visible: boolean; type: 'terms' | 'privacy_policy' }>({
        visible: false,
        type: 'terms',
    });

    const dispatch = useDispatch<AppDispatch>();
    const { isLoading } = useSelector((state: RootState) => state.auth);
    const router = useRouter();
    
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? THEME.dark : THEME.light;

    // Animations
    const cardOpacity = useSharedValue(0);
    const cardTranslateY = useSharedValue(50);
    const buttonScale = useSharedValue(1);
    
    useEffect(() => {
        cardOpacity.value = withTiming(1, { duration: 800 });
        cardTranslateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
        buttonScale.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
            ),
            -1,
            false
        );
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [{ translateY: cardTranslateY.value }]
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }]
    }));

    // Email validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Phone validation (Indian format)
    const validatePhone = (phone: string): boolean => {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
        return phoneRegex.test(cleaned);
    };

    // DOB validation (must be at least 13 years old)
    const validateDOB = (dob: string): boolean => {
        if (!dob) return false;
        
        const dobDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
            return age - 1 >= 13;
        }
        
        return age >= 13;
    };

    // Password strength calculator
    const calculatePasswordStrength = (password: string): PasswordStrength => {
        if (!password) return { score: 0, label: '', color: '' };
        
        let score = 0;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        
        if (score <= 2) {
            return { score, label: 'Weak - Use a stronger password', color: colors.error };
        } else if (score <= 4) {
            return { score, label: 'Medium - Add more variety', color: colors.warning };
        } else {
            return { score, label: 'Strong', color: colors.success };
        }
    };

    // Handle email change
    useEffect(() => {
        if (emailTouched && formData.email) {
            setEmailValid(validateEmail(formData.email));
        }
    }, [formData.email, emailTouched]);

    // Handle phone change
    useEffect(() => {
        if (phoneTouched && formData.phone) {
            setPhoneValid(validatePhone(formData.phone));
        }
    }, [formData.phone, phoneTouched]);

    // Handle DOB change
    useEffect(() => {
        if (dobTouched && formData.dob) {
            setDobValid(validateDOB(formData.dob));
        }
    }, [formData.dob, dobTouched]);

    // Handle password change
    useEffect(() => {
        if (passwordTouched && formData.password) {
            setPasswordStrength(calculatePasswordStrength(formData.password));
        }
    }, [formData.password, passwordTouched]);

    // Format phone number with +91
    const formatPhoneNumber = (text: string) => {
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.startsWith('91') && cleaned.length <= 12) {
            return '+' + cleaned;
        }
        if (cleaned.length > 0 && cleaned.length <= 10) {
            return '+91' + cleaned;
        }
        return text;
    };

    // Handle date picker change
    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        
        if (selectedDate) {
            setSelectedDate(selectedDate);
            const formattedDate = selectedDate.toISOString().split('T')[0];
            setFormData({ ...formData, dob: formattedDate });
            setDobTouched(true);
        }
    };

    const handleSignUp = async () => {
        // Validate all fields
        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.dob) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Missing Information',
                message: 'Please fill in all required fields.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Email validation
        if (!validateEmail(formData.email)) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Email',
                message: 'Please enter a valid email address.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Phone validation
        if (!validatePhone(formData.phone)) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Phone Number',
                message: 'Please enter a valid Indian phone number (10 digits).',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // DOB validation
        if (!validateDOB(formData.dob)) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Invalid Date of Birth',
                message: 'You must be at least 13 years old to create an account.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Password strength check
        if (passwordStrength.score <= 2) {
            setAlertConfig({
                visible: true,
                type: 'warning',
                title: 'Weak Password',
                message: 'Your password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Password match check
        if (formData.password !== formData.confirmPassword) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Passwords Don\'t Match',
                message: 'Please make sure both passwords are identical.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Terms acceptance
        if (!acceptedTerms) {
            setAlertConfig({
                visible: true,
                type: 'warning',
                title: 'Terms Required',
                message: 'Please accept the Terms & Conditions and Privacy Policy to continue.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
            return;
        }

        // Clean phone number for API
        const cleanedPhone = formData.phone.replace(/[\s\-\(\)\+]/g, '');

        try {
            const result = await dispatch(register({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone_number: cleanedPhone,
                date_of_birth: formData.dob,
                role: 'user',
                terms_accepted: true,
            }));

            if (register.fulfilled.match(result)) {
                setAlertConfig({
                    visible: true,
                    type: 'success',
                    title: 'Account Created',
                    message: 'Your account has been created successfully! Welcome to NextDoc.',
                    buttons: [{
                        text: 'Get Started',
                        onPress: () => router.replace('/(app)/dashboard'),
                        style: 'default'
                    }],
                });
            } else if (register.rejected.match(result)) {
                const error = result.payload as any;
                const errorMessage = error?.message || error?.detail || 'Registration failed';
                
                if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already')) {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Email Already Registered',
                        message: 'This email address is already associated with an account. Please sign in or use a different email.',
                        buttons: [
                            { text: 'Try Again', style: 'cancel' },
                            { text: 'Sign In', onPress: () => router.push('/sign-in'), style: 'default' }
                        ],
                    });
                } else if (errorMessage.toLowerCase().includes('phone') && errorMessage.toLowerCase().includes('already')) {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Phone Number Already Registered',
                        message: 'This phone number is already associated with an account. Please sign in or use a different number.',
                        buttons: [
                            { text: 'Try Again', style: 'cancel' },
                            { text: 'Sign In', onPress: () => router.push('/sign-in'), style: 'default' }
                        ],
                    });
                } else {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Registration Failed',
                        message: errorMessage,
                        buttons: [{ text: 'OK', style: 'default' }],
                    });
                }
            }
        } catch (error: any) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'An unexpected error occurred. Please try again.',
                buttons: [{ text: 'OK', style: 'default' }],
            });
        }
    };

    const getInputBorderColor = (isValid: boolean | null, isTouched: boolean) => {
        if (!isTouched) return colors.inputBorder;
        if (isValid === null) return colors.inputBorder;
        return isValid ? colors.inputBorderSuccess : colors.inputBorderError;
    };

    // Format date for display
    const formatDateForDisplay = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
                            {/* Header */}
                            <View style={styles.cardHeader}>
                                <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                                    Join us to start your health journey
                                </Text>
                            </View>

                            {/* Form */}
                            <View style={styles.form}>
                                {/* Full Name */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <User size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Your full name"
                                            placeholderTextColor={colors.textSecondary}
                                            value={formData.name}
                                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                                        />
                                    </View>
                                </View>

                                {/* Email with validation */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                                    <View style={[
                                        styles.inputWrapper, 
                                        { 
                                            backgroundColor: colors.inputBg, 
                                            borderColor: getInputBorderColor(emailValid, emailTouched),
                                            borderWidth: 2
                                        }
                                    ]}>
                                        <Mail size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="your@email.com"
                                            placeholderTextColor={colors.textSecondary}
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            onBlur={() => setEmailTouched(true)}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                        {emailTouched && emailValid !== null && (
                                            emailValid ? 
                                                <CheckCircle2 size={20} color={colors.success} /> :
                                                <X size={20} color={colors.error} />
                                        )}
                                    </View>
                                    {emailTouched && emailValid === false && (
                                        <Text style={[styles.errorText, { color: colors.error }]}>
                                            Please enter a valid email address
                                        </Text>
                                    )}
                                </View>

                                {/* Phone Number with Indian format */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                                    <View style={[
                                        styles.inputWrapper, 
                                        { 
                                            backgroundColor: colors.inputBg, 
                                            borderColor: getInputBorderColor(phoneValid, phoneTouched),
                                            borderWidth: 2
                                        }
                                    ]}>
                                        <Phone size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="+91 98765 43210"
                                            placeholderTextColor={colors.textSecondary}
                                            value={formData.phone}
                                            onChangeText={(text) => {
                                                const formatted = formatPhoneNumber(text);
                                                setFormData({ ...formData, phone: formatted });
                                            }}
                                            onBlur={() => setPhoneTouched(true)}
                                            keyboardType="phone-pad"
                                            maxLength={13}
                                        />
                                        {phoneTouched && phoneValid !== null && (
                                            phoneValid ? 
                                                <CheckCircle2 size={20} color={colors.success} /> :
                                                <X size={20} color={colors.error} />
                                        )}
                                    </View>
                                    {phoneTouched && phoneValid === false && (
                                        <Text style={[styles.errorText, { color: colors.error }]}>
                                            Please enter a valid Indian phone number
                                        </Text>
                                    )}
                                </View>

                                {/* Date of Birth with Calendar Picker */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        style={[
                                            styles.inputWrapper, 
                                            { 
                                                backgroundColor: colors.inputBg, 
                                                borderColor: getInputBorderColor(dobValid, dobTouched),
                                                borderWidth: 2
                                            }
                                        ]}
                                    >
                                        <Calendar size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <Text style={[
                                            styles.input, 
                                            { 
                                                color: formData.dob ? colors.text : colors.textSecondary,
                                                paddingTop: 16
                                            }
                                        ]}>
                                            {formData.dob ? formatDateForDisplay(formData.dob) : 'Select your date of birth'}
                                        </Text>
                                        {dobTouched && dobValid !== null && (
                                            dobValid ? 
                                                <CheckCircle2 size={20} color={colors.success} /> :
                                                <X size={20} color={colors.error} />
                                        )}
                                    </TouchableOpacity>
                                    {dobTouched && dobValid === false && (
                                        <Text style={[styles.errorText, { color: colors.error }]}>
                                            You must be at least 13 years old
                                        </Text>
                                    )}
                                </View>

                                {/* Date Picker Modal */}
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={selectedDate}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        maximumDate={new Date()}
                                        minimumDate={new Date(1900, 0, 1)}
                                    />
                                )}

                                {/* Password with strength indicator */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Lock size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Min 8 characters"
                                            placeholderTextColor={colors.textSecondary}
                                            value={formData.password}
                                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                                            onBlur={() => setPasswordTouched(true)}
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
                                    {passwordTouched && passwordStrength.label && (
                                        <View style={styles.passwordStrengthContainer}>
                                            <View style={styles.strengthBars}>
                                                {[1, 2, 3, 4, 5, 6].map((bar) => (
                                                    <View 
                                                        key={bar}
                                                        style={[
                                                            styles.strengthBar,
                                                            { 
                                                                backgroundColor: bar <= passwordStrength.score 
                                                                    ? passwordStrength.color 
                                                                    : colors.inputBorder 
                                                            }
                                                        ]} 
                                                    />
                                                ))}
                                            </View>
                                            <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                                                {passwordStrength.label}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Confirm Password */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                        <Lock size={20} color={colors.iconColor} style={styles.inputIcon} />
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="Repeat your password"
                                            placeholderTextColor={colors.textSecondary}
                                            value={formData.confirmPassword}
                                            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
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

                                {/* Terms Checkbox */}
                                <TouchableOpacity 
                                    style={styles.termsContainer}
                                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: acceptedTerms ? colors.primary : colors.inputBorder },
                                        acceptedTerms && { backgroundColor: colors.primary }
                                    ]}>
                                        {acceptedTerms && <Check size={14} color="#fff" />}
                                    </View>
                                    <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                                        I agree to the{' '}
                                        <Text 
                                            style={[styles.linkText, { color: colors.primary }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setContentModal({ visible: true, type: 'terms' });
                                            }}
                                        >
                                            Terms & Conditions
                                        </Text>
                                        {' '}and{' '}
                                        <Text 
                                            style={[styles.linkText, { color: colors.primary }]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                setContentModal({ visible: true, type: 'privacy_policy' });
                                            }}
                                        >
                                            Privacy Policy
                                        </Text>
                                    </Text>
                                </TouchableOpacity>

                                {/* Sign Up Button */}
                                <Animated.View style={[buttonStyle, styles.buttonContainer]}>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={handleSignUp}
                                        disabled={isLoading}
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
                                                <Text style={styles.buttonText}>Create Account</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                                    Already have an account?{' '}
                                </Text>
                                <TouchableOpacity onPress={() => router.push('/sign-in')}>
                                    <Text style={[styles.linkText, { color: colors.primary }]}>Sign In</Text>
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

            {/* Content Modal for Terms & Privacy */}
            <ContentModal
                visible={contentModal.visible}
                contentType={contentModal.type}
                onClose={() => setContentModal({ ...contentModal, visible: false })}
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
        padding: spacing.lg,
        paddingTop: spacing.md,
    },
    cardContainer: {
        width: '100%',
    },
    blurCard: {
        borderRadius: 32,
        borderWidth: 1,
        overflow: 'hidden',
        padding: spacing.xl,
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        textAlign: 'center',
    },
    form: {
        gap: spacing.md,
        marginBottom: spacing.lg,
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
    errorText: {
        fontSize: typography.fontSize.xs,
        marginLeft: spacing.xs,
        marginTop: 4,
    },
    passwordStrengthContainer: {
        marginTop: spacing.xs,
        gap: spacing.xs,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
    },
    strengthBar: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthText: {
        fontSize: typography.fontSize.xs,
        fontWeight: '600',
        marginLeft: spacing.xs,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    termsText: {
        flex: 1,
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
    },
    linkText: {
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginTop: spacing.sm,
    },
    gradientButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    footerText: {
        fontSize: typography.fontSize.sm,
    },
});

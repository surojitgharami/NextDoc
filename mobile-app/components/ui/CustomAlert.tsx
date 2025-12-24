import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react-native';
import { typography, spacing, borderRadius } from '@/constants/Theme';

interface CustomAlertProps {
    visible: boolean;
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    buttons?: Array<{
        text: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
    }>;
    onClose: () => void;
}

const THEME = {
    light: {
        overlay: 'rgba(0, 0, 0, 0.5)',
        cardBg: 'rgba(255, 255, 255, 0.95)',
        cardBorder: 'rgba(255, 255, 255, 0.8)',
        text: '#0F172A',
        textSecondary: '#64748B',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        buttonBg: '#F1F5F9',
        buttonText: '#0F172A',
        primaryGradient: ['#4F46E5', '#6366F1'],
    },
    dark: {
        overlay: 'rgba(0, 0, 0, 0.7)',
        cardBg: 'rgba(30, 41, 59, 0.95)',
        cardBorder: 'rgba(255, 255, 255, 0.1)',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        success: '#34D399',
        error: '#F87171',
        warning: '#FBBF24',
        info: '#60A5FA',
        buttonBg: '#1E293B',
        buttonText: '#F8FAFC',
        primaryGradient: ['#6366F1', '#8B5CF6'],
    },
};

export const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    type = 'info',
    title,
    message,
    buttons = [{ text: 'OK', onPress: () => {} }],
    onClose,
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? THEME.dark : THEME.light;

    const getIcon = () => {
        const iconSize = 48;
        switch (type) {
            case 'success':
                return <CheckCircle size={iconSize} color={colors.success} />;
            case 'error':
                return <XCircle size={iconSize} color={colors.error} />;
            case 'warning':
                return <AlertCircle size={iconSize} color={colors.warning} />;
            default:
                return <Info size={iconSize} color={colors.info} />;
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'success':
                return colors.success;
            case 'error':
                return colors.error;
            case 'warning':
                return colors.warning;
            default:
                return colors.info;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <View style={styles.container}>
                    <BlurView
                        intensity={isDark ? 30 : 50}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.cardBg,
                                borderColor: colors.cardBorder,
                            },
                        ]}
                    >
                        {/* Close Button */}
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
                            {getIcon()}
                        </View>

                        {/* Title */}
                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

                        {/* Message */}
                        <Text style={[styles.message, { color: colors.textSecondary }]}>
                            {message}
                        </Text>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            {buttons.map((button, index) => {
                                const isCancel = button.style === 'cancel';
                                const isDestructive = button.style === 'destructive';
                                const isPrimary = button.style === 'default' || (!isCancel && !isDestructive);

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            isCancel && { backgroundColor: colors.buttonBg },
                                        ]}
                                        onPress={() => {
                                            button.onPress?.();
                                            onClose();
                                        }}
                                    >
                                        {isPrimary ? (
                                            <LinearGradient
                                                colors={colors.primaryGradient as any}
                                                style={styles.gradientButton}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                            >
                                                <Text style={styles.primaryButtonText}>{button.text}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.buttonText,
                                                    {
                                                        color: isDestructive
                                                            ? colors.error
                                                            : colors.buttonText,
                                                    },
                                                ]}
                                            >
                                                {button.text}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </BlurView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 400,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    buttonContainer: {
        width: '100%',
        gap: spacing.sm,
    },
    button: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradientButton: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: typography.fontSize.base,
        fontWeight: '600',
    },
    buttonText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
});

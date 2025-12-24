import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, FileText } from 'lucide-react-native';
import { typography, spacing } from '@/constants/Theme';
import api from '../../api/axiosInstance';

interface ContentModalProps {
    visible: boolean;
    contentType: 'terms' | 'privacy_policy';
    onClose: () => void;
}

const THEME = {
    light: {
        overlay: 'rgba(0, 0, 0, 0.5)',
        cardBg: 'rgba(255, 255, 255, 0.98)',
        text: '#0F172A',
        textSecondary: '#64748B',
        primary: '#4F46E5',
        border: '#E2E8F0',
    },
    dark: {
        overlay: 'rgba(0, 0, 0, 0.7)',
        cardBg: 'rgba(15, 23, 42, 0.98)',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        primary: '#6366F1',
        border: '#334155',
    },
};

export const ContentModal: React.FC<ContentModalProps> = ({ visible, contentType, onClose }) => {
    const [content, setContent] = useState<{ title: string; content: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? THEME.dark : THEME.light;

    useEffect(() => {
        if (visible) {
            fetchContent();
        }
    }, [visible, contentType]);

    const fetchContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/api/content/${contentType}`);
            setContent(response.data);
        } catch (err: any) {
            setError('Failed to load content. Please try again.');
            console.error('Content fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        if (content?.title) return content.title;
        return contentType === 'terms' ? 'Terms & Conditions' : 'Privacy Policy';
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
                <BlurView
                    intensity={isDark ? 30 : 50}
                    tint={isDark ? 'dark' : 'light'}
                    style={styles.container}
                >
                    <View style={[styles.modal, { backgroundColor: colors.cardBg }]}>
                        {/* Header */}
                        <View style={[styles.header, { borderBottomColor: colors.border }]}>
                            <View style={styles.headerLeft}>
                                <FileText size={24} color={colors.primary} />
                                <Text style={[styles.title, { color: colors.text }]}>
                                    {getTitle()}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                            {loading && (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                        Loading...
                                    </Text>
                                </View>
                            )}

                            {error && (
                                <View style={styles.centerContainer}>
                                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
                                    <TouchableOpacity onPress={fetchContent} style={styles.retryButton}>
                                        <Text style={[styles.retryText, { color: colors.primary }]}>
                                            Retry
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {!loading && !error && content && (
                                <Text style={[styles.contentText, { color: colors.text }]}>
                                    {content.content}
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modal: {
        height: '90%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.lg,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    title: {
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    closeButton: {
        padding: spacing.xs,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: spacing.lg,
    },
    contentText: {
        fontSize: typography.fontSize.base,
        lineHeight: 24,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing.xl * 2,
    },
    loadingText: {
        marginTop: spacing.md,
        fontSize: typography.fontSize.base,
    },
    errorText: {
        fontSize: typography.fontSize.base,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    retryButton: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    retryText: {
        fontSize: typography.fontSize.base,
        fontWeight: '600',
    },
});

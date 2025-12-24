import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withDelay,
    Easing,
    withSequence,
} from 'react-native-reanimated';
import { MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { typography, spacing } from '@/constants/Theme';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();
    
    // Animation Shared Values
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);

    useEffect(() => {
        // Start Animations
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });
        
        textOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
        textTranslateY.value = withDelay(400, withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) }));

        // Navigate after delay
        const timer = setTimeout(() => {
            router.replace('/welcome');
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const iconStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.centerContent}>
                {/* Icon Container */}
                <Animated.View style={[styles.iconContainer, iconStyle]}>
                     <View style={styles.iconCircle}>
                        <MessageCircle size={48} color={Colors.light.primary} />
                     </View>
                </Animated.View>

                {/* Text Container */}
                <Animated.View style={[styles.textContainer, textStyle]}>
                    <Text style={styles.title}>NextDoc</Text>
                    <Text style={styles.subtitle}>Your Healthcare Assistant</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.primary, // Using primary color as background like web version
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: 96,
        height: 96,
        backgroundColor: '#fff',
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    textContainer: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    title: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        color: '#fff',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: typography.fontSize.sm,
        color: 'rgba(255, 255, 255, 0.9)',
    },
});

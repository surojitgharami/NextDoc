import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { borderRadius, shadows, spacing } from '@/constants/Theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  gradient?: string[];
  style?: ViewStyle;
  pressable?: boolean;
}

export function Card({
  children,
  onPress,
  gradient,
  style,
  pressable = true,
}: CardProps) {
  const scale = useSharedValue(1);
  const elevation = useSharedValue(shadows.sm.elevation);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    elevation: elevation.value,
  }));

  const handlePressIn = () => {
    if (pressable && onPress) {
      scale.value = withSpring(0.98, { damping: 15 });
      elevation.value = withTiming(shadows.md.elevation, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (pressable && onPress) {
      scale.value = withSpring(1, { damping: 15 });
      elevation.value = withTiming(shadows.sm.elevation, { duration: 100 });
    }
  };

  const content = <View style={styles.content}>{children}</View>;

  if (gradient) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        style={[styles.card, animatedStyle, style]}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {content}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  if (onPress && pressable) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, styles.cardDefault, animatedStyle, style]}
        activeOpacity={0.9}
      >
        {content}
      </AnimatedTouchable>
    );
  }

  return (
    <View style={[styles.card, styles.cardDefault, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...shadows.sm,
  },
  gradient: {
    flex: 1,
    borderRadius: borderRadius.lg,
  },
  content: {
    padding: spacing.lg,
  },
});

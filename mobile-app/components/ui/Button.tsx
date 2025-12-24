import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { typography, borderRadius, spacing, shadows } from '@/constants/Theme';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const getVariantStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: borderRadius.md,
      ...shadows.sm,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: Colors.light.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: Colors.light.secondary,
        };
      case 'destructive':
        return {
          ...baseStyle,
          backgroundColor: Colors.light.destructive,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          shadowOpacity: 0,
          elevation: 0,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.light.border,
          shadowOpacity: 0,
          elevation: 0,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: Colors.light.background,
          borderWidth: 1,
          borderColor: Colors.light.border,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return Colors.light.primaryForeground;
      case 'secondary':
        return Colors.light.secondaryForeground;
      case 'destructive':
        return Colors.light.destructiveForeground;
      case 'ghost':
        return Colors.light.text;
      case 'outline':
        return Colors.light.text;
      default:
        return Colors.light.text;
    }
  };

  const getSizeStyles = (): ViewStyle & TextStyle => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: typography.fontSize.sm,
        };
      case 'lg':
        return {
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          fontSize: typography.fontSize.lg,
        };
      default:
        return {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          fontSize: typography.fontSize.base,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const textColor = getTextColor();

  const content = (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            style={[
              styles.text,
              {
                color: textColor,
                fontSize: sizeStyles.fontSize,
                fontWeight: typography.fontWeight.semibold,
              },
              textStyle,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </>
      )}
    </View>
  );

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        variantStyles,
        {
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        animatedStyle,
        style,
      ]}
      activeOpacity={0.8}
    >
      {content}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

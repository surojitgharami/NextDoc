import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { typography, spacing, borderRadius } from '@/constants/Theme';
import { Sparkles, Activity, Heart, Stethoscope, Brain, ArrowRight, Zap, Shield, Pill, Microscope } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  withSpring,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Modern Theme Colors
const THEME = {
  light: {
    background: ['#FAFBFF', '#F0F4FF', '#E8EEFF'],
    text: '#0A0E27',
    textHighlight: '#5B5FFF',
    subtext: '#6B7280',
    orb1: 'rgba(91, 95, 255, 0.12)',
    orb2: 'rgba(236, 72, 153, 0.1)',
    orb3: 'rgba(14, 165, 233, 0.1)',
    orb4: 'rgba(168, 85, 247, 0.08)',
    glass: 'rgba(255, 255, 255, 0.95)',
    glassBorder: 'rgba(255, 255, 255, 0.8)',
    iconBg: '#FFFFFF',
    centerGradient: ['#5B5FFF', '#7C3AED', '#A855F7'], 
    buttonGradient: ['#5B5FFF', '#7C3AED'],
    badgeBg: 'rgba(91, 95, 255, 0.08)',
    badgeText: '#5B5FFF',
    badgeBorder: 'rgba(91, 95, 255, 0.15)',
    particleColors: ['#5B5FFF', '#EC4899', '#0EA5E9', '#A855F7', '#10B981'],
  },
  dark: {
    background: ['#000000', '#0A0E27', '#050814'],
    text: '#F9FAFB',
    textHighlight: '#818CF8',
    subtext: '#9CA3AF',
    orb1: 'rgba(129, 140, 248, 0.15)',
    orb2: 'rgba(236, 72, 153, 0.12)',
    orb3: 'rgba(56, 189, 248, 0.12)',
    orb4: 'rgba(168, 85, 247, 0.1)',
    glass: 'rgba(15, 23, 42, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    iconBg: '#1E293B',
    centerGradient: ['#818CF8', '#A78BFA', '#C084FC'],
    buttonGradient: ['#6366F1', '#8B5CF6'],
    badgeBg: 'rgba(129, 140, 248, 0.12)',
    badgeText: '#A78BFA',
    badgeBorder: 'rgba(129, 140, 248, 0.2)',
    particleColors: ['#818CF8', '#F472B6', '#38BDF8', '#C084FC', '#34D399'],
  },
};

// Floating Particle Component
const FloatingParticle = ({ delay, size, color, startX, startY, duration }: any) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-60, { duration: duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(60, { duration: duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    
    translateX.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(40, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) }),
          withTiming(-40, { duration: duration * 0.8, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
        animatedStyle,
      ]}
    />
  );
};

// Floating Orb Component with Blur
const FloatingOrb = ({ delay, size, color, startX, startY }: any) => {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-50, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
          withTiming(50, { duration: 6000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 7000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
        animatedStyle,
      ]}
    />
  );
};

// Orbiting Icon Component
const OrbitingIcon = ({ Icon, color, angle, radius, delay, isDark }: any) => {
  const rotation = useSharedValue(angle);
  const scale = useSharedValue(0);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 80 }));
    
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(angle + 360, { duration: 30000, easing: Easing.linear }),
        -1,
        false
      )
    );

    iconRotation.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const x = Math.cos((rotation.value * Math.PI) / 180) * radius;
    const y = Math.sin((rotation.value * Math.PI) / 180) * radius;
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: scale.value },
        { rotate: `${iconRotation.value}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.orbitIcon, animatedStyle]}>
      <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={styles.orbitIconInner}>
        <Icon size={22} color={color} strokeWidth={2.5} />
      </BlurView>
    </Animated.View>
  );
};

export default function Welcome() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? THEME.dark : THEME.light;

  // Animation values
  const centerScale = useSharedValue(0);
  const centerRotation = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);

  useEffect(() => {
    // Center icon entrance
    centerScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 100 }));
    
    // Continuous rotation
    centerRotation.value = withDelay(
      800,
      withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      )
    );

    // Glow pulse
    glowPulse.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Button pulse
    buttonScale.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Text entrance
    textOpacity.value = withDelay(600, withTiming(1, { duration: 1000 }));
    textTranslateY.value = withDelay(600, withSpring(0, { damping: 15 }));
  }, []);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: centerScale.value },
      { rotate: `${centerRotation.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.3, 0.8]),
    transform: [
      { scale: interpolate(glowPulse.value, [0, 1], [1, 1.15]) },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={colors.background}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      {/* Ambient Orbs */}
      <FloatingOrb delay={0} size={width * 0.9} color={colors.orb1} startX={-width * 0.3} startY={-width * 0.2} />
      <FloatingOrb delay={1200} size={width * 0.8} color={colors.orb2} startX={width * 0.5} startY={height * 0.15} />
      <FloatingOrb delay={600} size={width * 1} color={colors.orb3} startX={-width * 0.2} startY={height * 0.55} />
      <FloatingOrb delay={1800} size={width * 0.7} color={colors.orb4} startX={width * 0.3} startY={height * 0.7} />

      {/* Floating Particles */}
      {colors.particleColors.map((color, index) => (
        <FloatingParticle
          key={index}
          delay={index * 200}
          size={Math.random() * 6 + 3}
          color={color}
          startX={Math.random() * width}
          startY={Math.random() * height}
          duration={4000 + Math.random() * 3000}
        />
      ))}

      <View style={styles.content}>
        
        {/* Central Hero Component */}
        <View style={styles.heroContainer}>
          
          {/* Outer Glow Ring */}
          <Animated.View style={[styles.glowRing, glowStyle]}>
            <LinearGradient
              colors={[...colors.centerGradient, colors.centerGradient[0]]}
              style={styles.glowGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Orbiting Icons */}
          <View style={styles.orbitContainer}>
            <OrbitingIcon Icon={Brain} color={colors.particleColors[0]} angle={0} radius={110} delay={400} isDark={isDark} />
            <OrbitingIcon Icon={Heart} color={colors.particleColors[1]} angle={72} radius={110} delay={500} isDark={isDark} />
            <OrbitingIcon Icon={Activity} color={colors.particleColors[2]} angle={144} radius={110} delay={600} isDark={isDark} />
            <OrbitingIcon Icon={Shield} color={colors.particleColors[3]} angle={216} radius={110} delay={700} isDark={isDark} />
            <OrbitingIcon Icon={Pill} color={colors.particleColors[4]} angle={288} radius={110} delay={800} isDark={isDark} />
          </View>

          {/* Glass Connection Circle */}
          <BlurView 
            intensity={isDark ? 25 : 50} 
            tint={isDark ? 'dark' : 'light'} 
            style={[styles.connectionCircle, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]} 
          />

          {/* Center Core */}
          <Animated.View style={[styles.coreContainer, centerStyle]}>
            <LinearGradient
              colors={colors.centerGradient}
              style={styles.core}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Zap size={56} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Text Content */}
        <Animated.View style={[styles.textContent, textStyle]}>
          <View style={[styles.badge, { backgroundColor: colors.badgeBg, borderColor: colors.badgeBorder }]}>
            <Sparkles size={15} color={colors.badgeText} strokeWidth={2.5} />
            <Text style={[styles.badgeText, { color: colors.badgeText }]}>Powered by AI</Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>NextDoc</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Your Virtual Healthcare Assistant: Partner in wellness, just a message away.
          </Text>
        </Animated.View>

        {/* CTA Button */}
        <Animated.View style={[styles.ctaContainer, buttonAnimatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/sign-in')}
          >
            <LinearGradient
              colors={colors.buttonGradient}
              style={styles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <ArrowRight size={22} color="#fff" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={[styles.terms, { color: colors.subtext }]}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  heroContainer: {
    width: 320,
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['4xl'],
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  orbitContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitIcon: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  orbitIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  connectionCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  coreContainer: {
    shadowColor: '#5B5FFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  core: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginBottom: spacing.xl,
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 26,
    fontWeight: '400',
  },
  ctaContainer: {
    width: '100%',
    maxWidth: 340,
    shadowColor: '#5B5FFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    gap: spacing.md,
  },
  ctaText: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  terms: {
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontWeight: '400',
  },
});

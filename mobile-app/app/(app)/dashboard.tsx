import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius, shadows, gradients } from '@/constants/Theme';
import {
  Activity,
  Shield,
  Heart,
  Pill,
  FileText,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Feature {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  path: string;
  gradient: string[];
  iconBg: string;
}

export default function Dashboard() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth.user);

  const features: Feature[] = [
    {
      icon: Activity,
      title: 'Symptom Checker',
      description: 'AI-powered analysis',
      path: '/(app)/chat',
      gradient: ['#EEF2FF', '#E0E7FF', '#DBEAFE'],
      iconBg: '#C7D2FE',
    },
    {
      icon: Shield,
      title: 'Insurance Help',
      description: 'Claims & assistance',
      path: '/(app)/chat',
      gradient: ['#F0FDFA', '#CCFBF1', '#D1FAE5'],
      iconBg: '#99F6E4',
    },
    {
      icon: Heart,
      title: 'Health Metrics',
      description: 'Track your vitals',
      path: '/(app)/health-monitoring',
      gradient: ['#FDF2F8', '#FCE7F3', '#FEE2E2'],
      iconBg: '#FBCFE8',
    },
    {
      icon: Pill,
      title: 'Medications',
      description: 'Reminders & tracking',
      path: '/(app)/medicine-reminder',
      gradient: ['#F5F3FF', '#EDE9FE', '#FAE8FF'],
      iconBg: '#DDD6FE',
    },
    {
      icon: FileText,
      title: 'Medical Reports',
      description: 'Upload & analyze',
      path: '/(app)/scanner',
      gradient: ['#FFF7ED', '#FFEDD5', '#FEF3C7'],
      iconBg: '#FED7AA',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeTitle}>
              Welcome, {user?.name || 'there'}
            </Text>
            <Text style={styles.welcomeEmoji}>👋</Text>
          </View>
          <Text style={styles.welcomeSubtitle}>
            Manage your health with AI-powered insights
          </Text>
        </View>

        {/* Primary CTA Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/chat')}
        >
          <LinearGradient
            colors={[Colors.light.primary, Colors.light.primary, '#3B82F6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ctaCard, shadows.lg]}
          >
            <View style={styles.ctaContent}>
              <View style={styles.ctaIcon}>
                <MessageCircle size={32} color="#fff" />
              </View>
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>Healthcare Chat Assistant</Text>
                <Text style={styles.ctaSubtitle}>
                  AI-powered health guidance available 24/7
                </Text>
              </View>
              <ChevronRight size={24} color="rgba(255,255,255,0.7)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Healthcare Services</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <TouchableOpacity
                  key={feature.title}
                  activeOpacity={0.9}
                  onPress={() => router.push(feature.path as any)}
                  style={styles.featureCardWrapper}
                >
                  <LinearGradient
                    colors={feature.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureCard}
                  >
                    <View style={styles.featureHeader}>
                      <View
                        style={[
                          styles.featureIconBg,
                          { backgroundColor: feature.iconBg },
                        ]}
                      >
                        <Icon size={24} color="#6B7280" />
                      </View>
                      <ChevronRight size={20} color="rgba(0,0,0,0.4)" />
                    </View>
                    <View style={styles.featureContent}>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureDescription}>
                        {feature.description}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  welcomeSection: {
    marginBottom: spacing.xl,
  },
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  welcomeTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
  },
  welcomeEmoji: {
    fontSize: typography.fontSize.lg,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.base,
    color: Colors.light.mutedForeground,
  },
  ctaCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaText: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  featuresSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    marginBottom: spacing.sm,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  featureCardWrapper: {
    width: width < 600 ? '100%' : '48%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  featureCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 140,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  featureIconBg: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    gap: spacing.xs,
  },
  featureTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
  },
  featureDescription: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(0,0,0,0.6)',
  },
});

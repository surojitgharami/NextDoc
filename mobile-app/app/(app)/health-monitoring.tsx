import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius, shadows } from '@/constants/Theme';
import { ArrowLeft, Heart, Activity, Droplet, Moon, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');

interface HealthMetric {
  id: string;
  icon: React.ComponentType<any>;
  title: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  gradient: string[];
}

export default function HealthMonitoring() {
  const router = useRouter();

  const metrics: HealthMetric[] = [
    {
      id: '1',
      icon: Heart,
      title: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      status: 'normal',
      gradient: ['#FDF2F8', '#FCE7F3'],
    },
    {
      id: '2',
      icon: Activity,
      title: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      status: 'normal',
      gradient: ['#EEF2FF', '#E0E7FF'],
    },
    {
      id: '3',
      icon: Droplet,
      title: 'Blood Sugar',
      value: '95',
      unit: 'mg/dL',
      status: 'normal',
      gradient: ['#F0FDFA', '#CCFBF1'],
    },
    {
      id: '4',
      icon: Moon,
      title: 'Sleep',
      value: '7.5',
      unit: 'hours',
      status: 'normal',
      gradient: ['#F5F3FF', '#EDE9FE'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return Colors.light.mutedForeground;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Health Monitoring</Text>
          <Text style={styles.headerSubtitle}>Track your vitals</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <TouchableOpacity
                key={metric.id}
                activeOpacity={0.9}
                style={styles.metricCardWrapper}
              >
                <LinearGradient
                  colors={metric.gradient}
                  style={styles.metricCard}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIconContainer}>
                      <Icon size={24} color={getStatusColor(metric.status)} />
                    </View>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(metric.status) },
                      ]}
                    />
                  </View>
                  <View style={styles.metricContent}>
                    <Text style={styles.metricValue}>{metric.value}</Text>
                    <Text style={styles.metricUnit}>{metric.unit}</Text>
                  </View>
                  <Text style={styles.metricTitle}>{metric.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Add New Metric Button */}
        <Button
          variant="outline"
          size="lg"
          fullWidth
          icon={<Plus size={20} color={Colors.light.primary} />}
          iconPosition="left"
          style={styles.addButton}
        >
          Add New Metric
        </Button>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Heart size={16} color={Colors.light.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Heart Rate Logged</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Activity size={16} color={Colors.light.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Blood Pressure Updated</Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>
          </Card>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: Colors.light.mutedForeground,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricCardWrapper: {
    width: width < 600 ? '48%' : '30%',
  },
  metricCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    minHeight: 160,
    ...shadows.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricContent: {
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
  },
  metricUnit: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.text,
  },
  addButton: {
    marginBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
  },
  activityCard: {
    padding: spacing.lg,
  },
  activityItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(79, 156, 249, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  activityTime: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius, shadows } from '@/constants/Theme';
import { ArrowLeft, Plus, Pill, Clock, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  color: string;
}

export default function MedicineReminder() {
  const router = useRouter();
  const [medicines] = useState<Medicine[]>([
    {
      id: '1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 'Daily',
      time: '8:00 AM',
      color: '#EC4899',
    },
    {
      id: '2',
      name: 'Vitamin D',
      dosage: '1000 IU',
      frequency: 'Daily',
      time: '9:00 AM',
      color: '#F59E0B',
    },
    {
      id: '3',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      time: '8:00 AM, 8:00 PM',
      color: '#8B5CF6',
    },
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Medicine Reminder</Text>
          <Text style={styles.headerSubtitle}>Never miss a dose</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.medicineList}>
            {medicines.map((medicine) => (
              <Card key={medicine.id} style={styles.medicineCard}>
                <View style={styles.medicineContent}>
                  <View
                    style={[
                      styles.medicineIcon,
                      { backgroundColor: `${medicine.color}20` },
                    ]}
                  >
                    <Pill size={24} color={medicine.color} />
                  </View>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineDosage}>{medicine.dosage}</Text>
                    <View style={styles.medicineDetails}>
                      <Clock size={14} color={Colors.light.mutedForeground} />
                      <Text style={styles.medicineTime}>{medicine.time}</Text>
                    </View>
                  </View>
                  <View style={styles.medicineActions}>
                    <TouchableOpacity style={styles.checkButton}>
                      <View style={styles.checkbox} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Add Medicine Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Plus size={20} color="#fff" />}
          iconPosition="left"
          onPress={() => router.push('/(app)/add-medicine' as any)}
        >
          Add New Medicine
        </Button>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.statsGrid}>
            <LinearGradient
              colors={['#EEF2FF', '#E0E7FF']}
              style={styles.statCard}
            >
              <Text style={styles.statValue}>21</Text>
              <Text style={styles.statLabel}>Taken</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.statCard}
            >
              <Text style={styles.statValue}>2</Text>
              <Text style={styles.statLabel}>Missed</Text>
            </LinearGradient>
            <LinearGradient
              colors={['#D1FAE5', '#A7F3D0']}
              style={styles.statCard}
            >
              <Text style={styles.statValue}>91%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </LinearGradient>
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
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  medicineList: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  medicineCard: {
    padding: spacing.lg,
  },
  medicineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  medicineDosage: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
    marginBottom: spacing.xs,
  },
  medicineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  medicineTime: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
  medicineActions: {
    alignItems: 'center',
  },
  checkButton: {
    padding: spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
});

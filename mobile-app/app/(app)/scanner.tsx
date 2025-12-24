import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius } from '@/constants/Theme';
import { ArrowLeft, Camera, Image as ImageIcon, FileText } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function Scanner() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  const handleCamera = () => {
    Alert.alert('Camera', 'Camera functionality will be implemented with expo-camera');
  };

  const handleGallery = () => {
    Alert.alert('Gallery', 'Gallery picker will be implemented with expo-image-picker');
  };

  const handleDocument = () => {
    Alert.alert('Document', 'Document picker will be implemented with expo-document-picker');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Scanner</Text>
          <Text style={styles.headerSubtitle}>Scan medical documents</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {/* Scanner Options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.title}>Choose Upload Method</Text>
          <Text style={styles.subtitle}>
            Scan prescriptions, lab reports, or medical documents
          </Text>

          <View style={styles.options}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCamera}
            >
              <Card style={styles.optionCard}>
                <View style={styles.optionIcon}>
                  <Camera size={32} color={Colors.light.primary} />
                </View>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionSubtitle}>Use camera to scan</Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGallery}
            >
              <Card style={styles.optionCard}>
                <View style={styles.optionIcon}>
                  <ImageIcon size={32} color={Colors.light.primary} />
                </View>
                <Text style={styles.optionTitle}>From Gallery</Text>
                <Text style={styles.optionSubtitle}>Choose from photos</Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDocument}
            >
              <Card style={styles.optionCard}>
                <View style={styles.optionIcon}>
                  <FileText size={32} color={Colors.light.primary} />
                </View>
                <Text style={styles.optionTitle}>Upload Document</Text>
                <Text style={styles.optionSubtitle}>PDF or image files</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Supported Documents</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Prescriptions</Text>
            <Text style={styles.infoItem}>• Lab Reports</Text>
            <Text style={styles.infoItem}>• Medical Bills</Text>
            <Text style={styles.infoItem}>• Insurance Documents</Text>
            <Text style={styles.infoItem}>• X-rays & Scans</Text>
          </View>
        </Card>
      </View>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  optionsContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: Colors.light.mutedForeground,
    marginBottom: spacing.xl,
  },
  options: {
    gap: spacing.md,
  },
  optionCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(79, 156, 249, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  optionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: 'rgba(79, 156, 249, 0.05)',
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.text,
    marginBottom: spacing.md,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
});

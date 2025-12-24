import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/authSlice';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius } from '@/constants/Theme';
import {
  ArrowLeft,
  User,
  Settings as SettingsIcon,
  FileText,
  Heart,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';

interface MenuItem {
  icon: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  path: string;
  color: string;
}

export default function Profile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const menuItems: MenuItem[] = [
    {
      icon: User,
      title: 'Profile Details',
      subtitle: 'Update your information',
      path: '/(app)/profile-details',
      color: Colors.light.primary,
    },
    {
      icon: Heart,
      title: 'Medical Profile',
      subtitle: 'Health conditions & allergies',
      path: '/(app)/medical-profile',
      color: '#EC4899',
    },
    {
      icon: FileText,
      title: 'Health Records',
      subtitle: 'View your medical documents',
      path: '/(app)/health-records',
      color: '#8B5CF6',
    },
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage your alerts',
      path: '/(app)/settings',
      color: '#F59E0B',
    },
    {
      icon: SettingsIcon,
      title: 'Settings',
      subtitle: 'App preferences',
      path: '/(app)/settings',
      color: '#6B7280',
    },
    {
      icon: HelpCircle,
      title: 'Help Center',
      subtitle: 'FAQs and support',
      path: '/(app)/help-center',
      color: '#10B981',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.title}
                activeOpacity={0.7}
                onPress={() => router.push(item.path as any)}
              >
                <Card style={styles.menuCard}>
                  <View style={styles.menuContent}>
                    <View
                      style={[
                        styles.menuIcon,
                        { backgroundColor: `${item.color}20` },
                      ]}
                    >
                      <Icon size={20} color={item.color} />
                    </View>
                    <View style={styles.menuText}>
                      <Text style={styles.menuTitle}>{item.title}</Text>
                      {item.subtitle && (
                        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                    <ChevronRight size={20} color={Colors.light.mutedForeground} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => dispatch(logout() as any)}
        >
          <LogOut size={20} color={Colors.light.destructive} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
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
  userCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
  menuList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  menuCard: {
    padding: spacing.lg,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  menuSubtitle: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.destructive,
    marginBottom: spacing.lg,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: Colors.light.destructive,
  },
  version: {
    fontSize: typography.fontSize.sm,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
  },
});

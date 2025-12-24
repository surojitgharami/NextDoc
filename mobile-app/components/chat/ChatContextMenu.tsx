import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
  Animated,
} from 'react-native';
import { Pin, Share2, Edit2, Trash2, X } from 'lucide-react-native';

interface ChatContextMenuProps {
  visible: boolean;
  onClose: () => void;
  chatTitle: string;
  isPinned: boolean;
  onPin: () => void;
  onShare: () => void;
  onRename: () => void;
  onDelete: () => void;
}

// Theme colors
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  danger: '#EF4444',
  primary: '#4F46E5',
};

const darkTheme = {
  background: '#1F2937',
  surface: '#111827',
  border: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  danger: '#EF4444',
  primary: '#6366F1',
};

export default function ChatContextMenu({
  visible,
  onClose,
  chatTitle,
  isPinned,
  onPin,
  onShare,
  onRename,
  onDelete,
}: ChatContextMenuProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  const handleAction = (action: () => void) => {
    onClose();
    // Small delay to allow modal to close before action
    setTimeout(action, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={[styles.menuContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {chatTitle}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            {/* Pin/Unpin */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => handleAction(onPin)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                <Pin size={20} color={isPinned ? theme.primary : theme.textSecondary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  {isPinned ? 'Unpin from top' : 'Pin to top'}
                </Text>
                <Text style={[styles.menuItemDescription, { color: theme.textMuted }]}>
                  {isPinned ? 'Remove from pinned section' : 'Keep at the top of your chats'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => handleAction(onShare)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                <Share2 size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Share conversation
                </Text>
                <Text style={[styles.menuItemDescription, { color: theme.textMuted }]}>
                  Send this chat to others
                </Text>
              </View>
            </TouchableOpacity>

            {/* Rename */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => handleAction(onRename)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.surface }]}>
                <Edit2 size={20} color={theme.textSecondary} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.text }]}>
                  Rename
                </Text>
                <Text style={[styles.menuItemDescription, { color: theme.textMuted }]}>
                  Give this chat a custom name
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleAction(onDelete)}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Trash2 size={20} color={theme.danger} />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, { color: theme.danger }]}>
                  Delete conversation
                </Text>
                <Text style={[styles.menuItemDescription, { color: theme.textMuted }]}>
                  Permanently remove this chat
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

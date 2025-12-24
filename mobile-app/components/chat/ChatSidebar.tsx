import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  useColorScheme,
  StatusBar,
} from 'react-native';
import { Search, Plus, X, MoreVertical, Pin, Share2, Edit2, Trash2, MessageSquare, ChevronDown, User, PanelLeftClose } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '@/constants/Theme';
import ChatContextMenu from './ChatContextMenu';

// Theme colors
const lightTheme = {
  background: '#FFFFFF',
  surface: '#F9FAFB',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  active: '#EFF6FF',
  activeText: '#4F9CF9',
  button: '#101827',
  buttonText: '#FFFFFF',
  input: '#F3F4F6',
  inputBorder: '#E5E7EB',
};

const darkTheme = {
  background: '#1F2937',
  surface: '#111827',
  border: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  active: '#374151',
  activeText: '#F9FAFB',
  button: '#111827',
  buttonText: '#F9FAFB',
  input: '#111827',
  inputBorder: '#374151',
};

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  createdAt?: string;
  message_count?: number;
  is_pinned?: boolean;
  preview?: string;
  summary?: string;
}

interface ChatSidebarProps {
  visible: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void;
  onPinConversation?: (id: string, pinned: boolean) => void;
  onShareConversation?: (id: string) => void;
  onProfilePress: () => void;
  isLoading?: boolean;
}

export default function ChatSidebar({
  visible,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onShareConversation,
  onProfilePress,
  isLoading = false,
}: ChatSidebarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isAllChatsOpen, setIsAllChatsOpen] = useState(true);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuChat, setContextMenuChat] = useState<Conversation | null>(null);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) =>
    searchQuery === '' || conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate pinned and unpinned
  const pinnedConversations = filteredConversations.filter((c) => c.is_pinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.is_pinned);

  // Group by time
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groupConversations = (convs: Conversation[]) => {
    const today = convs.filter((c) => new Date(c.createdAt || c.updatedAt) > oneDayAgo);
    const previous7Days = convs.filter(
      (c) =>
        new Date(c.createdAt || c.updatedAt) <= oneDayAgo &&
        new Date(c.createdAt || c.updatedAt) > sevenDaysAgo
    );
    const previous30Days = convs.filter(
      (c) =>
        new Date(c.createdAt || c.updatedAt) <= sevenDaysAgo &&
        new Date(c.createdAt || c.updatedAt) > thirtyDaysAgo
    );
    return { today, previous7Days, previous30Days };
  };

  const grouped = groupConversations(unpinnedConversations);

  const handleChatPress = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const handleRename = (chat: Conversation) => {
    setSelectedChat(chat.id);
    setRenameText(chat.title);
    setShowRenameModal(true);
  };

  const confirmRename = () => {
    if (selectedChat && renameText.trim() && onRenameConversation) {
      onRenameConversation(selectedChat, renameText.trim());
      setShowRenameModal(false);
      setSelectedChat(null);
    }
  };

  const handleDelete = (chat: Conversation) => {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteConversation?.(chat.id),
        },
      ]
    );
  };

  return (
    <Modal 
      visible={visible} 
      animationType="none" 
      transparent 
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {visible && <StatusBar barStyle="light-content" />}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sidebar, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                {/* Empty space for alignment */}
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <PanelLeftClose size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity 
              style={[styles.newChatButton, { backgroundColor: theme.button, borderColor: theme.border }]} 
              onPress={() => { onNewChat(); onClose(); }}
            >
              <Plus size={18} color={theme.buttonText} />
              <Text style={[styles.newChatText, { color: theme.buttonText }]}>New Chat</Text>
            </TouchableOpacity>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
              <Search size={14} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search chats..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Chat List */}
          <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
            {/* Pinned Section */}
            {pinnedConversations.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setIsPinnedOpen(!isPinnedOpen)}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Pin size={12} color={theme.textSecondary} />
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Pinned</Text>
                  </View>
                  <ChevronDown
                    size={14}
                    color={theme.textMuted}
                    style={[styles.chevron, !isPinnedOpen && styles.chevronClosed]}
                  />
                </TouchableOpacity>
                {isPinnedOpen && pinnedConversations.map((chat) => renderChatItem(chat, theme))}
              </View>
            )}

            {/* All Chats Section */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setIsAllChatsOpen(!isAllChatsOpen)}
              >
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>All Chats</Text>
                <ChevronDown
                  size={14}
                  color={theme.textMuted}
                  style={[styles.chevron, !isAllChatsOpen && styles.chevronClosed]}
                />
              </TouchableOpacity>

              {isAllChatsOpen && (
                <>
                  {renderGroup('Today', grouped.today, theme)}
                  {renderGroup('Previous 7 days', grouped.previous7Days, theme)}
                  {renderGroup('Previous 30 days', grouped.previous30Days, theme)}

                  {filteredConversations.length === 0 && (
                    <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </Text>
                  )}
                </>
              )}
            </View>

            {isLoading && <Text style={[styles.loadingText, { color: theme.textMuted }]}>Loading...</Text>}
          </ScrollView>

          {/* Footer */}
          <TouchableOpacity 
            style={[styles.footer, { borderTopColor: theme.border }]} 
            onPress={() => { onProfilePress(); onClose(); }}
          >
            <LinearGradient
              colors={['#4F9CF9', '#3B82F6']}
              style={styles.profileAvatar}
            >
              <User size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>My Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Rename Modal */}
        <Modal visible={showRenameModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Rename Chat</Text>
              <Text style={[styles.modalDescription, { color: theme.textMuted }]}>Enter a new title for this conversation</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.input, borderColor: theme.inputBorder, color: theme.text }]}
                value={renameText}
                onChangeText={setRenameText}
                placeholder="Chat title"
                placeholderTextColor={theme.textMuted}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.surface }]}
                  onPress={() => setShowRenameModal(false)}
                >
                  <Text style={[styles.modalButtonTextCancel, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={confirmRename}
                >
                  <Text style={styles.modalButtonText}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Context Menu */}
        {contextMenuChat && (
          <ChatContextMenu
            visible={showContextMenu}
            onClose={() => {
              setShowContextMenu(false);
              setContextMenuChat(null);
            }}
            chatTitle={contextMenuChat.title}
            isPinned={contextMenuChat.is_pinned || false}
            onPin={() => {
              if (onPinConversation) {
                onPinConversation(contextMenuChat.id, !contextMenuChat.is_pinned);
              }
            }}
            onShare={() => {
              if (onShareConversation) {
                onShareConversation(contextMenuChat.id);
              }
            }}
            onRename={() => {
              handleRename(contextMenuChat);
            }}
            onDelete={() => {
              handleDelete(contextMenuChat);
            }}
          />
        )}
      </View>
    </Modal>
  );

  function renderChatItem(chat: Conversation, theme: typeof lightTheme) {
    return (
      <View key={chat.id} style={styles.chatItemContainer}>
        <TouchableOpacity
          style={[
            styles.chatItem,
            chat.id === activeConversationId && { backgroundColor: theme.active },
          ]}
          onPress={() => handleChatPress(chat.id)}
        >
          <View style={styles.chatItemContent}>
            {chat.is_pinned && <Pin size={12} color="#8B5CF6" style={styles.pinIcon} />}
            <Text
              style={[
                styles.chatItemText,
                { color: theme.textSecondary },
                chat.id === activeConversationId && { color: theme.activeText, fontWeight: '500' },
              ]}
              numberOfLines={1}
            >
              {chat.title}
            </Text>
          </View>
          {chat.message_count && chat.message_count > 0 && (
            <Text style={[styles.messageCount, { color: theme.textMuted }]}>{chat.message_count}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => {
            setContextMenuChat(chat);
            setShowContextMenu(true);
          }}
        >
          <MoreVertical size={16} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderGroup(title: string, chats: Conversation[], theme: typeof lightTheme) {
    if (chats.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{title}</Text>
        {chats.map((chat) => renderChatItem(chat, theme))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row-reverse',
    zIndex: 9999,
  },
  overlayTouchable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sidebar: {
    width: '75%',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    width: 24,
  },
  closeButton: {
    padding: 4,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chatList: {
    flex: 1,
    padding: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronClosed: {
    transform: [{ rotate: '-90deg' }],
  },
  group: {
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  chatItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  chatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 6,
  },
  chatItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinIcon: {
    flexShrink: 0,
  },
  chatItemText: {
    flex: 1,
    fontSize: 13,
  },
  messageCount: {
    fontSize: 11,
    flexShrink: 0,
    marginLeft: 8,
  },
  moreButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 24,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonConfirm: {
    backgroundColor: '#4F46E5',
  },
  modalButtonText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F9CF9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

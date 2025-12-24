import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { Colors } from '@/constants/Colors';
import { typography, spacing, borderRadius, shadows } from '@/constants/Theme';
import { ArrowLeft, Send, Mic, Paperclip, Sparkles, Plus, Menu, X, MessageSquare, User, PanelLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { RootState } from '@/store';
import ChatHistory from '@/components/chat/ChatHistory';
import MobileMessageInput from '@/components/chat/MobileMessageInput';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { voiceAPI, setVoiceAuthTokenGetter } from '@/services/voiceAPI';
import { chatAPI, setAuthTokenGetter } from '@/services/api';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
  imageUrls?: string[];
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export default function Chat() {
  const router = useRouter();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isS2SActive, setIsS2SActive] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Sidebar State
  const [isSidebarVisible, setSidebarVisible] = useState(false);
  const sidebarTranslateX = useSharedValue(-SIDEBAR_WIDTH);
  const [history, setHistory] = useState<Conversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  // Set auth token getter for APIs
  useEffect(() => {
    if (token) {
      setVoiceAuthTokenGetter(() => token);
      setAuthTokenGetter(() => token);
    }
  }, [token]);

  // Load history when sidebar opens
  useEffect(() => {
    if (isSidebarVisible && user?.id) {
      loadHistory();
    }
  }, [isSidebarVisible, user?.id]);

  const toggleSidebar = () => {
    if (isSidebarVisible) {
      sidebarTranslateX.value = -SIDEBAR_WIDTH;
      setSidebarVisible(false);
    } else {
      setSidebarVisible(true);
      sidebarTranslateX.value = 0;
    }
  };

  const loadHistory = async () => {
    if(!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const data = await chatAPI.getConversations(user.id);
      
      // Handle different response structures
      let convs: Conversation[] = [];
      if (data.today) {
        convs = [
          ...data.today,
          ...data.previous7Days,
          ...data.previous30Days
        ];
      } else if (Array.isArray(data)) {
        convs = data;
      }
      setHistory(convs);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await chatAPI.getHistory(conversationId);
      
      // Convert history to messages
      const loadedMessages: Message[] = (response.messages || []).map((msg: any) => ({
        id: msg.id || Date.now().toString(),
        text: msg.content || msg.message || '',
        isUser: msg.role === 'user',
        timestamp: new Date(msg.timestamp || Date.now()),
        audioUrl: msg.audioUrl,
        imageUrls: msg.imageUrls,
      }));
      
      setMessages(loadedMessages);
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await chatAPI.renameConversation(id, newTitle);
      // Reload history to reflect changes
      await loadHistory();
      Alert.alert('Success', 'Chat renamed successfully');
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      Alert.alert('Error', 'Failed to rename chat');
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await chatAPI.deleteConversation(id);
      // If deleted chat was active, clear messages
      if (id === activeConversationId) {
        setMessages([]);
        setActiveConversationId(null);
      }
      // Reload history
      await loadHistory();
      Alert.alert('Success', 'Chat deleted successfully');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      Alert.alert('Error', 'Failed to delete chat');
    }
  };

  const handlePinConversation = async (id: string, pinned: boolean) => {
    try {
      await chatAPI.pinConversation(id, pinned);
      // Reload history to reflect changes
      await loadHistory();
    } catch (error) {
      console.error('Failed to pin conversation:', error);
      Alert.alert('Error', 'Failed to pin chat');
    }
  };

  const handleShareConversation = async (id: string) => {
    try {
      const chat = history.find(c => c.id === id);
      if (!chat) return;
      
      await Share.share({
        message: `Check out this conversation: ${chat.title}`,
        title: chat.title,
      });
    } catch (error) {
      console.error('Failed to share conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    setIsTyping(true);

    try {
      const { chatAPI } = await import('@/services/api');
      const response = await chatAPI.sendMessage(inputText, null, user?.id);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply || response.message || 'No response received',
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I am unable to connect to the server at the moment.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceSend = async (audioUri: string) => {
    if (isSending) return;

    setIsSending(true);
    setIsTyping(true);

    try {
      // Call S2S endpoint
      const response = await voiceAPI.speechToSpeech(audioUri);

      // Add user's transcribed message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: response.request_text,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add AI's response with audio
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.reply_text,
        isUser: false,
        timestamp: new Date(),
        audioUrl: response.audio_url,
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.error('Voice S2S error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I could not process your voice message. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const handleImageSelect = (imageUris: string[]) => {
    setSelectedImages(imageUris);
  };

  const handleS2SStart = async () => {
    setIsS2SActive(true);
    // S2S mode activated - continuous listening
  };

  const handleS2SStop = () => {
    setIsS2SActive(false);
    // S2S mode deactivated
  };

  const handleStopThinking = () => {
    // Stop AI thinking/response
    setIsTyping(false);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarTranslateX.value }],
  }));

  return (
    <>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.iconButton}>
              <PanelLeft size={22} color={Colors.light.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(app)/dashboard')} style={styles.iconButton}>
              <ArrowLeft size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <MessageSquare size={18} color="#4F9CF9" />
            <Text style={styles.headerTitle}>Chat</Text>
          </View>

          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => router.push('/(app)/profile')}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#4F9CF9', '#3B82F6']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitials}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          <ChatHistory
            messages={messages}
            isTyping={isTyping}
            scrollViewRef={scrollViewRef}
            emptyStateTitle="How can I help you?"
            emptyStateDescription="Start a conversation by typing a message or using voice"
          />
        </View>

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <MobileMessageInput
            value={inputText}
            onChange={setInputText}
            onSend={handleSend}
            onAudioSend={handleVoiceSend}
            onS2SStart={handleS2SStart}
            onS2SStop={handleS2SStop}
            disabled={isSending}
            placeholder="Message AI..."
            onStop={isTyping ? handleStopThinking : undefined}
            isS2SActive={isS2SActive}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sidebar - Outside SafeAreaView for full-screen overlay */}
      <ChatSidebar
        visible={isSidebarVisible}
        onClose={toggleSidebar}
        conversations={history}
        activeConversationId={activeConversationId}
        onSelectConversation={loadConversationMessages}
        onNewChat={() => {
          setMessages([]);
          setActiveConversationId(null);
        }}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onPinConversation={handlePinConversation}
        onShareConversation={handleShareConversation}
        onProfilePress={() => router.push('/(app)/profile')}
        isLoading={isLoadingHistory}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  profileButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  iconButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 20,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: '#4F9CF9',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  aiTimestamp: {
    color: '#9CA3AF',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  suggestionsContainer: {
    width: '100%',
    gap: spacing.md,
  },
  suggestionCard: {
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    color: '#374151',
    fontSize: 14,
    textAlign: 'center',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.9,
  },
  inputWrapper: {
    padding: spacing.md,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  attachButton: {
    padding: 10,
  },
  micButton: {
    padding: 10,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  sendButton: {
    marginBottom: 4,
    marginRight: 4,
  },
  sendGradient: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  messageImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  // Sidebar Styles
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#fff',
    zIndex: 21,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  historyList: {
    flex: 1,
    padding: spacing.md,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#101827',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xl,
    gap: 8,
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  historyItemText: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  sidebarProfileText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  loadingText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginTop: spacing.xl,
  },
  emptyHistoryText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginTop: spacing.xl,
  },
});

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Animated, Easing } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AudioPlayer from './AudioPlayer';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
  imageUrls?: string[];
}

interface ChatHistoryProps {
  messages: Message[];
  isTyping: boolean;
  scrollViewRef: React.RefObject<ScrollView>;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export default function ChatHistory({
  messages,
  isTyping,
  scrollViewRef,
  emptyStateTitle = 'How can I help you?',
  emptyStateDescription = 'Start a conversation by typing a message or using voice',
}: ChatHistoryProps) {
  
  // Animation values for empty state icon
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Start animations when component mounts
  useEffect(() => {
    // Pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const renderMessage = (message: Message, index: number) => {
    return (
      <View
        key={message.id}
        style={[
          styles.messageRow,
          !message.isUser && styles.aiMessageRow,
        ]}
      >
        <View style={[
          styles.messageContent,
          message.isUser && styles.userMessageContent,
        ]}>
          {!message.isUser && (
            <LinearGradient
              colors={['#4F9CF9', '#3B82F6']}
              style={styles.aiAvatar}
            >
              <Sparkles size={18} color="#fff" />
            </LinearGradient>
          )}
          
          <View style={styles.messageTextContainer}>
            {/* Image Attachments */}
            {message.imageUrls && message.imageUrls.length > 0 && (
              <View style={styles.messageImages}>
                {message.imageUrls.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.messageImage} />
                ))}
              </View>
            )}
            
            {/* Message Text */}
            <Text style={[
              styles.messageText,
              message.isUser && styles.userMessageText
            ]}>
              {message.text}
            </Text>
            
            {/* Audio Player for AI responses */}
            {message.audioUrl && !message.isUser && (
              <AudioPlayer audioUrl={message.audioUrl} autoPlay={true} />
            )}
            
            {/* Timestamp */}
            <Text style={[
              styles.timestamp,
              message.isUser && styles.userTimestamp
            ]}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#FFFFFF', '#F9FAFB']}
        style={styles.gradientBackground}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={[
            styles.messagesContent,
            messages.length === 0 && styles.emptyContent
          ]}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            // Empty State
            <View style={styles.emptyStateContainer}>
              <Animated.View style={[
                styles.emptyIconContainer,
                {
                  transform: [
                    { scale: pulseAnim },
                    { translateY: floatAnim },
                    { rotate: rotate },
                  ],
                },
              ]}>
                <LinearGradient
                  colors={['#4F9CF9', '#3B82F6']}
                  style={styles.logoGradient}
                >
                  <Sparkles size={40} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.emptyTitle}>{emptyStateTitle}</Text>
              <Text style={styles.emptyDescription}>{emptyStateDescription}</Text>
            </View>
          ) : (
            // Messages
            messages.map((message, index) => renderMessage(message, index))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingRow}>
              <View style={styles.messageContent}>
                <LinearGradient colors={['#4F9CF9', '#3B82F6']} style={styles.aiAvatar}>
                  <Sparkles size={18} color="#fff" />
                </LinearGradient>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, styles.typingDotDelay1]} />
                  <View style={[styles.typingDot, styles.typingDotDelay2]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  messageRow: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  aiMessageRow: {
    backgroundColor: '#F7F9FC',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  userMessageContent: {
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    shadowColor: '#4F9CF9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  messageTextContainer: {
    flex: 1,
    maxWidth: '85%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
    color: '#1F2937',
    fontWeight: '400',
  },
  userMessageText: {
    textAlign: 'right',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  userTimestamp: {
    textAlign: 'right',
  },
  messageImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  messageImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F9CF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    fontWeight: '400',
  },
  typingRow: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F7F9FC',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#4F9CF9',
    opacity: 0.4,
  },
  typingDotDelay1: {
    opacity: 0.6,
  },
  typingDotDelay2: {
    opacity: 0.8,
  },
});

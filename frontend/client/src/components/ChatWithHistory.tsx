import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/auth-context";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarChat } from "@/components/AppSidebarChat";
import MessageInput from "@/components/MessageInput";
import TypingText from "@/components/TypingText";
import MessageActions from "@/components/MessageActions";
import ReportModal from "@/components/ReportModal";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { startContinuousRecording } from "@/voice/VoiceRecorderVAD";
import { sendS2SAudio, playAudioURL } from "@/voice/s2sHelpers";
import { 
  useChatSessions, 
  useRenameChatSession, 
  usePinChatSession, 
  useDeleteChatSession,
  useResumeChatSession,
  type ChatSession 
} from "@/lib/api-hooks";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  attachment?: {
    type: "image" | "audio";
    fileName: string;
    url?: string;
  };
}

interface ChatWithHistoryProps {
  title: string;
  icon?: React.ReactNode;
  placeholder?: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  emptyStateIcon: React.ReactNode;
  emptyStateActions?: React.ReactNode;
  thinkingComponent?: React.ReactNode;
  mode: "simple" | "symptom_checker";
  generateResponse: (userMessage: string) => {
    content: string;
    thinkingComponent?: React.ReactNode;
  };
  externalInputValue?: string;
  onExternalInputChange?: (value: string) => void;
}

export default function ChatWithHistory({
  title,
  icon,
  placeholder = "Type Here...",
  emptyStateTitle,
  emptyStateDescription,
  emptyStateIcon,
  emptyStateActions,
  generateResponse,
  mode,
  externalInputValue,
  onExternalInputChange
}: ChatWithHistoryProps) {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [internalInputValue, setInternalInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{ name: string; summary: string } | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [thinkingComponents, setThinkingComponents] = useState<Map<string, React.ReactNode>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isS2SActive, setIsS2SActive] = useState(false);
  const s2sStopRef = useRef<(() => void) | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<{ id: string; content: string } | null>(null);

  const { data: sessionsData, refetch: refetchSessions } = useChatSessions(true);
  const renameMutation = useRenameChatSession();
  const pinMutation = usePinChatSession();
  const deleteMutation = useDeleteChatSession();
  const resumeMutation = useResumeChatSession();

  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ["/api/conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await apiRequest('GET', `/api/conversations`);
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  const sessions: ChatSession[] = sessionsData?.sessions || [];
  
  const conversations = Array.isArray(conversationsData) 
    ? conversationsData 
    : conversationsData ? [
        ...(conversationsData.today || []),
        ...(conversationsData.previous7Days || []),
        ...(conversationsData.previous30Days || []),
      ] : [];

  // Mutation to create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (conversationData: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await apiRequest('POST', '/api/conversations', conversationData);
      return response.json();
    },
    onSuccess: (newConversation: any) => {
      refetchConversations();
      setActiveConversationId(newConversation.id);
    },
  });

  // Use external input value if provided, otherwise use internal state
  const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue;
  const setInputValue = onExternalInputChange || setInternalInputValue;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() && !uploadedImage) return;
    let messageText = inputValue;
    const currentFile = uploadedImage;
    
    let attachment: Message['attachment'] | undefined;
    let tempObjectUrl: string | null = null;
    
    if (uploadedImage) {
      tempObjectUrl = URL.createObjectURL(uploadedImage);
      attachment = {
        type: uploadedImage.type.startsWith('audio/') ? 'audio' : 'image',
        fileName: uploadedImage.name,
        url: tempObjectUrl
      };
      
      if (uploadedImage.type.startsWith('audio/')) {
        try {
          const formData = new FormData();
          formData.append('file', uploadedImage);
          const transcribeResponse = await apiRequestFormData('POST', '/api/voice/transcribe', formData);
          const transcribeData = await transcribeResponse.json();
          messageText = transcribeData.text || messageText;
        } catch (transcribeError) {
          console.error('Voice transcription error:', transcribeError);
          toast({
            title: "Transcription error",
            description: "Failed to transcribe voice message. Please try again.",
            variant: "destructive"
          });
          setIsTyping(false);
          return;
        }
      }
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
      attachment
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedImage(null);
    setIsTyping(true);
    
    abortControllerRef.current = new AbortController();
    
    try {
      let endpoint: string;
      let requestBody: Record<string, any>;
      
      if (mode === 'symptom_checker') {
        endpoint = '/api/symptom-checker';
        requestBody = {
          symptoms: messageText,
          conversationId: activeConversationId || '',
          userId: user?.id || ''
        };
      } else {
        endpoint = '/api/v1/chat/message';
        requestBody = {
          message: messageText,
          session_id: activeConversationId || null,
          user_id: user?.id || ''
        };
      }
      
      const response = await apiRequest('POST', endpoint, requestBody, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (tempObjectUrl) {
        URL.revokeObjectURL(tempObjectUrl);
      }
      
      if (!activeConversationId) {
        if (mode === 'symptom_checker' && data.assessment?.conversationId) {
          setActiveConversationId(data.assessment.conversationId);
        } else if (mode === 'simple' && data.session_id) {
          setActiveConversationId(data.session_id);
        }
      }
      
      let aiResponse = '';
      let thinking = '';
      
      if (mode === 'symptom_checker') {
        aiResponse = data.assessment?.assessment || 'Unable to assess symptoms';
        thinking = data.reasoning?.[0] || '';
      } else {
        aiResponse = data.reply || data.message || 'No response received';
        thinking = data.thinking || '';
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
        isStreaming: false
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      if (thinking) {
        setThinkingComponents((prev) => 
          new Map(prev).set(assistantMessage.id, thinking)
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      if (error?.name !== 'AbortError') {
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
        toast({
          title: "Error sending message",
          description: "Failed to send your message. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Thinking stopped",
          description: "The AI response was cancelled. Your message remains.",
          variant: "default"
        });
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopThinking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
    }
  };

  const handleImageUpload = (file: File) => {
    setUploadedImage(file);
  };

  const handleAudioSend = async (audioFile: File) => {
    let messageText = '';

    try {
      // Transcribe audio to get text
      try {
        const formData = new FormData();
        formData.append('file', audioFile);
        const transcribeResponse = await apiRequestFormData('POST', '/api/voice/transcribe', formData);
        const transcribeData = await transcribeResponse.json();
        messageText = transcribeData.text || '';
      } catch (transcribeError) {
        console.error('Voice transcription error:', transcribeError);
        toast({
          title: "Transcription error",
          description: "Failed to transcribe voice message. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!messageText.trim()) {
        toast({
          title: "No speech detected",
          description: "Please record something and try again.",
          variant: "destructive"
        });
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      abortControllerRef.current = new AbortController();

      try {
        let endpoint: string;
        let requestBody: Record<string, any>;

        if (mode === 'symptom_checker') {
          endpoint = '/api/symptom-checker';
          requestBody = {
            symptoms: messageText,
            conversationId: activeConversationId || '',
            userId: user?.id || ''
          };
        } else {
          endpoint = '/api/v1/chat/message';
          requestBody = {
            message: messageText,
            session_id: activeConversationId || null,
            user_id: user?.id || ''
          };
        }

        const response = await apiRequest('POST', endpoint, requestBody, {
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!activeConversationId) {
          if (mode === 'symptom_checker' && data.assessment?.conversationId) {
            setActiveConversationId(data.assessment.conversationId);
          } else if (mode === 'simple' && data.session_id) {
            setActiveConversationId(data.session_id);
          }
        }

        let aiResponse = '';
        let thinking = '';

        if (mode === 'symptom_checker') {
          aiResponse = data.assessment?.assessment || 'Unable to assess symptoms';
          thinking = data.reasoning?.[0] || '';
        } else {
          aiResponse = data.reply || data.message || 'No response received';
          thinking = data.thinking || '';
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          isStreaming: false
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (thinking) {
          setThinkingComponents((prev) =>
            new Map(prev).set(assistantMessage.id, thinking)
          );
        }
      } catch (error: any) {
        console.error('Error sending audio message:', error);

        if (error?.name !== 'AbortError') {
          setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
          toast({
            title: "Error sending voice message",
            description: "Failed to send your voice message. Please try again.",
            variant: "destructive"
          });
        }
      } finally {
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error processing audio",
        description: "Failed to process your voice message.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveAttachment = () => {
    setUploadedImage(null);
  };

  const handleS2SStart = async () => {
    setIsS2SActive(true);

    try {
      const stopRecorder = await startContinuousRecording(async (audioBlob) => {
        // Auto-send audio and continue loop
        await handleS2SAudioRecorded(audioBlob);
      });

      s2sStopRef.current = stopRecorder;
    } catch (error) {
      console.error('Error starting S2S recording:', error);
      toast({
        title: "Microphone error",
        description: "Could not access microphone for speech mode.",
        variant: "destructive"
      });
      setIsS2SActive(false);
    }
  };

  const handleS2SStop = () => {
    if (s2sStopRef.current) {
      s2sStopRef.current();
      s2sStopRef.current = null;
    }
    setIsS2SActive(false);
  };

  const handleS2SAudioRecorded = async (audioBlob: Blob) => {
    try {
      setIsTyping(true);
      const response = await sendS2SAudio(audioBlob, activeConversationId || undefined);

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: response.request_text,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, userMessage]);

      // Add AI message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply_text,
        timestamp: new Date().toISOString(),
        isStreaming: false
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Play AI audio if available
      if (response.audio_url) {
        try {
          await playAudioURL(response.audio_url);
        } catch (audioError) {
          console.error('Error playing audio:', audioError);
        }
      }

      // Continue listening if still in S2S mode
      if (isS2SActive) {
        const stopRecorder = await startContinuousRecording(handleS2SAudioRecorded);
        s2sStopRef.current = stopRecorder;
      }
    } catch (error) {
      console.error('Error processing S2S audio:', error);
      toast({
        title: "S2S Error",
        description: "Failed to process your voice message.",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleTypingComplete = (messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, isTyping: false, isStreaming: false } : msg
      )
    );
  };

  const handleNewChat = () => {
    setActiveConversationId(undefined);
    setMessages([]);
    setThinkingComponents(new Map());
    setSessionSummary(null);
    setIsLoadingMessages(false);
    refetchConversations();
    refetchSessions();
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setMessages([]);
    setIsLoadingMessages(true);
    setSessionSummary(null);
    
    const isSession = sessions.some(s => s.session_id === id);
    
    try {
      let loadedMessages: Message[] = [];
      let summaryData: { name: string; summary: string } | null = null;
      
      if (isSession) {
        const resumeData = await resumeMutation.mutateAsync(id);
        
        loadedMessages = (resumeData.recent_messages || []).map((msg: any) => ({
          id: msg.timestamp || Date.now().toString(),
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          isStreaming: false,
        }));
        
        if (loadedMessages.length < 5) {
          try {
            const response = await apiRequest('GET', `/api/v1/chat/history/${id}`);
            const historyData = await response.json();
            
            loadedMessages = (historyData.messages || []).map((msg: any) => ({
              id: msg.timestamp || Date.now().toString(),
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content || '',
              timestamp: msg.timestamp || new Date().toISOString(),
              isStreaming: false,
            }));
          } catch (e) {
            console.warn('Failed to fetch full history, using resume data');
          }
        }
        
        const sessionName = resumeData.session_name || "Chat";
        if (resumeData.summary) {
          summaryData = { name: sessionName, summary: resumeData.summary };
          setSessionSummary(summaryData);
        }
        
        refetchSessions();
      } else {
        const response = await apiRequest('GET', `/api/messages?conversationId=${id}`);
        const messagesData = await response.json();
        
        loadedMessages = (Array.isArray(messagesData) ? messagesData : messagesData.messages || []).map((msg: any) => ({
          id: msg.id || msg._id || Date.now().toString(),
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
          isStreaming: false,
        }));
      }
      
      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error loading conversation",
        description: "Failed to load messages. Please try again.",
        variant: "destructive"
      });
      setMessages([]);
      setActiveConversationId(undefined);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    const isSession = sessions.some(s => s.session_id === id);
    
    try {
      if (isSession) {
        await renameMutation.mutateAsync({ sessionId: id, sessionName: newTitle });
        toast({
          title: "Chat renamed",
          description: `Conversation renamed to "${newTitle}"`,
        });
        refetchSessions();
      } else {
        const response = await apiRequest('PATCH', `/api/conversations/${id}`, { title: newTitle });
        if (!response.ok) {
          throw new Error('Failed to rename conversation');
        }
        toast({
          title: "Chat renamed",
          description: `Conversation renamed to "${newTitle}"`,
        });
        refetchConversations();
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: "Error renaming chat",
        description: "Failed to rename conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const isSession = sessions.some(s => s.session_id === id);
    
    try {
      if (isSession) {
        await deleteMutation.mutateAsync(id);
        if (activeConversationId === id) {
          handleNewChat();
        }
        toast({
          title: "Chat deleted",
          description: "Conversation has been deleted",
        });
        refetchSessions();
      } else {
        const response = await apiRequest('DELETE', `/api/conversations/${id}`);
        if (!response.ok) {
          throw new Error('Failed to delete conversation');
        }
        if (activeConversationId === id) {
          handleNewChat();
        }
        toast({
          title: "Chat deleted",
          description: "Conversation has been deleted",
        });
        refetchConversations();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error deleting chat",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePinConversation = async (id: string, pinned: boolean) => {
    try {
      await pinMutation.mutateAsync({ sessionId: id, pinned });
      toast({
        title: pinned ? "Chat pinned" : "Chat unpinned",
        description: pinned ? "Conversation has been pinned to top" : "Conversation has been unpinned",
      });
      refetchSessions();
    } catch (error) {
      console.error('Error pinning conversation:', error);
      toast({
        title: "Error",
        description: "Failed to update pin status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleShareConversation = (id: string) => {
    const conversation = conversations.find(c => c.id === id);
    const session = sessions.find(s => s.session_id === id);
    const title = session?.session_name || conversation?.title || "Untitled";
    toast({
      title: "Share feature",
      description: `Would share: "${title}". This feature will be implemented with backend integration.`,
    });
  };

  const sidebarStyle = {
    "--sidebar-width": "20rem",
  };

  return (
    <SidebarProvider defaultOpen={true} style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebarChat
          conversations={conversations}
          sessions={sessions}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onShareConversation={handleShareConversation}
          onPinConversation={handlePinConversation}
          mode={mode}
        />

        <SidebarInset className="flex flex-col overflow-hidden">
          <header className={`flex-shrink-0 bg-background px-4 py-3 flex items-center gap-4 ${messages.length > 0 ? 'border-b' : ''}`}>
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              {icon}
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <Avatar 
              className="w-10 h-10 border-2 border-primary/20 cursor-pointer hover-elevate" 
              onClick={() => setLocation("/profile")}
              data-testid="button-profile-avatar"
            >
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-6 pb-4">
              {isLoadingMessages ? (
                <div className="space-y-4">
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                  <div className="h-24 bg-muted animate-pulse rounded-lg" />
                  <div className="h-16 bg-muted animate-pulse rounded-lg" />
                </div>
              ) : sessionSummary ? (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">{sessionSummary.name}</h3>
                      <p className="text-blue-800 dark:text-blue-200 text-sm mt-1">{sessionSummary.summary}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {messages.length === 0 && !isLoadingMessages ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                    {emptyStateIcon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{emptyStateTitle}</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      {emptyStateDescription}
                    </p>
                  </div>
                  {emptyStateActions}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`group flex gap-3 ${message.role === 'user' ? 'justify-end pr-12' : 'justify-start'}`}
                    data-testid={`message-${message.role}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 flex-shrink-0 mt-1 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full">
                        <Sparkles className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                      </div>
                    )}
                    <div className={`max-w-[80%] space-y-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className="px-4 py-3 rounded-lg">
                        {message.attachment && message.attachment.type === 'image' && message.attachment.url && (
                          <div className="mb-3">
                            <img 
                              src={message.attachment.url} 
                              alt={message.attachment.fileName}
                              className="max-w-sm rounded-lg max-h-80 object-contain shadow-md"
                              data-testid="message-image"
                            />
                          </div>
                        )}
                        {message.attachment && message.attachment.type === 'audio' && message.attachment.url && (
                          <div className="mb-2">
                            <audio controls className="w-full max-w-xs">
                              <source src={message.attachment.url} type="audio/webm" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                        {message.role === 'assistant' && message.isStreaming ? (
                          <TypingText 
                            text={message.content}
                            speed={20}
                            onComplete={() => handleTypingComplete(message.id)}
                            className="text-sm"
                            renderMarkdown={true}
                          />
                        ) : message.role === 'assistant' ? (
                          message.content && <MarkdownRenderer content={message.content} />
                        ) : (
                          message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {message.role === 'assistant' && !message.isStreaming && message.content && (
                        <MessageActions
                          messageId={message.id}
                          messageText={message.content}
                          onReport={(msgId) => {
                            setReportingMessage({ id: msgId, content: message.content });
                            setReportModalOpen(true);
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 flex-shrink-0 mt-1 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full">
                    <Sparkles className="w-4 h-4 text-gray-700 dark:text-gray-200" />
                  </div>
                  <div className="px-4 py-3 rounded-lg">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="flex-shrink-0 bg-background px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <MessageInput
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSend}
                onImageUpload={handleImageUpload}
                onAudioSend={handleAudioSend}
                onRemoveAttachment={handleRemoveAttachment}
                onS2SStart={handleS2SStart}
                onS2SStop={handleS2SStop}
                disabled={isTyping}
                placeholder={placeholder}
                onStop={handleStopThinking}
              />
            </div>
          </div>
        </SidebarInset>
      </div>
      
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportingMessage(null);
        }}
        messageId={reportingMessage?.id || ""}
        sessionId={activeConversationId || ""}
        messagePreview={reportingMessage?.content}
      />
    </SidebarProvider>
  );
}

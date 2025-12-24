import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/auth-context";
import {
  Send,
  Menu,
  X,
  MoreVertical,
  Plus,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAIDocktorChat } from "@/lib/aiDoctorApi";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  streaming?: boolean;
}

interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
}

export default function AIDoctorChat() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { sendMessage, createNewConversation, fetchMessages, fetchConversations } = useAIDocktorChat();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatConversation[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        if (!user?.id) return;
        const conversations = await fetchConversations();
        setChatHistory(
          conversations.map((conv) => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt,
          }))
        );
      } catch (error) {
        console.error("Failed to load conversation history:", error);
      }
    };

    loadConversations();
  }, [user?.id, fetchConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        120
      ) + "px";
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = inputValue;
    setInputValue("");
    setIsLoading(true);

    try {
      // If no conversation exists, create one
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const newConversation = await createNewConversation("New Chat");
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);

        // Add to history
        setChatHistory((prev) => [
          {
            id: newConversation.id,
            title: newConversation.title,
            createdAt: newConversation.createdAt,
          },
          ...prev,
        ]);
      }

      // Send message to backend
      const response = await sendMessage(currentConversationId, messageContent);

      const aiMessage: Message = {
        id: response.message.id,
        role: "assistant",
        content: response.message.content,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        streaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Simulate streaming completion
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessage.id ? { ...msg, streaming: false } : msg
          )
        );
      }, aiMessage.content.length * 20);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInputValue("");
  };

  const loadConversation = async (convId: string) => {
    try {
      setConversationId(convId);
      setMessages([]);
      setIsLoading(true);
      const messages = await fetchMessages(convId);
      setMessages(
        messages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.timestamp).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
        }))
      );
      setShowSidebar(false);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-[#D6F6FF] to-white relative">
      {/* Sidebar - Chat History */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />

          <div className="fixed lg:relative w-64 h-full bg-white border-r border-[#4CAFCA]/20 flex flex-col z-50 shadow-lg lg:shadow-none">
            <div className="p-4 border-b border-[#4CAFCA]/20">
              <Button
                onClick={handleNewChat}
                className="w-full bg-[#4CAFCA] hover:bg-[#3d9fb5] text-white"
                data-testid="button-new-chat"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            <ScrollArea className="flex-1 px-2 py-4">
              {chatHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No chat history
                </p>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm truncate ${
                        conversationId === conv.id
                          ? "bg-[#4CAFCA] text-white"
                          : "hover:bg-[#D6F6FF] text-gray-700"
                      }`}
                      data-testid={`session-${conv.id}`}
                    >
                      {conv.title}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            <button
              onClick={() => setShowSidebar(false)}
              className="lg:hidden p-4 border-t border-[#4CAFCA]/20"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-[#4CAFCA]/20 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden"
              data-testid="button-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4CAFCA] to-[#2A9BC0] flex items-center justify-center text-white font-bold">
                AI
              </div>
              <div className="flex flex-col">
                <h1 className="font-semibold text-gray-800">AI Doctor</h1>
                <p className="text-xs text-gray-500">
                  {conversationId ? "Connected" : "New chat"}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-options"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleNewChat}
                data-testid="menu-new-chat"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLocation("/dashboard")}
                data-testid="menu-back"
              >
                Back to Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4CAFCA] to-[#2A9BC0] flex items-center justify-center text-white text-3xl mb-4">
                  🏥
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  AI Doctor Assistant
                </h2>
                <p className="text-gray-600 max-w-md mb-6">
                  Welcome to your personal health assistant. Ask any health-related
                  questions and get instant guidance.
                </p>
                <div className="text-sm text-gray-500">
                  <p className="mb-2">
                    💊 Medical advice and health tips
                  </p>
                  <p className="mb-2">🩺 Symptom checking</p>
                  <p>📋 General wellness information</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    streaming={message.streaming}
                  />
                ))}
                {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-t border-[#4CAFCA]/20 p-4">
          <div className="max-w-4xl mx-auto">
            {/* Loading Alert */}
            {isLoading && (
              <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#4CAFCA]" />
                <span className="text-sm text-gray-700">
                  AI Doctor is thinking...
                </span>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your health..."
                  className="resize-none rounded-2xl border-[#4CAFCA] focus:border-[#4CAFCA] focus:ring-[#4CAFCA]"
                  rows={1}
                  disabled={isLoading}
                  data-testid="input-message"
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || !user}
                size="icon"
                className="bg-[#4CAFCA] hover:bg-[#3d9fb5] text-white rounded-full h-10 w-10 flex-shrink-0"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-2 text-center">
              Disclaimer: This AI is for informational purposes only and not a
              replacement for professional medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import ChatHistorySidebar from "@/components/ChatHistorySidebar";
import { useLocation } from "wouter";

export default function History() {
  const [, setLocation] = useLocation();

  const handleConversationSelect = (conversationId: string) => {
    setLocation(`/chat?id=${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <ChatHistorySidebar
        onConversationSelect={handleConversationSelect}
        className="h-screen"
      />
    </div>
  );
}

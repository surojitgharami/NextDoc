import { MessageSquare } from "lucide-react";
import ChatWithHistory from "@/components/ChatWithHistory";

export default function NewChat() {
  const generateResponse = (_userMessage: string) => {
    return {
      content: "",
    };
  };

  return (
    <ChatWithHistory
      title="Chat"
      icon={<MessageSquare className="w-5 h-5 text-primary" />}
      placeholder="Type Here..."
      emptyStateTitle="Healthcare Assistant"
      emptyStateDescription="Ask me anything about your health, medications, or wellness. I'm here to help!"
      emptyStateIcon={<MessageSquare className="w-8 h-8 text-primary" />}
      generateResponse={generateResponse}
      mode="simple"
    />
  );
}

import { useState } from "react";
import { Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Conversation {
  id: string;
  name: string;
}

export default function Messaging() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // TODO: Send message to API
      setMessageText("");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 max-w-6xl mx-auto">
        <div className="md:col-span-1">
          <Card className="h-[500px]">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold">Conversations</h2>
              <Button size="icon" variant="ghost"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-2 p-4">
              {conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <div key={conv.id} className="p-2 rounded hover:bg-muted cursor-pointer">
                    {conv.name}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-[500px] flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-bold">
                {selectedConversation ? selectedConversation.name : "Select a conversation"}
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {selectedConversation ? (
                <div className="text-center text-muted-foreground">
                  Message thread here
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a conversation to start messaging
                </div>
              )}
            </div>
            {selectedConversation && (
              <div className="p-4 border-t flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button size="icon" onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

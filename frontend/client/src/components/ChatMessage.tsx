import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Stethoscope, User } from "lucide-react";
import { useState, useEffect } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  streaming?: boolean;
  userImage?: string;
  userName?: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
}

export default function ChatMessage({ role, content, timestamp, streaming = false, userImage, userName, imageUrl, audioUrl, duration }: ChatMessageProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (streaming && currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 20);
      return () => clearTimeout(timeout);
    } else if (!streaming) {
      setDisplayedContent(content);
      setCurrentIndex(content.length);
    }
  }, [streaming, currentIndex, content]);

  const isUser = role === "user";

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${role}`}
    >
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600">
            <Stethoscope className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[75%]`}>
        <div
          className={`rounded-[20px] overflow-hidden ${
            isUser
              ? "bg-[#e8f5e9] text-foreground"
              : "bg-white text-foreground"
          }`}
        >
          {imageUrl && (
            <img 
              src={imageUrl} 
              alt="Uploaded content" 
              className="max-w-full h-auto max-h-96 object-contain"
            />
          )}
          {audioUrl && (
            <div className="px-4 py-3">
              <audio 
                controls 
                className="w-full max-w-xs"
                src={audioUrl}
              />
            </div>
          )}
          {(!audioUrl || content.trim()) && (
            <div className="px-4 py-3">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {displayedContent}
                {streaming && currentIndex < content.length && (
                  <span className="inline-block w-[2px] h-[18px] ml-0.5 bg-current animate-pulse" />
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

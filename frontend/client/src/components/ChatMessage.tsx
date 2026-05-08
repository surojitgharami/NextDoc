import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Stethoscope } from "lucide-react";
import { useState, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

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

export default function ChatMessage({
  role,
  content,
  timestamp,
  streaming = false,
  userImage,
  userName,
  imageUrl,
  audioUrl,
  duration,
}: ChatMessageProps) {
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
  const isStreaming = streaming && currentIndex < content.length;

  return (
    <div className={`flex gap-3 mb-6 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`message-${role}`}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600">
            <Stethoscope className="w-4 h-4 text-white" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%]`}>
        <div
          className={`rounded-2xl overflow-hidden ${
            isUser
              ? "bg-[#e8f5e9] text-foreground px-4 py-3"
              : "bg-white text-foreground shadow-sm border border-gray-100"
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
              <audio controls className="w-full max-w-xs" src={audioUrl} />
            </div>
          )}

          {(!audioUrl || content.trim()) && (
            <div className={isUser ? "" : "px-4 py-3"}>
              {isUser ? (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{displayedContent}</p>
              ) : (
                <div className="text-[15px] leading-relaxed text-gray-800">
                  <MarkdownRenderer content={displayedContent} />
                  {isStreaming && (
                    <span className="inline-block w-[2px] h-[18px] ml-0.5 bg-gray-400 animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {timestamp && (
          <span className="text-xs text-gray-400 mt-1 px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
}

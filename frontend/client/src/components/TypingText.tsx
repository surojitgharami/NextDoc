import { useState, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface TypingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  renderMarkdown?: boolean;
}

export default function TypingText({ 
  text, 
  speed = 20, 
  onComplete,
  className = "",
  renderMarkdown = false,
}: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (currentIndex === text.length && onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  if (renderMarkdown) {
    return (
      <div className={className}>
        <MarkdownRenderer content={displayedText} />
        {currentIndex < text.length && (
          <span className="inline-block w-[2px] h-[16px] bg-current ml-0.5 align-middle animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

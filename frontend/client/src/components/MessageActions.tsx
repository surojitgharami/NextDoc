import { useState } from "react";
import { Copy, Volume2, VolumeX, Flag, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { audioController } from "@/lib/audioController";
import { stopMic } from "@/lib/audioMicController";

interface MessageActionsProps {
  messageId: string;
  messageText: string;
  onReport: (messageId: string) => void;
}

export default function MessageActions({ 
  messageId, 
  messageText, 
  onReport 
}: MessageActionsProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const stopPlayback = () => {
    // Stop all audio playback
    audioController.stop();
    
    // Stop Web Speech Synthesis
    window.speechSynthesis.cancel();
    
    // Stop microphone
    stopMic();
    
    setIsPlaying(false);
  };

  const playWithWebSpeech = () => {
    if (!("speechSynthesis" in window)) {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    // Stop microphone before playing speech
    stopMic();

    const utterance = new SpeechSynthesisUtterance(messageText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (voice) => voice.lang.startsWith("en") && voice.localService
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      toast({
        title: "Error",
        description: "Failed to read aloud",
        variant: "destructive",
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleReadAloud = async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (isLoading) return;

    setIsLoading(true);

    try {
      const token = await getToken();
      const textToSpeak = messageText.substring(0, 5000);
      const encodedText = encodeURIComponent(textToSpeak);
      
      const response = await fetch(`/api/tts?text=${encodedText}&voice=alloy`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("TTS API request failed");
      }

      const data = await response.json();

      if (data.method === "synth_service" && data.audio_url) {
        setIsLoading(false);
        
        try {
          // Stop microphone before playing audio
          stopMic();
          
          // Use global audio controller to play audio
          await audioController.play(data.audio_url);
          setIsPlaying(false);
        } catch (err) {
          console.error("Error playing TTS audio:", err);
          playWithWebSpeech();
        }
      } else {
        setIsLoading(false);
        playWithWebSpeech();
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsLoading(false);
      playWithWebSpeech();
    }
  };

  const handleReport = () => {
    onReport(messageId);
  };

  return (
    <TooltipProvider>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : "Copy"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${isPlaying ? "text-primary" : ""}`}
              onClick={handleReadAloud}
              disabled={isLoading}
              aria-label={isPlaying ? "Stop reading" : "Read aloud"}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isPlaying ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isLoading ? "Loading..." : isPlaying ? "Stop" : "Read aloud"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:text-red-500"
              onClick={handleReport}
              aria-label="Report message"
            >
              <Flag className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Report</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

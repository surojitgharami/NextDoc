/**
 * Voice Button Component
 * Compact button to trigger voice recording - suitable for placing in chat toolbar
 */

import React, { useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/auth-context";
import type { VoiceMode } from "./types";

interface VoiceButtonProps {
  mode?: VoiceMode;
  onTranscript?: (text: string) => void;
  onReply?: (text: string, audioUrl: string) => void;
  onError?: (error: string) => void;
  tooltip?: string;
  size?: "sm" | "default" | "lg";
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  mode = "stt",
  onTranscript,
  onReply,
  onError,
  tooltip = "Voice message (click to record)",
  size = "default",
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const getAuthToken = React.useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getToken();
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }, [user]);

  const startRecording = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      if (onError) onError(message);
    }
  }, [toast, onError]);

  const stopRecording = React.useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];

    setIsRecording(false);
    setIsPending(true);

    try {
      const token = await getAuthToken();
      let endpoint = "/api/voice/transcribe";
      if (mode === "s2s") {
        endpoint = "/api/voice/s2s";
      } else if (mode === "voice-text-reply") {
        endpoint = "/api/voice/voice-text-reply";
      }

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (mode === "stt") {
        if (onTranscript) onTranscript(data.text);
        toast({
          title: "✅ Transcribed",
          description: data.text.substring(0, 100),
        });
      } else if (mode === "voice-text-reply") {
        if (onReply) onReply(data.reply_text, "");
        toast({
          title: "✅ Reply",
          description: data.reply_text.substring(0, 100),
        });
      } else {
        if (onReply) onReply(data.reply_text, data.audio_url);
        
        // Auto-play audio if data URL
        if (data.audio_url) {
          const audio = new Audio(data.audio_url);
          audio.play().catch(err => console.error("Failed to play audio:", err));
        }
        
        toast({
          title: "✅ Done",
          description: data.reply_text.substring(0, 100),
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      if (onError) onError(message);
    } finally {
      setIsPending(false);
    }
  }, [mode, getAuthToken, onTranscript, onReply, onError, toast]);

  const handleClick = React.useCallback(async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isDisabled = isPending;

  const sizeMap = {
    sm: "w-8 h-8",
    default: "w-10 h-10",
    lg: "w-12 h-12",
  };

  return (
    <Button
      variant={isRecording ? "destructive" : "ghost"}
      size="icon"
      onClick={handleClick}
      disabled={isDisabled}
      title={tooltip}
      className={`${sizeMap[size]} rounded-full`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isRecording ? (
        <Square className="w-4 h-4 fill-current" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
};

export default VoiceButton;

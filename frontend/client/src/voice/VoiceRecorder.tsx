/**
 * Voice Recorder Component
 * Supports two modes:
 * - STT (Speech-to-Text): Records audio and transcribes it
 * - S2S (Speech-to-Speech): Records audio, transcribes, gets AI reply, and plays audio response
 */

import React, { useState, useRef, useCallback } from "react";
import { Mic, Square, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/auth-context";
import { audioController } from "@/lib/audioController";
import { stopMic } from "@/lib/audioMicController";
import type { VoiceMode, VoiceRecorderState } from "./types";

interface VoiceRecorderProps {
  mode?: VoiceMode;
  onTranscript?: (text: string) => void;
  onReply?: (text: string, audioUrl: string) => void;
  className?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  mode = "stt",
  onTranscript,
  onReply,
  className = "",
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isPending: false,
    mode,
    transcript: undefined,
    reply: undefined,
    audioUrl: undefined,
    error: undefined,
  });

  // Get auth token from Clerk
  const getAuthToken = useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getToken();
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return null;
    }
  }, [user]);

  // Start recording
  const startRecording = useCallback(async () => {
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

      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: undefined,
        transcript: undefined,
        reply: undefined,
        audioUrl: undefined,
      }));

      toast({
        title: "🎤 Recording started",
        description: "Speak your message...",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start recording";
      setState((prev) => ({ ...prev, error: message }));
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Stop recording and process
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();

    // Stop all tracks
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    audioChunksRef.current = [];

    setState((prev) => ({ ...prev, isRecording: false, isPending: true }));

    try {
      const token = await getAuthToken();
      const endpoint =
        state.mode === "s2s"
          ? "/api/voice/s2s"
          : "/api/voice/transcribe";

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
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (state.mode === "stt") {
        // STT mode: just show transcript
        setState((prev) => ({
          ...prev,
          isPending: false,
          transcript: data.text,
        }));

        if (onTranscript) {
          onTranscript(data.text);
        }

        toast({
          title: "✅ Transcribed",
          description: data.text,
        });
      } else {
        // S2S mode: show transcript and play audio response
        setState((prev) => ({
          ...prev,
          isPending: false,
          transcript: data.request_text,
          reply: data.reply_text,
          audioUrl: data.audio_url,
        }));

        if (onReply) {
          onReply(data.reply_text, data.audio_url);
        }

        // Play audio using global audio controller
        if (data.audio_url) {
          // Stop microphone before playing audio
          stopMic();
          
          audioController.play(data.audio_url).catch((err) => {
            console.error("Failed to play audio:", err);
            toast({
              title: "Error",
              description: "Failed to play audio response",
              variant: "destructive",
            });
          });
        }

        toast({
          title: "✅ Processing complete",
          description: data.reply_text,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed";
      setState((prev) => ({
        ...prev,
        isPending: false,
        error: message,
      }));

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  }, [state.mode, getAuthToken, onTranscript, onReply, toast]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isRecording: false,
      isPending: false,
      mode: state.mode,
      transcript: undefined,
      reply: undefined,
      audioUrl: undefined,
      error: undefined,
    });
  }, [state.mode]);

  // Toggle recording
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant={state.isRecording ? "destructive" : "default"}
          size="sm"
          onClick={toggleRecording}
          disabled={state.isPending}
          className="gap-2"
        >
          {state.isRecording ? (
            <>
              <Square className="w-4 h-4" />
              Stop
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Record
            </>
          )}
        </Button>

        {(state.transcript || state.reply) && (
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </Button>
        )}

        {state.audioUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Stop microphone before playing audio
              stopMic();
              audioController.play(state.audioUrl!).catch((err) => {
                console.error("Failed to replay audio:", err);
                toast({
                  title: "Error",
                  description: "Failed to replay audio",
                  variant: "destructive",
                });
              });
            }}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            Replay
          </Button>
        )}
      </div>

      {/* Transcript display */}
      {state.transcript && (
        <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
            You said:
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">{state.transcript}</p>
        </div>
      )}

      {/* Reply display (S2S mode only) */}
      {state.reply && (
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
            AI Reply:
          </p>
          <p className="text-sm text-green-800 dark:text-green-200">{state.reply}</p>
        </div>
      )}

      {/* Error display */}
      {state.error && (
        <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            Error:
          </p>
          <p className="text-sm text-red-800 dark:text-red-200">{state.error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {state.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin">⏳</div>
          Processing audio...
        </div>
      )}

    </div>
  );
};

// Export hook for use in other components
export function useVoice() {
  const [mode, setMode] = React.useState<VoiceMode>("stt");

  const toggleMode = React.useCallback(() => {
    setMode((prev) => (prev === "stt" ? "s2s" : "stt"));
  }, []);

  return {
    mode,
    setMode,
    toggleMode,
    isSpeechToSpeech: mode === "s2s",
  };
}

export default VoiceRecorder;

/**
 * Voice service API types and responses
 */

export interface TranscribeResponse {
  text: string;
  source: "openai" | "colab";
}

export interface SynthesizeRequest {
  text: string;
  voice_options?: Record<string, unknown>;
  language?: string;
}

export interface SynthesizeResponse {
  audio_url: string;
  duration_ms?: number;
  format: string;
}

export interface S2SResponse {
  request_text: string;
  reply_text: string;
  audio_url: string;
  duration_ms?: number;
}

export interface VoiceTextReplyResponse {
  request_text: string;
  reply_text: string;
}

export type VoiceMode = "stt" | "s2s" | "voice-text-reply";

export interface VoiceRecorderState {
  isRecording: boolean;
  isPending: boolean;
  mode: VoiceMode;
  transcript?: string;
  reply?: string;
  audioUrl?: string;
  error?: string;
}

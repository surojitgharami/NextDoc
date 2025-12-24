/**
 * Speech-to-Speech API helpers
 */

import { apiRequestFormData } from "@/lib/queryClient";
import { audioController } from "@/lib/audioController";
import { stopMic } from "@/lib/audioMicController";

export interface S2SResponse {
  request_text: string;
  reply_text: string;
  audio_url?: string;
}

export async function sendS2SAudio(
  audioBlob: Blob,
  sessionId?: string | null
): Promise<S2SResponse> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  
  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  const response = await apiRequestFormData('POST', '/api/voice/s2s', formData);

  if (!response.ok) {
    throw new Error(`S2S request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Play audio using the global audio controller
 * Automatically stops microphone when audio starts
 */
export function playAudioURL(audioUrl: string): Promise<void> {
  // Stop microphone before playing audio to prevent overlap
  stopMic();
  
  return audioController.play(audioUrl);
}

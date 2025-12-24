// Voice API Service for Speech-to-Speech functionality
import { API_BASE_URL } from './api';

let getAuthToken: (() => string | null) | null = null;

export function setVoiceAuthTokenGetter(getter: () => string | null) {
  getAuthToken = getter;
}

export const voiceAPI = {
  /**
   * Full Speech-to-Speech pipeline
   * 1. Transcribe user audio to text (STT)
   * 2. Get AI response
   * 3. Synthesize AI response to audio (TTS)
   */
  speechToSpeech: async (audioUri: string): Promise<{
    request_text: string;
    reply_text: string;
    audio_url: string;
    duration_ms?: number;
  }> => {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);

    const token = getAuthToken?.();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/s2s`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`S2S failed: ${error}`);
    }

    return response.json();
  },

  /**
   * Transcribe audio to text only (STT)
   */
  transcribe: async (audioUri: string): Promise<{
    text: string;
    source: string;
  }> => {
    const formData = new FormData();
    
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);

    const token = getAuthToken?.();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed: ${error}`);
    }

    return response.json();
  },

  /**
   * Synthesize text to speech (TTS)
   */
  synthesize: async (text: string, language: string = 'en'): Promise<{
    audio_url: string;
    duration_ms?: number;
    format: string;
  }> => {
    const token = getAuthToken?.();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/synthesize`, {
      method: 'POST',
      body: JSON.stringify({ text, language }),
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS failed: ${error}`);
    }

    return response.json();
  },

  /**
   * Voice input to text reply (no audio synthesis)
   */
  voiceTextReply: async (audioUri: string): Promise<{
    request_text: string;
    reply_text: string;
  }> => {
    const formData = new FormData();
    
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);

    const token = getAuthToken?.();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/voice/voice-text-reply`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voice-text-reply failed: ${error}`);
    }

    return response.json();
  },
};

/**
 * Universal Audio and Microphone Controller
 * Provides a single function to stop all audio and microphone activity
 */

import { audioController } from './audioController';

// Global state for microphone
let micActive = false;
let recognitionInstance: any = null;

export function setRecognitionInstance(instance: any) {
  recognitionInstance = instance;
}

export function setMicActive(active: boolean) {
  micActive = active;
}

export function getMicActive(): boolean {
  return micActive;
}

/**
 * Stop all audio and microphone activity
 * Safe to call even if nothing is active
 */
export function stopAllAudioAndMic() {
  try {
    // Stop audio playback
    audioController.stop();
  } catch (e) {
    console.error('Error stopping audio:', e);
  }

  try {
    // Stop microphone
    if (recognitionInstance) {
      recognitionInstance.stop();
    }
    micActive = false;
  } catch (e) {
    console.error('Error stopping microphone:', e);
  }
}

/**
 * Stop only the microphone
 */
export function stopMic() {
  try {
    if (recognitionInstance) {
      recognitionInstance.stop();
    }
    micActive = false;
  } catch (e) {
    console.error('Error stopping microphone:', e);
  }
}

/**
 * Start microphone for speech recognition
 */
export function startMic(recognition: any) {
  try {
    recognitionInstance = recognition;
    micActive = true;
    recognition.start();
  } catch (e) {
    console.error('Error starting microphone:', e);
  }
}

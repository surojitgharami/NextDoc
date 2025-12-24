/**
 * Voice Activity Detection (VAD) recorder
 * Automatically stops recording when silence is detected (~1500ms)
 */

interface VADConfig {
  silenceThreshold: number; // RMS threshold for silence (0-1)
  silenceDuration: number; // milliseconds of silence to trigger stop
  fftSize: number; // FFT size for analysis
}

const defaultConfig: VADConfig = {
  silenceThreshold: 0.02,
  silenceDuration: 1500,
  fftSize: 2048,
};

export async function startContinuousRecording(
  onSilenceDetected: (blob: Blob) => Promise<void>,
  config: Partial<VADConfig> = {}
): Promise<() => void> {
  const finalConfig = { ...defaultConfig, ...config };

  let stream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let isRunning = true;
  let silenceTimer: NodeJS.Timeout | null = null;
  let audioChunks: Blob[] = [];

  try {
    // Request microphone access
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = finalConfig.fftSize;
    source.connect(analyser);

    let isSendingAudio = false;

    // Collect audio data
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (audioChunks.length > 0 && !isSendingAudio) {
        isSendingAudio = true;
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        audioChunks = [];
        onSilenceDetected(blob).then(() => {
          isSendingAudio = false;
        });
      }
    };

    mediaRecorder.start();

    // VAD detection loop
    const detectSilence = () => {
      if (!isRunning || !analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for volume detection
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);

      if (rms < finalConfig.silenceThreshold) {
        // Silence detected
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (isRunning && mediaRecorder) {
              mediaRecorder.stop();
              silenceTimer = null;
            }
          }, finalConfig.silenceDuration);
        }
      } else {
        // Sound detected - reset silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      }

      if (isRunning) {
        requestAnimationFrame(detectSilence);
      }
    };

    // Start VAD loop
    detectSilence();

    // Return stop function
    return () => {
      isRunning = false;

      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (audioContext) {
        audioContext.close();
      }

      audioChunks = [];
    };
  } catch (error) {
    console.error('Error starting continuous recording:', error);
    
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    
    if (audioContext) {
      audioContext.close();
    }

    throw error;
  }
}

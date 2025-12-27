/**
 * Global Audio Controller
 * Manages all audio playback to prevent overlapping audio and ensure clean stops
 */

class AudioController {
  audio: HTMLAudioElement | null = null;
  isPlaying = false;

  /**
   * Play audio from URL
   * Automatically stops any previous audio first
   */
  play(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop(); // stop any previous audio instantly

      this.audio = new Audio(url);
      this.audio.play();
      this.isPlaying = true;

      this.audio.onended = () => {
        this.isPlaying = false;
        resolve();
      };

      this.audio.onerror = () => {
        this.isPlaying = false;
        reject(new Error('Failed to play audio'));
      };
    });
  }

  /**
   * Stop audio playback immediately
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    }
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioController = new AudioController();

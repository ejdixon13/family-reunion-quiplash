// Audio queue manager for TTS playback
// Prevents overlapping speech and manages priority

export type TTSPriority = 'high' | 'normal';

interface QueueItem {
  id: string;
  audioUrl: string;
  priority: TTSPriority;
  onStart?: () => void;
  onEnd?: () => void;
}

type QueueStateListener = (state: { isPlaying: boolean; queueLength: number }) => void;

class TTSQueue {
  private queue: QueueItem[] = [];
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private isMuted = false;
  private volume = 1.0;
  private listeners: Set<QueueStateListener> = new Set();
  private currentPhase: string | null = null;

  // Add item to queue
  enqueue(item: Omit<QueueItem, 'id'>): string {
    const id = `tts-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const queueItem: QueueItem = { ...item, id };

    if (item.priority === 'high') {
      // High priority items go to front (after any currently playing high priority)
      const insertIndex = this.queue.findIndex(q => q.priority !== 'high');
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }
    } else {
      this.queue.push(queueItem);
    }

    this.notifyListeners();
    this.processQueue();
    return id;
  }

  // Process next item in queue
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.isPlaying = true;
    this.notifyListeners();

    try {
      await this.playAudio(item);
    } catch (error) {
      console.error('[TTS] Playback error:', error);
    } finally {
      this.isPlaying = false;
      this.currentAudio = null;
      this.notifyListeners();
      // Process next item
      this.processQueue();
    }
  }

  // Play a single audio item
  private playAudio(item: QueueItem): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(item.audioUrl);
      audio.volume = this.isMuted ? 0 : this.volume;
      this.currentAudio = audio;

      audio.oncanplaythrough = () => {
        item.onStart?.();
        audio.play().catch(reject);
      };

      audio.onended = () => {
        item.onEnd?.();
        // Revoke object URL to free memory
        URL.revokeObjectURL(item.audioUrl);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(item.audioUrl);
        reject(new Error(`Failed to play audio: ${item.audioUrl}`));
      };

      audio.load();
    });
  }

  // Clear all queued items (optionally keep current playing)
  clear(stopCurrent = false): void {
    this.queue = [];
    if (stopCurrent && this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
      this.isPlaying = false;
    }
    this.notifyListeners();
  }

  // Clear queue when game phase changes (prevents stale audio)
  setPhase(phase: string): void {
    if (this.currentPhase && this.currentPhase !== phase) {
      // Phase changed, clear queue to prevent stale audio
      this.clear(true);
    }
    this.currentPhase = phase;
  }

  // Mute/unmute
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.currentAudio) {
      this.currentAudio.volume = muted ? 0 : this.volume;
    }
  }

  // Set volume (0-1)
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.volume;
    }
  }

  // Skip current playing audio
  skip(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.dispatchEvent(new Event('ended'));
    }
  }

  // State getters
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.volume;
  }

  // Subscribe to state changes
  subscribe(listener: QueueStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = { isPlaying: this.isPlaying, queueLength: this.queue.length };
    this.listeners.forEach(listener => listener(state));
  }
}

// Singleton instance
export const ttsQueue = new TTSQueue();

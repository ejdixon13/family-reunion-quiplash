'use client';

import { useCallback, useEffect, useState } from 'react';
import { ttsQueue, type TTSPriority } from '@/lib/ttsQueue';
import {
  getVoiceConfig,
  ANNOUNCER_CONFIG,
  TTS_API_ENDPOINT,
  type VoiceConfig,
} from '@/lib/voiceConfig';

export interface TTSOptions {
  voice?: 'announcer' | 'family';
  familyMemberName?: string;
  priority?: TTSPriority;
  exaggeration?: number;
  paralinguistics?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseTTSReturn {
  speak: (text: string, options?: TTSOptions) => Promise<string>;
  speakAnnouncement: (text: string, options?: Omit<TTSOptions, 'voice'>) => Promise<string>;
  speakDialogue: (
    messages: Array<{ sender: string; message: string }>,
    delayMs?: number
  ) => Promise<void>;
  stop: () => void;
  skip: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
  queueLength: number;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// Generate TTS audio via API
async function generateTTS(
  text: string,
  config: VoiceConfig
): Promise<Blob> {
  // Build request body matching Chatterbox-TTS-Server API
  const requestBody: Record<string, unknown> = {
    text,
    voice_mode: config.mode === 'clone' ? 'clone' : 'predefined',
    output_format: 'wav',
  };

  if (config.seed !== undefined) {
    requestBody.seed = config.seed;
  }

  if (config.cloneFile) {
    requestBody.predefined_voice_id = config.cloneFile;
  }

  if (config.exaggeration !== undefined) {
    requestBody.exaggeration = config.exaggeration;
  }

  const response = await fetch(TTS_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.blob();
}

export function useTTS(): UseTTSReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queueLength, setQueueLength] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);

  // Subscribe to queue state changes
  useEffect(() => {
    const unsubscribe = ttsQueue.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setQueueLength(state.queueLength);
    });
    return unsubscribe;
  }, []);

  // Sync mute/volume with queue
  useEffect(() => {
    ttsQueue.setMuted(isMuted);
  }, [isMuted]);

  useEffect(() => {
    ttsQueue.setVolume(volume);
  }, [volume]);

  // Main speak function
  const speak = useCallback(
    async (text: string, options: TTSOptions = {}): Promise<string> => {
      if (!isEnabled) {
        return '';
      }

      const {
        voice = 'announcer',
        familyMemberName,
        priority = 'normal',
        exaggeration,
        onStart,
        onEnd,
      } = options;

      // Get voice config based on type
      let config: VoiceConfig;
      if (voice === 'announcer') {
        config = { ...ANNOUNCER_CONFIG };
      } else if (familyMemberName) {
        config = getVoiceConfig(familyMemberName);
      } else {
        config = { mode: 'seed', seed: 12345 }; // Default fallback
      }

      // Override exaggeration if specified
      if (exaggeration !== undefined) {
        config.exaggeration = exaggeration;
      }

      try {
        // Generate audio
        const audioBlob = await generateTTS(text, config);
        const audioUrl = URL.createObjectURL(audioBlob);

        // Queue for playback
        const id = ttsQueue.enqueue({
          audioUrl,
          priority,
          onStart,
          onEnd,
        });

        return id;
      } catch (error) {
        console.error('[TTS] Generation failed:', error);
        return '';
      }
    },
    [isEnabled]
  );

  // Convenience: speak as announcer (high priority)
  const speakAnnouncement = useCallback(
    async (text: string, options: Omit<TTSOptions, 'voice'> = {}): Promise<string> => {
      return speak(text, {
        ...options,
        voice: 'announcer',
        priority: options.priority ?? 'high',
      });
    },
    [speak]
  );

  // Speak multiple dialogue messages with delays (for WhatsApp reveal)
  const speakDialogue = useCallback(
    async (
      messages: Array<{ sender: string; message: string }>,
      delayMs = 300
    ): Promise<void> => {
      if (!isEnabled) return;

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Wait for stagger delay (sync with animation)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        await speak(msg.message, {
          voice: 'family',
          familyMemberName: msg.sender,
          priority: 'normal',
        });
      }
    },
    [isEnabled, speak]
  );

  // Stop all TTS
  const stop = useCallback(() => {
    ttsQueue.clear(true);
  }, []);

  // Skip current audio
  const skip = useCallback(() => {
    ttsQueue.skip();
  }, []);

  // Update mute state
  const handleSetMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  // Update volume
  const handleSetVolume = useCallback((vol: number) => {
    setVolume(Math.max(0, Math.min(1, vol)));
  }, []);

  return {
    speak,
    speakAnnouncement,
    speakDialogue,
    stop,
    skip,
    setMuted: handleSetMuted,
    setVolume: handleSetVolume,
    isMuted,
    volume,
    isPlaying,
    queueLength,
    isEnabled,
    setEnabled: setIsEnabled,
  };
}

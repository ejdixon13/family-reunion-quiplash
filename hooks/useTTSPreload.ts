'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ttsQueue } from '@/lib/ttsQueue';
import { getVoiceConfig, TTS_API_ENDPOINT } from '@/lib/voiceConfig';
import {
  pregenerateGameStart,
  getAnnouncementAudio,
  generateCustomAnnouncement,
  pickRandomAnnouncement,
  type AnnouncementCategory,
  clearAudioCache,
} from '@/lib/ttsPregenerate';

interface ConversationMessage {
  sender: string;
  message: string;
}

interface CachedConversation {
  promptId: string;
  audioUrls: string[];
}

interface UseTTSPreloadReturn {
  // Pre-generation status
  isPreloading: boolean;
  preloadProgress: string;

  // Start pre-generating at game start
  startPreloading: () => Promise<void>;

  // Play a pre-generated announcement
  playAnnouncement: (
    category: AnnouncementCategory,
    replacements?: Record<string, string | number>
  ) => Promise<void>;

  // Play custom announcement (generates if not cached)
  playCustomAnnouncement: (text: string, cacheKey?: string) => Promise<void>;

  // Pre-fetch conversation for upcoming context reveal
  prefetchConversation: (promptId: string, messages: ConversationMessage[]) => Promise<void>;

  // Play pre-fetched conversation
  playConversation: (promptId: string, delayMs?: number) => Promise<void>;

  // Check if conversation is ready
  isConversationReady: (promptId: string) => boolean;

  // Cleanup
  cleanup: () => void;
}

export function useTTSPreload(): UseTTSPreloadReturn {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState('');

  // Cache for pre-fetched conversations
  const conversationCache = useRef<Map<string, CachedConversation>>(new Map());

  // Track if we've started preloading
  const hasPreloaded = useRef(false);

  // Generate TTS for a single message
  const generateMessageAudio = useCallback(
    async (message: string, senderName: string): Promise<string> => {
      const config = getVoiceConfig(senderName);

      const response = await fetch(TTS_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          voice_mode: config.mode,
          predefined_voice_id: config.voiceId,
          exaggeration: config.exaggeration,
          output_format: 'wav',
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS generation failed: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    []
  );

  // Pre-generate announcements at game start
  // TTS disabled - using music/SFX instead
  const startPreloading = useCallback(async () => {
    // TTS disabled - skip preloading
    return;
  }, []);

  // Play a pre-generated announcement
  const playAnnouncement = useCallback(
    async (
      category: AnnouncementCategory,
      replacements: Record<string, string | number> = {}
    ) => {
      try {
        // If no dynamic replacements, use pre-generated audio
        const hasDynamicContent = Object.keys(replacements).length > 0;

        if (hasDynamicContent) {
          // Generate fresh with actual values
          const text = pickRandomAnnouncement(category, replacements);
          const url = await generateCustomAnnouncement(text);
          ttsQueue.enqueue({ audioUrl: url, priority: 'high' });
        } else {
          // Use pre-generated
          const url = await getAnnouncementAudio(category);
          ttsQueue.enqueue({ audioUrl: url, priority: 'high' });
        }
      } catch (error) {
        console.error('[TTS] Announcement playback failed:', error);
      }
    },
    []
  );

  // Play custom announcement
  const playCustomAnnouncement = useCallback(
    async (text: string, cacheKey?: string) => {
      try {
        const url = await generateCustomAnnouncement(text, cacheKey);
        ttsQueue.enqueue({ audioUrl: url, priority: 'high' });
      } catch (error) {
        console.error('[TTS] Custom announcement failed:', error);
      }
    },
    []
  );

  // Pre-fetch conversation TTS during voting
  const prefetchConversation = useCallback(
    async (promptId: string, messages: ConversationMessage[]) => {
      // Skip if already cached
      if (conversationCache.current.has(promptId)) {
        return;
      }

      console.log(`[TTS Preload] Pre-fetching conversation for prompt ${promptId}`);

      const audioUrls: string[] = [];

      // Generate all message audio in parallel (up to 3 at a time to not overload)
      const batchSize = 3;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        const batchUrls = await Promise.all(
          batch.map((msg) =>
            generateMessageAudio(msg.message, msg.sender).catch((err) => {
              console.error(`[TTS Preload] Failed to generate for ${msg.sender}:`, err);
              return ''; // Return empty on failure
            })
          )
        );
        audioUrls.push(...batchUrls);
      }

      conversationCache.current.set(promptId, { promptId, audioUrls });
      console.log(`[TTS Preload] Conversation ready for prompt ${promptId}`);
    },
    [generateMessageAudio]
  );

  // Play pre-fetched conversation immediately
  const playConversation = useCallback(
    async (promptId: string, delayMs = 100) => {
      const cached = conversationCache.current.get(promptId);

      if (!cached) {
        console.warn(`[TTS] No cached conversation for prompt ${promptId}`);
        return;
      }

      // Clear any pending announcements so conversation starts immediately
      ttsQueue.clear(true);

      console.log(`[TTS] Playing conversation for prompt ${promptId} with ${cached.audioUrls.length} messages`);

      // Queue each message - first one with high priority for immediate playback
      for (let i = 0; i < cached.audioUrls.length; i++) {
        const url = cached.audioUrls[i];
        if (!url) continue; // Skip failed generations

        // Add small delay between messages (but don't wait for previous to finish)
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        // First message is high priority to start immediately
        ttsQueue.enqueue({ audioUrl: url, priority: i === 0 ? 'high' : 'normal' });
      }
    },
    []
  );

  // Check if conversation is ready
  const isConversationReady = useCallback((promptId: string): boolean => {
    return conversationCache.current.has(promptId);
  }, []);

  // Cleanup
  const cleanup = useCallback(() => {
    // Revoke conversation audio URLs
    conversationCache.current.forEach(({ audioUrls }) => {
      audioUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    });
    conversationCache.current.clear();

    // Clear announcement cache
    clearAudioCache();

    hasPreloaded.current = false;
    setPreloadProgress('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isPreloading,
    preloadProgress,
    startPreloading,
    playAnnouncement,
    playCustomAnnouncement,
    prefetchConversation,
    playConversation,
    isConversationReady,
    cleanup,
  };
}

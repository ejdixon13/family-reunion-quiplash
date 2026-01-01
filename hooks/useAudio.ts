'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Sound effect types
export type SoundEffect =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'reveal'
  | 'fanfare'
  | 'countdown'
  | 'positive'
  | 'gameOver'
  | 'suspense'
  | 'intro';

// Background music types mapped to game phases
export type MusicTrack = 'lobby' | 'thinking' | 'voting' | 'results';

// Audio file paths
const SFX_PATHS: Record<SoundEffect, string> = {
  click: '/audio/sfx/click.mp3',
  correct: '/audio/sfx/correct-answer.mp3',
  wrong: '/audio/sfx/wrong-answer.mp3',
  reveal: '/audio/sfx/reveal.mp3',
  fanfare: '/audio/sfx/fanfare.mp3',
  countdown: '/audio/sfx/countdown-tick.mp3',
  positive: '/audio/sfx/positive-notification.mp3',
  gameOver: '/audio/sfx/game-over.mp3',
  suspense: '/audio/sfx/suspense-timer.mp3',
  intro: '/audio/sfx/game-show-intro.mp3',
};

const MUSIC_PATHS: Record<MusicTrack, string> = {
  lobby: '/audio/music/lobby-music.mp3',
  thinking: '/audio/music/thinking-music.mp3',
  voting: '/audio/music/voting-music.mp3',
  results: '/audio/music/results-music.mp3',
};

// Music attribution (Kevin MacLeod - incompetech.com)
// Licensed under Creative Commons: By Attribution 4.0
// Lobby Time, Thinking Music, Winner Winner!, Sneaky Snitch

interface UseAudioReturn {
  // Sound effects
  playSfx: (sound: SoundEffect) => void;

  // Background music
  playMusic: (track: MusicTrack) => void;
  stopMusic: () => void;
  fadeOutMusic: (durationMs?: number) => void;

  // Volume controls
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  musicVolume: number;
  sfxVolume: number;

  // Mute controls
  setMuted: (muted: boolean) => void;
  isMuted: boolean;

  // State
  currentTrack: MusicTrack | null;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export function useAudio(): UseAudioReturn {
  const [isMuted, setIsMuted] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(0.3);
  const [sfxVolume, setSfxVolumeState] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  // Audio element refs
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const sfxCache = useRef<Map<SoundEffect, HTMLAudioElement>>(new Map());
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Preload sound effects on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Preload all sound effects
    Object.entries(SFX_PATHS).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = 'auto';
      sfxCache.current.set(key as SoundEffect, audio);
    });

    // Create music element
    musicRef.current = new Audio();
    musicRef.current.loop = true;

    return () => {
      // Cleanup
      sfxCache.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      sfxCache.current.clear();

      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = '';
      }

      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // Update music volume when state changes
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  // Play a sound effect
  const playSfx = useCallback(
    (sound: SoundEffect) => {
      if (!isEnabled || isMuted) return;

      const cachedAudio = sfxCache.current.get(sound);
      if (cachedAudio) {
        // Clone to allow overlapping sounds
        const audio = cachedAudio.cloneNode() as HTMLAudioElement;
        audio.volume = sfxVolume;
        audio.play().catch((err) => {
          console.warn('[Audio] SFX playback failed:', err);
        });
      }
    },
    [isEnabled, isMuted, sfxVolume]
  );

  // Play background music
  const playMusic = useCallback(
    (track: MusicTrack) => {
      if (!isEnabled || !musicRef.current) return;

      // Clear any existing fade
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }

      // If same track is already playing, do nothing
      if (currentTrack === track && !musicRef.current.paused) {
        return;
      }

      const path = MUSIC_PATHS[track];
      musicRef.current.src = path;
      musicRef.current.volume = isMuted ? 0 : musicVolume;
      musicRef.current.play().catch((err) => {
        console.warn('[Audio] Music playback failed:', err);
      });

      setCurrentTrack(track);
    },
    [isEnabled, currentTrack, isMuted, musicVolume]
  );

  // Stop background music
  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
  }, []);

  // Fade out music over duration
  const fadeOutMusic = useCallback(
    (durationMs = 1000) => {
      if (!musicRef.current || musicRef.current.paused) return;

      const startVolume = musicRef.current.volume;
      const steps = 20;
      const stepDuration = durationMs / steps;
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        if (musicRef.current) {
          musicRef.current.volume = Math.max(0, startVolume - volumeStep * currentStep);
        }

        if (currentStep >= steps) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          stopMusic();
        }
      }, stepDuration);
    },
    [stopMusic]
  );

  // Volume setters
  const setMusicVolume = useCallback((volume: number) => {
    setMusicVolumeState(Math.max(0, Math.min(1, volume)));
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    setSfxVolumeState(Math.max(0, Math.min(1, volume)));
  }, []);

  // Mute handler
  const handleSetMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
    if (musicRef.current) {
      musicRef.current.volume = muted ? 0 : musicVolume;
    }
  }, [musicVolume]);

  return {
    playSfx,
    playMusic,
    stopMusic,
    fadeOutMusic,
    setMusicVolume,
    setSfxVolume,
    musicVolume,
    sfxVolume,
    setMuted: handleSetMuted,
    isMuted,
    currentTrack,
    isEnabled,
    setEnabled: setIsEnabled,
  };
}

// Game phase to music mapping utility
export function getMusicForPhase(phase: string): MusicTrack | null {
  switch (phase) {
    case 'lobby':
    case 'category_select':
      return 'lobby';
    case 'answering':
      return 'thinking';
    case 'voting':
      return 'voting';
    case 'vote_results':
    case 'round_scores':
    case 'final_scores':
      return 'results';
    default:
      return null;
  }
}

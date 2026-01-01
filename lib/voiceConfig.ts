// Voice configuration for TTS
// Maps family member names to consistent voice settings

export type VoiceMode = 'seed' | 'clone';

export interface VoiceConfig {
  mode: VoiceMode;
  seed?: number;
  cloneFile?: string;
  exaggeration?: number; // 0.0-1.0 for emotion intensity
}

// Simple hash function to generate consistent seed from name
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive and within reasonable range
  return Math.abs(hash) % 100000;
}

// Cache of known cloned voices (populated at runtime)
const clonedVoices = new Set<string>();

// Register a cloned voice as available
export function registerClonedVoice(name: string): void {
  clonedVoices.add(name.toLowerCase());
}

// Check if a cloned voice exists
export function hasClonedVoice(name: string): boolean {
  return clonedVoices.has(name.toLowerCase());
}

// Get voice configuration for a family member
export function getVoiceConfig(name: string): VoiceConfig {
  const normalizedName = name.toLowerCase();

  if (hasClonedVoice(normalizedName)) {
    return {
      mode: 'clone',
      cloneFile: `${normalizedName}.wav`,
      exaggeration: 0.3,
    };
  }

  return {
    mode: 'seed',
    seed: hashName(name),
    exaggeration: 0.4, // Slightly more expressive for seed-based voices
  };
}

// Announcer voice config (game show host style)
export const ANNOUNCER_CONFIG: VoiceConfig = {
  mode: 'seed',
  seed: 42424, // Fixed seed for consistent announcer voice
  exaggeration: 0.7, // High energy for announcements
};

// TTS API endpoint
export const TTS_API_ENDPOINT = '/api/tts';

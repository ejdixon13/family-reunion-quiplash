// Voice configuration for TTS
// Maps family member names to consistent voice settings

export type VoiceMode = 'predefined' | 'clone';

export interface VoiceConfig {
  mode: VoiceMode;
  seed?: number;
  voiceId: string; // Predefined voice filename (without .wav)
  exaggeration?: number; // 0.0-1.0 for emotion intensity
}

// Default voices available in Chatterbox-TTS-Server
// These provide variety for different family members
const DEFAULT_VOICES = [
  'Abigail', 'Adrian', 'Alexander', 'Alice', 'Austin', 'Axel',
  'Connor', 'Cora', 'Elena', 'Eli', 'Emily', 'Everett',
  'Gabriel', 'Gianna', 'Henry', 'Ian', 'Jade', 'Jeremiah',
  'Jordan', 'Julian', 'Layla', 'Leonardo', 'Michael', 'Miles',
  'Olivia', 'Ryan', 'Taylor', 'Thomas',
];

// Simple hash function to get consistent voice index from name
function hashNameToIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % DEFAULT_VOICES.length;
}

// Cache of custom cloned voices (for future use)
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
// Maps names to consistent predefined voices
export function getVoiceConfig(name: string): VoiceConfig {
  const normalizedName = name.toLowerCase();

  // If a custom cloned voice exists, use it
  if (hasClonedVoice(normalizedName)) {
    return {
      mode: 'clone',
      voiceId: `${normalizedName}.wav`,
      exaggeration: 0.3,
    };
  }

  // Otherwise, map to a consistent predefined voice based on name hash
  const voiceIndex = hashNameToIndex(name);
  return {
    mode: 'predefined',
    voiceId: DEFAULT_VOICES[voiceIndex],
    exaggeration: 0.4,
  };
}

// Announcer voice config (game show host style)
// Using "Michael" for a classic announcer feel
export const ANNOUNCER_CONFIG: VoiceConfig = {
  mode: 'predefined',
  voiceId: 'Michael',
  exaggeration: 0.7, // High energy for announcements
};

// TTS API endpoint
export const TTS_API_ENDPOINT = '/api/tts';

// Pre-generated TTS announcements pool
// These are generated at game start and cached for instant playback

import { ANNOUNCER_CONFIG, TTS_API_ENDPOINT } from './voiceConfig';

// Announcement categories with fun variations
export const ANNOUNCEMENT_POOL = {
  gameIntro: [
    "Welcome to Family Quiplash! Time to find out who's actually funny in this family!",
    "It's Family Quiplash time! May the wittiest relative win!",
    "Family Quiplash is starting! Remember, what happens at game night stays at game night!",
    "Welcome everyone! Let's see whose sense of humor they got from Grandma!",
  ],
  roundStart: [
    "Round {round} begins! Get those creative juices flowing!",
    "Here comes round {round}! Time to impress your relatives!",
    "Round {round} is upon us! May your answers be clever and your timing impeccable!",
    "Starting round {round}! Remember, family-appropriate is optional!",
  ],
  votingStart: [
    "Time to vote! Pick your favorite, no favoritism for siblings!",
    "Voting time! Choose wisely, Thanksgiving dinner depends on it!",
    "Cast your votes! Remember, they can't see who you picked!",
    "Vote now! May the best quip win!",
  ],
  votesAreIn: [
    "The votes are in!",
    "And the people have spoken!",
    "The results are here!",
    "Let's see who won this one!",
  ],
  quiplash: [
    "[laugh] It's a Quiplash! Everyone agreed!",
    "[laugh] Unanimous! That's a Quiplash bonus!",
    "Quiplash! The whole family loved that one!",
    "[chuckle] Complete domination! Quiplash!",
  ],
  roundEnd: [
    "That's the end of round {round}! Let's see the scores!",
    "Round {round} complete! Who's in the lead?",
    "And that wraps up round {round}!",
  ],
  gameOver: [
    "Game over! We have a winner!",
    "That's the game! Time to crown our champion!",
    "And that's Family Quiplash! Drumroll please!",
  ],
  winnerAnnounce: [
    "{name} takes the crown with {score} points!",
    "Congratulations {name}! {score} points of pure wit!",
    "{name} wins! {score} points! Bragging rights until next reunion!",
    "The funniest family member is {name} with {score} points!",
  ],
};

export type AnnouncementCategory = keyof typeof ANNOUNCEMENT_POOL;

interface CachedAudio {
  blob: Blob;
  url: string;
}

// Cache for pre-generated audio
const audioCache = new Map<string, CachedAudio>();

// Track which categories have been pre-generated
const pregeneratedCategories = new Set<AnnouncementCategory>();

// Generate a single TTS audio
async function generateAudio(text: string, exaggeration = 0.7): Promise<Blob> {
  const response = await fetch(TTS_API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice_mode: 'predefined',
      predefined_voice_id: ANNOUNCER_CONFIG.voiceId,
      exaggeration,
      output_format: 'wav',
    }),
  });

  if (!response.ok) {
    throw new Error(`TTS generation failed: ${response.status}`);
  }

  return response.blob();
}

// Pick a random announcement from a category
export function pickRandomAnnouncement(
  category: AnnouncementCategory,
  replacements: Record<string, string | number> = {}
): string {
  const pool = ANNOUNCEMENT_POOL[category];
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Replace placeholders like {round}, {name}, {score}
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(replacements[key] ?? `{${key}}`)
  );
}

// Get cache key for an announcement
function getCacheKey(category: AnnouncementCategory, index: number): string {
  return `${category}-${index}`;
}

// Pre-generate all announcements for a category
export async function pregenerateCategory(
  category: AnnouncementCategory,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  if (pregeneratedCategories.has(category)) {
    return; // Already generated
  }

  const pool = ANNOUNCEMENT_POOL[category];

  for (let i = 0; i < pool.length; i++) {
    const key = getCacheKey(category, i);

    if (!audioCache.has(key)) {
      try {
        // Use placeholder text for template announcements
        const text = pool[i]
          .replace('{round}', '1')
          .replace('{name}', 'Player')
          .replace('{score}', '1000');

        const blob = await generateAudio(text);
        const url = URL.createObjectURL(blob);
        audioCache.set(key, { blob, url });

        onProgress?.(i + 1, pool.length);
      } catch (error) {
        console.error(`[TTS] Failed to pregenerate ${key}:`, error);
      }
    }
  }

  pregeneratedCategories.add(category);
}

// Pre-generate critical announcements at game start
export async function pregenerateGameStart(
  onProgress?: (category: string, done: number, total: number) => void
): Promise<void> {
  const criticalCategories: AnnouncementCategory[] = [
    'gameIntro',
    'roundStart',
    'votesAreIn',
    'quiplash',
  ];

  for (const category of criticalCategories) {
    await pregenerateCategory(category, (done, total) => {
      onProgress?.(category, done, total);
    });
  }
}

// Get a pre-generated audio URL (or generate on-demand if not cached)
export async function getAnnouncementAudio(
  category: AnnouncementCategory,
  index?: number
): Promise<string> {
  const pool = ANNOUNCEMENT_POOL[category];
  const actualIndex = index ?? Math.floor(Math.random() * pool.length);
  const key = getCacheKey(category, actualIndex);

  // Check cache first
  const cached = audioCache.get(key);
  if (cached) {
    return cached.url;
  }

  // Generate on demand
  const text = pool[actualIndex]
    .replace('{round}', '1')
    .replace('{name}', 'Player')
    .replace('{score}', '1000');

  const blob = await generateAudio(text);
  const url = URL.createObjectURL(blob);
  audioCache.set(key, { blob, url });

  return url;
}

// Generate custom announcement with dynamic text (for winner names, scores, etc.)
export async function generateCustomAnnouncement(
  text: string,
  cacheKey?: string
): Promise<string> {
  // Check cache if key provided
  if (cacheKey && audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!.url;
  }

  const blob = await generateAudio(text);
  const url = URL.createObjectURL(blob);

  if (cacheKey) {
    audioCache.set(cacheKey, { blob, url });
  }

  return url;
}

// Clear all cached audio (for cleanup)
export function clearAudioCache(): void {
  audioCache.forEach(({ url }) => URL.revokeObjectURL(url));
  audioCache.clear();
  pregeneratedCategories.clear();
}

// Get cache stats
export function getCacheStats(): { size: number; categories: string[] } {
  return {
    size: audioCache.size,
    categories: Array.from(pregeneratedCategories),
  };
}

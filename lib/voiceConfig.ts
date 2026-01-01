// Voice configuration for TTS
// Maps family member names to consistent voice settings

export type VoiceMode = 'predefined' | 'clone';

export interface VoiceConfig {
  mode: VoiceMode;
  seed?: number;
  voiceId: string; // Predefined voice filename (without .wav)
  exaggeration?: number; // 0.0-1.0 for emotion intensity
}

// Voices split by gender for Chatterbox-TTS-Server
const MALE_VOICES = [
  'Adrian.wav', 'Alexander.wav', 'Austin.wav', 'Axel.wav', 'Connor.wav',
  'Eli.wav', 'Everett.wav', 'Gabriel.wav', 'Henry.wav', 'Ian.wav',
  'Jeremiah.wav', 'Julian.wav', 'Leonardo.wav', 'Michael.wav', 'Miles.wav',
  'Ryan.wav', 'Thomas.wav',
];

const FEMALE_VOICES = [
  'Abigail.wav', 'Alice.wav', 'Cora.wav', 'Elena.wav', 'Emily.wav',
  'Gianna.wav', 'Jade.wav', 'Layla.wav', 'Olivia.wav', 'Taylor.wav',
];

// Common male names for gender detection
const MALE_NAMES = new Set([
  'adam', 'adrian', 'alex', 'alexander', 'andrew', 'anthony', 'austin', 'axel',
  'ben', 'benjamin', 'blake', 'brad', 'brandon', 'brian', 'bruce',
  'carl', 'carlos', 'charles', 'charlie', 'chris', 'christian', 'christopher', 'connor', 'corey',
  'dad', 'daddy', 'dan', 'daniel', 'david', 'dean', 'dennis', 'derek', 'dominic', 'don', 'donald', 'doug', 'douglas', 'drew', 'dylan',
  'ed', 'eddie', 'edward', 'eli', 'elijah', 'eric', 'erik', 'ethan', 'evan', 'everett',
  'frank', 'fred', 'frederick',
  'gabriel', 'gary', 'george', 'gerald', 'gordon', 'graham', 'grant', 'greg', 'gregory',
  'harold', 'harry', 'henry', 'howard', 'hunter',
  'ian', 'isaac', 'ivan',
  'jack', 'jackson', 'jacob', 'jake', 'james', 'jason', 'jeff', 'jeffrey', 'jeremy', 'jeremiah', 'jerry', 'jesse', 'jim', 'jimmy', 'joe', 'joel', 'john', 'johnny', 'jon', 'jonathan', 'jordan', 'joseph', 'josh', 'joshua', 'julian', 'justin',
  'keith', 'ken', 'kenneth', 'kevin', 'kyle',
  'larry', 'lawrence', 'leo', 'leon', 'leonard', 'leonardo', 'liam', 'logan', 'louis', 'lucas', 'luke',
  'marcus', 'mark', 'martin', 'mason', 'matt', 'matthew', 'max', 'michael', 'mike', 'miles', 'mitch', 'mitchell',
  'nathan', 'nathaniel', 'neil', 'nick', 'nicholas', 'noah', 'nolan',
  'oliver', 'oscar', 'owen',
  'patrick', 'paul', 'peter', 'phil', 'philip', 'phillip',
  'ralph', 'randy', 'ray', 'raymond', 'richard', 'rick', 'rob', 'robert', 'roger', 'ronald', 'ross', 'roy', 'russell', 'ryan',
  'sam', 'samuel', 'scott', 'sean', 'seth', 'shane', 'shaun', 'shawn', 'simon', 'spencer', 'stan', 'stanley', 'stephen', 'steve', 'steven', 'stuart',
  'ted', 'terry', 'thomas', 'tim', 'timothy', 'todd', 'tom', 'tommy', 'tony', 'travis', 'trevor', 'troy', 'tyler',
  'uncle', 'victor', 'vincent',
  'walter', 'warren', 'wayne', 'will', 'william', 'wyatt',
  'zach', 'zachary', 'zack',
]);

// Common female names for gender detection
const FEMALE_NAMES = new Set([
  'abby', 'abigail', 'adriana', 'alexandra', 'alexis', 'alice', 'alicia', 'alison', 'allison', 'alyssa', 'amanda', 'amber', 'amy', 'andrea', 'angela', 'angelica', 'angie', 'anna', 'anne', 'annie', 'april', 'ashley', 'audrey', 'aunt', 'auntie', 'aurora', 'ava',
  'bailey', 'barbara', 'becky', 'beth', 'bethany', 'betty', 'bonnie', 'brenda', 'brianna', 'bridget', 'brittany', 'brooke',
  'caitlin', 'candice', 'carla', 'carmen', 'carol', 'caroline', 'carolyn', 'carrie', 'casey', 'cassandra', 'catherine', 'cathy', 'charlotte', 'chelsea', 'cheryl', 'chloe', 'christina', 'christine', 'cindy', 'claire', 'clara', 'claudia', 'colleen', 'cora', 'courtney', 'crystal', 'cynthia',
  'daisy', 'dana', 'danielle', 'debbie', 'deborah', 'debra', 'denise', 'diana', 'diane', 'donna', 'doris', 'dorothy',
  'eileen', 'elaine', 'elena', 'eleanor', 'elizabeth', 'ella', 'ellen', 'emily', 'emma', 'erica', 'erin', 'eva', 'evelyn',
  'faith', 'fiona', 'florence', 'frances',
  'gabriella', 'gail', 'gianna', 'gina', 'gloria', 'grace', 'grandma', 'granny',
  'hailey', 'hannah', 'hazel', 'heather', 'heidi', 'helen', 'hillary', 'holly', 'hope',
  'irene', 'iris', 'isabella', 'ivy',
  'jackie', 'jacqueline', 'jade', 'jamie', 'jane', 'janet', 'janice', 'jasmine', 'jean', 'jenna', 'jennifer', 'jenny', 'jessica', 'jill', 'joan', 'joanna', 'jocelyn', 'jodi', 'jodie', 'joyce', 'judith', 'judy', 'julia', 'julie', 'juliet', 'june',
  'kaitlyn', 'karen', 'kate', 'katherine', 'kathleen', 'kathy', 'katrina', 'kayla', 'kelly', 'kelsey', 'kendra', 'kim', 'kimberly', 'kristen', 'kristin', 'kristina', 'kristy', 'kylie',
  'lacey', 'laura', 'lauren', 'layla', 'leah', 'leslie', 'lillian', 'lily', 'linda', 'lindsay', 'lindsey', 'lisa', 'lori', 'lorraine', 'louise', 'lucia', 'lucy', 'lynn', 'lydia',
  'mackenzie', 'madeline', 'madison', 'maggie', 'malia', 'mallory', 'mandy', 'margaret', 'maria', 'marie', 'marilyn', 'marissa', 'martha', 'mary', 'maureen', 'megan', 'melanie', 'melissa', 'melody', 'mercedes', 'mia', 'michelle', 'miranda', 'molly', 'mom', 'mommy', 'monica', 'morgan',
  'nana', 'nancy', 'natalie', 'natasha', 'nicole', 'nina', 'nora',
  'olivia',
  'paige', 'pamela', 'patricia', 'patty', 'paula', 'peggy', 'penny', 'phoebe', 'phyllis',
  'rachel', 'rebecca', 'regina', 'renee', 'rita', 'roberta', 'robin', 'rosa', 'rose', 'rosemary', 'ruby', 'ruth',
  'sabrina', 'sally', 'samantha', 'sandra', 'sara', 'sarah', 'savannah', 'shannon', 'sharon', 'sheila', 'shelby', 'shelly', 'sherri', 'shirley', 'sierra', 'sonia', 'sophia', 'sophie', 'stacey', 'stacy', 'stella', 'stephanie', 'sue', 'susan', 'suzanne', 'sydney', 'sylvia',
  'tamara', 'tammy', 'tanya', 'tara', 'taylor', 'teresa', 'terri', 'theresa', 'tiffany', 'tina', 'tracy', 'tricia',
  'valerie', 'vanessa', 'veronica', 'vicki', 'vicky', 'victoria', 'violet', 'virginia', 'vivian',
  'wendy', 'whitney', 'wilma',
  'yolanda', 'yvonne',
  'zoe', 'zoey',
]);

// Determine gender from name (returns 'male' | 'female' | 'unknown')
function getGenderFromName(name: string): 'male' | 'female' | 'unknown' {
  // Extract first name (handle "Uncle Bob", "Aunt Sally", etc.)
  const parts = name.toLowerCase().trim().split(/\s+/);

  // Check each part for gender matches
  for (const part of parts) {
    if (MALE_NAMES.has(part)) return 'male';
    if (FEMALE_NAMES.has(part)) return 'female';
  }

  return 'unknown';
}

// Cache for name -> voice mapping to ensure consistency within a session
const voiceAssignments = new Map<string, string>();

// Simple hash function to get consistent index from name
function hashNameToIndex(name: string, arrayLength: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % arrayLength;
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
// Uses gender-based voice selection with consistent assignment per name
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

  // Check if we already assigned a voice to this name
  const cachedVoice = voiceAssignments.get(normalizedName);
  if (cachedVoice) {
    return {
      mode: 'predefined',
      voiceId: cachedVoice,
      exaggeration: 0.4,
    };
  }

  // Determine gender and select from appropriate voice pool
  const gender = getGenderFromName(name);

  let voicePool: string[];
  if (gender === 'male') {
    voicePool = MALE_VOICES;
  } else if (gender === 'female') {
    voicePool = FEMALE_VOICES;
  } else {
    // Unknown gender - use hash to pick from combined pool deterministically
    const allVoices = [...MALE_VOICES, ...FEMALE_VOICES];
    voicePool = allVoices;
  }

  // Use hash for consistent but varied voice selection
  const voiceIndex = hashNameToIndex(name, voicePool.length);
  const selectedVoice = voicePool[voiceIndex];

  // Cache the assignment for this session
  voiceAssignments.set(normalizedName, selectedVoice);

  console.log(`[VoiceConfig] ${name} -> ${gender} -> ${selectedVoice}`);

  return {
    mode: 'predefined',
    voiceId: selectedVoice,
    exaggeration: 0.4,
  };
}

// Announcer voice config (game show host style)
// Using "Michael" for a classic announcer feel
export const ANNOUNCER_CONFIG: VoiceConfig = {
  mode: 'predefined',
  voiceId: 'Michael.wav',
  exaggeration: 0.95, // Maximum game-show energy!
};

// TTS API endpoint
export const TTS_API_ENDPOINT = '/api/tts';

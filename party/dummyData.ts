// Dummy player names for testing
export const DUMMY_NAMES = [
  'Bot Alice',
  'Bot Bob',
  'Bot Charlie',
  'Bot Diana',
  'Bot Eddie',
  'Bot Fiona',
  'Bot George',
  'Bot Hannah',
];

// Generic funny answers for dummy players
export const DUMMY_ANSWERS = [
  "Grandma's secret recipe",
  "That time at the family BBQ",
  "Uncle Bob's famous dance moves",
  "The cousin nobody talks about",
  "Dad's bad jokes",
  "Mom's 'special' casserole",
  "The family dog",
  "Aunt Karen's unsolicited advice",
  "Grandpa's fishing stories",
  "The mystery meat from Thanksgiving",
  "That one vacation photo",
  "The WiFi password argument",
  "Who ate the last slice of pie",
  "The relatives who stay too long",
  "Dad falling asleep on the couch",
  "The kids table rebellion",
  "Grandma's plastic-covered furniture",
  "The annual family drama",
  "Someone's questionable life choices",
  "The casserole that never gets eaten",
];

// Get a random answer from the bank
export function getRandomDummyAnswer(): string {
  return DUMMY_ANSWERS[Math.floor(Math.random() * DUMMY_ANSWERS.length)];
}

// Get a dummy name by index
export function getDummyName(index: number): string {
  return DUMMY_NAMES[index % DUMMY_NAMES.length] || `Bot ${index + 1}`;
}

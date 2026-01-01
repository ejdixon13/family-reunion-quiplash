// Game phase states
export type GamePhase =
  | 'lobby'
  | 'category_select'
  | 'answering'
  | 'voting'
  | 'vote_results'
  | 'round_scores'
  | 'final_scores';

// Player information
export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isAudience: boolean;
  isConnected: boolean;
  isDummy?: boolean;
}

// Prompt from the database
export interface Prompt {
  id: string;
  category: string;
  prompt: string;
  context: {
    snippet: string;
    date: string;
    participants: string[];
  };
  imageUrl?: string;
  isImagePrompt?: boolean;
}

// Answer submitted by a player
export interface Answer {
  promptId: string;
  playerId: string;
  playerName: string;
  text: string;
  votes: number;
  voterIds: string[];
}

// Current voting round
export interface VotingRound {
  promptId: string;
  prompt: Prompt;
  answers: Answer[];  // 2 answers normally, all players' answers in final round
  votedPlayerIds: string[];
  isFinalRound?: boolean;
}

// Game configuration
export interface GameConfig {
  answerTimeSeconds: number;
  voteTimeSeconds: number;
  resultsTimeSeconds: number;
  minPlayers: number;
  maxActivePlayers: number;
  roundsPerGame: number;
}

// Full game state
export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  selectedCategories: string[];
  currentRound: number;
  totalRounds: number;
  currentPromptIndex: number;
  prompts: Prompt[];
  promptAssignments: Record<string, string[]>; // playerId -> promptIds
  answers: Answer[];
  currentVotingRound: VotingRound | null;
  timer: number;
  config: GameConfig;
}

// Client -> Server messages
export type ClientMessage =
  | { type: 'join'; playerName: string }
  | { type: 'select_categories'; categories: string[] }
  | { type: 'start_game' }
  | { type: 'submit_answer'; promptId: string; answer: string }
  | { type: 'submit_vote'; votedPlayerId: string }
  | { type: 'submit_multi_vote'; votes: Record<string, number> }
  | { type: 'next_prompt' }
  | { type: 'next_round' }
  | { type: 'restart_game' }
  | { type: 'ping' }
  | { type: 'add_dummy_players'; count: number };

// Server -> Client messages
export type ServerMessage =
  | { type: 'state_update'; state: GameState }
  | { type: 'your_prompts'; prompts: Prompt[] }
  | { type: 'timer_tick'; seconds: number }
  | { type: 'error'; message: string }
  | { type: 'pong' };

// Category from prompts.json
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Re-export types from party/types for client usage
export type {
  GameState,
  GamePhase,
  Player,
  Prompt,
  Answer,
  VotingRound,
  GameConfig,
  ClientMessage,
  ServerMessage,
  Category,
} from '../party/types';

// Client-side utility functions
export function getActivePlayers(players: import('../party/types').Player[]) {
  return players.filter((p) => !p.isAudience);
}

export function getAudiencePlayers(players: import('../party/types').Player[]) {
  return players.filter((p) => p.isAudience);
}

export function getConnectedPlayers(players: import('../party/types').Player[]) {
  return players.filter((p) => p.isConnected);
}

export function getPlayerById(players: import('../party/types').Player[], id: string) {
  return players.find((p) => p.id === id);
}

export function getSortedByScore(players: import('../party/types').Player[]) {
  return [...players].sort((a, b) => b.score - a.score);
}

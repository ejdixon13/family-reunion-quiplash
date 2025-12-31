'use client';

import type { Player } from '@/lib/gameState';

interface PlayerListProps {
  players: Player[];
  showScores?: boolean;
  currentPlayerId?: string | null;
}

export function PlayerList({ players, showScores = false, currentPlayerId }: PlayerListProps) {
  const activePlayers = players.filter((p) => !p.isAudience);
  const audienceCount = players.filter((p) => p.isAudience).length;

  const sortedPlayers = showScores
    ? [...activePlayers].sort((a, b) => b.score - a.score)
    : activePlayers;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              ${player.isConnected ? 'bg-white/20' : 'bg-white/10 opacity-50'}
              ${player.id === currentPlayerId ? 'ring-2 ring-yellow-400' : ''}
              ${player.isHost ? 'border-2 border-yellow-400/50' : ''}
            `}
          >
            {showScores && (
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${index === 0 ? 'bg-yellow-400 text-gray-900' :
                  index === 1 ? 'bg-gray-300 text-gray-900' :
                  index === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
              `}>
                {index + 1}
              </span>
            )}
            <span className={`font-medium ${player.isConnected ? 'text-white' : 'text-white/50'}`}>
              {player.name}
              {player.isHost && ' ★'}
            </span>
            {showScores && (
              <span className="text-yellow-400 font-bold">{player.score}</span>
            )}
            {!player.isConnected && (
              <span className="text-red-400 text-xs">(disconnected)</span>
            )}
          </div>
        ))}
      </div>

      {audienceCount > 0 && (
        <p className="text-center text-white/60 text-sm">
          + {audienceCount} audience member{audienceCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

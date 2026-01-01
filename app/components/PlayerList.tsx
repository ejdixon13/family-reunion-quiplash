'use client';

import { motion } from 'framer-motion';
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 justify-center">
        {sortedPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            className={`
              flex items-center gap-3 px-5 py-3 rounded-full font-body
              ${player.isConnected ? 'bg-white/15' : 'bg-white/5 opacity-50'}
              ${player.id === currentPlayerId ? 'ring-2 ring-quiplash-yellow shadow-lg shadow-yellow-500/20' : ''}
              ${player.isHost ? 'border-2 border-quiplash-yellow/50' : ''}
            `}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: index * 0.05,
              type: 'spring',
              damping: 15,
            }}
            layout
          >
            {showScores && (
              <motion.span
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-display
                  ${index === 0 ? 'bg-quiplash-yellow text-quiplash-blue shadow-lg shadow-yellow-500/30' :
                    index === 1 ? 'bg-gray-300 text-gray-900' :
                    index === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05, type: 'spring' }}
              >
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
              </motion.span>
            )}
            <span className={`font-semibold text-lg ${player.isConnected ? 'text-white' : 'text-white/50'}`}>
              {player.name}
              {player.isHost && <span className="text-quiplash-yellow ml-1">★</span>}
            </span>
            {showScores && (
              <motion.span
                className="text-quiplash-yellow font-display text-lg"
                key={player.score}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                {player.score}
              </motion.span>
            )}
            {!player.isConnected && (
              <span className="text-red-400 text-xs font-body">(away)</span>
            )}
          </motion.div>
        ))}
      </div>

      {audienceCount > 0 && (
        <motion.p
          className="text-center text-white/60 text-sm font-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          + {audienceCount} audience member{audienceCount !== 1 ? 's' : ''} 👀
        </motion.p>
      )}
    </div>
  );
}

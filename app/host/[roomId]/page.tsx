'use client';

import { useParams } from 'next/navigation';
import { usePartySocket } from '@/hooks/usePartySocket';
import { QRCodeDisplay } from '@/app/components/QRCodeDisplay';
import { CategoryPicker } from '@/app/components/CategoryPicker';
import { PlayerList } from '@/app/components/PlayerList';
import { Timer } from '@/app/components/Timer';
import { ContextReveal } from '@/app/components/ContextReveal';

export default function HostPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const {
    gameState,
    isConnected,
    error,
    selectCategories,
    startGame,
    nextPrompt,
    nextRound,
    restartGame,
  } = usePartySocket(roomId, { isHost: true });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-red-400 text-2xl">{error}</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading game...</div>
      </div>
    );
  }

  const activePlayers = gameState.players.filter((p) => !p.isAudience);
  const canStart =
    activePlayers.length >= gameState.config.minPlayers &&
    gameState.selectedCategories.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            Family Quiplash
          </h1>
          <p className="text-white/60 text-lg">Room: {roomId}</p>
        </div>

        {/* Lobby Phase */}
        {gameState.phase === 'lobby' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
            <div className="flex-shrink-0">
              <QRCodeDisplay
                roomId={roomId}
                playerCount={gameState.players.length}
              />
            </div>

            <div className="flex-1 space-y-6">
              <div className="bg-white/10 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Players</h2>
                <PlayerList players={gameState.players} />
                {activePlayers.length < gameState.config.minPlayers && (
                  <p className="text-yellow-400 text-center mt-4">
                    Need at least {gameState.config.minPlayers} players to start
                  </p>
                )}
              </div>

              <CategoryPicker
                selectedCategories={gameState.selectedCategories}
                onSelect={selectCategories}
                maxCategories={3}
              />

              <button
                onClick={startGame}
                disabled={!canStart}
                className={`
                  w-full py-4 rounded-xl text-xl font-bold transition-all
                  ${canStart
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'}
                `}
              >
                {!canStart
                  ? activePlayers.length < gameState.config.minPlayers
                    ? `Waiting for ${gameState.config.minPlayers - activePlayers.length} more player(s)...`
                    : 'Select at least one category'
                  : 'Start Game!'}
              </button>
            </div>
          </div>
        )}

        {/* Category Select Phase */}
        {gameState.phase === 'category_select' && (
          <div className="text-center space-y-6">
            <CategoryPicker
              selectedCategories={gameState.selectedCategories}
              onSelect={selectCategories}
              maxCategories={3}
            />
            <button
              onClick={startGame}
              disabled={gameState.selectedCategories.length === 0}
              className={`
                px-8 py-4 rounded-xl text-xl font-bold transition-all
                ${gameState.selectedCategories.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'}
              `}
            >
              Start Round {gameState.currentRound}
            </button>
          </div>
        )}

        {/* Answering Phase */}
        {gameState.phase === 'answering' && (
          <div className="text-center space-y-8">
            <div className="bg-white/10 rounded-2xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">
                Round {gameState.currentRound} of {gameState.totalRounds}
              </h2>
              <p className="text-white/80 text-xl mb-6">
                Players are answering their prompts...
              </p>
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Submissions</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {activePlayers.map((player) => {
                  const playerAnswers = gameState.answers.filter(
                    (a) => a.playerId === player.id
                  );
                  const assignedPrompts = gameState.promptAssignments[player.id] || [];
                  const submitted = playerAnswers.length;
                  const total = assignedPrompts.length;

                  return (
                    <div
                      key={player.id}
                      className={`
                        px-4 py-2 rounded-full flex items-center gap-2
                        ${submitted === total ? 'bg-green-500/30' : 'bg-white/20'}
                      `}
                    >
                      <span className="text-white font-medium">{player.name}</span>
                      <span className={`
                        text-sm px-2 py-0.5 rounded-full
                        ${submitted === total ? 'bg-green-500 text-white' : 'bg-white/30 text-white/80'}
                      `}>
                        {submitted}/{total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Voting Phase */}
        {gameState.phase === 'voting' && gameState.currentVotingRound && (
          <div className="text-center space-y-8">
            <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />

            <div className="bg-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">
                {gameState.currentVotingRound.prompt.prompt}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {gameState.currentVotingRound.answers.map((answer, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 rounded-xl p-6 transform hover:scale-105 transition-transform"
                  >
                    <p className="text-white text-2xl font-bold">{answer.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-white/60">
              {gameState.currentVotingRound.votedPlayerIds.length} of{' '}
              {activePlayers.length - 2} votes cast
            </div>
          </div>
        )}

        {/* Vote Results Phase */}
        {gameState.phase === 'vote_results' && gameState.currentVotingRound && (
          <div className="text-center space-y-8">
            <div className="bg-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">
                {gameState.currentVotingRound.prompt.prompt}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {gameState.currentVotingRound.answers
                  .sort((a, b) => b.votes - a.votes)
                  .map((answer, idx) => {
                    const totalVotes = gameState.currentVotingRound!.answers.reduce(
                      (sum, a) => sum + a.votes,
                      0
                    );
                    const isWinner = idx === 0 && answer.votes > 0;
                    const isQuiplash = isWinner && answer.votes === totalVotes && totalVotes > 0;

                    return (
                      <div
                        key={idx}
                        className={`
                          rounded-xl p-6 transition-all
                          ${isQuiplash
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse'
                            : isWinner
                            ? 'bg-green-500/30 ring-2 ring-green-400'
                            : 'bg-white/10'}
                        `}
                      >
                        {isQuiplash && (
                          <div className="text-4xl mb-2">QUIPLASH!</div>
                        )}
                        <p className={`text-2xl font-bold mb-3 ${isQuiplash ? 'text-gray-900' : 'text-white'}`}>
                          {answer.text}
                        </p>
                        <p className={`text-lg ${isQuiplash ? 'text-gray-800' : 'text-white/80'}`}>
                          - {answer.playerName}
                        </p>
                        <div className={`text-3xl font-bold mt-4 ${isQuiplash ? 'text-gray-900' : 'text-yellow-400'}`}>
                          {answer.votes} vote{answer.votes !== 1 ? 's' : ''}
                          <span className="text-lg ml-2">
                            (+{answer.votes * 100}{isQuiplash ? ' +250' : ''} pts)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Context Reveal */}
            <ContextReveal
              snippet={gameState.currentVotingRound.prompt.context.snippet}
              date={gameState.currentVotingRound.prompt.context.date}
              participants={gameState.currentVotingRound.prompt.context.participants}
            />

            <button
              onClick={nextPrompt}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xl font-bold hover:scale-105 transition-transform"
            >
              Next
            </button>
          </div>
        )}

        {/* Round Scores Phase */}
        {gameState.phase === 'round_scores' && (
          <div className="text-center space-y-8">
            <h2 className="text-4xl font-bold text-white">
              Round {gameState.currentRound} Complete!
            </h2>

            <div className="bg-white/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-6">Scoreboard</h3>
              <PlayerList players={gameState.players} showScores />
            </div>

            <button
              onClick={nextRound}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xl font-bold hover:scale-105 transition-transform"
            >
              {gameState.currentRound < gameState.totalRounds
                ? `Start Round ${gameState.currentRound + 1}`
                : 'See Final Scores'}
            </button>
          </div>
        )}

        {/* Final Scores Phase */}
        {gameState.phase === 'final_scores' && (
          <div className="text-center space-y-8">
            <h2 className="text-5xl font-bold text-white mb-2">Game Over!</h2>

            <div className="bg-white/10 rounded-2xl p-8">
              {(() => {
                const sortedPlayers = [...gameState.players]
                  .filter((p) => !p.isAudience)
                  .sort((a, b) => b.score - a.score);
                const winner = sortedPlayers[0];

                return (
                  <>
                    <div className="mb-8">
                      <div className="text-6xl mb-4">Crown</div>
                      <h3 className="text-4xl font-bold text-yellow-400">
                        {winner?.name}
                      </h3>
                      <p className="text-2xl text-white mt-2">
                        {winner?.score} points
                      </p>
                    </div>

                    <PlayerList players={gameState.players} showScores />
                  </>
                );
              })()}
            </div>

            <button
              onClick={restartGame}
              className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xl font-bold hover:scale-105 transition-transform"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

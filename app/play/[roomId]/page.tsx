'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePartySocket } from '@/hooks/usePartySocket';
import { Timer } from '@/app/components/Timer';
import { ContextReveal } from '@/app/components/ContextReveal';

export default function PlayerPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submittedPromptIds, setSubmittedPromptIds] = useState<Set<string>>(new Set());

  const {
    gameState,
    myPrompts,
    connectionId,
    isConnected,
    error,
    join,
    submitAnswer,
    submitVote,
  } = usePartySocket(roomId);

  // Get current player from game state
  const currentPlayer = gameState?.players.find((p) => p.id === connectionId);
  const isAudience = currentPlayer?.isAudience ?? false;

  // Handle joining
  const handleJoin = () => {
    if (playerName.trim()) {
      join(playerName.trim());
      setHasJoined(true);
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (myPrompts[currentPromptIndex] && answerText.trim()) {
      submitAnswer(myPrompts[currentPromptIndex].id, answerText.trim());
      setSubmittedPromptIds((prev) => new Set(prev).add(myPrompts[currentPromptIndex].id));
      setAnswerText('');
      if (currentPromptIndex < myPrompts.length - 1) {
        setCurrentPromptIndex(currentPromptIndex + 1);
      }
    }
  };

  // Reset prompts when new round starts
  useEffect(() => {
    if (gameState?.phase === 'answering') {
      setCurrentPromptIndex(0);
      setSubmittedPromptIds(new Set());
      setAnswerText('');
    }
  }, [gameState?.phase, gameState?.currentRound]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-white text-xl animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-red-400 text-xl text-center">{error}</div>
      </div>
    );
  }

  // Join screen
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-3xl font-bold text-white text-center mb-6">
            Join Game
          </h1>
          <p className="text-white/60 text-center mb-6">Room: {roomId}</p>

          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            autoFocus
            maxLength={20}
          />

          <button
            onClick={handleJoin}
            disabled={!playerName.trim()}
            className={`
              w-full mt-4 py-3 rounded-xl text-lg font-bold transition-all
              ${playerName.trim()
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:scale-105'
                : 'bg-white/20 text-white/50 cursor-not-allowed'}
            `}
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  // Lobby - waiting for game to start
  if (gameState.phase === 'lobby' || gameState.phase === 'category_select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">Party</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Welcome, {currentPlayer?.name}!
          </h2>
          {isAudience ? (
            <p className="text-yellow-400 text-lg">
              You&apos;re in the audience! You&apos;ll vote on answers.
            </p>
          ) : (
            <p className="text-white/60 text-lg">
              Waiting for the host to start the game...
            </p>
          )}
          <div className="mt-8 text-white/40 text-sm">
            {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''} connected
          </div>
        </div>
      </div>
    );
  }

  // Answering phase
  if (gameState.phase === 'answering') {
    // Audience just watches
    if (isAudience) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="text-center">
            <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            <p className="text-white/60 text-lg mt-4">
              Players are answering their prompts...
            </p>
          </div>
        </div>
      );
    }

    const allSubmitted = myPrompts.every((p) => submittedPromptIds.has(p.id));
    const currentPrompt = myPrompts[currentPromptIndex];

    if (allSubmitted || !currentPrompt) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-6xl mb-4">Check</div>
            <h2 className="text-2xl font-bold text-white mb-4">All done!</h2>
            <p className="text-white/60">Waiting for other players...</p>
            <div className="mt-6">
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 flex flex-col">
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
          <span className="text-white/60 text-sm">
            {currentPromptIndex + 1} of {myPrompts.length}
          </span>
          <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="bg-white/10 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-yellow-400 text-center">
              {currentPrompt.prompt}
            </h2>
          </div>

          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Type your answer..."
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 text-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            rows={3}
            maxLength={100}
            autoFocus
          />

          <button
            onClick={handleSubmitAnswer}
            disabled={!answerText.trim()}
            className={`
              w-full mt-4 py-4 rounded-xl text-lg font-bold transition-all
              ${answerText.trim()
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105'
                : 'bg-white/20 text-white/50 cursor-not-allowed'}
            `}
          >
            Submit Answer
          </button>
        </div>
      </div>
    );
  }

  // Voting phase
  if (gameState.phase === 'voting' && gameState.currentVotingRound) {
    const votingRound = gameState.currentVotingRound;
    const hasVoted = votingRound.votedPlayerIds.includes(connectionId!);
    const isAuthor = votingRound.answers.some((a) => a.playerId === connectionId);

    if (isAuthor) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="text-center">
            <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
            <p className="text-white text-lg mt-4">
              This is your prompt! Others are voting...
            </p>
          </div>
        </div>
      );
    }

    if (hasVoted) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-6xl mb-4">Voting</div>
            <h2 className="text-2xl font-bold text-white mb-4">Vote cast!</h2>
            <p className="text-white/60">Waiting for others...</p>
            <div className="mt-6">
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 flex flex-col">
        <div className="flex-shrink-0 mb-4">
          <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
        </div>

        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-bold text-yellow-400 text-center">
            {votingRound.prompt.prompt}
          </h2>
        </div>

        <div className="flex-1 flex flex-col gap-4 justify-center">
          {votingRound.answers.map((answer, idx) => (
            <button
              key={idx}
              onClick={() => submitVote(answer.playerId)}
              className="w-full p-6 bg-white/10 rounded-xl text-white text-lg font-bold hover:bg-white/20 hover:scale-105 transition-all active:scale-95"
            >
              {answer.text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Vote results phase
  if (gameState.phase === 'vote_results' && gameState.currentVotingRound) {
    const votingRound = gameState.currentVotingRound;
    const myAnswer = votingRound.answers.find((a) => a.playerId === connectionId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold text-yellow-400 text-center">
            {votingRound.prompt.prompt}
          </h2>

          {votingRound.answers
            .sort((a, b) => b.votes - a.votes)
            .map((answer, idx) => {
              const isWinner = idx === 0 && answer.votes > 0;
              const isMine = answer.playerId === connectionId;

              return (
                <div
                  key={idx}
                  className={`
                    p-4 rounded-xl
                    ${isWinner ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/10'}
                    ${isMine ? 'ring-2 ring-yellow-400' : ''}
                  `}
                >
                  <p className="text-white font-bold">{answer.text}</p>
                  <p className="text-white/60 text-sm mt-1">- {answer.playerName}</p>
                  <p className="text-yellow-400 font-bold mt-2">
                    {answer.votes} vote{answer.votes !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}

          <ContextReveal
            snippet={votingRound.prompt.context.snippet}
            date={votingRound.prompt.context.date}
            participants={votingRound.prompt.context.participants}
          />
        </div>
      </div>
    );
  }

  // Round scores phase
  if (gameState.phase === 'round_scores') {
    const sortedPlayers = [...gameState.players]
      .filter((p) => !p.isAudience)
      .sort((a, b) => b.score - a.score);

    const myRank = sortedPlayers.findIndex((p) => p.id === connectionId) + 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-white mb-6">
          Round {gameState.currentRound} Complete!
        </h2>

        <div className="text-center mb-6">
          <p className="text-white/60">Your rank</p>
          <p className="text-5xl font-bold text-yellow-400">#{myRank}</p>
          <p className="text-white text-xl mt-2">{currentPlayer?.score} pts</p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          {sortedPlayers.slice(0, 5).map((player, idx) => (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${player.id === connectionId ? 'bg-yellow-400/20 ring-1 ring-yellow-400' : 'bg-white/10'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${idx === 0 ? 'bg-yellow-400 text-gray-900' :
                    idx === 1 ? 'bg-gray-300 text-gray-900' :
                    idx === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
                `}>
                  {idx + 1}
                </span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-yellow-400 font-bold">{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Final scores phase
  if (gameState.phase === 'final_scores') {
    const sortedPlayers = [...gameState.players]
      .filter((p) => !p.isAudience)
      .sort((a, b) => b.score - a.score);

    const winner = sortedPlayers[0];
    const isWinner = winner?.id === connectionId;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-white mb-6">Game Over!</h2>

        {isWinner ? (
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">Trophy</div>
            <p className="text-2xl font-bold text-yellow-400">You won!</p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <p className="text-xl text-white/60">Winner:</p>
            <p className="text-2xl font-bold text-yellow-400">{winner?.name}</p>
          </div>
        )}

        <div className="w-full max-w-sm space-y-2">
          {sortedPlayers.map((player, idx) => (
            <div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg
                ${player.id === connectionId ? 'bg-yellow-400/20 ring-1 ring-yellow-400' : 'bg-white/10'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${idx === 0 ? 'bg-yellow-400 text-gray-900' :
                    idx === 1 ? 'bg-gray-300 text-gray-900' :
                    idx === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
                `}>
                  {idx + 1}
                </span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-yellow-400 font-bold">{player.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="text-white text-xl">Loading game state...</div>
    </div>
  );
}

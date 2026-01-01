'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePartySocket } from '@/hooks/usePartySocket';
import { Timer } from '@/app/components/Timer';

// Join form component - shown before connecting to socket
function JoinForm({
  initialRoomId,
  onJoin,
}: {
  initialRoomId: string;
  onJoin: (roomId: string, playerName: string) => void;
}) {
  const [roomCode, setRoomCode] = useState(initialRoomId);
  const [playerName, setPlayerName] = useState('');

  const handleSubmit = () => {
    if (roomCode.trim() && playerName.trim()) {
      onJoin(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  const canJoin = roomCode.trim().length > 0 && playerName.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        className="glass-card p-8 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
      >
        <motion.h1
          className="quiplash-title text-4xl text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Join Game
        </motion.h1>

        {/* Room Code Field */}
        <motion.div
          className="mb-4"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-white/60 text-sm font-body mb-2">
            Room Code
          </label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && canJoin && handleSubmit()}
            placeholder="ABCD"
            className="w-full px-4 py-3 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/50 text-xl font-display text-center tracking-widest focus:outline-none focus:border-quiplash-yellow focus:ring-2 focus:ring-quiplash-yellow/50 uppercase"
            maxLength={10}
          />
        </motion.div>

        {/* Player Name Field */}
        <motion.div
          className="mb-6"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-white/60 text-sm font-body mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canJoin && handleSubmit()}
            placeholder="Enter your name"
            className="w-full px-4 py-3 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/50 text-lg font-body focus:outline-none focus:border-quiplash-yellow focus:ring-2 focus:ring-quiplash-yellow/50"
            autoFocus
            maxLength={20}
          />
        </motion.div>

        <motion.button
          onClick={handleSubmit}
          disabled={!canJoin}
          className={`
            w-full py-4 rounded-xl text-lg font-display transition-all
            ${canJoin
              ? 'bg-gradient-to-r from-quiplash-yellow to-yellow-500 text-quiplash-blue shadow-lg shadow-yellow-500/30'
              : 'bg-white/20 text-white/50 cursor-not-allowed'}
          `}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={canJoin ? { scale: 1.02 } : {}}
          whileTap={canJoin ? { scale: 0.98 } : {}}
        >
          Join Game
        </motion.button>
      </motion.div>
    </div>
  );
}

// Game component - only rendered after joining (connects to socket)
function GameView({
  roomId,
  playerName,
  onLeave,
}: {
  roomId: string;
  playerName: string;
  onLeave: () => void;
}) {
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [submittedPromptIds, setSubmittedPromptIds] = useState<Set<string>>(new Set());
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [voteAllocation, setVoteAllocation] = useState<Record<string, number>>({});

  const {
    gameState,
    myPrompts,
    connectionId,
    isConnected,
    error,
    join,
    submitAnswer,
    submitVote,
    submitMultiVote,
  } = usePartySocket(roomId);

  // Get current player from game state
  const currentPlayer = gameState?.players.find((p) => p.id === connectionId);
  const isAudience = currentPlayer?.isAudience ?? false;

  // Auto-join once connected
  useEffect(() => {
    if (isConnected && !hasJoinedRoom) {
      join(playerName);
      setHasJoinedRoom(true);
    }
  }, [isConnected, hasJoinedRoom, join, playerName]);

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

  // Handle vote with animation (single vote mode)
  const handleVote = (playerId: string) => {
    setSelectedVote(playerId);
    setTimeout(() => {
      submitVote(playerId);
    }, 300);
  };

  // Handle multi-vote (tap to add, max 1 per answer)
  const handleMultiVote = (playerId: string) => {
    const totalVotesUsed = Object.values(voteAllocation).reduce((a, b) => a + b, 0);
    if (totalVotesUsed >= 3) return;

    // Can't vote for own answer
    if (playerId === connectionId) return;

    // Max 1 vote per answer
    if (voteAllocation[playerId] >= 1) return;

    setVoteAllocation(prev => ({
      ...prev,
      [playerId]: 1
    }));
  };

  // Reset prompts when new round starts
  useEffect(() => {
    if (gameState?.phase === 'answering') {
      setCurrentPromptIndex(0);
      setSubmittedPromptIds(new Set());
      setAnswerText('');
    }
  }, [gameState?.phase, gameState?.currentRound]);

  // Reset vote selection when voting round changes
  useEffect(() => {
    setSelectedVote(null);
    setVoteAllocation({});
  }, [gameState?.currentVotingRound?.promptId]);

  // Auto-submit multi-vote when all 3 votes placed
  const totalVotesUsed = Object.values(voteAllocation).reduce((a, b) => a + b, 0);
  useEffect(() => {
    if (gameState?.currentVotingRound?.isFinalRound && totalVotesUsed === 3) {
      submitMultiVote(voteAllocation);
    }
  }, [totalVotesUsed, gameState?.currentVotingRound?.isFinalRound, voteAllocation, submitMultiVote]);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-white text-xl font-display animate-pulse mb-4">Connecting to {roomId}...</div>
          <button
            onClick={onLeave}
            className="text-white/60 text-sm font-body hover:text-white underline"
          >
            Back to join screen
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-400 text-xl font-display mb-4">{error}</div>
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-white/20 text-white rounded-lg font-body hover:bg-white/30 transition-colors"
          >
            Try Different Room
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-white text-xl font-display animate-pulse">Loading...</div>
      </div>
    );
  }

  // Lobby - waiting for game to start
  if (gameState.phase === 'lobby' || gameState.phase === 'category_select') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <motion.div
            className="text-7xl mb-4"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-display text-quiplash-yellow mb-4">
            Welcome, {currentPlayer?.name}!
          </h2>
          {isAudience ? (
            <p className="text-quiplash-pink text-lg font-body">
              You&apos;re in the audience! You&apos;ll vote on answers.
            </p>
          ) : (
            <motion.p
              className="text-white/60 text-lg font-body"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              Waiting for the host to start...
            </motion.p>
          )}
          <div className="mt-8 text-white/40 text-sm font-body">
            Room: {roomId} • {gameState.players.length} player{gameState.players.length !== 1 ? 's' : ''} connected
          </div>
        </motion.div>
      </div>
    );
  }

  // Answering phase
  if (gameState.phase === 'answering') {
    // Audience just watches
    if (isAudience) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            <p className="text-white/60 text-lg mt-4 font-body">
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
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
          >
            <motion.div
              className="text-7xl mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 360] }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              ✅
            </motion.div>
            <h2 className="text-3xl font-display text-quiplash-yellow mb-4">All done!</h2>
            <p className="text-white/60 font-body">Waiting for other players...</p>
            <div className="mt-6">
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4 flex flex-col">
        <motion.div
          className="flex-shrink-0 flex justify-between items-center mb-4"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className="text-white/60 text-sm font-body px-3 py-1 bg-white/10 rounded-full">
            {currentPromptIndex + 1} of {myPrompts.length}
          </span>
          <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
        </motion.div>

        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            className="glass-card p-6 mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
            key={currentPrompt.id}
          >
            {currentPrompt.isImagePrompt && currentPrompt.imageUrl && (
              <div className="mb-4">
                <img
                  src={currentPrompt.imageUrl}
                  alt="Caption this"
                  className="max-h-48 mx-auto rounded-lg shadow-lg"
                />
              </div>
            )}
            <h2 className="text-xl font-display text-quiplash-yellow text-center">
              {currentPrompt.prompt}
            </h2>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-4 py-4 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/50 text-lg font-body focus:outline-none focus:border-quiplash-yellow focus:ring-2 focus:ring-quiplash-yellow/50 resize-none"
              rows={3}
              maxLength={100}
              autoFocus
            />
            <div className="flex justify-end mt-1">
              <span className={`text-sm font-body ${answerText.length > 80 ? 'text-orange-400' : 'text-white/40'}`}>
                {answerText.length}/100
              </span>
            </div>
          </motion.div>

          <motion.button
            onClick={handleSubmitAnswer}
            disabled={!answerText.trim()}
            className={`
              w-full mt-4 py-4 rounded-xl text-lg font-display transition-all
              ${answerText.trim()
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                : 'bg-white/20 text-white/50 cursor-not-allowed'}
            `}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={answerText.trim() ? { scale: 1.02 } : {}}
            whileTap={answerText.trim() ? { scale: 0.98 } : {}}
          >
            Submit Answer
          </motion.button>
        </div>
      </div>
    );
  }

  // Voting phase
  if (gameState.phase === 'voting' && gameState.currentVotingRound) {
    const votingRound = gameState.currentVotingRound;
    const hasVoted = votingRound.votedPlayerIds.includes(connectionId!);
    const isAuthor = votingRound.answers.some((a) => a.playerId === connectionId);
    const isFinalRound = votingRound.isFinalRound;

    // In normal rounds, authors can't vote. In final round, everyone votes.
    if (isAuthor && !isFinalRound) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-6xl mb-4"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🤞
            </motion.div>
            <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
            <p className="text-white text-lg mt-4 font-body">
              This is your prompt! Others are voting...
            </p>
          </motion.div>
        </div>
      );
    }

    if (hasVoted) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div
            className="text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
          >
            <motion.div
              className="text-7xl mb-4"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              🗳️
            </motion.div>
            <h2 className="text-3xl font-display text-quiplash-yellow mb-4">Vote cast!</h2>
            <p className="text-white/60 font-body">Waiting for others...</p>
            <div className="mt-6">
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
            </div>
          </motion.div>
        </div>
      );
    }

    const votesRemaining = 3 - totalVotesUsed;

    return (
      <div className="min-h-screen p-4 flex flex-col">
        <motion.div
          className="flex-shrink-0 mb-4 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />
        </motion.div>

        <motion.div
          className="glass-card p-4 mb-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {votingRound.prompt.isImagePrompt && votingRound.prompt.imageUrl && (
            <div className="mb-4">
              <img
                src={votingRound.prompt.imageUrl}
                alt="Caption this"
                className="max-h-40 mx-auto rounded-lg shadow-lg"
              />
            </div>
          )}
          <h2 className="text-lg font-display text-quiplash-yellow text-center">
            {votingRound.prompt.prompt}
          </h2>
        </motion.div>

        {/* Multi-vote indicator */}
        {isFinalRound && (
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-white/80 font-display text-lg">
              Votes remaining: <span className="text-quiplash-yellow">{votesRemaining}</span>
            </span>
          </motion.div>
        )}

        <div className="flex-1 flex flex-col gap-4 justify-center overflow-y-auto">
          <AnimatePresence>
            {votingRound.answers.map((answer, idx) => {
              const myVotes = voteAllocation[answer.playerId] || 0;
              const isOwnAnswer = answer.playerId === connectionId;
              const alreadyVoted = myVotes >= 1;
              const isDisabled = isFinalRound
                ? (totalVotesUsed >= 3 || isOwnAnswer || alreadyVoted)
                : selectedVote !== null;

              return (
                <motion.button
                  key={idx}
                  onClick={() => isFinalRound ? handleMultiVote(answer.playerId) : handleVote(answer.playerId)}
                  disabled={isDisabled}
                  className={`
                    w-full p-6 rounded-xl text-white text-xl font-display transition-all relative
                    ${isOwnAnswer
                      ? 'bg-white/5 opacity-50 cursor-not-allowed border-2 border-dashed border-white/20'
                      : !isFinalRound && selectedVote === answer.playerId
                      ? 'bg-gradient-to-r from-quiplash-yellow to-yellow-500 text-quiplash-blue scale-105'
                      : !isFinalRound && selectedVote !== null
                      ? 'bg-white/5 opacity-50'
                      : isFinalRound && myVotes > 0
                      ? 'bg-gradient-to-r from-quiplash-yellow/30 to-yellow-500/30 border-2 border-quiplash-yellow'
                      : 'bg-white/10 hover:bg-white/20 active:scale-95'}
                  `}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05, type: 'spring' }}
                  whileHover={!isDisabled ? { scale: 1.02 } : {}}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                >
                  {answer.text}
                  {/* Your answer indicator */}
                  {isOwnAnswer && (
                    <span className="absolute top-2 left-2 text-xs text-white/40 font-body">
                      (yours)
                    </span>
                  )}
                  {/* Vote badge for multi-vote */}
                  {isFinalRound && myVotes > 0 && (
                    <span className="absolute top-2 right-2 bg-quiplash-yellow text-quiplash-blue w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold">
                      ✓
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Vote results phase
  if (gameState.phase === 'vote_results' && gameState.currentVotingRound) {
    const votingRound = gameState.currentVotingRound;
    const totalVotes = votingRound.answers.reduce((sum, a) => sum + a.votes, 0);

    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <motion.div
          className="w-full max-w-md space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {votingRound.prompt.isImagePrompt && votingRound.prompt.imageUrl && (
            <motion.div
              className="mb-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <img
                src={votingRound.prompt.imageUrl}
                alt="Caption this"
                className="max-h-32 mx-auto rounded-lg shadow-lg"
              />
            </motion.div>
          )}

          <motion.h2
            className="text-xl font-display text-quiplash-yellow text-center mb-6"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {votingRound.prompt.prompt}
          </motion.h2>

          {votingRound.answers
            .sort((a, b) => b.votes - a.votes)
            .map((answer, idx) => {
              const isWinner = idx === 0 && answer.votes > 0;
              const isMine = answer.playerId === connectionId;
              const isQuiplash = isWinner && answer.votes === totalVotes && totalVotes > 0;

              return (
                <motion.div
                  key={idx}
                  className={`
                    p-4 rounded-xl
                    ${isQuiplash
                      ? 'winner-card'
                      : isWinner
                      ? 'bg-green-500/30 ring-2 ring-green-400'
                      : 'bg-white/10'}
                    ${isMine && !isQuiplash ? 'ring-2 ring-quiplash-yellow' : ''}
                  `}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: isWinner ? 1.02 : 1, opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15, type: 'spring' }}
                >
                  {isQuiplash && (
                    <motion.div
                      className="text-2xl font-display text-quiplash-blue text-center mb-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                    >
                      QUIPLASH!
                    </motion.div>
                  )}
                  <p className={`font-display text-lg ${isQuiplash ? 'text-quiplash-blue' : 'text-white'}`}>
                    {answer.text}
                  </p>
                  <p className={`text-sm mt-1 font-body ${isQuiplash ? 'text-quiplash-blue/70' : 'text-white/60'}`}>
                    - {answer.playerName} {isMine && '(you)'}
                  </p>
                  <motion.p
                    className={`font-display mt-2 ${isQuiplash ? 'text-quiplash-blue' : 'text-quiplash-yellow'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.15 }}
                  >
                    {answer.votes} vote{answer.votes !== 1 ? 's' : ''}
                    <span className="text-sm ml-1">
                      (+{answer.votes * (gameState.currentRound === 3 ? 200 : 100)}{isQuiplash ? ' +250' : ''})
                    </span>
                  </motion.p>
                </motion.div>
              );
            })}
        </motion.div>
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
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <motion.h2
          className="quiplash-title text-3xl mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          Round {gameState.currentRound} Complete!
        </motion.h2>

        <motion.div
          className="text-center mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-white/60 font-body">Your rank</p>
          <motion.p
            className="text-6xl font-display text-quiplash-yellow"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            #{myRank}
          </motion.p>
          <p className="text-white text-xl mt-2 font-display">{currentPlayer?.score} pts</p>
        </motion.div>

        <motion.div
          className="w-full max-w-sm space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {sortedPlayers.slice(0, 5).map((player, idx) => (
            <motion.div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg font-body
                ${player.id === connectionId ? 'bg-quiplash-yellow/20 ring-2 ring-quiplash-yellow' : 'bg-white/10'}
              `}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-sm font-display
                  ${idx === 0 ? 'bg-quiplash-yellow text-quiplash-blue' :
                    idx === 1 ? 'bg-gray-300 text-gray-900' :
                    idx === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
                `}>
                  {idx + 1}
                </span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-quiplash-yellow font-display">{player.score}</span>
            </motion.div>
          ))}
        </motion.div>
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
      <div className="min-h-screen p-4 flex flex-col items-center justify-center">
        <motion.h2
          className="quiplash-title text-4xl mb-6"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          Game Over!
        </motion.h2>

        {isWinner ? (
          <motion.div
            className="text-center mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <motion.div
              className="text-8xl mb-4"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              🏆
            </motion.div>
            <p className="text-3xl font-display text-quiplash-yellow">You won!</p>
          </motion.div>
        ) : (
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div className="text-6xl mb-4">👑</motion.div>
            <p className="text-xl text-white/60 font-body">Winner:</p>
            <p className="text-2xl font-display text-quiplash-yellow">{winner?.name}</p>
          </motion.div>
        )}

        <motion.div
          className="w-full max-w-sm space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {sortedPlayers.map((player, idx) => (
            <motion.div
              key={player.id}
              className={`
                flex items-center justify-between p-3 rounded-lg font-body
                ${player.id === connectionId ? 'bg-quiplash-yellow/20 ring-2 ring-quiplash-yellow' : 'bg-white/10'}
              `}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 + idx * 0.05 }}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-sm font-display
                  ${idx === 0 ? 'bg-quiplash-yellow text-quiplash-blue' :
                    idx === 1 ? 'bg-gray-300 text-gray-900' :
                    idx === 2 ? 'bg-orange-400 text-gray-900' : 'bg-white/20 text-white'}
                `}>
                  {idx + 1}
                </span>
                <span className="text-white font-medium">{player.name}</span>
              </div>
              <span className="text-quiplash-yellow font-display">{player.score}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-white text-xl font-display">Loading game state...</div>
    </div>
  );
}

// Main page component - orchestrates join form vs game view
export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const initialRoomId = (params.roomId as string) || '';

  const [joinState, setJoinState] = useState<{
    roomId: string;
    playerName: string;
  } | null>(null);

  const handleJoin = (roomId: string, playerName: string) => {
    // Update URL if room code changed
    if (roomId !== initialRoomId) {
      router.replace(`/play/${roomId}`);
    }
    setJoinState({ roomId, playerName });
  };

  const handleLeave = () => {
    setJoinState(null);
  };

  // Show join form until user confirms
  if (!joinState) {
    return <JoinForm initialRoomId={initialRoomId} onJoin={handleJoin} />;
  }

  // Show game view after joining
  return (
    <GameView
      roomId={joinState.roomId}
      playerName={joinState.playerName}
      onLeave={handleLeave}
    />
  );
}

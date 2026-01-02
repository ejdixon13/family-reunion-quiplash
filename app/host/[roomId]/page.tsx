'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePartySocket } from '@/hooks/usePartySocket';
import { useTTS } from '@/hooks/useTTS';
import { useTTSPreload } from '@/hooks/useTTSPreload';
import { useAudio, getMusicForPhase } from '@/hooks/useAudio';
import { QRCodeDisplay } from '@/app/components/QRCodeDisplay';
import { CategoryPicker } from '@/app/components/CategoryPicker';
import { PlayerList } from '@/app/components/PlayerList';
import { Timer } from '@/app/components/Timer';
import { ContextRevealOverlay } from '@/app/components/ContextRevealOverlay';

export default function HostPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [showContextOverlay, setShowContextOverlay] = useState(false);
  const [showVotingIntro, setShowVotingIntro] = useState(false);
  const [showVotingContent, setShowVotingContent] = useState(false);
  const previousPromptId = useRef<string | null>(null);
  const announcedPromptId = useRef<string | null>(null);
  const votingIntroPromptId = useRef<string | null>(null);

  const tts = useTTS();
  const ttsPreload = useTTSPreload();
  const audio = useAudio();

  const {
    gameState,
    isConnected,
    error,
    sendMessage,
    selectCategories,
    startGame,
    nextPrompt,
    nextRound,
    restartGame,
  } = usePartySocket(roomId, { isHost: true });

  // Dev panel keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        if (process.env.NODE_ENV === 'development') {
          e.preventDefault();
          setShowDevPanel((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track previous phase for transition sound effects
  const previousPhaseRef = useRef<string | null>(null);

  // Play background music based on game phase
  useEffect(() => {
    if (!gameState?.phase) return;

    const currentPhase = gameState.phase;
    const prevPhase = previousPhaseRef.current;
    previousPhaseRef.current = currentPhase;

    // Get appropriate music for current phase
    const track = getMusicForPhase(currentPhase);
    if (track) {
      audio.playMusic(track);
    }

    // Play sound effects on phase transitions
    if (prevPhase && prevPhase !== currentPhase) {
      switch (currentPhase) {
        case 'answering':
          // Game starting - play intro fanfare
          if (prevPhase === 'lobby' || prevPhase === 'category_select') {
            audio.playSfx('intro');
          }
          break;
        case 'voting':
          // Voting phase starting
          audio.playSfx('suspense');
          break;
        case 'vote_results':
          // Results revealed
          audio.playSfx('reveal');
          break;
        case 'round_scores':
          // Round complete
          audio.playSfx('positive');
          break;
        case 'final_scores':
          // Game over - big fanfare
          audio.playSfx('fanfare');
          break;
      }
    }
  }, [gameState?.phase, audio]);

  // Start preloading TTS when entering lobby (if TTS enabled)
  useEffect(() => {
    if (gameState?.phase === 'lobby' && tts.isEnabled) {
      ttsPreload.startPreloading();
    }
  }, [gameState?.phase, tts.isEnabled, ttsPreload]);

  // Pre-fetch ALL conversation TTS during answering phase (before voting starts)
  // This gives maximum time for TTS generation to complete
  const prefetchedPromptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Start prefetching when we enter answering phase
    if (gameState?.phase === 'answering' && gameState.prompts.length > 0 && tts.isEnabled) {
      console.log(`[TTS Prefetch] Answering phase started - prefetching ${gameState.prompts.length} conversations`);

      // Prefetch all prompts that we haven't already prefetched
      for (const prompt of gameState.prompts) {
        if (prefetchedPromptsRef.current.has(prompt.id)) {
          continue; // Already prefetched
        }

        prefetchedPromptsRef.current.add(prompt.id);

        // Parse conversation from snippet
        const snippet = prompt.context.snippet;
        const lines = snippet.split('\n').filter((line: string) => line.trim());
        const messages = lines
          .map((line: string) => {
            const match = line.match(/^(.+?):\s*(.+)$/);
            if (match) {
              return { sender: match[1], message: match[2] };
            }
            return null;
          })
          .filter((msg: { sender: string; message: string } | null): msg is { sender: string; message: string } => msg !== null);

        // Start pre-fetching in background (don't await - let them run in parallel)
        ttsPreload.prefetchConversation(prompt.id, messages);
      }
    }

    // Clear prefetch tracking when returning to lobby (new game)
    if (gameState?.phase === 'lobby') {
      prefetchedPromptsRef.current.clear();
    }
  }, [gameState?.phase, gameState?.prompts, tts.isEnabled, ttsPreload]);

  // Voting intro animation and announcement
  useEffect(() => {
    const promptId = gameState?.currentVotingRound?.promptId;

    if (gameState?.phase === 'voting' && promptId) {
      // Check if this is a new voting round
      if (promptId !== votingIntroPromptId.current) {
        votingIntroPromptId.current = promptId;

        // Show intro, hide content
        setShowVotingIntro(true);
        setShowVotingContent(false);

        // Play "voting time" announcement
        if (tts.isEnabled) {
          ttsPreload.playAnnouncement('votingStart');
        }

        // After 2.5 seconds, hide intro and show content
        const timer = setTimeout(() => {
          setShowVotingIntro(false);
          setShowVotingContent(true);
        }, 2500);

        return () => clearTimeout(timer);
      }
    } else if (gameState?.phase !== 'voting') {
      // Reset when leaving voting phase
      setShowVotingIntro(false);
      setShowVotingContent(false);
      votingIntroPromptId.current = null;
    }
  }, [gameState?.phase, gameState?.currentVotingRound?.promptId, tts.isEnabled, ttsPreload]);

  // Callback to play pre-fetched conversation
  const handleSpeakDialogue = useCallback(
    async (messages: Array<{ sender: string; message: string }>, delayMs = 150) => {
      const promptId = gameState?.currentVotingRound?.promptId;

      if (promptId && ttsPreload.isConversationReady(promptId)) {
        // Use pre-fetched audio
        await ttsPreload.playConversation(promptId, delayMs);
      } else {
        // Fall back to on-demand generation
        await tts.speakDialogue(messages, delayMs);
      }
    },
    [gameState?.currentVotingRound?.promptId, ttsPreload, tts]
  );

  // Sound effects for vote results (Quiplash bonus sound)
  useEffect(() => {
    const currentPromptId = gameState?.currentVotingRound?.promptId;
    const votingRound = gameState?.currentVotingRound;

    if (gameState?.phase === 'vote_results' && votingRound && currentPromptId) {
      // Only trigger once per prompt
      if (currentPromptId !== announcedPromptId.current) {
        announcedPromptId.current = currentPromptId;

        // Check for Quiplash (all votes to one answer)
        const sortedAnswers = [...votingRound.answers].sort((a, b) => b.votes - a.votes);
        const winner = sortedAnswers[0];
        const totalVotes = votingRound.answers.reduce((sum, a) => sum + a.votes, 0);
        const isQuiplash = winner && winner.votes === totalVotes && totalVotes > 0;

        // Play fanfare for Quiplash after a short delay
        if (isQuiplash) {
          setTimeout(() => {
            audio.playSfx('fanfare');
          }, 500);
        }
      }
    } else if (gameState?.phase !== 'vote_results') {
      announcedPromptId.current = null;
    }
  }, [gameState?.phase, gameState?.currentVotingRound, audio]);

  // Context reveal timing - show after results and Quiplash announcement
  // Votes reveal at ~1s, Quiplash at ~0.5s, so wait 4s total to let it sink in
  useEffect(() => {
    const currentPromptId = gameState?.currentVotingRound?.promptId;

    if (gameState?.phase === 'vote_results' && currentPromptId) {
      // Only trigger if this is a new prompt (not returning to same results)
      if (currentPromptId !== previousPromptId.current) {
        previousPromptId.current = currentPromptId;
        setShowContextOverlay(false);

        const timer = setTimeout(() => {
          setShowContextOverlay(true);
        }, 4000); // 4 seconds after results to show conversation

        return () => clearTimeout(timer);
      }
    } else if (gameState?.phase !== 'vote_results') {
      setShowContextOverlay(false);
      previousPromptId.current = null;
    }
  }, [gameState?.phase, gameState?.currentVotingRound?.promptId]);

  const handleContextDismiss = () => {
    setShowContextOverlay(false);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl font-display animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400 text-2xl font-display">{error}</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-2xl font-display animate-pulse">Loading game...</div>
      </div>
    );
  }

  const activePlayers = gameState.players.filter((p) => !p.isAudience);
  const canStart =
    activePlayers.length >= gameState.config.minPlayers &&
    gameState.selectedCategories.length > 0;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="quiplash-title text-6xl font-bold mb-2">
            Family Quiplash
          </h1>
          <p className="text-white/60 text-lg font-body">Room: {roomId}</p>

          {/* Audio Controls */}
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => audio.playSfx('fanfare')}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all bg-purple-500/80 hover:bg-purple-500 text-white hover:scale-105"
              >
                🎵 Test Sound
              </button>
              <button
                onClick={() => audio.setMuted(!audio.isMuted)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                  !audio.isMuted
                    ? 'bg-green-500/80 hover:bg-green-500 text-white'
                    : 'bg-red-500/80 hover:bg-red-500 text-white'
                }`}
              >
                {!audio.isMuted ? '🔊 Sound On' : '🔇 Sound Off'}
              </button>
            </div>
            {audio.currentTrack && (
              <p className="text-white/50 text-xs">Now playing: {audio.currentTrack} music</p>
            )}
          </div>
        </motion.div>

        {/* Lobby Phase */}
        {gameState.phase === 'lobby' && (
          <motion.div
            className="flex flex-col lg:flex-row gap-8 items-start justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="flex-shrink-0"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              <QRCodeDisplay
                roomId={roomId}
                playerCount={gameState.players.length}
              />
            </motion.div>

            <div className="flex-1 space-y-6">
              <motion.div
                className="glass-card p-6"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-display text-quiplash-yellow mb-4">Players</h2>
                <PlayerList players={gameState.players} />
                {activePlayers.length < gameState.config.minPlayers && (
                  <p className="text-quiplash-yellow text-center mt-4 font-body">
                    Need at least {gameState.config.minPlayers} players to start
                  </p>
                )}
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <CategoryPicker
                  selectedCategories={gameState.selectedCategories}
                  onSelect={selectCategories}
                  maxCategories={3}
                />
              </motion.div>

              <motion.button
                onClick={startGame}
                disabled={!canStart}
                className={`
                  w-full py-4 rounded-xl text-xl font-display transition-all
                  ${canStart
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg shadow-green-500/30'
                    : 'bg-white/20 text-white/50 cursor-not-allowed'}
                `}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={canStart ? { scale: 1.02 } : {}}
                whileTap={canStart ? { scale: 0.98 } : {}}
              >
                {!canStart
                  ? activePlayers.length < gameState.config.minPlayers
                    ? `Waiting for ${gameState.config.minPlayers - activePlayers.length} more player(s)...`
                    : 'Select at least one category'
                  : 'Start Game!'}
              </motion.button>

              {/* Dev Panel - Ctrl+Shift+D to toggle */}
              <AnimatePresence>
                {showDevPanel && (
                  <motion.div
                    className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                      <span>Dev Tools</span>
                      <span className="text-xs bg-yellow-500/30 px-2 py-1 rounded">Ctrl+Shift+D</span>
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => sendMessage({ type: 'add_dummy_players', count: 1 })}
                        className="px-3 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-100 rounded-lg text-sm transition-colors"
                      >
                        +1 Bot
                      </button>
                      <button
                        onClick={() => sendMessage({ type: 'add_dummy_players', count: 3 })}
                        className="px-3 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-100 rounded-lg text-sm transition-colors"
                      >
                        +3 Bots
                      </button>
                      <button
                        onClick={() => sendMessage({ type: 'add_dummy_players', count: 5 })}
                        className="px-3 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-100 rounded-lg text-sm transition-colors"
                      >
                        +5 Bots
                      </button>
                      <button
                        onClick={() => audio.playSfx('intro')}
                        className="px-3 py-2 bg-purple-500/30 hover:bg-purple-500/50 text-purple-100 rounded-lg text-sm transition-colors"
                      >
                        🎵 Test SFX
                      </button>
                      <button
                        onClick={() => audio.setMuted(!audio.isMuted)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          !audio.isMuted
                            ? 'bg-green-500/30 hover:bg-green-500/50 text-green-100'
                            : 'bg-red-500/30 hover:bg-red-500/50 text-red-100'
                        }`}
                      >
                        {!audio.isMuted ? '🔊 Audio On' : '🔇 Audio Off'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Category Select Phase */}
        {gameState.phase === 'category_select' && (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <CategoryPicker
              selectedCategories={gameState.selectedCategories}
              onSelect={selectCategories}
              maxCategories={3}
            />
            <motion.button
              onClick={startGame}
              disabled={gameState.selectedCategories.length === 0}
              className={`
                px-8 py-4 rounded-xl text-xl font-display transition-all
                ${gameState.selectedCategories.length > 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'}
              `}
              whileHover={gameState.selectedCategories.length > 0 ? { scale: 1.05 } : {}}
              whileTap={gameState.selectedCategories.length > 0 ? { scale: 0.95 } : {}}
            >
              Start Round {gameState.currentRound}
            </motion.button>
          </motion.div>
        )}

        {/* Answering Phase */}
        {gameState.phase === 'answering' && (
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="glass-card p-8"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <h2 className="text-4xl font-display text-quiplash-yellow mb-4">
                Round {gameState.currentRound} of {gameState.totalRounds}
              </h2>
              <p className="text-white/80 text-xl mb-6 font-body">
                Players are answering their prompts...
              </p>
              <Timer seconds={gameState.timer} maxSeconds={gameState.config.answerTimeSeconds} />
            </motion.div>

            <motion.div
              className="glass-card p-6"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-display text-white mb-4">Submissions</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {activePlayers.map((player, idx) => {
                  const playerAnswers = gameState.answers.filter(
                    (a) => a.playerId === player.id
                  );
                  const assignedPrompts = gameState.promptAssignments[player.id] || [];
                  const submitted = playerAnswers.length;
                  const total = assignedPrompts.length;
                  const isComplete = submitted === total;

                  return (
                    <motion.div
                      key={player.id}
                      className={`
                        px-4 py-2 rounded-full flex items-center gap-2 font-body
                        ${isComplete ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-white/20'}
                      `}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <span className="text-white font-medium">{player.name}</span>
                      <span className={`
                        text-sm px-2 py-0.5 rounded-full
                        ${isComplete ? 'bg-green-500 text-white' : 'bg-white/30 text-white/80'}
                      `}>
                        {submitted}/{total}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Voting Phase */}
        {gameState.phase === 'voting' && gameState.currentVotingRound && (
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Voting Intro Animation */}
            <AnimatePresence mode="wait">
              {showVotingIntro && (
                <motion.div
                  key="voting-intro"
                  className="flex flex-col items-center justify-center min-h-[400px]"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    className="text-8xl mb-6"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: 2,
                      ease: 'easeInOut',
                    }}
                  >
                    🗳️
                  </motion.div>
                  <motion.h2
                    className="quiplash-title text-6xl"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Time to Vote!
                  </motion.h2>
                  <motion.p
                    className="text-white/60 text-xl mt-4 font-body"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Pick your favorite answer!
                  </motion.p>
                </motion.div>
              )}

              {showVotingContent && (
                <motion.div
                  key="voting-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Timer seconds={gameState.timer} maxSeconds={gameState.config.voteTimeSeconds} />

                  <motion.div
                    className="glass-card p-8 mt-8"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {gameState.currentVotingRound.prompt.isImagePrompt && gameState.currentVotingRound.prompt.imageUrl && (
                      <div className="mb-6">
                        <img
                          src={gameState.currentVotingRound.prompt.imageUrl}
                          alt="Caption this"
                          className="max-h-72 mx-auto rounded-xl shadow-2xl"
                        />
                      </div>
                    )}
                    <h2 className="text-3xl font-display text-quiplash-yellow mb-8">
                      {gameState.currentVotingRound.prompt.prompt}
                    </h2>

                    {gameState.currentVotingRound.isFinalRound ? (
                      /* Final round: show answers appearing one by one with dramatic timing */
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {gameState.currentVotingRound.answers.map((answer, idx) => (
                          <motion.div
                            key={idx}
                            className="answer-card cursor-default p-4"
                            initial={{ y: 50, opacity: 0, scale: 0.8, rotateX: -15 }}
                            animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                            transition={{
                              delay: 1.5 + idx * 1.2, // Stagger by 1.2 seconds per answer
                              type: 'spring',
                              damping: 15,
                              stiffness: 100,
                            }}
                          >
                            <motion.p
                              className="text-white text-xl font-display"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.8 + idx * 1.2 }}
                            >
                              {answer.text}
                            </motion.p>
                            <motion.p
                              className="text-white/50 text-sm font-body mt-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 2.0 + idx * 1.2 }}
                            >
                              - {answer.playerName}
                            </motion.p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      /* Normal rounds: 2 answers with VS */
                      <>
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                          {gameState.currentVotingRound.answers.map((answer, idx) => (
                            <motion.div
                              key={idx}
                              className="answer-card cursor-default"
                              initial={{
                                x: idx === 0 ? -100 : 100,
                                opacity: 0,
                                rotateY: idx === 0 ? -15 : 15,
                              }}
                              animate={{ x: 0, opacity: 1, rotateY: 0 }}
                              transition={{
                                delay: 0.3 + idx * 0.2,
                                type: 'spring',
                                damping: 20,
                              }}
                            >
                              <p className="text-white text-2xl font-display">{answer.text}</p>
                            </motion.div>
                          ))}
                        </div>

                        {/* VS indicator */}
                        <motion.div
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5, type: 'spring' }}
                        >
                          <span className="text-4xl font-display text-quiplash-pink">VS</span>
                        </motion.div>
                      </>
                    )}
                  </motion.div>

                  {/* Vote count hidden during voting - just show "Vote now!" */}
                  <motion.div
                    className="text-white/60 font-body mt-4 text-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    Vote on your device now!
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Vote Results Phase - Reveal ALL votes at once */}
        {gameState.phase === 'vote_results' && gameState.currentVotingRound && (() => {
          const sortedAnswers = [...gameState.currentVotingRound.answers].sort((a, b) => b.votes - a.votes);
          const totalVotes = sortedAnswers.reduce((sum, a) => sum + a.votes, 0);
          const winner = sortedAnswers[0];
          const isQuiplash = winner && winner.votes === totalVotes && totalVotes > 0;

          return (
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div className="glass-card p-8">
              {/* Prompt/image */}
              {gameState.currentVotingRound.prompt.isImagePrompt && gameState.currentVotingRound.prompt.imageUrl && (
                <div className="mb-6">
                  <img
                    src={gameState.currentVotingRound.prompt.imageUrl}
                    alt="Caption this"
                    className="max-h-64 mx-auto rounded-xl shadow-2xl"
                  />
                </div>
              )}
              <h2 className="text-2xl font-display text-quiplash-yellow mb-8">
                {gameState.currentVotingRound.prompt.prompt}
              </h2>

              {/* Quiplash announcement - shows first if applicable */}
              {isQuiplash && (
                <motion.div
                  className="mb-8"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: 0.5,
                    type: 'spring',
                    damping: 8,
                    stiffness: 150,
                  }}
                >
                  <span className="text-6xl font-display text-quiplash-yellow">
                    🎉 QUIPLASH! 🎉
                  </span>
                </motion.div>
              )}

              {/* All answers with votes - revealed together */}
              <div className={`grid gap-6 max-w-5xl mx-auto ${
                gameState.currentVotingRound.isFinalRound
                  ? 'md:grid-cols-2 lg:grid-cols-3'
                  : 'md:grid-cols-2 max-w-4xl'
              }`}>
                {sortedAnswers.map((answer, idx) => {
                    const isWinner = idx === 0 && answer.votes > 0;
                    const isThisQuiplash = isWinner && isQuiplash;

                    return (
                      <motion.div
                        key={idx}
                        className={`
                          rounded-xl p-6
                          ${isThisQuiplash
                            ? 'winner-card'
                            : isWinner
                            ? 'bg-green-500/30 ring-2 ring-green-400'
                            : 'bg-white/10'}
                        `}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: isWinner ? 1.05 : 1, opacity: 1 }}
                        transition={{
                          delay: 1.0,
                          type: 'spring',
                          damping: 15,
                        }}
                      >
                        {/* Answer text */}
                        <p className={`text-2xl font-display mb-3 ${isThisQuiplash ? 'text-quiplash-blue' : 'text-white'}`}>
                          {answer.text}
                        </p>
                        <p className={`text-lg font-body ${isThisQuiplash ? 'text-quiplash-blue/80' : 'text-white/80'}`}>
                          - {answer.playerName}
                        </p>

                        {/* Vote count - all revealed at once */}
                        <motion.div
                          className={`text-3xl font-display mt-4 ${isThisQuiplash ? 'text-quiplash-blue' : isWinner ? 'text-green-400' : 'text-quiplash-yellow'}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.2, type: 'spring' }}
                        >
                          {answer.votes} vote{answer.votes !== 1 ? 's' : ''}
                          <span className="text-lg ml-2">
                            (+{answer.votes * (gameState.currentRound === 3 ? 200 : 100)}{isThisQuiplash ? ' +250' : ''} pts)
                          </span>
                        </motion.div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>

            <motion.button
              onClick={nextPrompt}
              className="px-8 py-4 bg-gradient-to-r from-quiplash-purple to-quiplash-pink text-white rounded-xl text-xl font-display hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
            </motion.button>
          </motion.div>
          );
        })()}

        {/* Round Scores Phase */}
        {gameState.phase === 'round_scores' && (
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.h2
              className="quiplash-title text-5xl"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              Round {gameState.currentRound} Complete!
            </motion.h2>

            <motion.div
              className="glass-card p-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-3xl font-display text-quiplash-yellow mb-6">Scoreboard</h3>
              <PlayerList players={gameState.players} showScores />
            </motion.div>

            <motion.button
              onClick={nextRound}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-xl font-display hover:scale-105 transition-transform shadow-lg shadow-green-500/30"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {gameState.currentRound < gameState.totalRounds
                ? `Start Round ${gameState.currentRound + 1}`
                : 'See Final Scores'}
            </motion.button>
          </motion.div>
        )}

        {/* Final Scores Phase */}
        {gameState.phase === 'final_scores' && (
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.h2
              className="quiplash-title text-6xl"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              Game Over!
            </motion.h2>

            <motion.div
              className="glass-card p-8"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {(() => {
                const sortedPlayers = [...gameState.players]
                  .filter((p) => !p.isAudience)
                  .sort((a, b) => b.score - a.score);
                const winner = sortedPlayers[0];

                return (
                  <>
                    <motion.div
                      className="mb-8"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                    >
                      <motion.div
                        className="text-8xl mb-4"
                        animate={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ delay: 0.8, duration: 0.5 }}
                      >
                        👑
                      </motion.div>
                      <h3 className="text-5xl font-display text-quiplash-yellow">
                        {winner?.name}
                      </h3>
                      <motion.p
                        className="text-3xl text-white mt-2 font-display"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                      >
                        {winner?.score} points
                      </motion.p>
                    </motion.div>

                    <PlayerList players={gameState.players} showScores />
                  </>
                );
              })()}
            </motion.div>

            <motion.button
              onClick={restartGame}
              className="px-8 py-4 bg-gradient-to-r from-quiplash-purple to-quiplash-pink text-white rounded-xl text-xl font-display hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Full-screen WhatsApp Context Reveal (skip for image prompts) */}
      {gameState.currentVotingRound && !gameState.currentVotingRound.prompt.isImagePrompt && (
        <ContextRevealOverlay
          snippet={gameState.currentVotingRound.prompt.context.snippet}
          date={gameState.currentVotingRound.prompt.context.date}
          participants={gameState.currentVotingRound.prompt.context.participants}
          isVisible={showContextOverlay}
          onComplete={handleContextDismiss}
          onSpeakDialogue={handleSpeakDialogue}
        />
      )}
    </div>
  );
}

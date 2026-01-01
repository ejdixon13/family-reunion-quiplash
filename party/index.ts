import type * as Party from "partykit/server";
import type {
  GameState,
  GamePhase,
  Player,
  Prompt,
  Answer,
  VotingRound,
  ClientMessage,
  ServerMessage,
  GameConfig,
} from "./types";

// Import prompts - in production this would be fetched
import promptsData from "../data/prompts.json";
import imagePromptsData from "../data/imagePrompts.json";
import { getDummyName, getRandomDummyAnswer } from "./dummyData";

const DEFAULT_CONFIG: GameConfig = {
  answerTimeSeconds: 60,
  voteTimeSeconds: 20,
  resultsTimeSeconds: 12,
  minPlayers: 3,
  maxActivePlayers: 8,
  roundsPerGame: 3,
};

class QuiplashServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  gameState: GameState | null = null;
  timerId: ReturnType<typeof setInterval> | null = null;
  dummyCount = 0;
  // Track host by _pk (client-generated ID) which is stable across reconnects
  hostPk: string | null = null;
  // Map connection.id to _pk for lookups
  connectionToPk: Map<string, string> = new Map();

  // Initialize game state
  initializeGame(): GameState {
    return {
      roomId: this.room.id,
      phase: 'lobby',
      players: [],
      selectedCategories: [],
      currentRound: 0,
      totalRounds: DEFAULT_CONFIG.roundsPerGame,
      currentPromptIndex: 0,
      prompts: [],
      promptAssignments: {},
      answers: [],
      currentVotingRound: null,
      timer: 0,
      config: DEFAULT_CONFIG,
    };
  }

  // Handle new connections
  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    // Initialize game if first connection
    if (!this.gameState) {
      this.gameState = this.initializeGame();
    }

    // Extract _pk from query params (client-generated stable ID)
    const url = new URL(ctx.request.url);
    const pk = url.searchParams.get('_pk');
    if (pk) {
      this.connectionToPk.set(connection.id, pk);
    }

    // Check if this is the host (has host query param)
    const isHost = url.searchParams.get('host') === 'true';
    if (isHost && pk) {
      this.hostPk = pk;
      console.log(`[PartyKit] Host connected with _pk: ${pk}`);
    }

    // Send current state to new connection
    this.sendToConnection(connection, {
      type: 'state_update',
      state: this.gameState,
    });
  }

  // Handle incoming messages
  async onMessage(message: string, sender: Party.Connection) {
    if (!this.gameState) {
      this.gameState = this.initializeGame();
    }

    try {
      const msg = JSON.parse(message) as ClientMessage;

      switch (msg.type) {
        case 'ping':
          this.sendToConnection(sender, { type: 'pong' });
          break;

        case 'join':
          this.handleJoin(sender, msg.playerName);
          break;

        case 'select_categories':
          this.handleSelectCategories(sender, msg.categories);
          break;

        case 'start_game':
          this.handleStartGame(sender);
          break;

        case 'submit_answer':
          this.handleSubmitAnswer(sender, msg.promptId, msg.answer);
          break;

        case 'submit_vote':
          this.handleSubmitVote(sender, msg.votedPlayerId);
          break;

        case 'submit_multi_vote':
          this.handleSubmitMultiVote(sender, msg.votes);
          break;

        case 'next_prompt':
          this.handleNextPrompt(sender);
          break;

        case 'next_round':
          this.handleNextRound(sender);
          break;

        case 'restart_game':
          this.handleRestartGame(sender);
          break;

        case 'add_dummy_players':
          this.handleAddDummyPlayers(sender, msg.count);
          break;
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  }

  // Handle player joining
  handleJoin(connection: Party.Connection, playerName: string) {
    if (!this.gameState) return;

    // Check if player already exists (reconnect)
    const existingPlayer = this.gameState.players.find(
      (p) => p.id === connection.id || p.name.toLowerCase() === playerName.toLowerCase()
    );

    if (existingPlayer) {
      existingPlayer.id = connection.id;
      existingPlayer.isConnected = true;
      this.broadcastState();
      return;
    }

    // Determine if player should be audience
    const activePlayers = this.gameState.players.filter((p) => !p.isAudience);
    const isAudience = activePlayers.length >= this.gameState.config.maxActivePlayers;
    const isHost = this.gameState.players.length === 0;

    const player: Player = {
      id: connection.id,
      name: playerName,
      score: 0,
      isHost,
      isAudience,
      isConnected: true,
    };

    this.gameState.players.push(player);
    this.broadcastState();
  }

  // Handle adding dummy players for testing
  handleAddDummyPlayers(connection: Party.Connection, count: number) {
    if (!this.gameState) return;
    if (this.gameState.phase !== 'lobby') return;
    if (!this.isHostConnection(connection)) return;

    const maxToAdd = Math.min(count, 8);
    for (let i = 0; i < maxToAdd; i++) {
      const activePlayers = this.gameState.players.filter((p) => !p.isAudience);
      if (activePlayers.length >= this.gameState.config.maxActivePlayers) break;

      const dummyPlayer: Player = {
        id: `dummy-${Date.now()}-${this.dummyCount}`,
        name: getDummyName(this.dummyCount),
        score: 0,
        isHost: false,
        isAudience: false,
        isConnected: true,
        isDummy: true,
      };

      this.dummyCount++;
      this.gameState.players.push(dummyPlayer);
    }

    this.broadcastState();
  }

  // Check if connection is the host (either host page or player with isHost)
  isHostConnection(connection: Party.Connection): boolean {
    // Check by _pk (stable across reconnects)
    const pk = this.connectionToPk.get(connection.id);
    if (pk && pk === this.hostPk) return true;

    // Also check if player has isHost flag
    const player = this.gameState?.players.find((p) => p.id === connection.id);
    return player?.isHost === true;
  }

  // Handle category selection
  handleSelectCategories(connection: Party.Connection, categories: string[]) {
    if (!this.gameState) return;
    if (!this.isHostConnection(connection)) return;

    this.gameState.selectedCategories = categories.slice(0, 3);
    this.gameState.phase = 'category_select';
    this.broadcastState();
  }

  // Handle game start
  handleStartGame(connection: Party.Connection) {
    if (!this.gameState) return;
    if (!this.isHostConnection(connection)) return;

    const activePlayers = this.gameState.players.filter((p) => !p.isAudience);
    if (activePlayers.length < this.gameState.config.minPlayers) {
      this.sendToConnection(connection, {
        type: 'error',
        message: `Need at least ${this.gameState.config.minPlayers} players to start`,
      });
      return;
    }

    if (this.gameState.selectedCategories.length === 0) {
      this.sendToConnection(connection, {
        type: 'error',
        message: 'Please select at least one category',
      });
      return;
    }

    this.startRound();
  }

  // Start a new round
  startRound() {
    if (!this.gameState) return;

    this.gameState.currentRound++;
    this.gameState.currentPromptIndex = 0;
    this.gameState.answers = [];

    const activePlayers = this.gameState.players.filter((p) => !p.isAudience);
    const playerIds = activePlayers.map((p) => p.id);

    // Round 3: "Caption This" - ONE image prompt for ALL players
    if (this.gameState.currentRound === 3) {
      // Generate just 1 image prompt
      this.gameState.prompts = this.generateImagePrompts(1);
      const prompt = this.gameState.prompts[0];

      // Assign the single prompt to ALL active players
      this.gameState.promptAssignments = {};
      for (const playerId of playerIds) {
        this.gameState.promptAssignments[playerId] = [prompt.id];
      }
    } else {
      // Rounds 1-2: Category-based prompts (each prompt to 2 players)
      const promptsNeeded = activePlayers.length;
      const categoryIndex = Math.min(
        this.gameState.currentRound - 1,
        this.gameState.selectedCategories.length - 1
      );
      const categoryId = this.gameState.selectedCategories[categoryIndex];

      const categoryPrompts = (promptsData.prompts as Prompt[]).filter(
        (p) => p.category === categoryId
      );

      const shuffled = this.shuffleArray([...categoryPrompts]);
      this.gameState.prompts = shuffled.slice(0, promptsNeeded);

      // Assign prompts to players (each prompt goes to 2 players)
      this.gameState.promptAssignments = {};
      for (let i = 0; i < this.gameState.prompts.length; i++) {
        const prompt = this.gameState.prompts[i];
        const player1 = playerIds[i % playerIds.length];
        const player2 = playerIds[(i + 1) % playerIds.length];

        if (!this.gameState.promptAssignments[player1]) {
          this.gameState.promptAssignments[player1] = [];
        }
        if (!this.gameState.promptAssignments[player2]) {
          this.gameState.promptAssignments[player2] = [];
        }

        this.gameState.promptAssignments[player1].push(prompt.id);
        this.gameState.promptAssignments[player2].push(prompt.id);
      }
    }

    // Transition to answering phase
    this.gameState.phase = 'answering';
    this.broadcastState();

    // Send each player their prompts
    for (const player of activePlayers) {
      const promptIds = this.gameState.promptAssignments[player.id] || [];
      const playerPrompts = this.gameState.prompts.filter((p) =>
        promptIds.includes(p.id)
      );

      const conn = this.getConnection(player.id);
      if (conn) {
        this.sendToConnection(conn, {
          type: 'your_prompts',
          prompts: playerPrompts,
        });
      }
    }

    // Submit answers for dummy players immediately
    this.submitDummyAnswers();

    // Start timer
    this.startTimer(this.gameState.config.answerTimeSeconds, () => {
      this.endAnsweringPhase();
    });
  }

  // Submit answers for dummy players
  submitDummyAnswers() {
    if (!this.gameState) return;

    const dummyPlayers = this.gameState.players.filter(
      (p) => p.isDummy && !p.isAudience
    );

    for (const player of dummyPlayers) {
      const promptIds = this.gameState.promptAssignments[player.id] || [];
      for (const promptId of promptIds) {
        // Check if already answered
        const existingAnswer = this.gameState.answers.find(
          (a) => a.promptId === promptId && a.playerId === player.id
        );
        if (existingAnswer) continue;

        const answer: Answer = {
          promptId,
          playerId: player.id,
          playerName: player.name,
          text: getRandomDummyAnswer(),
          votes: 0,
          voterIds: [],
        };

        this.gameState.answers.push(answer);
      }
    }

    this.broadcastState();
  }

  // Handle answer submission
  handleSubmitAnswer(connection: Party.Connection, promptId: string, answerText: string) {
    if (!this.gameState || this.gameState.phase !== 'answering') return;

    const player = this.gameState.players.find((p) => p.id === connection.id);
    if (!player || player.isAudience) return;

    // Check if already answered this prompt
    const existingAnswer = this.gameState.answers.find(
      (a) => a.promptId === promptId && a.playerId === player.id
    );
    if (existingAnswer) return;

    const answer: Answer = {
      promptId,
      playerId: player.id,
      playerName: player.name,
      text: answerText.trim() || '(No answer)',
      votes: 0,
      voterIds: [],
    };

    this.gameState.answers.push(answer);
    this.broadcastState();

    // Check if all answers are in
    const activePlayers = this.gameState.players.filter((p) => !p.isAudience);
    const totalExpectedAnswers = this.gameState.prompts.length * 2; // 2 answers per prompt

    if (this.gameState.answers.length >= totalExpectedAnswers) {
      this.clearTimer();
      this.endAnsweringPhase();
    }
  }

  // End answering phase and start voting
  endAnsweringPhase() {
    if (!this.gameState) return;

    // Fill in missing answers
    for (const prompt of this.gameState.prompts) {
      const promptAnswers = this.gameState.answers.filter(
        (a) => a.promptId === prompt.id
      );

      // Find players assigned to this prompt who haven't answered
      for (const [playerId, promptIds] of Object.entries(this.gameState.promptAssignments)) {
        if (promptIds.includes(prompt.id)) {
          const hasAnswered = promptAnswers.some((a) => a.playerId === playerId);
          if (!hasAnswered) {
            const player = this.gameState.players.find((p) => p.id === playerId);
            this.gameState.answers.push({
              promptId: prompt.id,
              playerId,
              playerName: player?.name || 'Unknown',
              text: '(No answer)',
              votes: 0,
              voterIds: [],
            });
          }
        }
      }
    }

    this.startVotingRound();
  }

  // Start voting on a prompt
  startVotingRound() {
    if (!this.gameState) return;

    if (this.gameState.currentPromptIndex >= this.gameState.prompts.length) {
      this.showRoundScores();
      return;
    }

    const prompt = this.gameState.prompts[this.gameState.currentPromptIndex];
    const promptAnswers = this.gameState.answers.filter(
      (a) => a.promptId === prompt.id
    );

    const isFinalRound = this.gameState.currentRound === 3;

    // Final round: need at least 2 answers from all players
    // Normal rounds: need exactly 2 answers
    if (promptAnswers.length < 2) {
      // Skip this prompt if not enough answers
      this.gameState.currentPromptIndex++;
      this.startVotingRound();
      return;
    }

    this.gameState.currentVotingRound = {
      promptId: prompt.id,
      prompt,
      // Final round: ALL answers; Normal rounds: just 2
      answers: isFinalRound ? promptAnswers : [promptAnswers[0], promptAnswers[1]],
      votedPlayerIds: [],
      isFinalRound,
    };

    this.gameState.phase = 'voting';
    this.broadcastState();

    // Schedule dummy votes with a small random delay
    setTimeout(() => this.submitDummyVotes(), 1000 + Math.random() * 2000);

    this.startTimer(this.gameState.config.voteTimeSeconds, () => {
      this.endVotingRound();
    });
  }

  // Submit votes for dummy players
  submitDummyVotes() {
    if (!this.gameState || this.gameState.phase !== 'voting') return;
    if (!this.gameState.currentVotingRound) return;

    const voting = this.gameState.currentVotingRound;
    const dummyPlayers = this.gameState.players.filter(
      (p) => p.isDummy && p.isConnected
    );

    for (const player of dummyPlayers) {
      // Skip if already voted
      if (voting.votedPlayerIds.includes(player.id)) continue;

      // Final round: Multi-vote (3 votes to 3 DIFFERENT answers, not own)
      if (voting.isFinalRound) {
        // Get answers this player can vote for (not their own)
        const eligibleAnswers = voting.answers.filter((a) => a.playerId !== player.id);
        if (eligibleAnswers.length < 3) continue; // Need at least 3 answers to vote for

        // Shuffle and pick 3 different answers
        const shuffled = this.shuffleArray([...eligibleAnswers]);
        const selectedAnswers = shuffled.slice(0, 3);

        for (const answer of selectedAnswers) {
          answer.votes++;
          answer.voterIds.push(player.id);
        }
      } else {
        // Normal rounds: single vote, skip if answerer
        const isAnswerer = voting.answers.some((a) => a.playerId === player.id);
        if (isAnswerer) continue;

        const randomIndex = Math.floor(Math.random() * voting.answers.length);
        const votedAnswer = voting.answers[randomIndex];
        votedAnswer.votes++;
        votedAnswer.voterIds.push(player.id);
      }

      voting.votedPlayerIds.push(player.id);
    }

    this.broadcastState();
    this.checkVotingComplete();
  }

  // Check if all eligible voters have voted
  checkVotingComplete() {
    if (!this.gameState || !this.gameState.currentVotingRound) return;

    const isFinalRound = this.gameState.currentVotingRound.isFinalRound;

    const eligibleVoters = this.gameState.players.filter((p) => {
      if (!p.isConnected) return false;

      // Final round: everyone can vote (for others' answers)
      if (isFinalRound) {
        return !p.isAudience; // All active players vote
      }

      // Normal rounds: only non-answerers vote
      const isAnswerer = this.gameState!.currentVotingRound!.answers.some(
        (a) => a.playerId === p.id
      );
      return !isAnswerer;
    });

    if (this.gameState.currentVotingRound.votedPlayerIds.length >= eligibleVoters.length) {
      this.clearTimer();
      this.endVotingRound();
    }
  }

  // Handle vote submission
  handleSubmitVote(connection: Party.Connection, votedPlayerId: string) {
    if (!this.gameState || this.gameState.phase !== 'voting') return;
    if (!this.gameState.currentVotingRound) return;

    const voter = this.gameState.players.find((p) => p.id === connection.id);
    if (!voter) return;

    // Can't vote for your own answer
    const isOwnAnswer = this.gameState.currentVotingRound.answers.some(
      (a) => a.playerId === voter.id
    );
    if (isOwnAnswer) return;

    // Already voted?
    if (this.gameState.currentVotingRound.votedPlayerIds.includes(voter.id)) {
      return;
    }

    // Record vote
    const answer = this.gameState.currentVotingRound.answers.find(
      (a) => a.playerId === votedPlayerId
    );
    if (answer) {
      answer.votes++;
      answer.voterIds.push(voter.id);
      this.gameState.currentVotingRound.votedPlayerIds.push(voter.id);
    }

    this.broadcastState();
    this.checkVotingComplete();
  }

  // Handle multi-vote submission (Round 3 only)
  handleSubmitMultiVote(connection: Party.Connection, votes: Record<string, number>) {
    if (!this.gameState || this.gameState.phase !== 'voting') return;
    if (!this.gameState.currentVotingRound) return;
    if (!this.gameState.currentVotingRound.isFinalRound) return;

    const voter = this.gameState.players.find((p) => p.id === connection.id);
    if (!voter) return;

    // Already voted?
    if (this.gameState.currentVotingRound.votedPlayerIds.includes(voter.id)) {
      return;
    }

    // Validate total votes === 3
    const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
    if (totalVotes !== 3) return;

    // Validate: max 1 vote per answer, and can't vote for own answer
    for (const [playerId, voteCount] of Object.entries(votes)) {
      if (voteCount > 1) return; // Max 1 vote per answer
      if (playerId === voter.id && voteCount > 0) return; // Can't vote for own answer
    }

    // Apply votes
    for (const [playerId, voteCount] of Object.entries(votes)) {
      const answer = this.gameState.currentVotingRound.answers.find(
        (a) => a.playerId === playerId
      );
      if (answer && voteCount > 0) {
        answer.votes += voteCount;
        answer.voterIds.push(voter.id);
      }
    }

    this.gameState.currentVotingRound.votedPlayerIds.push(voter.id);
    this.broadcastState();
    this.checkVotingComplete();
  }

  // End voting and show results
  endVotingRound() {
    if (!this.gameState || !this.gameState.currentVotingRound) return;

    // Award points (200 per vote in Round 3, 100 otherwise)
    const pointsPerVote = this.gameState.currentRound === 3 ? 200 : 100;
    const answers = this.gameState.currentVotingRound.answers;
    for (const answer of answers) {
      const player = this.gameState.players.find((p) => p.id === answer.playerId);
      if (player) {
        player.score += answer.votes * pointsPerVote;

        // Quiplash bonus (all votes)
        const otherAnswer = answers.find((a) => a.playerId !== answer.playerId);
        if (otherAnswer && otherAnswer.votes === 0 && answer.votes > 0) {
          player.score += 250; // Bonus for getting ALL votes
        }
      }
    }

    // Update answers in main array
    for (const answer of answers) {
      const idx = this.gameState.answers.findIndex(
        (a) => a.promptId === answer.promptId && a.playerId === answer.playerId
      );
      if (idx >= 0) {
        this.gameState.answers[idx] = answer;
      }
    }

    this.gameState.phase = 'vote_results';
    this.broadcastState();

    // Auto-advance after showing results
    this.startTimer(this.gameState.config.resultsTimeSeconds, () => {
      this.handleNextPrompt(null);
    });
  }

  // Move to next prompt
  handleNextPrompt(connection: Party.Connection | null) {
    if (!this.gameState) return;

    // Only host can manually advance, or timer auto-advances
    if (connection && !this.isHostConnection(connection)) return;

    this.clearTimer();
    this.gameState.currentPromptIndex++;
    this.gameState.currentVotingRound = null;
    this.startVotingRound();
  }

  // Show round scores
  showRoundScores() {
    if (!this.gameState) return;

    this.gameState.phase = 'round_scores';
    this.gameState.currentVotingRound = null;
    this.broadcastState();
  }

  // Handle next round
  handleNextRound(connection: Party.Connection) {
    if (!this.gameState) return;
    if (!this.isHostConnection(connection)) return;

    if (this.gameState.currentRound >= this.gameState.totalRounds) {
      this.gameState.phase = 'final_scores';
      this.broadcastState();
    } else {
      this.startRound();
    }
  }

  // Handle game restart
  handleRestartGame(connection: Party.Connection) {
    if (!this.gameState) return;
    if (!this.isHostConnection(connection)) return;

    // Reset scores but keep players
    for (const p of this.gameState.players) {
      p.score = 0;
    }

    this.gameState.phase = 'lobby';
    this.gameState.currentRound = 0;
    this.gameState.selectedCategories = [];
    this.gameState.prompts = [];
    this.gameState.answers = [];
    this.gameState.currentVotingRound = null;
    this.gameState.promptAssignments = {};

    this.clearTimer();
    this.broadcastState();
  }

  // Handle disconnection
  onClose(connection: Party.Connection) {
    // Clean up connection mapping
    this.connectionToPk.delete(connection.id);

    if (!this.gameState) return;

    const player = this.gameState.players.find((p) => p.id === connection.id);
    if (player) {
      player.isConnected = false;
      this.broadcastState();
    }
  }

  // Helper: Broadcast state to all connections
  broadcastState() {
    if (!this.gameState) return;

    const message: ServerMessage = {
      type: 'state_update',
      state: this.gameState,
    };

    this.room.broadcast(JSON.stringify(message));
  }

  // Helper: Send to specific connection
  sendToConnection(connection: Party.Connection, message: ServerMessage) {
    connection.send(JSON.stringify(message));
  }

  // Helper: Get connection by ID
  getConnection(id: string): Party.Connection | undefined {
    for (const conn of this.room.getConnections()) {
      if (conn.id === id) return conn;
    }
    return undefined;
  }

  // Helper: Start timer
  startTimer(seconds: number, onComplete: () => void) {
    this.clearTimer();

    if (!this.gameState) return;
    this.gameState.timer = seconds;
    this.broadcastState();

    this.timerId = setInterval(() => {
      if (!this.gameState) return;

      this.gameState.timer--;

      // Broadcast timer update
      this.room.broadcast(
        JSON.stringify({
          type: 'timer_tick',
          seconds: this.gameState.timer,
        } as ServerMessage)
      );

      if (this.gameState.timer <= 0) {
        this.clearTimer();
        onComplete();
      }
    }, 1000);
  }

  // Helper: Clear timer
  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // Generate image-based prompts for "Caption This" round
  generateImagePrompts(count: number): Prompt[] {
    const shuffledImages = this.shuffleArray([...imagePromptsData.images]);
    const selectedImages = shuffledImages.slice(0, count);
    const captionPrompts = imagePromptsData.captionPrompts;

    return selectedImages.map((image, index) => ({
      id: `caption-${Date.now()}-${index}`,
      category: 'caption_this',
      prompt: captionPrompts[Math.floor(Math.random() * captionPrompts.length)],
      context: { snippet: '', date: '', participants: [] },
      imageUrl: `/images/caption/${image.filename}`,
      isImagePrompt: true,
    }));
  }

  // Helper: Shuffle array
  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Handle HTTP requests (required for some environments)
  async onRequest(req: Party.Request) {
    return new Response("This is a WebSocket server", { status: 200 });
  }
}

export default QuiplashServer satisfies Party.Worker;

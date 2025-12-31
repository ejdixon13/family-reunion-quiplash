'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import PartySocket from 'partysocket';
import type { GameState, Prompt, ClientMessage, ServerMessage } from '@/lib/gameState';

// In production behind nginx, PartyKit is accessed via /party path on same host
// In development, it's on localhost:1999
const getPartyKitHost = () => {
  if (typeof window === 'undefined') return 'localhost:1999';

  const envHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  if (envHost) return envHost;

  // Default to same host in production
  // nginx proxies /parties/ directly to partykit
  if (process.env.NODE_ENV === 'production') {
    return window.location.host;
  }

  return 'localhost:1999';
};

interface UsePartySocketOptions {
  isHost?: boolean;
}

interface UsePartySocketReturn {
  gameState: GameState | null;
  myPrompts: Prompt[];
  connectionId: string | null;
  isConnected: boolean;
  error: string | null;
  sendMessage: (message: ClientMessage) => void;
  join: (playerName: string) => void;
  selectCategories: (categories: string[]) => void;
  startGame: () => void;
  submitAnswer: (promptId: string, answer: string) => void;
  submitVote: (votedPlayerId: string) => void;
  nextPrompt: () => void;
  nextRound: () => void;
  restartGame: () => void;
}

export function usePartySocket(
  roomId: string,
  options: UsePartySocketOptions = {}
): UsePartySocketReturn {
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPrompts, setMyPrompts] = useState<Prompt[]>([]);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    const host = getPartyKitHost();
    const ws = new PartySocket({
      host,
      room: roomId,
      query: options.isHost ? { host: 'true' } : {},
    });

    ws.addEventListener('open', () => {
      setConnectionId(ws.id);
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;

        switch (msg.type) {
          case 'state_update':
            setGameState(msg.state);
            break;
          case 'your_prompts':
            setMyPrompts(msg.prompts);
            break;
          case 'timer_tick':
            setGameState((prev) =>
              prev ? { ...prev, timer: msg.seconds } : null
            );
            break;
          case 'error':
            setError(msg.message);
            break;
          case 'pong':
            // Keep-alive response
            break;
        }
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    ws.addEventListener('close', () => {
      setIsConnected(false);
    });

    ws.addEventListener('error', (e) => {
      console.error('WebSocket error:', e);
      setError('Connection error');
    });

    setSocket(ws);

    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [roomId, options.isHost]);

  const sendMessage = useCallback(
    (message: ClientMessage) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    },
    [socket]
  );

  const join = useCallback(
    (playerName: string) => {
      sendMessage({ type: 'join', playerName });
    },
    [sendMessage]
  );

  const selectCategories = useCallback(
    (categories: string[]) => {
      sendMessage({ type: 'select_categories', categories });
    },
    [sendMessage]
  );

  const startGame = useCallback(() => {
    sendMessage({ type: 'start_game' });
  }, [sendMessage]);

  const submitAnswer = useCallback(
    (promptId: string, answer: string) => {
      sendMessage({ type: 'submit_answer', promptId, answer });
    },
    [sendMessage]
  );

  const submitVote = useCallback(
    (votedPlayerId: string) => {
      sendMessage({ type: 'submit_vote', votedPlayerId });
    },
    [sendMessage]
  );

  const nextPrompt = useCallback(() => {
    sendMessage({ type: 'next_prompt' });
  }, [sendMessage]);

  const nextRound = useCallback(() => {
    sendMessage({ type: 'next_round' });
  }, [sendMessage]);

  const restartGame = useCallback(() => {
    sendMessage({ type: 'restart_game' });
  }, [sendMessage]);

  return {
    gameState,
    myPrompts,
    connectionId,
    isConnected,
    error,
    sendMessage,
    join,
    selectCategories,
    startGame,
    submitAnswer,
    submitVote,
    nextPrompt,
    nextRound,
    restartGame,
  };
}

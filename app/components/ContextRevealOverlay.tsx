'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextRevealOverlayProps {
  snippet: string;
  date: string;
  participants: string[];
  isVisible: boolean;
  onComplete?: () => void;
  onSpeakDialogue?: (
    messages: Array<{ sender: string; message: string }>,
    delayMs?: number
  ) => Promise<void>;
}

interface ParsedMessage {
  sender: string;
  message: string;
  isOutgoing: boolean;
}

export function ContextRevealOverlay({
  snippet,
  date,
  participants,
  isVisible,
  onComplete,
  onSpeakDialogue,
}: ContextRevealOverlayProps) {
  const hasSpokeRef = useRef(false);
  const lines = snippet.split('\n').filter(line => line.trim());

  // Trigger TTS dialogue when overlay becomes visible
  useEffect(() => {
    if (isVisible && onSpeakDialogue && !hasSpokeRef.current) {
      hasSpokeRef.current = true;

      // Parse messages for TTS
      const dialogueMessages = lines
        .map((line) => {
          const match = line.match(/^(.+?):\s*(.+)$/);
          if (match) {
            return { sender: match[1], message: match[2] };
          }
          return null;
        })
        .filter((msg): msg is { sender: string; message: string } => msg !== null);

      // Match animation stagger timing (0.4s base + 0.15s per message)
      const baseDelayMs = 400;
      const staggerMs = 150;

      // Start speaking after initial animation delay
      setTimeout(() => {
        onSpeakDialogue(dialogueMessages, staggerMs);
      }, baseDelayMs);
    }

    // Reset when overlay hides
    if (!isVisible) {
      hasSpokeRef.current = false;
    }
  }, [isVisible, onSpeakDialogue, lines]);

  // Parse messages and assign alternating outgoing/incoming
  const messages: ParsedMessage[] = lines.map((line, index) => {
    const match = line.match(/^(.+?):\s*(.+)$/);
    if (match) {
      const [, sender, message] = match;
      return {
        sender,
        message,
        isOutgoing: index % 2 === 0, // Alternate for visual variety
      };
    }
    return {
      sender: '',
      message: line,
      isOutgoing: false,
    };
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onComplete}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* WhatsApp Phone Frame */}
          <motion.div
            className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* WhatsApp Header */}
            <div className="bg-whatsapp-teal px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-lg">👥</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm truncate">
                  Family Chat
                </h3>
                <p className="text-white/70 text-xs">
                  {participants.join(', ')}
                </p>
              </div>
              <span className="text-white/60 text-xs">{date}</span>
            </div>

            {/* "Behind the Joke" Label */}
            <motion.div
              className="bg-quiplash-yellow text-quiplash-blue font-display text-center py-2 font-bold text-lg"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              📱 Behind the Joke
            </motion.div>

            {/* Chat Area */}
            <div
              className="p-4 min-h-[300px] max-h-[60vh] overflow-y-auto"
              style={{
                background: `#ECE5DD url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    className={`flex ${msg.isOutgoing ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, x: msg.isOutgoing ? 50 : -50, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{
                      delay: 0.4 + index * 0.15,
                      type: 'spring',
                      damping: 20,
                      stiffness: 300,
                    }}
                  >
                    <div
                      className={`
                        max-w-[85%] px-3 py-2 rounded-lg shadow-sm relative
                        ${msg.isOutgoing
                          ? 'bg-whatsapp-outgoing rounded-br-none'
                          : 'bg-white rounded-bl-none'
                        }
                      `}
                    >
                      {/* Sender name */}
                      {msg.sender && (
                        <p
                          className={`text-xs font-bold mb-1 ${
                            msg.isOutgoing ? 'text-emerald-700' : 'text-purple-600'
                          }`}
                        >
                          {msg.sender}
                        </p>
                      )}
                      {/* Message text */}
                      <p className="text-gray-800 text-sm leading-relaxed">
                        {msg.message}
                      </p>
                      {/* Bubble tail */}
                      <div
                        className={`
                          absolute bottom-0 w-3 h-3
                          ${msg.isOutgoing
                            ? '-right-1.5 bg-whatsapp-outgoing'
                            : '-left-1.5 bg-white'
                          }
                        `}
                        style={{
                          clipPath: msg.isOutgoing
                            ? 'polygon(0 0, 0 100%, 100% 100%)'
                            : 'polygon(100% 0, 0 100%, 100% 100%)',
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Bottom hint */}
            <motion.div
              className="bg-gray-800 text-white/60 text-center py-3 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + messages.length * 0.15 }}
            >
              Tap anywhere to continue
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

interface ContextRevealProps {
  snippet: string;
  date: string;
  participants: string[];
}

export function ContextReveal({ snippet, date, participants }: ContextRevealProps) {
  const lines = snippet.split('\n');

  return (
    <div className="bg-gray-900/80 rounded-xl p-4 max-w-lg mx-auto mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">💬</span>
        <span className="text-white font-bold text-sm">Behind the Joke</span>
        <span className="text-white/50 text-xs">({date})</span>
      </div>

      <div className="space-y-1 font-mono text-sm">
        {lines.map((line, index) => {
          // Parse WhatsApp-style messages
          const match = line.match(/^(.+?):\s*(.+)$/);
          if (match) {
            const [, sender, message] = match;
            return (
              <div key={index} className="flex gap-2">
                <span className="text-blue-400 font-bold shrink-0">{sender}:</span>
                <span className="text-white/90">{message}</span>
              </div>
            );
          }
          return (
            <div key={index} className="text-white/70 pl-4">
              {line}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1">
        {participants.map((p) => (
          <span
            key={p}
            className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/60"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

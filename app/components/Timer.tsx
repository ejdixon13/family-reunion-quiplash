'use client';

interface TimerProps {
  seconds: number;
  maxSeconds?: number;
}

export function Timer({ seconds, maxSeconds = 60 }: TimerProps) {
  const percentage = (seconds / maxSeconds) * 100;
  const isLow = seconds <= 10;
  const isCritical = seconds <= 5;

  // Color progression: green -> yellow -> orange -> red
  const getColor = () => {
    if (isCritical) return { text: 'text-red-500', bar: 'bg-red-500', glow: 'shadow-red-500/50' };
    if (seconds <= 7) return { text: 'text-orange-500', bar: 'bg-orange-500', glow: 'shadow-orange-500/50' };
    if (isLow) return { text: 'text-yellow-400', bar: 'bg-yellow-400', glow: 'shadow-yellow-400/50' };
    return { text: 'text-green-400', bar: 'bg-green-500', glow: '' };
  };

  const colors = getColor();

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Timer number with display font */}
      <div
        className={`
          font-display text-6xl font-bold tabular-nums
          ${colors.text}
          ${isCritical ? 'animate-shake' : ''}
          transition-colors duration-300
        `}
        style={{
          textShadow: isCritical
            ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)'
            : isLow
            ? '0 0 15px rgba(250, 204, 21, 0.6)'
            : 'none',
        }}
      >
        {seconds}
      </div>

      {/* Progress bar with glow */}
      <div
        className={`
          w-48 h-3 bg-white/20 rounded-full overflow-hidden
          ${isCritical ? 'shadow-lg ' + colors.glow : ''}
        `}
      >
        <div
          className={`
            h-full transition-all duration-1000 ease-linear rounded-full
            ${colors.bar}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Urgency indicator */}
      {isCritical && (
        <div className="text-red-400 text-sm font-bold animate-pulse uppercase tracking-wider">
          Hurry!
        </div>
      )}
    </div>
  );
}

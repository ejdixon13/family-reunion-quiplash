'use client';

interface TimerProps {
  seconds: number;
  maxSeconds?: number;
}

export function Timer({ seconds, maxSeconds = 60 }: TimerProps) {
  const percentage = (seconds / maxSeconds) * 100;
  const isLow = seconds <= 10;
  const isCritical = seconds <= 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`
          text-4xl font-bold tabular-nums
          ${isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-yellow-400' : 'text-white'}
        `}
      >
        {seconds}
      </div>
      <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`
            h-full transition-all duration-1000 ease-linear rounded-full
            ${isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-400' : 'bg-green-500'}
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

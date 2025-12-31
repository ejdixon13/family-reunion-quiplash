'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  roomId: string;
  playerCount: number;
}

export function QRCodeDisplay({ roomId, playerCount }: QRCodeDisplayProps) {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const joinUrl = `${baseUrl}/play/${roomId}`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-2xl">
      <QRCodeSVG
        value={joinUrl}
        size={220}
        level="M"
        includeMargin
        bgColor="#ffffff"
        fgColor="#1e1b4b"
      />
      <p className="text-center mt-4 text-gray-600 font-medium">
        Scan to join on your phone
      </p>
      <p className="text-center text-sm text-gray-400 mt-1">
        Room: <span className="font-mono font-bold">{roomId}</span>
      </p>
      <div className="text-center mt-4">
        <span className="inline-flex items-center px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full font-bold">
          {playerCount} player{playerCount !== 1 ? 's' : ''} joined
        </span>
      </div>
    </div>
  );
}

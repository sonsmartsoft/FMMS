'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface AIFloatingButtonProps {
  onClick: () => void;
}

export const AIFloatingButton: React.FC<AIFloatingButtonProps> = ({ onClick }) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 });

  return (
    <div
      style={{ bottom: `${position.y}px`, right: `${position.x}px` }}
      className="fixed z-50 animate-bounce-subtle"
    >
      <button
        onClick={onClick}
        className="group relative flex items-center space-x-2 px-4 py-3 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white font-bold shadow-2xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
        title="Mở AI Assistant (Hỗ trợ gia đình & phương tiện)"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
        <span className="text-xs tracking-wider">AI ASSISTANT</span>
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-300"></span>
        </span>
      </button>
    </div>
  );
};

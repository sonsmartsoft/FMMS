'use client';

import React, { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';

interface ChartLabelToggleProps {
  showLabels: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
  title?: string;
}

/**
 * Custom hook to safely sync per-chart label visibility with localStorage (SSR-friendly)
 */
export function useChartLabelState(storageKey: string, defaultValue: boolean = false) {
  const [showLabels, setShowLabels] = useState<boolean>(defaultValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        setShowLabels(saved === 'true');
      }
    } catch {}
    setIsInitialized(true);
  }, [storageKey]);

  const toggle = () => {
    setShowLabels((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {}
      return next;
    });
  };

  return [showLabels, toggle, isInitialized] as const;
}

/**
 * Modern pill-style toggle button for chart data labels
 */
export function ChartLabelToggle({
  showLabels,
  onToggle,
  label = 'Nhãn số',
  className = '',
  title = 'Bật/tắt hiển thị số liệu trực tiếp trên đỉnh biểu đồ',
}: ChartLabelToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 shrink-0 ${
        showLabels
          ? 'shadow-sm'
          : 'hover:opacity-100 opacity-70'
      } ${className}`}
      style={
        showLabels
          ? {
              background: 'rgba(6,182,212,0.18)',
              color: 'var(--accent-cyan, #06B6D4)',
              border: '1px solid rgba(6,182,212,0.4)',
            }
          : {
              background: 'var(--bg-hover, rgba(255,255,255,0.05))',
              color: 'var(--text-secondary, #94A3B8)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            }
      }
    >
      <Tag className={`w-3.5 h-3.5 transition-transform ${showLabels ? 'rotate-12 scale-105' : ''}`} />
      <span>{label}</span>
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 transition-all"
        style={{
          background: showLabels ? 'var(--accent-cyan, #06B6D4)' : 'var(--text-muted, #64748B)',
          boxShadow: showLabels ? '0 0 6px var(--accent-cyan, #06B6D4)' : 'none',
        }}
      />
    </button>
  );
}

export default ChartLabelToggle;

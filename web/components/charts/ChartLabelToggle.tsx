'use client';

import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface ChartLabelToggleProps {
  showLabels: boolean;
  onToggle: () => void;
  /** Label for backward compatibility or when a single base label is given */
  label?: string;
  /** Label to display when toggle is OFF (default: 'Hiện số') */
  labelShow?: string;
  /** Label to display when toggle is ON (default: 'Ẩn số') */
  labelHide?: string;
  /** Tooltip when toggle is OFF */
  tooltipShow?: string;
  /** Tooltip when toggle is ON */
  tooltipHide?: string;
  /** Custom title overriding both tooltips */
  title?: string;
  /** Compact mode: only display icon without label text */
  compact?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Extra CSS classes */
  className?: string;
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
 * Modern Outlined vs Contained toggle button with Eye / EyeOff dynamic icons
 * for toggling data label visibility across all charts in FMMS.
 */
export function ChartLabelToggle({
  showLabels,
  onToggle,
  label,
  labelShow,
  labelHide,
  tooltipShow = 'Hiển thị nhãn số kèm nền chống lóa',
  tooltipHide = 'Ẩn nhãn số để biểu đồ thoáng hơn',
  title,
  compact = false,
  size = 'medium',
  className = '',
}: ChartLabelToggleProps) {
  // Determine dynamic text labels based on props
  let resolvedShow = labelShow || 'Hiện số';
  let resolvedHide = labelHide || 'Ẩn số';

  if (label) {
    if (!labelShow && !labelHide) {
      resolvedShow = label;
      resolvedHide = label.includes('Hiện') ? label.replace('Hiện', 'Ẩn') : label;
    } else if (labelShow) {
      resolvedShow = labelShow;
    }
  }

  const currentLabel = showLabels ? resolvedHide : resolvedShow;
  const currentTooltip = title || (showLabels ? tooltipHide : tooltipShow);

  const sizeClasses =
    size === 'small'
      ? compact
        ? 'p-1 rounded-md'
        : 'px-2 py-0.5 text-[11px] rounded-md gap-1'
      : compact
        ? 'p-1.5 rounded-lg'
        : 'px-2.5 py-1 text-xs rounded-lg gap-1.5';

  return (
    <button
      type="button"
      onClick={onToggle}
      title={currentTooltip}
      aria-label={currentTooltip}
      aria-pressed={showLabels}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none active:scale-95 shrink-0 ${sizeClasses} ${
        showLabels
          ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm shadow-cyan-500/25 border border-cyan-400/50 font-semibold'
          : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/80'
      } ${className}`}
    >
      {showLabels ? (
        <Eye className="w-3.5 h-3.5 shrink-0 transition-transform" />
      ) : (
        <EyeOff className="w-3.5 h-3.5 shrink-0 transition-transform opacity-75" />
      )}

      {!compact && (
        <span className="leading-none whitespace-nowrap">{currentLabel}</span>
      )}
    </button>
  );
}

// Alias export for ChartValueToggle
export const ChartValueToggle = ChartLabelToggle;

export default ChartLabelToggle;

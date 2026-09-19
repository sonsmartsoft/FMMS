'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';

export type KpiColorType = 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue' | 'teal' | 'indigo';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  subColor?: string;
  badgeText?: string;
  badgeType?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  progressPercent?: number;
  colorType?: KpiColorType;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }> | React.ReactNode;
  onClick?: () => void;
  href?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  active?: boolean;
  className?: string;
  valueColor?: string;
}

interface ColorConfig {
  hex: string;
  rgb: string;
  textAccent: string;
  iconBgLight: string;
  iconBgDark: string;
  borderLight: string;
  borderDark: string;
  borderHover: string;
  badgeBg: string;
  badgeText: string;
  barGradient: string;
}

const COLOR_MAP: Record<KpiColorType, ColorConfig> = {
  cyan: {
    hex: '#0EA5E9',
    rgb: '14, 165, 233',
    textAccent: 'text-sky-600 dark:text-sky-400',
    iconBgLight: 'rgba(14, 165, 233, 0.12)',
    iconBgDark: 'rgba(56, 189, 248, 0.16)',
    borderLight: 'rgba(14, 165, 233, 0.22)',
    borderDark: 'rgba(56, 189, 248, 0.25)',
    borderHover: '#0EA5E9',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
    badgeText: 'text-sky-700 dark:text-sky-300',
    barGradient: 'from-sky-400 to-cyan-500',
  },
  emerald: {
    hex: '#10B981',
    rgb: '16, 185, 129',
    textAccent: 'text-emerald-600 dark:text-emerald-400',
    iconBgLight: 'rgba(16, 185, 129, 0.12)',
    iconBgDark: 'rgba(52, 211, 153, 0.16)',
    borderLight: 'rgba(16, 185, 129, 0.22)',
    borderDark: 'rgba(52, 211, 153, 0.25)',
    borderHover: '#10B981',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    barGradient: 'from-emerald-400 to-teal-500',
  },
  amber: {
    hex: '#F59E0B',
    rgb: '245, 158, 11',
    textAccent: 'text-amber-600 dark:text-amber-400',
    iconBgLight: 'rgba(245, 158, 11, 0.12)',
    iconBgDark: 'rgba(251, 191, 36, 0.16)',
    borderLight: 'rgba(245, 158, 11, 0.22)',
    borderDark: 'rgba(251, 191, 36, 0.25)',
    borderHover: '#F59E0B',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-700 dark:text-amber-300',
    barGradient: 'from-amber-400 to-orange-500',
  },
  rose: {
    hex: '#F43F5E',
    rgb: '244, 63, 94',
    textAccent: 'text-rose-600 dark:text-rose-400',
    iconBgLight: 'rgba(244, 63, 94, 0.12)',
    iconBgDark: 'rgba(251, 113, 133, 0.16)',
    borderLight: 'rgba(244, 63, 94, 0.22)',
    borderDark: 'rgba(251, 113, 133, 0.25)',
    borderHover: '#F43F5E',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    badgeText: 'text-rose-700 dark:text-rose-300',
    barGradient: 'from-rose-400 to-pink-600',
  },
  purple: {
    hex: '#8B5CF6',
    rgb: '139, 92, 246',
    textAccent: 'text-purple-600 dark:text-purple-400',
    iconBgLight: 'rgba(139, 92, 246, 0.12)',
    iconBgDark: 'rgba(167, 139, 250, 0.16)',
    borderLight: 'rgba(139, 92, 246, 0.22)',
    borderDark: 'rgba(167, 139, 250, 0.25)',
    borderHover: '#8B5CF6',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-700 dark:text-purple-300',
    barGradient: 'from-purple-400 to-indigo-600',
  },
  blue: {
    hex: '#3B82F6',
    rgb: '59, 130, 246',
    textAccent: 'text-blue-600 dark:text-blue-400',
    iconBgLight: 'rgba(59, 130, 246, 0.12)',
    iconBgDark: 'rgba(96, 165, 250, 0.16)',
    borderLight: 'rgba(59, 130, 246, 0.22)',
    borderDark: 'rgba(96, 165, 250, 0.25)',
    borderHover: '#3B82F6',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-700 dark:text-blue-300',
    barGradient: 'from-blue-400 to-indigo-500',
  },
  teal: {
    hex: '#14B8A6',
    rgb: '20, 184, 166',
    textAccent: 'text-teal-600 dark:text-teal-400',
    iconBgLight: 'rgba(20, 184, 166, 0.12)',
    iconBgDark: 'rgba(45, 212, 191, 0.16)',
    borderLight: 'rgba(20, 184, 166, 0.22)',
    borderDark: 'rgba(45, 212, 191, 0.25)',
    borderHover: '#14B8A6',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badgeText: 'text-teal-700 dark:text-teal-300',
    barGradient: 'from-teal-400 to-emerald-500',
  },
  indigo: {
    hex: '#6366F1',
    rgb: '99, 102, 241',
    textAccent: 'text-indigo-600 dark:text-indigo-400',
    iconBgLight: 'rgba(99, 102, 241, 0.12)',
    iconBgDark: 'rgba(129, 140, 248, 0.16)',
    borderLight: 'rgba(99, 102, 241, 0.22)',
    borderDark: 'rgba(129, 140, 248, 0.25)',
    borderHover: '#6366F1',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    barGradient: 'from-indigo-400 to-purple-600',
  },
};

export default function KpiGradientCard({
  title,
  value,
  unit,
  subtitle,
  subColor,
  badgeText,
  progressPercent,
  colorType = 'cyan',
  icon,
  onClick,
  href,
  trend,
  active = false,
  className = '',
  valueColor,
}: KpiCardProps) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDark = isMounted ? theme === 'dark' : true;
  const c = COLOR_MAP[colorType] || COLOR_MAP.cyan;

  // Dynamic multi-layer gradient background for the entire card surface
  const bgGradient = isDark
    ? isHovered
      ? `linear-gradient(135deg, rgba(${c.rgb}, 0.22) 0%, rgba(${c.rgb}, 0.06) 45%, rgba(17, 24, 39, 0.98) 100%)`
      : `linear-gradient(135deg, rgba(${c.rgb}, 0.13) 0%, rgba(${c.rgb}, 0.03) 45%, rgba(17, 24, 39, 0.96) 100%)`
    : isHovered
      ? `linear-gradient(135deg, rgba(${c.rgb}, 0.15) 0%, rgba(${c.rgb}, 0.035) 45%, #ffffff 100%)`
      : `linear-gradient(135deg, rgba(${c.rgb}, 0.075) 0%, rgba(${c.rgb}, 0.015) 45%, #ffffff 100%)`;

  // Render Icon safely whether it's a React component or a rendered Node
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
      return <IconComponent className="w-4 h-4 stroke-[2]" />;
    }
    return null;
  };

  const cardContent = (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`group relative flex flex-col justify-between p-4 sm:p-4.5 rounded-2xl transition-all duration-300 select-none overflow-hidden ${
        href || onClick ? 'cursor-pointer' : ''
      } ${
        isHovered
          ? '-translate-y-1 shadow-lg'
          : 'hover:-translate-y-0.5'
      } ${className}`}
      style={{
        background: bgGradient,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: active
          ? `1.5px solid ${c.hex}`
          : isHovered
            ? `1.5px solid ${c.hex}`
            : isDark
              ? `1px solid rgba(${c.rgb}, 0.32)`
              : `1px solid rgba(${c.rgb}, 0.22)`,
        boxShadow: isHovered
          ? `0 16px 32px -6px rgba(${c.rgb}, ${isDark ? 0.35 : 0.22}), 0 6px 16px -2px rgba(${c.rgb}, ${isDark ? 0.20 : 0.12})`
          : isDark
            ? `0 4px 16px 0 rgba(0, 0, 0, 0.45), 0 1px 3px 0 rgba(${c.rgb}, 0.10)`
            : `0 4px 16px 0 rgba(${c.rgb}, 0.08), 0 1px 3px 0 rgba(0, 0, 0, 0.04)`,
      }}
    >
      {/* ── LAYER 1a: Top Edge Luminous Highlight (Glass Shimmer Beam) ── */}
      <div
        className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent 0%, rgba(${c.rgb}, ${isHovered ? 0.85 : 0.45}) 30%, rgba(${c.rgb}, ${isHovered ? 0.95 : 0.6}) 50%, rgba(${c.rgb}, ${isHovered ? 0.85 : 0.45}) 70%, transparent 100%)`,
          opacity: isHovered ? 1 : 0.7,
        }}
      />

      {/* ── LAYER 1b: Primary Corner Glow (Radial Gradient ở góc trên phải) ── */}
      <div
        className="absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none transition-all duration-500 blur-2xl -mr-12 -mt-12"
        style={{
          background: `radial-gradient(circle at top right, rgba(${c.rgb}, ${isDark ? (isHovered ? 0.42 : 0.25) : (isHovered ? 0.30 : 0.16)}) 0%, transparent 70%)`,
          opacity: isHovered ? 1 : 0.85,
        }}
      />

      {/* ── LAYER 1c: Secondary Ambient Counter-Glow (Góc dưới trái) ── */}
      <div
        className="absolute bottom-0 left-0 w-36 h-36 rounded-full pointer-events-none transition-all duration-500 blur-2xl -ml-10 -mb-10"
        style={{
          background: `radial-gradient(circle at bottom left, rgba(${c.rgb}, ${isDark ? (isHovered ? 0.20 : 0.10) : (isHovered ? 0.14 : 0.06)}) 0%, transparent 70%)`,
          opacity: isHovered ? 1 : 0.8,
        }}
      />

      {/* ── LAYER 2: Header (Icon Box + Title + Badge / Arrow) ── */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-1"
              style={{
                background: `linear-gradient(135deg, rgba(${c.rgb}, 0.22) 0%, rgba(${c.rgb}, 0.06) 100%)`,
                border: `1px solid rgba(${c.rgb}, 0.32)`,
                color: c.hex,
              }}
            >
              {renderIcon()}
            </div>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badgeText && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeBg} ${c.badgeText}`}>
              {badgeText}
            </span>
          )}
          {(href || onClick) && (
            <ChevronRight
              className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 opacity-50 group-hover:opacity-100"
              style={{ color: c.hex }}
            />
          )}
        </div>
      </div>

      {/* ── LAYER 3: Main Metric & Trend ── */}
      <div className="my-1 relative z-10">
        <div className="flex items-baseline gap-1 flex-wrap">
          <span
            className="text-xl sm:text-2xl font-black font-mono tracking-tight"
            style={{ color: valueColor || 'var(--text-primary)' }}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              {unit}
            </span>
          )}
        </div>

        {/* Trend indicator if available */}
        {trend && (
          <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold">
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-500" />
            )}
            <span className={trend.isPositive ? 'text-emerald-500' : 'text-rose-500'}>
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-slate-400 text-[10px]">
                {trend.label}
              </span>
            )}
          </div>
        )}

        {/* ── LAYER 4: Progress Bar (nếu có progressPercent) ── */}
        {progressPercent !== undefined && (
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] mb-1 font-bold text-slate-500 dark:text-slate-400">
              <span>Tiến độ / Mục tiêu</span>
              <span className={c.textAccent}>{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800/90 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${c.barGradient} transition-all duration-500`}
                style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── LAYER 5: Footer Subtitle ── */}
      {subtitle && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-medium relative z-10">
          <span
            className="truncate"
            style={{ color: subColor || 'var(--text-muted)' }}
          >
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

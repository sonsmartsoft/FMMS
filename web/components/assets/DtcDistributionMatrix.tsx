'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sparkles, 
  Wrench, 
  X,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { VehicleDtcLog } from '@/lib/services/diagnosticService';
import { useTheme } from '@/lib/theme/ThemeContext';
import DraggableModal from '@/components/ui/DraggableModal';

interface DtcDistributionMatrixProps {
  logs: VehicleDtcLog[];
  assetName?: string;
  onLookup?: (code: string) => void;
  onAskAi?: (prompt: string) => void;
  onNavigateToMaintenance?: (note: string) => void;
}

interface CategoryConfig {
  id: string;
  name: string;
  shortName: string;
  codePrefix: string;
  color: string;
  gradColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}

const DTC_CATEGORIES: CategoryConfig[] = [
  {
    id: 'POWERTRAIN',
    name: 'Powertrain',
    shortName: 'Động cơ & Truyền động',
    codePrefix: 'P',
    color: '#38bdf8', // Vibrant Sky Blue
    gradColor: '#0284c7',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-600',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
  },
  {
    id: 'CHASSIS',
    name: 'Chassis',
    shortName: 'Khung gầm & Phanh',
    codePrefix: 'C',
    color: '#fbbf24', // Amber
    gradColor: '#d97706',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-600',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    badgeBg: 'rgba(251, 191, 36, 0.15)',
  },
  {
    id: 'BODY',
    name: 'Body',
    shortName: 'Thân vỏ & Tiện nghi',
    codePrefix: 'B',
    color: '#34d399', // Emerald Green
    gradColor: '#059669',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-600',
    borderColor: 'rgba(52, 211, 153, 0.4)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
  },
  {
    id: 'NETWORK',
    name: 'Network',
    shortName: 'Mạng CAN & ECU',
    codePrefix: 'U',
    color: '#f43f5e', // Rose / Ruby
    gradColor: '#be123c',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-600',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
  },
  {
    id: 'PENDING_TEMP',
    name: 'Pending',
    shortName: 'Lỗi tạm thời / Chờ',
    codePrefix: 'T',
    color: '#a855f7', // Purple
    gradColor: '#7e22ce',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-600',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
  },
];

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DtcDistributionMatrix({
  logs,
  assetName = 'Xe',
  onLookup,
  onAskAi,
  onNavigateToMaintenance,
}: DtcDistributionMatrixProps) {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const isDark = isMounted ? theme === 'dark' : true;

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  
  // 'ALL' for All-Years sum, or specific year number (2026, 2025, ...)
  const [timeScope, setTimeScope] = useState<'ALL' | number>(currentYear);

  const [selectedCell, setSelectedCell] = useState<{
    category: CategoryConfig;
    monthIndex: number;
    monthLabel: string;
    logs: VehicleDtcLog[];
  } | null>(null);

  // Available years from logs
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear - 1]);
    logs.forEach(l => {
      const d = new Date(l.first_detected_at || l.last_detected_at || l.created_at);
      if (!isNaN(d.getFullYear())) {
        years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [logs, currentYear]);

  // Aggregate matrix data: ALWAYS 12 months (0..11) for each category
  const matrixData = useMemo(() => {
    const data: Record<string, VehicleDtcLog[][]> = {};
    DTC_CATEGORIES.forEach(cat => {
      data[cat.id] = Array.from({ length: 12 }, () => []);
    });

    logs.forEach(log => {
      const dateStr = log.first_detected_at || log.last_detected_at || log.created_at;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const logYear = date.getFullYear();
      const logMonth = date.getMonth(); // 0..11

      // Filter by year if not 'ALL'
      if (timeScope !== 'ALL' && logYear !== timeScope) {
        return;
      }

      // Determine category
      let catId = 'POWERTRAIN';
      if (log.status === 'PENDING') {
        catId = 'PENDING_TEMP';
      } else {
        const codeUpper = (log.dtc_code || '').toUpperCase();
        if (codeUpper.startsWith('P') || log.system_category === 'POWERTRAIN') {
          catId = 'POWERTRAIN';
        } else if (codeUpper.startsWith('C') || log.system_category === 'CHASSIS') {
          catId = 'CHASSIS';
        } else if (codeUpper.startsWith('B') || log.system_category === 'BODY') {
          catId = 'BODY';
        } else if (codeUpper.startsWith('U') || log.system_category === 'NETWORK') {
          catId = 'NETWORK';
        }
      }

      if (data[catId] && data[catId][logMonth]) {
        data[catId][logMonth].push(log);
      }
    });

    return data;
  }, [logs, timeScope]);

  // Category totals for current time scope
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    DTC_CATEGORIES.forEach(cat => {
      const sum = (matrixData[cat.id] || []).reduce((acc, monthLogs) => acc + monthLogs.length, 0);
      totals[cat.id] = sum;
    });
    return totals;
  }, [matrixData]);

  const grandTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  }, [categoryTotals]);

  return (
    <div 
      className="p-4 sm:p-5 rounded-2xl transition-all relative overflow-hidden"
      style={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
        backgroundImage: isDark
          ? 'radial-gradient(circle at top right, rgba(14, 165, 233, 0.15) 0%, rgba(17, 24, 39, 0) 70%)'
          : 'radial-gradient(circle at top right, rgba(224, 242, 254, 0.95) 0%, rgba(255, 255, 255, 0) 70%)',
        border: isDark ? '1.5px solid rgba(255, 255, 255, 0.08)' : '1.5px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark
          ? '0 8px 32px -4px rgba(0, 0, 0, 0.5), 0 2px 8px -2px rgba(14, 165, 233, 0.1)'
          : '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* ── Top Header & Advanced Time Scope Filter ── */}
      <div 
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b min-w-0 max-w-full"
        style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}
      >
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-sm shadow-cyan-400/50" />
            <h4 
              className="text-sm font-extrabold tracking-wide uppercase truncate" 
              style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            >
              Phân bố mã lỗi chẩn đoán (DTC Distribution)
            </h4>
          </div>
          <p 
            className="text-xs mt-0.5 truncate font-medium" 
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {timeScope === 'ALL' 
              ? 'Tổng hợp chu kỳ 12 tháng của tất cả các năm (Toàn bộ vòng đời xe)'
              : 'Biểu đồ ma trận phân bố mã lỗi OBD-II theo hệ thống trong năm ' + timeScope + ' (12 tháng)'}
          </p>
        </div>

        {/* Smart Time Scope Selector */}
        <div 
          className="flex items-center space-x-1.5 self-stretch md:self-auto p-1 rounded-xl border text-xs max-w-full min-w-0 overflow-x-auto scrollbar-none"
          style={{
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          }}
        >
          {/* All-time option */}
          <button
            onClick={() => setTimeScope('ALL')}
            className={
              'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shrink-0 ' +
              (timeScope === 'ALL'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/25'
                : 'hover:opacity-80')
            }
            style={timeScope !== 'ALL' ? { color: isDark ? '#94a3b8' : '#64748b' } : {}}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tất cả các năm</span>
            <span className="sm:hidden">Tất cả</span>
          </button>

          {/* Individual Year Buttons */}
          <div 
            className="flex items-center space-x-1 pl-1 border-l shrink-0" 
            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0' }}
          >
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setTimeScope(yr)}
                className={
                  'px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition shrink-0 ' +
                  (timeScope === yr
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/25'
                    : 'hover:opacity-80')
                }
                style={timeScope !== yr ? { color: isDark ? '#94a3b8' : '#64748b' } : {}}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Category KPI Highlights (Top Row) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 py-4">
        {DTC_CATEGORIES.map(cat => {
          const count = categoryTotals[cat.id] || 0;
          return (
            <div 
              key={cat.id} 
              className="flex flex-col items-center justify-center p-2.5 rounded-xl transition-all border text-center"
              style={{
                backgroundColor: isDark 
                  ? (count > 0 ? `${cat.color}12` : 'rgba(255, 255, 255, 0.03)')
                  : (count > 0 ? `${cat.color}10` : '#f8fafc'),
                borderColor: count > 0 
                  ? cat.borderColor 
                  : (isDark ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0'),
                boxShadow: count > 0 
                  ? `0 4px 12px -2px ${cat.color}25` 
                  : 'none',
              }}
            >
              <span 
                className="text-[11px] font-bold tracking-tight uppercase" 
                style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              >
                {cat.name} ({cat.codePrefix})
              </span>
              <span 
                className="text-xl sm:text-2xl font-black font-mono mt-0.5 tracking-tight"
                style={{ color: count > 0 ? cat.color : (isDark ? '#475569' : '#94a3b8') }}
              >
                {count < 10 && count > 0 ? '0' + count : count === 0 ? '00' : count}
              </span>
            </div>
          );
        })}

        {/* Grand Total */}
        <div 
          className="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center"
          style={{
            backgroundColor: isDark 
              ? (grandTotal > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)')
              : (grandTotal > 0 ? '#fff1f2' : '#f0fdf4'),
            borderColor: grandTotal > 0 
              ? 'rgba(244, 63, 94, 0.4)' 
              : 'rgba(16, 185, 129, 0.4)',
            boxShadow: grandTotal > 0 
              ? '0 4px 12px -2px rgba(244, 63, 94, 0.25)' 
              : 'none',
          }}
        >
          <span 
            className="text-[11px] font-bold uppercase tracking-tight" 
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            {timeScope === 'ALL' ? 'Tổng toàn bộ' : 'Tổng năm ' + timeScope}
          </span>
          <span 
            className="text-xl sm:text-2xl font-black font-mono mt-0.5 tracking-tight"
            style={{ color: grandTotal > 0 ? '#f43f5e' : '#10b981' }}
          >
            {grandTotal < 10 && grandTotal > 0 ? '0' + grandTotal : grandTotal === 0 ? '00' : grandTotal}
          </span>
        </div>
      </div>

      {/* ── The Matrix / Heatmap Grid (Always 12 Months, High-Contrast Crisp Tiles) ── */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          {/* 12 Month Header Column Labels */}
          <div 
            className="grid grid-cols-[150px_repeat(12,1fr)] gap-1.5 pb-2 text-center text-[11px] font-extrabold uppercase tracking-wider"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
          >
            <div className="text-left pl-2 font-bold tracking-normal">
              Phân hệ \ Tháng
            </div>
            {MONTH_NAMES_EN.map((mEn, mIdx) => {
              const isCurMonth = timeScope === currentYear && mIdx === currentMonthIdx;
              return (
                <div 
                  key={mEn} 
                  className={`font-mono transition-all flex flex-col items-center justify-center ${
                    isCurMonth ? 'text-cyan-400 font-black' : ''
                  }`}
                >
                  <span>{mEn}</span>
                  {isCurMonth && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5 animate-ping" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Rows: Category Heatmap */}
          <div className="space-y-2">
            {DTC_CATEGORIES.map(cat => {
              const rowMonths = matrixData[cat.id] || [];

              return (
                <div 
                  key={cat.id} 
                  className="grid grid-cols-[150px_repeat(12,1fr)] gap-1.5 items-center p-1.5 rounded-xl transition-all"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* Category Name & Badge */}
                  <div className="flex items-center space-x-2 pl-1.5 overflow-hidden">
                    <span 
                      className="w-5 h-5 rounded-md flex items-center justify-center font-mono font-extrabold text-[11px] shrink-0"
                      style={{ 
                        backgroundColor: isDark ? `${cat.color}25` : `${cat.color}15`,
                        color: cat.color,
                        border: `1px solid ${cat.borderColor}`,
                      }}
                    >
                      {cat.codePrefix}
                    </span>
                    <div className="min-w-0">
                      <span 
                        className="text-xs font-extrabold block truncate leading-tight"
                        style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}
                        title={cat.name + ' - ' + cat.shortName}
                      >
                        {cat.name}
                      </span>
                      <span 
                        className="text-[10px] block truncate font-medium leading-none mt-0.5"
                        style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                      >
                        {cat.shortName}
                      </span>
                    </div>
                  </div>

                  {/* 12 Month Cells */}
                  {rowMonths.map((monthLogs, mIdx) => {
                    const count = monthLogs.length;
                    const hasErrors = count > 0;
                    const monthName = MONTH_NAMES_EN[mIdx];
                    const label = timeScope === 'ALL' 
                      ? 'Tháng ' + (mIdx + 1) + ' (' + monthName + ') - Tất cả các năm'
                      : 'Tháng ' + (mIdx + 1) + '/' + timeScope;

                    return (
                      <button
                        key={mIdx}
                        onClick={() => {
                          if (hasErrors) {
                            setSelectedCell({
                              category: cat,
                              monthIndex: mIdx,
                              monthLabel: label,
                              logs: monthLogs,
                            });
                          }
                        }}
                        disabled={!hasErrors}
                        className={`h-9 rounded-xl flex items-center justify-center font-mono text-xs font-black transition-all duration-200 select-none ${
                          hasErrors 
                            ? 'text-white cursor-pointer hover:scale-110 active:scale-95' 
                            : 'cursor-default'
                        }`}
                        style={hasErrors ? {
                          background: `linear-gradient(135deg, ${cat.color} 0%, ${cat.gradColor} 100%)`,
                          border: '1.5px solid rgba(255, 255, 255, 0.4)',
                          boxShadow: isDark 
                            ? `0 4px 14px -1px ${cat.color}65, 0 1px 3px rgba(0, 0, 0, 0.5)` 
                            : `0 3px 10px -1px ${cat.color}45`,
                        } : {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.035)' : '#f8fafc',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
                        }}
                        title={hasErrors ? cat.name + ' (' + label + '): ' + count + ' mã lỗi (Bấm để xem chi tiết)' : 'Không có lỗi'}
                      >
                        {hasErrors ? (
                          count
                        ) : (
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: isDark ? 'rgba(148, 163, 184, 0.25)' : '#cbd5e1' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Matrix Footer Info ── */}
      <div 
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] pt-3 mt-2 border-t gap-2" 
        style={{ 
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)', 
          color: isDark ? '#94a3b8' : '#64748b' 
        }}
      >
        <div className="flex items-center space-x-3 flex-wrap gap-1">
          {DTC_CATEGORIES.map(cat => (
            <div key={cat.id} className="flex items-center space-x-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-sm inline-block" 
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-semibold">{cat.codePrefix}: {cat.name}</span>
            </div>
          ))}
        </div>
        <span className="italic font-medium" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          Bấm vào ô có số để xem chi tiết mã lỗi &amp; Freeze Frame
        </span>
      </div>

      {/* ── Drill-down Standard System DraggableModal (Chuẩn 100% Hệ Thống FMMS) ── */}
      {selectedCell && (
        <DraggableModal
          isOpen={true}
          onClose={() => setSelectedCell(null)}
          title={'Chi tiết lỗi: ' + selectedCell.category.name + ' — ' + selectedCell.monthLabel + ' (' + selectedCell.logs.length + ' mã lỗi)'}
          className="w-[95vw] sm:w-[750px] max-w-[750px]"
        >
          <div 
            className="flex-1 overflow-y-auto p-4 sm:p-5 no-drag space-y-3" 
            style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', cursor: 'auto' }}
          >
            {selectedCell.logs.map(log => (
              <div 
                key={log.id} 
                className="p-3.5 rounded-xl border transition"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span 
                      className="font-mono font-black text-sm px-2 py-0.5 rounded-lg border text-cyan-400" 
                      style={{ 
                        backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.1)', 
                        borderColor: isDark ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.25)' 
                      }}
                    >
                      {log.dtc_code}
                    </span>
                    <span className={'text-[10px] font-bold px-2 py-0.5 rounded ' + (
                      log.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' :
                      log.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' :
                      'bg-blue-500/20 text-blue-500'
                    )}>
                      {log.severity === 'CRITICAL' ? 'Nghiêm trọng' : log.severity === 'MEDIUM' ? 'Cảnh báo' : 'Nhẹ'}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                      {log.is_active ? '🔴 Active' : '🟢 Đã xử lý'}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    {new Date(log.first_detected_at || log.created_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <p className="text-xs font-semibold mt-2" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  {log.description_vi || log.dtc_code}
                </p>
                {log.description_en && (
                  <p className="text-[11px] font-mono mt-0.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                    {log.description_en}
                  </p>
                )}

                {/* Freeze frame preview if available */}
                {log.freeze_frame && Object.keys(log.freeze_frame).length > 0 && (
                  <div 
                    className="mt-2.5 p-2.5 rounded-xl text-[10px] font-mono grid grid-cols-2 sm:grid-cols-3 gap-1.5 border"
                    style={{
                      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : '#f1f5f9',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                    }}
                  >
                    {Object.entries(log.freeze_frame).slice(0, 6).map(([k, v]) => (
                      <div key={k}>
                        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{k}:</span>{' '}
                        <span className="text-cyan-400 font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Action buttons */}
                <div 
                  className="flex items-center space-x-2 mt-3 pt-2 border-t flex-wrap gap-1" 
                  style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }}
                >
                  {onLookup && (
                    <button
                      onClick={() => {
                        setSelectedCell(null);
                        onLookup(log.dtc_code);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border hover:opacity-80"
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                      }}
                    >
                      Tra cứu từ điển
                    </button>
                  )}
                  {onAskAi && (
                    <button
                      onClick={() => {
                        setSelectedCell(null);
                        onAskAi('Xe ' + assetName + ' bị mã lỗi OBD ' + log.dtc_code + ' (' + (log.description_vi || log.description_en) + '). Vui lòng phân tích nguyên nhân và cách khắc phục.');
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Hỏi AI</span>
                    </button>
                  )}
                  {onNavigateToMaintenance && (
                    <button
                      onClick={() => {
                        setSelectedCell(null);
                        onNavigateToMaintenance('Kiểm tra và sửa chữa mã lỗi: ' + log.dtc_code + ' - ' + (log.description_vi || ''));
                      }}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Tạo phiếu sửa</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DraggableModal>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
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
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
}

const DTC_CATEGORIES: CategoryConfig[] = [
  {
    id: 'POWERTRAIN',
    name: 'Powertrain (P)',
    shortName: 'Động cơ & Truyền động',
    codePrefix: 'P',
    color: '#3b82f6', // Bright Blue
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-600',
    borderColor: 'border-blue-500/30',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'CHASSIS',
    name: 'Chassis (C)',
    shortName: 'Khung gầm & Phanh',
    codePrefix: 'C',
    color: '#f59e0b', // Amber / Orange
    textColor: 'text-amber-500',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-500/30',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'BODY',
    name: 'Body (B)',
    shortName: 'Thân vỏ & Tiện nghi',
    codePrefix: 'B',
    color: '#10b981', // Emerald Green
    textColor: 'text-emerald-500',
    bgColor: 'bg-emerald-600',
    borderColor: 'border-emerald-500/30',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'NETWORK',
    name: 'Network (U)',
    shortName: 'Mạng CAN & ECU',
    codePrefix: 'U',
    color: '#ec4899', // Pink / Magenta
    textColor: 'text-pink-500',
    bgColor: 'bg-pink-600',
    borderColor: 'border-pink-500/30',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
  },
  {
    id: 'PENDING_TEMP',
    name: 'Pending / Temp',
    shortName: 'Lỗi tạm thời / Chờ',
    codePrefix: 'T',
    color: '#06b6d4', // Cyan
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-600',
    borderColor: 'border-cyan-500/30',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
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
  const currentYear = new Date().getFullYear();
  
  // 'ALL' for All-Time years comparison, or specific year number (2026, 2025, ...)
  const [timeScope, setTimeScope] = useState<'ALL' | number>(currentYear);

  const [selectedCell, setSelectedCell] = useState<{
    category: CategoryConfig;
    columnLabel: string;
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

  // Determine Columns based on timeScope:
  // If 'ALL' -> Columns are sorted ascending years (e.g. [2024, 2025, 2026])
  // If number -> Columns are 12 months (Jan..Dec)
  const columns = useMemo(() => {
    if (timeScope === 'ALL') {
      const sortedAsc = [...availableYears].sort((a, b) => a - b);
      return sortedAsc.map(yr => ({
        key: String(yr),
        label: String(yr),
        year: yr,
        monthIndex: -1,
      }));
    } else {
      return MONTH_NAMES_EN.map((mEn, idx) => ({
        key: mEn,
        label: mEn,
        year: timeScope,
        monthIndex: idx,
      }));
    }
  }, [timeScope, availableYears]);

  // Aggregate matrix data: [category_id][colIndex] => VehicleDtcLog[]
  const matrixData = useMemo(() => {
    const data: Record<string, VehicleDtcLog[][]> = {};
    DTC_CATEGORIES.forEach(cat => {
      data[cat.id] = Array.from({ length: columns.length }, () => []);
    });

    logs.forEach(log => {
      const dateStr = log.first_detected_at || log.last_detected_at || log.created_at;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;

      const logYear = date.getFullYear();
      const logMonth = date.getMonth();

      let targetColIdx = -1;
      if (timeScope === 'ALL') {
        targetColIdx = columns.findIndex(col => col.year === logYear);
      } else {
        if (logYear === timeScope) {
          targetColIdx = logMonth;
        }
      }

      if (targetColIdx === -1) return;

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

      if (data[catId] && data[catId][targetColIdx]) {
        data[catId][targetColIdx].push(log);
      }
    });

    return data;
  }, [logs, timeScope, columns]);

  // Category totals for current time scope
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    DTC_CATEGORIES.forEach(cat => {
      const sum = (matrixData[cat.id] || []).reduce((acc, colLogs) => acc + colLogs.length, 0);
      totals[cat.id] = sum;
    });
    return totals;
  }, [matrixData]);

  const grandTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  }, [categoryTotals]);

  return (
    <div 
      className="p-4 sm:p-5 rounded-3xl transition-all shadow-sm"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* ── Top Header & Advanced Time Scope Filter ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h4 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>
              Phân bố mã lỗi chẩn đoán (DTC Distribution)
            </h4>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {timeScope === 'ALL' 
              ? 'Ma trận tổng hợp phân bố mã lỗi qua tất cả các năm (Toàn bộ vòng đời xe)'
              : 'Biểu đồ ma trận phân bố mã lỗi OBD-II theo hệ thống trong năm ' + timeScope + ' (12 tháng)'}
          </p>
        </div>

        {/* Smart Time Scope Selector */}
        <div className="flex items-center space-x-1.5 self-stretch sm:self-auto bg-black/15 dark:bg-white/5 p-1 rounded-2xl border border-white/10 text-xs flex-wrap gap-1">
          {/* All-time option */}
          <button
            onClick={() => setTimeScope('ALL')}
            className={
              'px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center space-x-1 ' +
              (timeScope === 'ALL'
                ? 'bg-cyan-500 text-white shadow-sm'
                : 'hover:bg-white/10 text-muted')
            }
          >
            <Layers className="w-3 h-3" />
            <span>Tất cả các năm</span>
          </button>

          {/* Individual Year Buttons / Dropdown */}
          <div className="flex items-center space-x-1 pl-1 border-l border-white/10">
            {availableYears.map(yr => (
              <button
                key={yr}
                onClick={() => setTimeScope(yr)}
                className={
                  'px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition ' +
                  (timeScope === yr
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'hover:bg-white/10 text-muted')
                }
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
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all border text-center"
              style={{
                background: 'var(--bg-primary)',
                borderColor: count > 0 ? cat.borderColor : 'var(--border-subtle)',
              }}
            >
              <span className="text-[11px] font-semibold tracking-tight" style={{ color: 'var(--text-muted)' }}>
                {cat.name}
              </span>
              <span 
                className="text-xl sm:text-2xl font-black font-mono mt-0.5 tracking-tight"
                style={{ color: count > 0 ? cat.color : 'var(--text-muted)' }}
              >
                {count < 10 && count > 0 ? '0' + count : count === 0 ? '00' : count}
              </span>
            </div>
          );
        })}

        {/* Grand Total */}
        <div 
          className="flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center"
          style={{
            background: 'var(--bg-primary)',
            borderColor: grandTotal > 0 ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-subtle)',
          }}
        >
          <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {timeScope === 'ALL' ? 'Tổng toàn bộ' : 'Tổng năm ' + timeScope}
          </span>
          <span 
            className="text-xl sm:text-2xl font-black font-mono mt-0.5"
            style={{ color: grandTotal > 0 ? 'var(--status-rose)' : 'var(--status-green)' }}
          >
            {grandTotal < 10 && grandTotal > 0 ? '0' + grandTotal : grandTotal === 0 ? '00' : grandTotal}
          </span>
        </div>
      </div>

      {/* ── The Matrix / Heatmap Grid ── */}
      <div className="overflow-x-auto pb-2">
        <div className={timeScope === 'ALL' ? 'min-w-[400px]' : 'min-w-[620px]'}>
          {/* Header Column Labels */}
          <div 
            className="grid gap-1.5 pb-2 text-center text-[11px] font-bold"
            style={{ 
              gridTemplateColumns: '140px repeat(' + columns.length + ', 1fr)',
              color: 'var(--text-muted)' 
            }}
          >
            <div className="text-left pl-2">
              {timeScope === 'ALL' ? 'Phân hệ  Năm' : 'Phân hệ  Tháng'}
            </div>
            {columns.map(col => (
              <div key={col.key} className="uppercase font-mono tracking-wider">
                {col.label}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="space-y-1.5">
            {DTC_CATEGORIES.map(cat => {
              const rowData = matrixData[cat.id] || [];
              const rowTotal = categoryTotals[cat.id] || 0;

              return (
                <div 
                  key={cat.id} 
                  className="grid gap-1.5 items-center p-1 rounded-2xl transition"
                  style={{
                    gridTemplateColumns: '140px repeat(' + columns.length + ', 1fr)',
                    background: rowTotal > 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  {/* Category Name Label */}
                  <div className="flex items-center space-x-2 pl-2 overflow-hidden">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span 
                      className="text-xs font-bold truncate"
                      style={{ color: rowTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      title={cat.name + ' - ' + cat.shortName}
                    >
                      {cat.name}
                    </span>
                  </div>

                  {/* Column Cells */}
                  {rowData.map((colLogs, cIdx) => {
                    const count = colLogs.length;
                    const hasErrors = count > 0;
                    const col = columns[cIdx];
                    const label = timeScope === 'ALL' ? 'Năm ' + col.label : 'Tháng ' + (cIdx + 1) + '/' + timeScope;

                    return (
                      <button
                        key={cIdx}
                        onClick={() => {
                          if (hasErrors) {
                            setSelectedCell({
                              category: cat,
                              columnLabel: label,
                              logs: colLogs,
                            });
                          }
                        }}
                        disabled={!hasErrors}
                        className={
                          'h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all duration-150 ' +
                          (hasErrors 
                            ? 'text-white shadow-sm hover:scale-105 hover:brightness-110 active:scale-95 cursor-pointer ring-1 ring-white/20' 
                            : 'bg-black/10 dark:bg-white/[0.03] border border-white/5 opacity-40 cursor-default')
                        }
                        style={hasErrors ? {
                          backgroundColor: cat.color,
                          boxShadow: '0 2px 8px ' + cat.color + '40',
                        } : {}}
                        title={hasErrors ? cat.name + ' (' + label + '): ' + count + ' mã lỗi (Bấm để xem chi tiết)' : 'Không có lỗi'}
                      >
                        {hasErrors ? count : ''}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] pt-3 mt-2 border-t gap-2" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        <div className="flex items-center space-x-3 flex-wrap gap-1">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" />
            <span>P: Động cơ</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" />
            <span>C: Khung gầm</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" />
            <span>B: Thân vỏ</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded bg-pink-600 inline-block" />
            <span>U: Mạng CAN</span>
          </div>
        </div>
        <span className="italic">Bấm vào ô có số để xem chi tiết mã lỗi &amp; Freeze Frame</span>
      </div>

      {/* ── Drill-down Modal (When clicking a cell) ── */}
      {selectedCell && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCell(null)}
        >
          <div 
            className="w-full max-w-xl p-5 rounded-3xl shadow-2xl border transition-all animate-scale-up"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: selectedCell.category.color,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center space-x-2.5">
                <span 
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ background: selectedCell.category.color }}
                />
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Chi tiết lỗi: {selectedCell.category.name}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {selectedCell.columnLabel} ({selectedCell.logs.length} mã lỗi phát hiện)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of DTCs in this cell */}
            <div className="space-y-3 my-4 max-h-[60vh] overflow-y-auto pr-1">
              {selectedCell.logs.map(log => (
                <div 
                  key={log.id} 
                  className="p-3.5 rounded-2xl border transition"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-default)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-cyan-400">
                        {log.dtc_code}
                      </span>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded ' + (
                        log.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        log.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      )}>
                        {log.severity === 'CRITICAL' ? 'Nghiêm trọng' : log.severity === 'MEDIUM' ? 'Cảnh báo' : 'Nhẹ'}
                      </span>
                      <span className="text-[10px] font-semibold text-muted">
                        {log.is_active ? '🔴 Active' : '🟢 Đã xử lý'}
                      </span>
                    </div>

                    <span className="text-[10px] text-muted font-mono">
                      {new Date(log.first_detected_at || log.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <p className="text-xs font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
                    {log.description_vi || log.dtc_code}
                  </p>
                  {log.description_en && (
                    <p className="text-[11px] font-mono text-muted mt-0.5">
                      {log.description_en}
                    </p>
                  )}

                  {/* Freeze frame preview if available */}
                  {log.freeze_frame && Object.keys(log.freeze_frame).length > 0 && (
                    <div className="mt-2.5 p-2 rounded-xl bg-black/20 dark:bg-white/5 text-[10px] font-mono grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {Object.entries(log.freeze_frame).slice(0, 6).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted">{k}:</span> <span className="text-cyan-400 font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick Action buttons */}
                  <div className="flex items-center space-x-2 mt-3 pt-2 border-t border-white/5">
                    {onLookup && (
                      <button
                        onClick={() => {
                          setSelectedCell(null);
                          onLookup(log.dtc_code);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition"
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

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

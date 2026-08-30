'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, Sun, Moon, Laptop, DollarSign, Gauge, Eye, Check, Sparkles, LayoutDashboard } from 'lucide-react';

interface DisplayPreferences {
  theme: 'system' | 'dark' | 'light';
  currency: 'VND' | 'USD';
  distanceUnit: 'km' | 'mi';
  fuelUnit: 'L' | 'gal';
  consumptionFormat: 'L/100km' | 'km/L' | 'MPG';
  showTcoOverview: boolean;
  showMaintenanceAlerts: boolean;
  showMonthlyExpenseChart: boolean;
  showLoanTracker: boolean;
  showRecentLogs: boolean;
}

const DEFAULT_PREFS: DisplayPreferences = {
  theme: 'system',
  currency: 'VND',
  distanceUnit: 'km',
  fuelUnit: 'L',
  consumptionFormat: 'L/100km',
  showTcoOverview: true,
  showMaintenanceAlerts: true,
  showMonthlyExpenseChart: true,
  showLoanTracker: true,
  showRecentLogs: true,
};

export default function DisplaySettingsPage() {
  const [prefs, setPrefs] = useState<DisplayPreferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('fmms_ui_preferences');
      if (raw) {
        setPrefs(p => ({ ...p, ...JSON.parse(raw) }));
      }
    } catch {}
  }, []);

  const update = <K extends keyof DisplayPreferences>(key: K, value: DisplayPreferences[K]) => {
    setPrefs(p => ({ ...p, [key]: value }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem('fmms_ui_preferences', JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-6 h-6 text-cyan-400" />
          <span>Tùy Chỉnh Dashboard &amp; Giao Diện</span>
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Cấu hình hiển thị bảng điều khiển, đơn vị đo lường, tiền tệ và các thẻ thông tin
        </p>
      </div>

      {/* Theme Selection */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Sun className="w-4 h-4" />
          <span>Chế Độ Giao Diện (Theme)</span>
        </h3>
        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            { id: 'system', label: 'Tự động (Hệ điều hành)', icon: Laptop },
            { id: 'light', label: 'Giao diện Sáng (Light)', icon: Sun },
            { id: 'dark', label: 'Giao diện Tối (Dark)', icon: Moon },
          ].map(t => {
            const Icon = t.icon;
            const isSelected = prefs.theme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => update('theme', t.id as any)}
                className={`p-4 rounded-2xl cursor-pointer border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                  isSelected ? 'ring-2 ring-cyan-500 shadow-md scale-[1.01]' : 'hover:border-cyan-500/50'
                }`}
                style={{
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-primary)',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                }}
              >
                <Icon className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Units & Formatting */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Gauge className="w-4 h-4" />
          <span>Đơn Vị Đo Lường &amp; Tiền Tệ</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Đơn vị tiền tệ
            </label>
            <select
              value={prefs.currency}
              onChange={e => update('currency', e.target.value as any)}
              className="theme-select text-xs font-bold"
            >
              <option value="VND">VND (₫ - Đồng Việt Nam)</option>
              <option value="USD">USD ($ - US Dollar)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Đơn vị quãng đường
            </label>
            <select
              value={prefs.distanceUnit}
              onChange={e => update('distanceUnit', e.target.value as any)}
              className="theme-select text-xs font-bold"
            >
              <option value="km">Kilômét (km)</option>
              <option value="mi">Dặm (Miles)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Định mức tiêu thụ nhiên liệu
            </label>
            <select
              value={prefs.consumptionFormat}
              onChange={e => update('consumptionFormat', e.target.value as any)}
              className="theme-select text-xs font-bold"
            >
              <option value="L/100km">Lít / 100km (L/100km)</option>
              <option value="km/L">Kilômét / Lít (km/L)</option>
              <option value="MPG">Dặm / Gallon (MPG)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dashboard Widgets Visibility */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <LayoutDashboard className="w-4 h-4" />
          <span>Hiển Thị Thẻ Trên Bảng Điều Khiển (Dashboard Widgets)</span>
        </h3>

        <div className="space-y-2.5 pt-1">
          {[
            { key: 'showTcoOverview', label: 'Thẻ Tổng quan Chi phí Sở hữu (TCO)', desc: 'Hiển thị tổng tài sản xe, chi phí lũy kế & giá trị còn lại' },
            { key: 'showMaintenanceAlerts', label: 'Thẻ Nhắc nhở Bảo dưỡng & Đăng kiểm', desc: 'Cảnh báo hạn bảo dưỡng, bảo hiểm sắp hết hạn' },
            { key: 'showMonthlyExpenseChart', label: 'Biểu đồ Chi phí Theo Tháng (Stacked Area)', desc: 'Biểu đồ trực quan hóa chi tiêu theo từng danh mục' },
            { key: 'showLoanTracker', label: 'Thẻ Quản lý Khoản vay Mua xe (Loans)', desc: 'Dư nợ giảm dần, số tiền gốc & lãi phải trả mỗi tháng' },
            { key: 'showRecentLogs', label: 'Nhật ký Hoạt động & Đổ xăng gần đây', desc: 'Bảng ghi nhận giao dịch nhiên liệu và chuyến đi mới nhất' },
          ].map(w => {
            const isChecked = (prefs as any)[w.key];
            return (
              <label
                key={w.key}
                className="flex items-start justify-between p-3 rounded-xl cursor-pointer transition hover:bg-black/5 dark:hover:bg-white/5 border"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: isChecked ? 'var(--accent-cyan-border)' : 'var(--border-subtle)',
                }}
              >
                <div className="space-y-0.5">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{w.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{w.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => update(w.key as any, e.target.checked)}
                  className="mt-1 rounded accent-cyan-500 w-4 h-4"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition hover:opacity-90 shadow-md cursor-pointer"
          style={{ background: saved ? 'var(--status-green)' : 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          {saved ? (
            <><Check className="w-4 h-4" /><span>Đã lưu tùy chỉnh thành công!</span></>
          ) : (
            <><Sparkles className="w-4 h-4" /><span>Lưu Tùy Chỉnh Dashboard</span></>
          )}
        </button>
      </div>
    </div>
  );
}

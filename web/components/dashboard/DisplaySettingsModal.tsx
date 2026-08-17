'use client';

import React from 'react';
import { CardDisplaySettings } from '@/types/mobility';
import { X, Check, Sliders } from 'lucide-react';

interface DisplaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CardDisplaySettings;
  onSaveSettings: (newSettings: CardDisplaySettings) => void;
}

export const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = ({
  isOpen, onClose, settings, onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = React.useState<CardDisplaySettings>(settings);

  if (!isOpen) return null;

  const toggleField = (key: keyof Omit<CardDisplaySettings, 'cardStyle'>) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fields: { key: keyof Omit<CardDisplaySettings, 'cardStyle'>; label: string; desc: string }[] = [
    { key: 'showPhoto', label: 'Hình ảnh phương tiện', desc: 'Hiển thị ảnh đại diện xe trên thẻ card' },
    { key: 'showName', label: 'Tên phương tiện & Model', desc: 'Tên hiển thị chính (vd: Mazda2 Base 2026)' },
    { key: 'showType', label: 'Badge Loại phương tiện', desc: 'Huy hiệu phân loại (Ô tô, Xe đạp, Xe điện...)' },
    { key: 'showPrice', label: 'Giá mua ban đầu', desc: 'Hiển thị giá mua tài sản' },
    { key: 'showLicensePlate', label: 'Biển số xe', desc: 'Hiển thị biển số đăng ký' },
    { key: 'showOdometer', label: 'Số km / Quãng đường (ODO)', desc: 'Hiển thị ODO thực tế hoặc Virtual ODO' },
    { key: 'showFuelLevel', label: 'Mức Nhiên liệu / Pin', desc: 'Mức xăng % hoặc dung lượng pin %' },
    { key: 'showConsumption', label: 'Mức tiêu thụ trung bình', desc: 'Số L/100km tiêu thụ thực tế' },
    { key: 'showRange', label: 'Số km còn đi được (Range)', desc: 'Phạm vi hoạt động ước tính dựa trên nhiên liệu' },
    { key: 'showNextMaintenance', label: 'Bảo dưỡng tiếp theo', desc: 'Thời hạn bảo dưỡng sắp tới' },
  ];

  const handleSave = () => {
    try {
      localStorage.setItem('fmms_card_settings', JSON.stringify(localSettings));
      window.dispatchEvent(new Event('fmms_settings_updated'));
    } catch {}
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="glass-panel w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Tùy chỉnh thẻ phương tiện</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Chọn các thông tin hiển thị trên Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          {fields.map((f) => {
            const isChecked = localSettings[f.key];
            return (
              <div
                key={f.key}
                onClick={() => toggleField(f.key)}
                className="p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                style={isChecked
                  ? { background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }
                  : { background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
              >
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 ml-3 transition-colors"
                  style={isChecked
                    ? { background: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)', color: 'white' }
                    : { background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end space-x-3" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition hover:opacity-80"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};

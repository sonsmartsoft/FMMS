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
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = React.useState<CardDisplaySettings>(settings);

  if (!isOpen) return null;

  const toggleField = (key: keyof Omit<CardDisplaySettings, 'cardStyle'>) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const fields: { key: keyof Omit<CardDisplaySettings, 'cardStyle'>; label: string; desc: string }[] = [
    { key: 'showPhoto', label: 'Hình ảnh phương tiện', desc: 'Hiển thị ảnh đại diện xe trên thẻ card' },
    { key: 'showName', label: 'Tên phương tiện & Model', desc: 'Tên hiển thị chính (vd: Mazda2 Base 2026)' },
    { key: 'showType', label: 'Badge Loại phương tiện', desc: 'Huy hiệu phân loại (Ô tồ, Xe đạp, Xe điện,...)' },
    { key: 'showPrice', label: 'Giá mua ban đầu', desc: 'Hiển thị giá mua tài sản' },
    { key: 'showLicensePlate', label: 'Biển số xe', desc: 'Hiển thị biển số đăng ký' },
    { key: 'showOdometer', label: 'Số km / Quãng đường (ODO)', desc: 'Hiển thị ODO thực tế hoặc Virtual ODO' },
    { key: 'showFuelLevel', label: 'Mức Nhiên liệu / Pin', desc: 'Mức xăng % hoặc dung lượng pin %' },
    { key: 'showConsumption', label: 'Mức tiêu thụ trung bình', desc: 'Số L/100km tiêu thụ thực tế' },
    { key: 'showRange', label: 'Số km còn đi được (Range)', desc: 'Phạm vi hoạt động ước tính dựa trên nhiên liệu' },
    { key: 'showNextMaintenance', label: 'Bảo dưỡng tiếp theo', desc: 'Thời hạn bảo dưỡng sắp tới' },
  ];

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Tùy chỉnh thẻ phương tiện</h2>
              <p className="text-xs text-slate-400">Chọn các thông tin hiển thị trên Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {fields.map((f) => {
            const isChecked = localSettings[f.key];
            return (
              <div
                key={f.key}
                onClick={() => toggleField(f.key)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-cyan-950/30 border-cyan-500/40 text-slate-100'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-white">{f.label}</p>
                  <p className="text-[11px] text-slate-400">{f.desc}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                    isChecked
                      ? 'bg-cyan-500 border-cyan-400 text-white'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end space-x-3 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition"
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};

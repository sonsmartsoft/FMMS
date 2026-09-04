'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, X, Check, AlertTriangle } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';

export const MASTER_ADMIN_PIN = '0075';

interface AdminSecurityPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  actionName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminSecurityPinModal({
  isOpen,
  title = 'Xác thực Quyền Quản Trị Viên (Admin PIN)',
  description = 'Hành động này mang tính chất quan trọng và nguy hiểm. Vui lòng nhập mã PIN Quản trị viên để xác nhận.',
  actionName = 'Xác nhận xóa',
  onClose,
  onSuccess,
}: AdminSecurityPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.trim() === MASTER_ADMIN_PIN) {
      setError(null);
      onSuccess();
      onClose();
    } else {
      setError('❌ Mã PIN Quản trị viên không chính xác! Hành động bị chặn lại để bảo vệ an toàn dữ liệu.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <DraggableModal isOpen={isOpen} onClose={onClose}>
      <div
        className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[92vw] sm:w-[460px] max-w-md shadow-2xl overflow-hidden animate-fadeIn"
        style={{
          border: '1px solid rgba(244,63,94,0.35)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 25px 50px -12px rgba(244,63,94,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-default)', background: 'rgba(244,63,94,0.08)' }}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p className="text-[10px] text-rose-400 font-semibold">Bảo mật cấp cao • Yêu cầu mã PIN Quản trị viên</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerify} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl flex items-start space-x-2.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p style={{ color: 'var(--text-secondary)' }} className="leading-relaxed">
              {description}
            </p>
          </div>

          <div>
            <label className="block mb-1.5 font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-primary)' }}>
              Nhập mã PIN Admin (4 chữ số):
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                className="theme-input text-center font-mono font-black text-2xl tracking-[0.4em] py-2.5"
                placeholder="••••"
                autoComplete="off"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-faint)' }} />
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl text-xs font-semibold" style={{ background: 'rgba(244,63,94,0.12)', color: 'var(--status-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-semibold hover:bg-white/10 transition"
              style={{ color: 'var(--text-muted)' }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!pin}
              className="px-5 py-2 rounded-xl text-white font-bold transition shadow-lg flex items-center space-x-1.5"
              style={{
                background: 'linear-gradient(135deg, #F43F5E, #E11D48)',
                opacity: pin ? 1 : 0.6,
                cursor: pin ? 'pointer' : 'not-allowed',
              }}
            >
              <Check className="w-4 h-4" />
              <span>{actionName}</span>
            </button>
          </div>
        </form>
      </div>
    </DraggableModal>
  );
}

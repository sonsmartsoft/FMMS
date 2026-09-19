'use client';

import React, { useState } from 'react';
import { Fuel, Wrench, CreditCard, CheckCircle2, XCircle, Loader2, Sparkles, Calendar, Gauge, Building, DollarSign } from 'lucide-react';
import { createFuelLog } from '@/lib/services/fuelService';
import { createExpense } from '@/lib/services/expenseService';
import { createMaintenanceRecord } from '@/lib/services/maintenanceService';

export interface ActionPayload {
  action_type: 'LOG_FUEL' | 'LOG_EXPENSE' | 'LOG_MAINTENANCE';
  title?: string;
  data: {
    asset_id?: string;
    asset_name?: string;
    date?: string;
    total_cost?: number;
    amount?: number;
    cost?: number;
    price_per_liter?: number;
    liters?: number;
    fuel_liters?: number;
    station?: string;
    vendor?: string;
    odometer_km?: number;
    notes?: string;
    category?: string;
    subcategory?: string;
    description?: string;
    maintenance_type?: string;
    next_due_km?: number;
    next_due_date?: string;
  };
}

interface FMMSActionCardProps {
  payload: ActionPayload;
  onSuccess?: (msg: string) => void;
}

export const FMMSActionCard: React.FC<FMMSActionCardProps> = ({ payload, onSuccess }) => {
  const [status, setStatus] = useState<'idle' | 'executing' | 'success' | 'cancelled' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  const { action_type, data } = payload;

  const fmtMoney = (n?: number) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');
  const todayStr = new Date().toISOString().slice(0, 10);
  const recordDate = data.date || todayStr;
  const assetId = data.asset_id || '20260308-0001-4222-8888-19b213872026'; // Mazda 2 default

  // Computed fields
  const cost = data.total_cost ?? data.amount ?? data.cost ?? 0;
  const liters = data.liters ?? data.fuel_liters ?? (data.price_per_liter && cost ? +(cost / data.price_per_liter).toFixed(2) : 0);
  const price = data.price_per_liter ?? (liters > 0 && cost > 0 ? Math.round(cost / liters) : 0);

  const handleConfirm = async () => {
    setStatus('executing');
    setErrorMsg('');

    try {
      if (action_type === 'LOG_FUEL') {
        await createFuelLog({
          asset_id: assetId,
          date: recordDate,
          liters: Number(liters),
          price_per_liter: Number(price),
          total_cost: Number(cost),
          odometer_km: data.odometer_km || 0,
          station: data.station || 'Cây xăng',
          notes: data.notes || 'Ghi nhận tự động qua AI Cố vấn',
        });
        setResultMsg(`Đã lưu thành công ${liters}L (${fmtMoney(cost)}) vào sổ xăng!`);
      } else if (action_type === 'LOG_MAINTENANCE') {
        await createMaintenanceRecord({
          asset_id: assetId,
          maintenance_type: data.maintenance_type || data.category || 'Bảo dưỡng định kỳ',
          date: recordDate,
          cost: Number(cost),
          odometer_km: data.odometer_km || 0,
          vendor: data.vendor || 'Gara sửa chữa',
          notes: data.notes || data.description || 'Ghi nhận tự động qua AI Cố vấn',
          next_due_km: data.next_due_km,
          next_due_date: data.next_due_date,
        });
        setResultMsg(`Đã ghi nhận bảo dưỡng "${data.maintenance_type || 'Bảo dưỡng'}" (${fmtMoney(cost)})!`);
      } else {
        // Map category & subcategory chuẩn xác theo hệ thống TAXONOMY của FMMS
        let mappedCat: any = data.category || 'Running';
        let mappedSubcat: string | undefined = data.subcategory;
        const descLower = (data.description || data.notes || '').toLowerCase();

        if (descLower.includes('rửa') || descLower.includes('rua')) {
          mappedCat = 'Running';
          mappedSubcat = 'Car Wash';
        } else if (descLower.includes('gửi') || descLower.includes('gui') || descLower.includes('đỗ') || descLower.includes('do xe')) {
          mappedCat = 'Running';
          mappedSubcat = 'Parking';
        } else if (descLower.includes('cầu đường') || descLower.includes('bot') || descLower.includes('vetc') || descLower.includes('epass')) {
          mappedCat = 'Running';
          mappedSubcat = 'Epass Fee';
        } else if (descLower.includes('phạt') || descLower.includes('phat')) {
          mappedCat = 'Running';
          mappedSubcat = 'Running Fine';
        }

        await createExpense({
          asset_id: assetId,
          date: recordDate,
          category: mappedCat,
          subcategory: mappedSubcat,
          amount: Number(cost),
          vendor: data.vendor || undefined,
          odometer_km: data.odometer_km,
          description: data.description || data.notes || 'Ghi nhận chi phí qua AI Cố vấn',
        });
        setResultMsg(`Đã ghi nhận khoản chi ${fmtMoney(cost)} (${mappedSubcat || mappedCat}) vào sổ chi phí!`);
      }

      setStatus('success');
      if (onSuccess) onSuccess(resultMsg);

      // Phát sự kiện toàn cục để các trang tự động reload số liệu
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fmms_data_updated', { detail: { type: action_type } }));
      }
    } catch (err: any) {
      console.error('[FMMSActionCard] Execution failed:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu vào database.');
      setStatus('error');
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
  };

  if (status === 'cancelled') {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 text-xs text-slate-400 italic flex items-center gap-2">
        <XCircle className="w-4 h-4" />
        <span>Đã hủy thao tác ghi nhận giao dịch.</span>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="my-2.5 p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/40 text-xs shadow-sm flex items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-200 text-xs">Ghi nhận hoàn tất!</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-[11px] truncate">{resultMsg}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          ĐÃ LƯU DATABASE ✓
        </span>
      </div>
    );
  }

  // Config UI by action type
  const isFuel = action_type === 'LOG_FUEL';
  const isMaint = action_type === 'LOG_MAINTENANCE';

  const themeConfig = isFuel
    ? {
        icon: Fuel,
        colorHex: '#0ea5e9',
        title: payload.title || 'XÁC NHẬN GHI SỔ NHIÊN LIỆU',
        bg: 'from-sky-500/10 via-cyan-500/5 to-transparent',
        border: 'border-sky-500/30 hover:border-sky-500/60',
        badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
        accentBtn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20',
      }
    : isMaint
    ? {
        icon: Wrench,
        colorHex: '#f59e0b',
        title: payload.title || 'XÁC NHẬN GHI SỔ BẢO DƯỠNG',
        bg: 'from-amber-500/10 via-orange-500/5 to-transparent',
        border: 'border-amber-500/30 hover:border-amber-500/60',
        badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        accentBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20',
      }
    : {
        icon: CreditCard,
        colorHex: '#8b5cf6',
        title: payload.title || 'XÁC NHẬN GHI SỔ CHI PHÍ VẬN HÀNH',
        bg: 'from-purple-500/10 via-indigo-500/5 to-transparent',
        border: 'border-purple-500/30 hover:border-purple-500/60',
        badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
        accentBtn: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20',
      };

  const IconComp = themeConfig.icon;

  return (
    <div
      className={`my-3 p-4 rounded-2xl border transition-all duration-300 bg-gradient-to-br ${themeConfig.bg} bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md ${themeConfig.border}`}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${themeConfig.colorHex}25 0%, ${themeConfig.colorHex}10 100%)`,
              border: `1px solid ${themeConfig.colorHex}40`,
              color: themeConfig.colorHex,
            }}
          >
            <IconComp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                {themeConfig.title}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              AI Cố vấn đã tự động bóc tách các thông số từ tin nhắn của bạn
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${themeConfig.badge}`}>
          DỰ THẢO 1-CLICK
        </span>
      </div>

      {/* 2. Body Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200/70 dark:border-slate-800/70 text-xs mb-3">
        {/* Số tiền */}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Tổng số tiền:</span>
          <span className="text-base font-black text-rose-600 dark:text-rose-400">{fmtMoney(cost)}</span>
        </div>

        {/* Ngày ghi nhận */}
        <div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Ngày:
          </span>
          <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{recordDate}</span>
        </div>

        {/* ODO nếu có */}
        {data.odometer_km != null && data.odometer_km > 0 && (
          <div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Gauge className="w-3 h-3 text-slate-400" /> ODO:
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{data.odometer_km.toLocaleString('vi-VN')} km</span>
          </div>
        )}

        {/* Thông số đặc thù: Xăng dầu */}
        {isFuel && (
          <>
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Thể tích xăng:</span>
              <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">{liters} Lít</span>
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Đơn giá:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{fmtMoney(price)}/L</span>
            </div>
            {data.station && (
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Cây xăng:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">{data.station}</span>
              </div>
            )}
          </>
        )}

        {/* Thông số đặc thù: Bảo dưỡng / Chi phí */}
        {!isFuel && (
          <>
            <div className="col-span-2">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Hạng mục:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                {data.maintenance_type || data.category || data.description || 'Chi phí vận hành'}
              </span>
            </div>
            {data.vendor && (
              <div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" /> Gara / Đơn vị:
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">{data.vendor}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Thông báo lỗi nếu có */}
      {status === 'error' && (
        <div className="mb-3 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={status === 'executing'}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
        >
          Hủy bỏ
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={status === 'executing'}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition ${themeConfig.accentBtn} disabled:opacity-50`}
        >
          {status === 'executing' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Đang lưu vào Supabase...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Xác nhận Lưu vào Lịch sử</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FMMSActionCard;

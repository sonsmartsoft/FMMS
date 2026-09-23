'use client';

import React, { useState, useEffect } from 'react';
import { Fuel, Wrench, CreditCard, CheckCircle2, XCircle, Loader2, Sparkles, Calendar, Gauge, Building, DollarSign, Pencil, Check, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Wallet, Trash2, RotateCcw, Tag, Layers } from 'lucide-react';
import { createFuelLog, deleteFuelLog } from '@/lib/services/fuelService';
import { createExpense, deleteExpense } from '@/lib/services/expenseService';
import { createMaintenanceRecord, deleteMaintenanceRecord } from '@/lib/services/maintenanceService';
import { createFamilyTransaction, deleteFamilyTransaction, getCategories, getWallets } from '@/lib/services/familyFinanceService';
import { SAMPLE_FAMILY_CATEGORIES } from '@/lib/data/sampleFinanceCategories';
import { TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import { getMasterMaintenanceCategories, DEFAULT_MAINT_CATEGORIES } from '@/lib/services/masterDataService';
import { TransactionCategory, Wallet as WalletType } from '@/types/finance';

export interface ActionPayload {
  action_type: 'LOG_FUEL' | 'LOG_EXPENSE' | 'LOG_MAINTENANCE' | 'LOG_GENERAL_EXPENSE' | 'LOG_INCOME' | 'TRANSFER_WALLET';
  title?: string;
  data: {
    wallet_id?: string;
    to_wallet_id?: string;
    category_id?: string;
    parent_category?: string;
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
    payee_vendor?: string;
    odometer_km?: number;
    notes?: string;
    category?: string;
    subcategory?: string;
    description?: string;
    maintenance_type?: string;
    next_due_km?: number;
    next_due_date?: string;
    wallet_name?: string;
    to_wallet_name?: string;
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
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedType, setSavedType] = useState<string | null>(null);

  const { action_type, data } = payload;

  const fmtMoney = (n?: number) => (n != null ? Number(n).toLocaleString('vi-VN') + ' ₫' : '—');
  const todayStr = new Date().toISOString().slice(0, 10);
  const recordDate = data.date || todayStr;
  const assetId = data.asset_id || '20260308-0001-4222-8888-19b213872026'; // Mazda 2 default

  // Chuẩn hóa ODO: Nếu bị AI đoán mò > 10.000 km trong khi xe mới chạy ~3.338 km -> đưa về 3.339 km
  const rawOdo = data.odometer_km;
  const initialOdo = (rawOdo && rawOdo < 10000 && rawOdo > 1000) ? rawOdo : 3339;

  // Chuẩn hóa Cost: Nếu lỡ bị thiếu số 0 (80.000 thay vì 800.000 cho thay dầu)
  let rawCost = data.total_cost ?? data.amount ?? data.cost ?? 0;
  if (rawCost === 80000 && (data.maintenance_type?.toLowerCase().includes('dầu') || data.description?.toLowerCase().includes('dầu'))) {
    rawCost = 800000;
  }

  // Computed initial fields
  const initialLiters = data.liters ?? data.fuel_liters ?? (data.price_per_liter && rawCost ? +(rawCost / data.price_per_liter).toFixed(2) : 0);
  const initialPrice = data.price_per_liter ?? (initialLiters > 0 && rawCost > 0 ? Math.round(rawCost / initialLiters) : 0);

  // Master Data state
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [taxonomy, setTaxonomy] = useState(TAXONOMY);
  const [maintCats, setMaintCats] = useState<string[]>(DEFAULT_MAINT_CATEGORIES);

  // Selected Category IDs from Master Data
  const [selectedParentId, setSelectedParentId] = useState<string>('cat-food');
  const [selectedSubId, setSelectedSubId] = useState<string>('cat-food-dining');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(data.wallet_id || 'w-tcb-01');

  // Mobility Taxonomy selections
  const [mobCatKey, setMobCatKey] = useState<string>('Running');
  const [mobSubKey, setMobSubKey] = useState<string>('Car Wash');
  const [selectedMaintType, setSelectedMaintType] = useState<string>('Thay dầu máy');

  // Trạng thái cho phép người dùng chỉnh sửa trực tiếp trên thẻ
  const [isEditing, setIsEditing] = useState(false);
  const [editCost, setEditCost] = useState<number>(rawCost);
  const [editOdo, setEditOdo] = useState<number>(initialOdo);
  const [editDate, setEditDate] = useState<string>(recordDate);
  const [editVendor, setEditVendor] = useState<string>(data.vendor || data.payee_vendor || (action_type === 'LOG_MAINTENANCE' ? 'Gara sửa chữa' : 'Tiệm dịch vụ'));
  const [editDescription, setEditDescription] = useState<string>(data.description || data.notes || '');
  const [editLiters, setEditLiters] = useState<number>(initialLiters);
  const [editPrice, setEditPrice] = useState<number>(initialPrice);

  // Load Master Data & Smart Match
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getCategories(),
      getWallets(),
      getMasterMaintenanceCategories(),
    ]).then(([cList, wList, mList]) => {
      if (!isMounted) return;

      // Flatten fallback categories if needed
      let loadedCats: TransactionCategory[] = [];
      if (cList && cList.length > 0) {
        loadedCats = cList;
      } else {
        SAMPLE_FAMILY_CATEGORIES.forEach((p) => {
          loadedCats.push({
            id: p.id,
            name: p.name,
            type: p.type,
            parent_id: null,
            color: p.color,
            icon: p.icon,
            budget_bucket: p.budget_bucket,
            is_essential: p.is_essential,
            is_system: p.is_system,
            display_order: p.display_order,
          });
          if (p.children) {
            p.children.forEach((c) => {
              loadedCats.push({
                id: c.id,
                name: c.name,
                type: c.type,
                parent_id: p.id,
                color: c.color,
                icon: c.icon,
                budget_bucket: c.budget_bucket,
                is_essential: c.is_essential,
                is_system: c.is_system,
                display_order: c.display_order,
              });
            });
          }
        });
      }
      setCategories(loadedCats);
      if (wList && wList.length > 0) setWallets(wList);
      if (mList && mList.length > 0) setMaintCats(mList);
      const tax = getDynamicTaxonomy();
      setTaxonomy(tax);

      const parents = loadedCats.filter((c) => !c.parent_id);
      const subs = loadedCats.filter((c) => !!c.parent_id);

      // Match category by ID or hint text
      let matchedSub = data.category_id ? subs.find((c) => c.id === data.category_id) : null;
      let matchedParent = matchedSub ? parents.find((p) => p.id === matchedSub!.parent_id) : null;

      if (!matchedSub) {
        const textHints = `${data.parent_category || ''} ${data.category || ''} ${data.subcategory || ''} ${data.description || ''} ${data.maintenance_type || ''}`.toLowerCase();
        if (textHints.includes('rửa') || textHints.includes('wash')) {
          matchedSub = subs.find((c) => c.id === 'cat-mob-wash') || subs.find((c) => c.name.toLowerCase().includes('rửa'));
        } else if (textHints.includes('xăng') || textHints.includes('fuel')) {
          matchedSub = subs.find((c) => c.id === 'cat-mob-fuel') || subs.find((c) => c.name.toLowerCase().includes('xăng'));
        } else if (textHints.includes('bảo dưỡng') || textHints.includes('thay dầu') || textHints.includes('maint')) {
          matchedSub = subs.find((c) => c.id === 'cat-mob-maint') || subs.find((c) => c.name.toLowerCase().includes('bảo dưỡng'));
        } else if (textHints.includes('gửi xe') || textHints.includes('đỗ xe') || textHints.includes('parking')) {
          matchedSub = subs.find((c) => c.id === 'cat-mob-parking') || subs.find((c) => c.name.toLowerCase().includes('gửi xe'));
        } else if (textHints.includes('cầu đường') || textHints.includes('bot') || textHints.includes('vetc') || textHints.includes('toll')) {
          matchedSub = subs.find((c) => c.id === 'cat-mob-toll') || subs.find((c) => c.name.toLowerCase().includes('cầu đường'));
        } else if (textHints.includes('chợ') || textHints.includes('siêu thị')) {
          matchedSub = subs.find((c) => c.id === 'cat-food-groceries');
        } else if (textHints.includes('ăn') || textHints.includes('uống') || textHints.includes('nhà hàng') || textHints.includes('buffet')) {
          matchedSub = subs.find((c) => c.id === 'cat-food-dining');
        } else if (textHints.includes('điện')) {
          matchedSub = subs.find((c) => c.id === 'cat-home-bills');
        } else if (textHints.includes('nước')) {
          matchedSub = subs.find((c) => c.id === 'cat-home-water');
        } else if (textHints.includes('học')) {
          matchedSub = subs.find((c) => c.id === 'cat-edu-tuition');
        } else if (textHints.includes('thuốc') || textHints.includes('khám')) {
          matchedSub = subs.find((c) => c.id === 'cat-health-hospital' || c.id === 'cat-health-meds');
        } else if (textHints.includes('lương')) {
          matchedSub = subs.find((c) => c.id === 'cat-inc-salary');
        }
      }

      if (matchedSub) {
        matchedParent = parents.find((p) => p.id === matchedSub!.parent_id) || null;
        if (matchedParent) {
          setSelectedParentId(matchedParent.id);
          setSelectedSubId(matchedSub.id);
        }
      } else if (parents.length > 0) {
        const defP = action_type === 'LOG_INCOME'
          ? parents.find((p) => p.type === 'INCOME') || parents[0]
          : parents.find((p) => p.id === 'cat-food') || parents[0];
        setSelectedParentId(defP.id);
        const childOfDef = subs.filter((c) => c.parent_id === defP.id);
        if (childOfDef.length > 0) setSelectedSubId(childOfDef[0].id);
      }

      // Match Mobility Taxonomy
      const rawCat = data.category || '';
      const rawSub = data.subcategory || '';
      if (rawCat && tax[rawCat]) {
        setMobCatKey(rawCat);
        if (rawSub && tax[rawCat].subcategories[rawSub]) {
          setMobSubKey(rawSub);
        } else {
          setMobSubKey(Object.keys(tax[rawCat].subcategories)[0] || 'Car Wash');
        }
      } else {
        const textHints = `${data.description || ''} ${data.maintenance_type || ''} ${data.category || ''}`.toLowerCase();
        if (textHints.includes('rửa')) {
          setMobCatKey('Running'); setMobSubKey('Car Wash');
        } else if (textHints.includes('gửi') || textHints.includes('đỗ')) {
          setMobCatKey('Running'); setMobSubKey('Parking');
        } else if (textHints.includes('cầu') || textHints.includes('bot') || textHints.includes('epass')) {
          setMobCatKey('Running'); setMobSubKey('Epass Fee');
        } else if (textHints.includes('xăng')) {
          setMobCatKey('Running'); setMobSubKey('Fuel');
        } else if (textHints.includes('bảo dưỡng') || textHints.includes('dầu')) {
          setMobCatKey('Maintenance'); setMobSubKey('General Service');
        }
      }

      // Match Maintenance type
      if (data.maintenance_type) {
        const found = mList?.find((m: string) => m.toLowerCase().includes(data.maintenance_type!.toLowerCase()));
        if (found) setSelectedMaintType(found);
        else setSelectedMaintType(data.maintenance_type);
      } else {
        const textHints = `${data.description || ''}`.toLowerCase();
        if (textHints.includes('nhớt') || textHints.includes('dầu')) setSelectedMaintType('Thay dầu máy');
        else if (textHints.includes('lọc gió')) setSelectedMaintType('Thay lọc gió động cơ');
        else if (textHints.includes('lốp')) setSelectedMaintType('Thay lốp xe');
        else if (textHints.includes('phanh')) setSelectedMaintType('Kiểm tra & Thay má phanh');
      }
    });

    return () => { isMounted = false; };
  }, [action_type, data]);

  const handleParentCatChange = (newParentId: string) => {
    setSelectedParentId(newParentId);
    const subs = categories.filter((c) => c.parent_id === newParentId);
    if (subs.length > 0) {
      setSelectedSubId(subs[0].id);
    } else {
      setSelectedSubId(newParentId);
    }
  };

  const handleMobCatChange = (newCatKey: string) => {
    setMobCatKey(newCatKey);
    const subKeys = Object.keys(taxonomy[newCatKey]?.subcategories || {});
    if (subKeys.length > 0) {
      setMobSubKey(subKeys[0]);
    }
  };

  const currentParentCat = categories.find((c) => c.id === selectedParentId);
  const currentSubCat = categories.find((c) => c.id === selectedSubId);
  const currentWallet = wallets.find((w) => w.id === selectedWalletId);

  const handleConfirm = async () => {
    setStatus('executing');
    setErrorMsg('');

    try {
      if (action_type === 'LOG_FUEL') {
        const created = await createFuelLog({
          asset_id: assetId,
          date: editDate,
          liters: Number(editLiters),
          price_per_liter: Number(editPrice),
          total_cost: Number(editCost),
          odometer_km: Number(editOdo) || 0,
          station: editVendor || data.station || 'Cây xăng',
          notes: editDescription || data.notes || 'Ghi nhận tự động qua AI Cố vấn',
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('LOG_FUEL');
        setResultMsg(`Đã lưu thành công ${editLiters}L (${fmtMoney(editCost)}) vào sổ xăng!`);
      } else if (action_type === 'LOG_MAINTENANCE') {
        const finalType = selectedMaintType || data.maintenance_type || 'Bảo dưỡng định kỳ';
        const created = await createMaintenanceRecord({
          asset_id: assetId,
          maintenance_type: finalType,
          date: editDate,
          cost: Number(editCost),
          odometer_km: Number(editOdo) || 0,
          vendor: editVendor,
          notes: editDescription || data.notes || data.description || 'Ghi nhận tự động qua AI Cố vấn',
          next_due_km: data.next_due_km,
          next_due_date: data.next_due_date,
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('LOG_MAINTENANCE');
        setResultMsg(`Đã ghi nhận bảo dưỡng "${finalType}" (${fmtMoney(editCost)}) ở mốc ODO ${editOdo.toLocaleString('vi-VN')} km!`);
      } else if (action_type === 'LOG_GENERAL_EXPENSE') {
        const finalCatId = selectedSubId || selectedParentId || 'cat-food-dining';
        const finalDesc = editDescription || currentSubCat?.name || currentParentCat?.name || 'Chi tiêu gia đình';
        const created = await createFamilyTransaction({
          wallet_id: selectedWalletId || data.wallet_id || 'w-tcb-01',
          category_id: finalCatId,
          asset_id: data.asset_id || null,
          transaction_type: 'EXPENSE',
          amount: Number(editCost),
          date: editDate,
          payee_vendor: editVendor || data.payee_vendor,
          description: finalDesc,
          notes: data.notes,
          is_essential: true,
          exclude_from_reports: false,
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('LOG_GENERAL_EXPENSE');
        setResultMsg(`Đã ghi sổ chi tiêu ${fmtMoney(editCost)} [${currentSubCat?.name || finalDesc}] vào ví gia đình!`);
      } else if (action_type === 'LOG_INCOME') {
        const finalCatId = selectedSubId || selectedParentId || 'cat-inc-salary';
        const finalDesc = editDescription || currentSubCat?.name || 'Thu nhập gia đình';
        const created = await createFamilyTransaction({
          wallet_id: selectedWalletId || data.wallet_id || 'w-vcb-01',
          category_id: finalCatId,
          transaction_type: 'INCOME',
          amount: Number(editCost),
          date: editDate,
          payee_vendor: editVendor || data.payee_vendor || 'Nguồn thu',
          description: finalDesc,
          notes: data.notes,
          is_essential: true,
          exclude_from_reports: false,
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('LOG_INCOME');
        setResultMsg(`Đã ghi nhận thu nhập +${fmtMoney(editCost)} [${currentSubCat?.name || finalDesc}] vào ví gia đình!`);
      } else if (action_type === 'TRANSFER_WALLET') {
        const created = await createFamilyTransaction({
          wallet_id: data.wallet_id || 'w-tcb-01',
          to_wallet_id: data.to_wallet_id || 'w-momo-01',
          category_id: 'cat-transfer',
          transaction_type: 'TRANSFER',
          amount: Number(editCost),
          date: editDate,
          description: `Chuyển ví qua AI: ${data.wallet_name || 'Ví nguồn'} ➔ ${data.to_wallet_name || 'Ví đích'}`,
          is_essential: false,
          exclude_from_reports: false,
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('TRANSFER_WALLET');
        setResultMsg(`Đã thực hiện chuyển ${fmtMoney(editCost)} thành công!`);
      } else {
        const mappedSubcatLabel = taxonomy[mobCatKey]?.subcategories[mobSubKey] || mobSubKey;
        const finalDesc = editDescription || `${mappedSubcatLabel} (${taxonomy[mobCatKey]?.label || mobCatKey})`;

        const created = await createExpense({
          asset_id: assetId,
          date: editDate,
          category: mobCatKey,
          subcategory: mobSubKey,
          amount: Number(editCost),
          vendor: editVendor,
          odometer_km: Number(editOdo) || undefined,
          description: finalDesc,
        });
        if (created?.id) setSavedId(created.id);
        setSavedType('LOG_EXPENSE');

        setResultMsg(`Đã ghi nhận khoản chi ${fmtMoney(editCost)} [${mappedSubcatLabel}] vào sổ xe và tài chính gia đình!`);
      }

      setStatus('success');
      if (onSuccess) onSuccess(resultMsg);

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

  const handleDeleteSaved = async () => {
    if (!confirm('Bạn có chắc muốn xóa và hoàn tác giao dịch này khỏi sổ cái?')) return;
    try {
      if (savedId) {
        if (savedType === 'LOG_FUEL') await deleteFuelLog(savedId);
        else if (savedType === 'LOG_MAINTENANCE') await deleteMaintenanceRecord(savedId);
        else if (savedType === 'LOG_GENERAL_EXPENSE' || savedType === 'LOG_INCOME' || savedType === 'TRANSFER_WALLET') {
          await deleteFamilyTransaction(savedId);
        } else {
          await deleteExpense(savedId);
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fmms_data_updated', { detail: { type: action_type } }));
      }
      setStatus('cancelled');
    } catch (e: any) {
      alert('Không thể xóa: ' + (e?.message || 'Có lỗi xảy ra'));
    }
  };

  const handleEditSaved = async () => {
    if (savedId) {
      try {
        if (savedType === 'LOG_FUEL') await deleteFuelLog(savedId);
        else if (savedType === 'LOG_MAINTENANCE') await deleteMaintenanceRecord(savedId);
        else if (savedType === 'LOG_GENERAL_EXPENSE' || savedType === 'LOG_INCOME' || savedType === 'TRANSFER_WALLET') {
          await deleteFamilyTransaction(savedId);
        } else {
          await deleteExpense(savedId);
        }
      } catch {}
    }
    setStatus('idle');
    setIsEditing(true);
  };

  if (status === 'cancelled') {
    return (
      <div className="my-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40 text-xs text-slate-400 italic flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          <span>Đã hủy thao tác ghi nhận giao dịch.</span>
        </div>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Mở lại dự thảo</span>
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="my-2.5 p-3.5 rounded-2xl border border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/40 text-xs shadow-sm space-y-2.5 animate-fadeIn">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-200 text-xs">Ghi nhận hoàn tất!</p>
              <p className="text-emerald-600 dark:text-emerald-400 text-[11px] truncate">{resultMsg}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
            ĐÃ LƯU DATABASE ✓
          </span>
        </div>

        {/* Thao tác Sửa / Xóa Hoàn tác sau khi lưu */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-500/20">
          <button
            type="button"
            onClick={handleEditSaved}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition"
            title="Chỉnh sửa lại số liệu vừa lưu"
          >
            <Pencil className="w-3 h-3" />
            <span>Sửa lại số liệu</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteSaved}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition"
            title="Xóa giao dịch này khỏi sổ cái"
          >
            <Trash2 className="w-3 h-3" />
            <span>Xóa / Hoàn tác</span>
          </button>
        </div>
      </div>
    );
  }

  // Config UI by action type
  const isFuel = action_type === 'LOG_FUEL';
  const isMaint = action_type === 'LOG_MAINTENANCE';
  const isIncome = action_type === 'LOG_INCOME';
  const isGeneralExp = action_type === 'LOG_GENERAL_EXPENSE';
  const isTransfer = action_type === 'TRANSFER_WALLET';

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
    : isIncome
    ? {
        icon: ArrowDownLeft,
        colorHex: '#10b981',
        title: payload.title || 'XÁC NHẬN GHI NHẬN THU NHẬP',
        bg: 'from-emerald-500/10 via-teal-500/5 to-transparent',
        border: 'border-emerald-500/30 hover:border-emerald-500/60',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        accentBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
      }
    : isTransfer
    ? {
        icon: ArrowRightLeft,
        colorHex: '#0284c7',
        title: payload.title || 'XÁC NHẬN CHUYỂN TIỀN VÍ',
        bg: 'from-sky-500/10 via-blue-500/5 to-transparent',
        border: 'border-sky-500/30 hover:border-sky-500/60',
        badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
        accentBtn: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20',
      }
    : isGeneralExp
    ? {
        icon: ArrowUpRight,
        colorHex: '#f43f5e',
        title: payload.title || 'XÁC NHẬN GHI SỔ CHI TIÊU GIA ĐÌNH',
        bg: 'from-rose-500/10 via-pink-500/5 to-transparent',
        border: 'border-rose-500/30 hover:border-rose-500/60',
        badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        accentBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
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
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${themeConfig.badge}`}>
            DỰ THẢO CHỜ XÁC NHẬN
          </span>
          <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            (Chưa lưu vào sổ cái)
          </span>
        </div>
      </div>

      {/* 2. Body Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-100/70 dark:bg-black/30 border border-slate-200/70 dark:border-slate-800/70 text-xs mb-3">
        {/* Số tiền */}
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Tổng số tiền:</span>
          {isEditing ? (
            <input
              type="number"
              value={editCost}
              onChange={(e) => setEditCost(Number(e.target.value) || 0)}
              className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-bold text-rose-600 focus:outline-none"
            />
          ) : (
            <span className="text-base font-black text-rose-600 dark:text-rose-400">{fmtMoney(editCost)}</span>
          )}
        </div>

        {/* Ngày ghi nhận */}
        <div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Ngày:
          </span>
          {isEditing ? (
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
            />
          ) : (
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{editDate}</span>
          )}
        </div>

        {/* ODO */}
        <div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Gauge className="w-3 h-3 text-slate-400" /> ODO hiện tại:
          </span>
          {isEditing ? (
            <input
              type="number"
              value={editOdo}
              onChange={(e) => setEditOdo(Number(e.target.value) || 0)}
              placeholder="VD: 3339"
              className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-bold text-cyan-600 focus:outline-none"
            />
          ) : (
            <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{editOdo.toLocaleString('vi-VN')} km</span>
          )}
        </div>

        {/* Thông số đặc thù: Xăng dầu */}
        {isFuel && (
          <>
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Thể tích xăng:</span>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={editLiters}
                  onChange={(e) => {
                    const l = Number(e.target.value) || 0;
                    setEditLiters(l);
                    if (l > 0 && editCost > 0) setEditPrice(Math.round(editCost / l));
                  }}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-bold text-sky-600 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-sky-600 dark:text-sky-400 text-xs">{editLiters} Lít</span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Đơn giá:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">{fmtMoney(editPrice)}/L</span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Cây xăng:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">{editVendor}</span>
              )}
            </div>
          </>
        )}

        {/* Thông số đặc thù: Thu chi gia đình (Ăn uống, Sinh hoạt, Con cái, Thu nhập...) */}
        {(isGeneralExp || isIncome) && (
          <>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-500" /> Danh mục lớn:
              </span>
              {isEditing ? (
                <select
                  value={selectedParentId}
                  onChange={(e) => handleParentCatChange(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {categories
                    .filter((c) => !c.parent_id && (isIncome ? c.type === 'INCOME' : c.type !== 'INCOME'))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block truncate">
                  {currentParentCat?.name || (isIncome ? 'Thu nhập' : 'Ăn uống & Đi chợ')}
                </span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-cyan-500" /> Danh mục nhỏ (chi tiết):
              </span>
              {isEditing ? (
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {categories
                    .filter((c) => c.parent_id === selectedParentId)
                    .map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-xs block truncate">
                  {currentSubCat?.name || currentParentCat?.name || 'Mặc định'}
                </span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-slate-400" /> Tài khoản / Ví:
              </span>
              {isEditing ? (
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({fmtMoney(w.current_balance)})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">
                  {currentWallet?.name || 'Techcombank Everyday'}
                </span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" /> {isIncome ? 'Nguồn chi trả:' : 'Đơn vị / Cửa hàng:'}
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">
                  {editVendor || '—'}
                </span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-2">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Nội dung ghi chú:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Nhập nội dung diễn giải..."
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-medium text-slate-600 dark:text-slate-300 text-xs truncate block italic">
                  {editDescription || data.description || 'Chi tiêu qua AI Cố vấn'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Thông số đặc thù: Bảo dưỡng xe (LOG_MAINTENANCE) */}
        {isMaint && (
          <>
            <div className="col-span-2 sm:col-span-2">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-500" /> Hạng mục bảo dưỡng (Master Data):
              </span>
              {isEditing ? (
                <select
                  value={selectedMaintType}
                  onChange={(e) => setSelectedMaintType(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {maintCats.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-amber-700 dark:text-amber-300 text-xs block truncate">
                  {selectedMaintType}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" /> Gara / Đơn vị:
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">{editVendor}</span>
              )}
            </div>
            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Ghi chú phụ tùng / công thợ:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Ghi chú chi tiết bảo dưỡng..."
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-medium text-slate-600 dark:text-slate-300 text-xs truncate block italic">
                  {editDescription || data.notes || data.description || 'Bảo dưỡng định kỳ'}
                </span>
              )}
            </div>
          </>
        )}

        {/* Thông số đặc thù: Chi phí xe khác (LOG_EXPENSE - Taxonomy: Rửa xe, Gửi xe, BOT, Nâng cấp...) */}
        {!isFuel && !isMaint && !isGeneralExp && !isIncome && !isTransfer && (
          <>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-500" /> Nhóm chi phí xe (Taxonomy):
              </span>
              {isEditing ? (
                <select
                  value={mobCatKey}
                  onChange={(e) => handleMobCatChange(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {Object.entries(taxonomy).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs block truncate">
                  {taxonomy[mobCatKey]?.label || mobCatKey}
                </span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-cyan-500" /> Chi tiết hạng mục:
              </span>
              {isEditing ? (
                <select
                  value={mobSubKey}
                  onChange={(e) => setMobSubKey(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                >
                  {Object.entries(taxonomy[mobCatKey]?.subcategories || {}).map(([sk, sv]) => (
                    <option key={sk} value={sk}>
                      {sv}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-bold text-cyan-600 dark:text-cyan-400 text-xs block truncate">
                  {taxonomy[mobCatKey]?.subcategories[mobSubKey] || mobSubKey}
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" /> Gara / Đơn vị:
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-bold text-slate-700 dark:text-slate-200 text-xs truncate block">{editVendor}</span>
              )}
            </div>

            <div className="col-span-2 sm:col-span-3">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">Nội dung chi phí:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Nhập nội dung chi phí..."
                  className="w-full mt-0.5 px-2 py-1 rounded-lg border border-cyan-500/50 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none"
                />
              ) : (
                <span className="font-medium text-slate-600 dark:text-slate-300 text-xs truncate block italic">
                  {editDescription || data.description || 'Chi phí vận hành'}
                </span>
              )}
            </div>
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
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          disabled={status === 'executing'}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
            isEditing
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Chỉnh sửa lại số tiền, ODO hoặc ngày nếu AI bóc tách chưa chuẩn"
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xong chỉnh sửa</span>
            </>
          ) : (
            <>
              <Pencil className="w-3 h-3 text-slate-400" />
              <span>Sửa số liệu</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
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
    </div>
  );
};

export default FMMSActionCard;

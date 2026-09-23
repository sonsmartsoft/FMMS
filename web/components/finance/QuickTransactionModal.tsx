'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TransactionCategory,
  TransactionType,
  FamilyTransaction,
} from '@/types/finance';
import { Asset } from '@/types/mobility';
import {
  createFamilyTransaction,
  updateFamilyTransaction,
  getCategories,
  getWallets,
} from '@/lib/services/familyFinanceService';
import { getAssets } from '@/lib/services/assetService';
import DraggableModal from '@/components/ui/DraggableModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Wallet as WalletIcon,
  Car,
  Calendar,
  Tag,
  FileText,
  Building,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: TransactionType;
  defaultWalletId?: string;
  defaultAssetId?: string;
  transactionToEdit?: FamilyTransaction | null;
}

export default function QuickTransactionModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'EXPENSE',
  defaultWalletId,
  defaultAssetId,
  transactionToEdit,
}: QuickTransactionModalProps) {
  const isEditing = Boolean(transactionToEdit);
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountStr, setAmountStr] = useState('');
  const [walletId, setWalletId] = useState(defaultWalletId || '');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [assetId, setAssetId] = useState(defaultAssetId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [isEssential, setIsEssential] = useState(true);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setType(transactionToEdit.transaction_type);
        setWalletId(transactionToEdit.wallet_id || '');
        setToWalletId(transactionToEdit.to_wallet_id || '');
        setCategoryId(transactionToEdit.category_id || '');
        setAssetId(transactionToEdit.asset_id || '');
        setDate(transactionToEdit.date ? transactionToEdit.date.slice(0, 10) : new Date().toISOString().split('T')[0]);
        setAmountStr(transactionToEdit.amount ? Number(transactionToEdit.amount).toLocaleString('vi-VN') : '');
        setPayee(transactionToEdit.payee_vendor || transactionToEdit.description || '');
        setNotes(transactionToEdit.notes || '');
        setIsEssential(transactionToEdit.is_essential ?? true);
        setErrorMsg('');
      } else {
        setType(defaultType);
        setWalletId(defaultWalletId || '');
        setAssetId(defaultAssetId || '');
        setDate(new Date().toISOString().split('T')[0]);
        setAmountStr('');
        setPayee('');
        setNotes('');
        setErrorMsg('');
      }

      // Load supporting data
      Promise.all([getWallets(), getCategories(), getAssets()])
        .then(([wList, cList, aList]) => {
          setWallets(wList);
          setCategories(cList);
          setAssets(aList);

          if (!transactionToEdit) {
            if (!defaultWalletId && wList.length > 0) {
              setWalletId(wList[0].id);
            }
            if (wList.length > 1) {
              setToWalletId(wList[1].id);
            }
            // Default category
            const defCat = cList.find((c) => c.type === defaultType);
            if (defCat) setCategoryId(defCat.id);
          }
        })
        .catch((err) => {
          console.error('Failed to load transaction metadata:', err);
        });
    }
  }, [isOpen, defaultType, defaultWalletId, defaultAssetId, transactionToEdit]);

  // When type switches, pick first matching category
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    const matched = categories.find((c) => c.type === newType);
    if (matched) {
      setCategoryId(matched.id);
    } else {
      setCategoryId('');
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (type === 'TRANSFER') return c.type === 'TRANSFER';
    return c.type === type;
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setAmountStr('');
      return;
    }
    const num = parseInt(raw, 10);
    setAmountStr(num.toLocaleString('vi-VN'));
  };

  const parseRawAmount = (): number => {
    return parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const amt = parseRawAmount();
    if (amt <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0');
      return;
    }
    if (!walletId) {
      setErrorMsg('Vui lòng chọn ví nguồn');
      return;
    }
    if (type === 'TRANSFER' && (!toWalletId || toWalletId === walletId)) {
      setErrorMsg('Vui lòng chọn ví đích khác ví nguồn để chuyển tiền');
      return;
    }

    setLoading(true);
    try {
      if (transactionToEdit) {
        await updateFamilyTransaction(transactionToEdit.id, {
          wallet_id: walletId,
          to_wallet_id: type === 'TRANSFER' ? toWalletId : null,
          category_id: categoryId || null,
          asset_id: assetId || null,
          transaction_type: type,
          amount: amt,
          date: date,
          payee_vendor: payee.trim() || undefined,
          description: payee.trim() || undefined,
          notes: notes.trim() || undefined,
          is_essential: isEssential,
        });
      } else {
        await createFamilyTransaction({
          wallet_id: walletId,
          to_wallet_id: type === 'TRANSFER' ? toWalletId : null,
          category_id: categoryId || null,
          asset_id: assetId || null,
          transaction_type: type,
          amount: amt,
          date: date,
          payee_vendor: payee.trim() || undefined,
          description: payee.trim() || undefined,
          notes: notes.trim() || undefined,
          is_essential: isEssential,
          exclude_from_reports: false,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit transaction error:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi lưu giao dịch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Chỉnh sửa Giao dịch' : 'Ghi chép Thu / Chi / Chuyển khoản'}
      className="max-w-xl w-full"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Type Selector Pills */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              type === 'EXPENSE'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              type === 'INCOME'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Thu nhập
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('TRANSFER')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
              type === 'TRANSFER'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Chuyển ví
          </button>
        </div>

        {/* Amount Input */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Số tiền (VNĐ)
          </label>
          <div className="relative inline-flex items-center justify-center w-full">
            <input
              type="text"
              autoFocus
              placeholder="0"
              value={amountStr}
              onChange={handleAmountChange}
              className="w-full text-center text-3xl font-extrabold bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder-slate-300 dark:placeholder-slate-600"
            />
            <span className="absolute right-4 text-sm font-bold text-slate-400">₫</span>
          </div>
        </div>

        {/* Wallets selection */}
        {type === 'TRANSFER' ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <WalletIcon className="w-3.5 h-3.5 text-slate-400" />
                Từ ví nguồn
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.current_balance.toLocaleString('vi-VN')} ₫)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                Đến ví đích
              </label>
              <select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.current_balance.toLocaleString('vi-VN')} ₫)
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <WalletIcon className="w-3.5 h-3.5 text-slate-400" />
                Tài khoản / Ví
              </label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.current_balance.toLocaleString('vi-VN')} ₫)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Hạng mục thu chi (Mẹ &amp; Con)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                {(() => {
                  const parents = filteredCategories.filter((c) => !c.parent_id);
                  const children = filteredCategories.filter((c) => !!c.parent_id);

                  if (parents.length === 0) {
                    return filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ));
                  }

                  return parents.map((parent) => {
                    const subs = children.filter((c) => c.parent_id === parent.id);
                    if (subs.length === 0) {
                      return (
                        <option key={parent.id} value={parent.id}>
                          {parent.name}
                        </option>
                      );
                    }
                    return (
                      <optgroup key={parent.id} label={`📁 ${parent.name}`}>
                        <option value={parent.id}>
                          — {parent.name} (Chung)
                        </option>
                        {subs.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            &nbsp;&nbsp;&nbsp;&nbsp;↳ {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    );
                  });
                })()}
              </select>
            </div>
          </div>
        )}

        {/* Asset Linkage (Vehicle) & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-cyan-500" />
              Gắn với Xe (FMMS Mobility)
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="">-- Không gắn phương tiện --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  🚗 {a.name} ({a.license_plate || a.model})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày giao dịch
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Payee / Vendor & Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Người nhận / Cửa hàng
            </label>
            <input
              type="text"
              placeholder="VD: Cây xăng Petrolimex, Vinmart..."
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Ghi chú thêm
            </label>
            <input
              type="text"
              placeholder="Ghi chú diễn giải..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Essential toggle */}
        {type === 'EXPENSE' && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Chi tiêu thiết yếu (Needs)?
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Phục vụ phân tích quy tắc 50/30/20 và Hũ Thiết Yếu (55%)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEssential}
                onChange={(e) => setIsEssential(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        )}

        {/* Error alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 active:scale-[0.98] rounded-lg shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Đang lưu...' : isEditing ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
}

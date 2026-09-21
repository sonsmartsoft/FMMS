'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Wallet, WalletType } from '@/types/finance';
import {
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
} from '@/lib/services/familyFinanceService';
import DraggableModal from '@/components/ui/DraggableModal';
import QuickTransactionModal from '@/components/finance/QuickTransactionModal';
import {
  Wallet as WalletIcon,
  Building2,
  CreditCard,
  Smartphone,
  PiggyBank,
  Banknote,
  Plus,
  ArrowRightLeft,
  ChevronLeft,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');

export default function WalletsManagementPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<WalletType>('BANK');
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState('');
  const [formStatementDay, setFormStatementDay] = useState('20');
  const [formDueDay, setFormDueDay] = useState('5');
  const [formColor, setFormColor] = useState('#0284c7');
  const [formExcluded, setFormExcluded] = useState(false);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const data = await getWallets();
      setWallets(data);
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const openCreateModal = () => {
    setEditingWallet(null);
    setFormName('');
    setFormType('BANK');
    setFormBankName('');
    setFormAccountNumber('');
    setFormBalance('0');
    setFormCreditLimit('50000000');
    setFormStatementDay('20');
    setFormDueDay('5');
    setFormColor('#0284c7');
    setFormExcluded(false);
    setIsEditModalOpen(true);
  };

  const openEditModal = (w: Wallet) => {
    setEditingWallet(w);
    setFormName(w.name);
    setFormType(w.wallet_type);
    setFormBankName(w.bank_name || '');
    setFormAccountNumber(w.account_number || '');
    setFormBalance(w.current_balance.toString());
    setFormCreditLimit((w.credit_limit || 0).toString());
    setFormStatementDay((w.statement_day || 20).toString());
    setFormDueDay((w.payment_due_day || 5).toString());
    setFormColor(w.color || '#0284c7');
    setFormExcluded(w.is_excluded_from_total);
    setIsEditModalOpen(true);
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseInt(formBalance.replace(/[^0-9-]/g, ''), 10) || 0;
    const limit = parseInt(formCreditLimit.replace(/[^0-9]/g, ''), 10) || 0;

    try {
      if (editingWallet) {
        await updateWallet(editingWallet.id, {
          name: formName,
          wallet_type: formType,
          bank_name: formBankName || undefined,
          account_number: formAccountNumber || undefined,
          current_balance: bal,
          credit_limit: formType === 'CREDIT_CARD' ? limit : undefined,
          statement_day: formType === 'CREDIT_CARD' ? parseInt(formStatementDay, 10) : undefined,
          payment_due_day: formType === 'CREDIT_CARD' ? parseInt(formDueDay, 10) : undefined,
          color: formColor,
          is_excluded_from_total: formExcluded,
        });
      } else {
        await createWallet({
          name: formName,
          wallet_type: formType,
          bank_name: formBankName || undefined,
          account_number: formAccountNumber || undefined,
          initial_balance: bal,
          current_balance: bal,
          currency: 'VND',
          credit_limit: formType === 'CREDIT_CARD' ? limit : undefined,
          statement_day: formType === 'CREDIT_CARD' ? parseInt(formStatementDay, 10) : undefined,
          payment_due_day: formType === 'CREDIT_CARD' ? parseInt(formDueDay, 10) : undefined,
          color: formColor,
          is_excluded_from_total: formExcluded,
          status: 'ACTIVE',
        });
      }
      setIsEditModalOpen(false);
      loadWallets();
    } catch (err) {
      alert('Lưu ví thất bại');
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài khoản/ví này? Các giao dịch liên quan có thể bị ảnh hưởng.')) {
      try {
        await deleteWallet(id);
        loadWallets();
      } catch (err) {
        alert('Xóa ví thất bại');
      }
    }
  };

  // Groupings
  const liquidWallets = useMemo(
    () => wallets.filter((w) => ['BANK', 'CASH', 'E_WALLET'].includes(w.wallet_type)),
    [wallets]
  );
  const creditWallets = useMemo(
    () => wallets.filter((w) => w.wallet_type === 'CREDIT_CARD'),
    [wallets]
  );
  const savingsWallets = useMemo(
    () => wallets.filter((w) => ['SAVINGS', 'INVESTMENT'].includes(w.wallet_type)),
    [wallets]
  );

  // Totals
  const totalLiquid = useMemo(
    () => liquidWallets.reduce((s, w) => s + (Number(w.current_balance) || 0), 0),
    [liquidWallets]
  );
  const totalSavings = useMemo(
    () => savingsWallets.reduce((s, w) => s + (Number(w.current_balance) || 0), 0),
    [savingsWallets]
  );
  const totalCreditDebt = useMemo(
    () => creditWallets.reduce((s, w) => s + Math.max(0, (w.credit_limit || 0) - (w.current_balance || 0)), 0),
    [creditWallets]
  );

  const getIcon = (type: WalletType) => {
    switch (type) {
      case 'BANK': return Building2;
      case 'CREDIT_CARD': return CreditCard;
      case 'E_WALLET': return Smartphone;
      case 'SAVINGS':
      case 'INVESTMENT': return PiggyBank;
      default: return Banknote;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/family-finance"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Ví & Tài Khoản Thanh Toán
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý tài khoản ngân hàng, thẻ tín dụng hạn mức & sao kê, ví điện tử và sổ tiết kiệm
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
            Chuyển tiền nội bộ
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-[0.98] rounded-xl shadow-md shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm tài khoản / Ví
          </button>

          <button
            onClick={loadWallets}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tiền khả dụng (Bank & Ví)</span>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {fmt(totalLiquid)} ₫
            </div>
            <span className="text-[11px] text-slate-400">{liquidWallets.length} tài khoản đang hoạt động</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dư nợ thẻ tín dụng đã dùng</span>
            <div className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              {fmt(totalCreditDebt)} ₫
            </div>
            <span className="text-[11px] text-slate-400">{creditWallets.length} thẻ tín dụng</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tiết kiệm & Dự phòng dài hạn</span>
            <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
              {fmt(totalSavings)} ₫
            </div>
            <span className="text-[11px] text-slate-400">{savingsWallets.length} sổ tiết kiệm</span>
          </div>
        </div>
      </div>

      {/* Group 1: Bank & Cash */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-500" />
          Tài khoản Ngân hàng & Tiền mặt ({liquidWallets.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liquidWallets.map((w) => {
            const Icon = getIcon(w.wallet_type);
            return (
              <div
                key={w.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: w.color || '#10b981' }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(w)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{w.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {w.bank_name || 'Ví tiền mặt'} {w.account_number ? `• STK: ${w.account_number}` : ''}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Số dư khả dụng</span>
                  <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {fmt(w.current_balance)} ₫
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group 2: Credit Cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-500" />
          Thẻ Tín Dụng & Trả Góp ({creditWallets.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditWallets.map((w) => {
            const limit = w.credit_limit || 0;
            const balance = w.current_balance || 0;
            const used = Math.max(0, limit - balance);
            const ratio = limit > 0 ? Math.round((used / limit) * 100) : 0;

            return (
              <div
                key={w.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg border border-indigo-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold tracking-widest text-indigo-300 uppercase">
                      {w.bank_name || 'CREDIT CARD'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(w)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWallet(w.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold tracking-wide">{w.name}</h3>
                  <p className="text-xs text-indigo-200/80 font-mono mt-0.5">
                    **** **** **** {w.account_number ? w.account_number.slice(-4) : '8888'}
                  </p>
                </div>

                <div className="mt-5 space-y-3 pt-3 border-t border-indigo-800/40">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] text-indigo-300">Khả dụng còn lại</span>
                      <div className="text-lg font-bold font-mono text-emerald-400">
                        {fmt(balance)} ₫
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-indigo-300">Hạn mức</span>
                      <div className="text-xs font-mono text-slate-300">{fmt(limit)} ₫</div>
                    </div>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-indigo-300">
                      <span>Đã dùng: {fmt(used)} ₫</span>
                      <span>{ratio}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-indigo-950/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ratio > 70 ? 'bg-rose-500' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, ratio)}%` }}
                      />
                    </div>
                  </div>

                  {/* Statement Alerts */}
                  <div className="flex justify-between text-[11px] text-indigo-200 bg-white/5 px-2.5 py-1.5 rounded-lg">
                    <span>📅 Sao kê: <b>Ngày {w.statement_day || 20}</b></span>
                    <span>⏰ Hạn tt: <b>Ngày {w.payment_due_day || 5}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group 3: Savings */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-sky-500" />
          Sổ Tiết Kiệm & Đầu Tư Tích Lũy ({savingsWallets.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savingsWallets.map((w) => (
            <div
              key={w.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                    <PiggyBank className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(w)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteWallet(w.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{w.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {w.bank_name || 'Ngân hàng'} • Dự phòng an toàn gia đình
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Số dư sổ tiết kiệm</span>
                <span className="text-lg font-black font-mono text-sky-600 dark:text-sky-400">
                  {fmt(w.current_balance)} ₫
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / Create Modal */}
      <DraggableModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingWallet ? 'Chỉnh sửa tài khoản / ví' : 'Thêm mới tài khoản / ví'}
        className="max-w-md w-full"
      >
        <form onSubmit={handleSaveWallet} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên tài khoản / Ví
            </label>
            <input
              type="text"
              required
              placeholder="VD: Techcombank Chi tiêu, Tiền mặt..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loại tài khoản
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as WalletType)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="BANK">Ngân hàng</option>
                <option value="CASH">Tiền mặt</option>
                <option value="CREDIT_CARD">Thẻ tín dụng</option>
                <option value="E_WALLET">Ví điện tử</option>
                <option value="SAVINGS">Sổ tiết kiệm</option>
                <option value="INVESTMENT">Đầu tư</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngân hàng / Đơn vị
              </label>
              <input
                type="text"
                placeholder="Techcombank, VCB..."
                value={formBankName}
                onChange={(e) => setFormBankName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số dư hiện tại (VNĐ)
              </label>
              <input
                type="text"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số tài khoản / 4 số cuối
              </label>
              <input
                type="text"
                placeholder="VD: 1903..."
                value={formAccountNumber}
                onChange={(e) => setFormAccountNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {formType === 'CREDIT_CARD' && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                Thông tin Thẻ Tín Dụng
              </span>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn mức tín dụng (VNĐ)
                </label>
                <input
                  type="text"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày sao kê hàng tháng
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formStatementDay}
                    onChange={(e) => setFormStatementDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày hạn thanh toán
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md shadow-sky-600/20"
            >
              Lưu tài khoản
            </button>
          </div>
        </form>
      </DraggableModal>

      {/* Internal Transfer Modal */}
      <QuickTransactionModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={loadWallets}
        defaultType="TRANSFER"
      />
    </div>
  );
}

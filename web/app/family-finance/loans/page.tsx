'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FamilyLoan, LoanCategory, LoanType } from '@/types/finance';
import { Asset } from '@/types/mobility';
import {
  getFamilyLoans,
  createFamilyLoan,
  updateFamilyLoan,
  deleteFamilyLoan,
  getWallets,
} from '@/lib/services/familyFinanceService';
import { getAssets } from '@/lib/services/assetService';
import DraggableModal from '@/components/ui/DraggableModal';
import {
  CreditCard,
  Building2,
  Calendar,
  ChevronLeft,
  RefreshCw,
  Plus,
  Car,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Percent,
  Check,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

export default function LoansManagementPage() {
  const [loans, setLoans] = useState<FamilyLoan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<FamilyLoan | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('BORROW');
  const [category, setCategory] = useState<LoanCategory>('CAR_LOAN');
  const [lenderName, setLenderName] = useState('Techcombank');
  const [principalStr, setPrincipalStr] = useState('');
  const [remainingStr, setRemainingStr] = useState('');
  const [interestRate, setInterestRate] = useState('8.5');
  const [termMonths, setTermMonths] = useState('60');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDay, setPaymentDay] = useState('15');
  const [monthlyPaymentStr, setMonthlyPaymentStr] = useState('');
  const [linkedAssetId, setLinkedAssetId] = useState('');
  const [linkedWalletId, setLinkedWalletId] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lList, aList, wList] = await Promise.all([
        getFamilyLoans(),
        getAssets(),
        getWallets(),
      ]);
      setLoans(lList);
      setAssets(aList);
      setWallets(wList);
    } catch (err) {
      console.error('Failed to load loans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingLoan(null);
    setTitle('');
    setLoanType('BORROW');
    setCategory('CAR_LOAN');
    setLenderName('Techcombank');
    setPrincipalStr('300000000');
    setRemainingStr('245000000');
    setInterestRate('8.5');
    setTermMonths('60');
    setStartDate(new Date().toISOString().split('T')[0]);
    setPaymentDay('15');
    setMonthlyPaymentStr('6250000');
    setLinkedAssetId(assets.length > 0 ? assets[0].id : '');
    setLinkedWalletId(wallets.length > 0 ? wallets[0].id : '');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (loan: FamilyLoan) => {
    setEditingLoan(loan);
    setTitle(loan.title);
    setLoanType(loan.loan_type);
    setCategory(loan.category);
    setLenderName(loan.lender_borrower_name);
    setPrincipalStr(loan.principal_amount.toString());
    setRemainingStr(loan.remaining_balance.toString());
    setInterestRate(loan.interest_rate_percent.toString());
    setTermMonths((loan.term_months || 0).toString());
    setStartDate(loan.start_date);
    setPaymentDay(loan.payment_day.toString());
    setMonthlyPaymentStr(loan.monthly_payment.toString());
    setLinkedAssetId(loan.linked_asset_id || '');
    setLinkedWalletId(loan.linked_wallet_id || '');
    setNotes(loan.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const principal = parseInt(principalStr.replace(/[^0-9]/g, ''), 10) || 0;
    const remaining = parseInt(remainingStr.replace(/[^0-9]/g, ''), 10) || 0;
    const monthlyPay = parseInt(monthlyPaymentStr.replace(/[^0-9]/g, ''), 10) || 0;

    try {
      if (editingLoan) {
        await updateFamilyLoan(editingLoan.id, {
          title,
          loan_type: loanType,
          category,
          lender_borrower_name: lenderName,
          principal_amount: principal,
          remaining_balance: remaining,
          interest_rate_percent: parseFloat(interestRate) || 0,
          term_months: parseInt(termMonths, 10) || 0,
          start_date: startDate,
          payment_day: parseInt(paymentDay, 10) || 15,
          monthly_payment: monthlyPay,
          linked_asset_id: linkedAssetId || null,
          linked_wallet_id: linkedWalletId || null,
          notes,
        });
      } else {
        await createFamilyLoan({
          title,
          loan_type: loanType,
          category,
          lender_borrower_name: lenderName,
          principal_amount: principal,
          remaining_balance: remaining,
          interest_rate_percent: parseFloat(interestRate) || 0,
          term_months: parseInt(termMonths, 10) || 0,
          start_date: startDate,
          payment_day: parseInt(paymentDay, 10) || 15,
          monthly_payment: monthlyPay,
          linked_asset_id: linkedAssetId || null,
          linked_wallet_id: linkedWalletId || null,
          status: 'ACTIVE',
          notes,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Lưu khoản vay thất bại');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa khoản vay này?')) {
      try {
        await deleteFamilyLoan(id);
        loadData();
      } catch (err) {
        alert('Xóa thất bại');
      }
    }
  };

  // Totals
  const totalRemainingDebt = useMemo(() => {
    return loans
      .filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW')
      .reduce((s, l) => s + (Number(l.remaining_balance) || 0), 0);
  }, [loans]);

  const totalMonthlyObligation = useMemo(() => {
    return loans
      .filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW')
      .reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);
  }, [loans]);

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
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
              Khoản Vay & Quản Trị Dư Nợ
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Theo dõi lịch trả nợ vay mua xe Mazda 2, vay mua nhà, tín dụng & hạn thanh toán hàng tháng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] rounded-xl shadow-md shadow-rose-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm khoản vay / Trả góp
          </button>

          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng dư nợ gốc còn lại
            </span>
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {fmt(totalRemainingDebt)} ₫
            </div>
            <span className="text-[11px] text-slate-400">{loans.length} hợp đồng vay</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Nghĩa vụ trả nợ mỗi tháng
            </span>
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
              {fmt(totalMonthlyObligation)} ₫
            </div>
            <span className="text-[11px] text-slate-400">Bao gồm gốc và lãi định kỳ</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vay xe Mazda 2 Deluxe
            </span>
            <div className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {loans[0] ? `${fmt(loans[0].remaining_balance)} ₫` : '0 ₫'}
            </div>
            <span className="text-[11px] text-slate-400">
              Trả ngày {loans[0]?.payment_day || 15} hàng tháng
            </span>
          </div>
        </div>
      </div>

      {/* Loan Cards */}
      <div className="space-y-4">
        {loans.map((loan) => {
          const paidOff = loan.principal_amount - loan.remaining_balance;
          const progressPercent =
            loan.principal_amount > 0
              ? Math.round((paidOff / loan.principal_amount) * 100)
              : 0;

          return (
            <div
              key={loan.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                      {loan.category}
                    </span>
                    {loan.linked_asset_id && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        <Car className="w-3 h-3" />
                        Liên kết Mazda 2 Deluxe
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {loan.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bên cho vay: <b>{loan.lender_borrower_name}</b> • Bắt đầu:{' '}
                    {fmtDate(loan.start_date)} • Kỳ hạn: {loan.term_months} tháng
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(loan)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Gốc ban đầu:</span>
                  <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                    {fmt(loan.principal_amount)} ₫
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Dư nợ còn lại:</span>
                  <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                    {fmt(loan.remaining_balance)} ₫
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Lãi suất năm:</span>
                  <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-sky-500" />
                    {loan.interest_rate_percent}% / năm
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Trả hàng tháng:</span>
                  <div className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                    {fmt(loan.monthly_payment)} ₫
                  </div>
                  <span className="text-[10px] text-amber-600">Ngày {loan.payment_day} hàng tháng</span>
                </div>
              </div>

              {/* Progress Bar of Payoff */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Đã trả: {fmt(paidOff)} ₫ ({progressPercent}%)
                  </span>
                  <span className="text-slate-400">
                    Còn lại: {fmt(loan.remaining_balance)} ₫ ({100 - progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div
                    className="h-full bg-rose-500/80 transition-all duration-500"
                    style={{ width: `${100 - progressPercent}%` }}
                  />
                </div>
              </div>

              {loan.notes && (
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{loan.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit / Create Loan Modal */}
      <DraggableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLoan ? 'Chỉnh sửa hợp đồng vay' : 'Thêm mới khoản vay / Trả góp'}
        className="max-w-lg w-full"
      >
        <form onSubmit={handleSaveLoan} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên khoản vay / Mục đích
            </label>
            <input
              type="text"
              required
              placeholder="VD: Khoản vay mua xe Mazda 2 Deluxe..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phân loại
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LoanCategory)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="CAR_LOAN">Vay mua ô tô (Xe)</option>
                <option value="BANK_MORTGAGE">Vay thế chấp / BĐS</option>
                <option value="BANK_CONSUMER">Vay tiêu dùng ngân hàng</option>
                <option value="CREDIT_INSTALLMENT">Trả góp thẻ tín dụng</option>
                <option value="PERSONAL">Vay mượn cá nhân / Người thân</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bên cho vay (Ngân hàng / Người)
              </label>
              <input
                type="text"
                placeholder="Techcombank, VIB..."
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số tiền gốc ban đầu (VNĐ)
              </label>
              <input
                type="text"
                value={principalStr}
                onChange={(e) => setPrincipalStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dư nợ gốc hiện tại (VNĐ)
              </label>
              <input
                type="text"
                value={remainingStr}
                onChange={(e) => setRemainingStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lãi suất (% / năm)
              </label>
              <input
                type="text"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kỳ hạn (tháng)
              </label>
              <input
                type="number"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày trả nợ trong tháng
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số tiền phải trả định kỳ (VNĐ/tháng)
              </label>
              <input
                type="text"
                value={monthlyPaymentStr}
                onChange={(e) => setMonthlyPaymentStr(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gắn với Xe (FMMS Mobility)
              </label>
              <select
                value={linkedAssetId}
                onChange={(e) => setLinkedAssetId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">-- Không gắn xe --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    🚗 {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú hợp đồng
            </label>
            <input
              type="text"
              placeholder="VD: Trả tự động từ Techcombank..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md shadow-rose-600/20"
            >
              Lưu khoản vay
            </button>
          </div>
        </form>
      </DraggableModal>
    </div>
  );
}

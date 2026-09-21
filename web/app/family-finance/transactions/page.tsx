'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  FamilyTransaction,
  TransactionCategory,
  TransactionType,
} from '@/types/finance';
import { Asset } from '@/types/mobility';
import {
  getWallets,
  getFamilyTransactions,
  getCategories,
  deleteFamilyTransaction,
} from '@/lib/services/familyFinanceService';
import { getAssets } from '@/lib/services/assetService';
import QuickTransactionModal from '@/components/finance/QuickTransactionModal';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Plus,
  Search,
  Filter,
  Car,
  Calendar,
  Wallet as WalletIcon,
  Tag,
  RefreshCw,
  Trash2,
  Download,
  ChevronLeft,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

export default function TransactionsLedgerPage() {
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [walletFilter, setWalletFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<TransactionType>('EXPENSE');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wList, cList, aList] = await Promise.all([
        getWallets(),
        getCategories(),
        getAssets(),
      ]);
      setWallets(wList);
      setCategories(cList);
      setAssets(aList);

      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const txList = await getFamilyTransactions({
        startDate: startStr,
        endDate: endStr,
      });
      setTransactions(txList);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Client-side filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'ALL' && tx.transaction_type !== typeFilter) return false;
      if (walletFilter !== 'ALL' && tx.wallet_id !== walletFilter && tx.to_wallet_id !== walletFilter) return false;
      if (categoryFilter !== 'ALL' && tx.category_id !== categoryFilter) return false;
      if (assetFilter !== 'ALL') {
        if (assetFilter === 'NONE' && tx.asset_id) return false;
        if (assetFilter !== 'NONE' && tx.asset_id !== assetFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPayee = tx.payee_vendor?.toLowerCase().includes(q);
        const matchNotes = tx.notes?.toLowerCase().includes(q);
        const matchCategory = tx.category?.name?.toLowerCase().includes(q);
        const matchAmount = tx.amount.toString().includes(q);
        if (!matchPayee && !matchNotes && !matchCategory && !matchAmount) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, walletFilter, categoryFilter, assetFilter, searchQuery]);

  // Financial summary
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let mobilityExpense = 0;

    filteredTransactions.forEach((t) => {
      if (t.exclude_from_reports) return;
      if (t.transaction_type === 'INCOME') {
        income += Number(t.amount || 0);
      } else if (t.transaction_type === 'EXPENSE') {
        const amt = Number(t.amount || 0);
        expense += amt;
        if (t.asset_id || t.category?.name?.includes('Phương tiện')) {
          mobilityExpense += amt;
        }
      }
    });

    return {
      income,
      expense,
      mobilityExpense,
      balance: income - expense,
    };
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa giao dịch này? Số dư ví sẽ được tự động hoàn lại.')) {
      try {
        await deleteFamilyTransaction(id);
        loadData();
      } catch (err) {
        alert('Xóa thất bại');
      }
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
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
              Sổ Thu Chi Gia Đình
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhật ký chi tiết mọi dòng tiền vào, chi tiêu sinh hoạt, xe cộ & chuyển khoản nội bộ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month / Year */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="dark:bg-slate-900">
                  Tháng {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="dark:bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setModalDefaultType('EXPENSE');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-[0.98] rounded-xl shadow-md shadow-rose-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Chi tiêu
          </button>

          <button
            onClick={() => {
              setModalDefaultType('INCOME');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thu nhập
          </button>

          <button
            onClick={loadData}
            title="Làm mới"
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4" />
            Tổng thu (Lọc)
          </span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            +{fmt(summary.income)} ₫
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" />
            Tổng chi (Lọc)
          </span>
          <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            -{fmt(summary.expense)} ₫
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
            <Car className="w-4 h-4" />
            Chi phí Xe cộ
          </span>
          <div className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1">
            {fmt(summary.mobilityExpense)} ₫
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <WalletIcon className="w-4 h-4" />
            Chênh lệch Thu - Chi
          </span>
          <div
            className={`text-xl font-black font-mono mt-1 ${
              summary.balance >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {summary.balance >= 0 ? '+' : ''}
            {fmt(summary.balance)} ₫
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo người nhận, diễn giải, ghi chú, số tiền..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Quick Type Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chi tiêu
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Thu nhập
            </button>
            <button
              onClick={() => setTypeFilter('TRANSFER')}
              className={`px-3 py-1 rounded-lg transition-all ${
                typeFilter === 'TRANSFER'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chuyển ví
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Wallet Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Ví:</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Tất cả tài khoản & ví</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Hạng mục:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Tất cả hạng mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Link Filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 shrink-0">Xe (FMMS):</span>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Tất cả giao dịch</option>
              <option value="NONE">Không gắn xe</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  🚗 {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            Không tìm thấy giao dịch nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-4">Hạng mục & Diễn giải</th>
                  <th className="py-3 px-4">Tài khoản / Ví</th>
                  <th className="py-3 px-4">Gắn với Xe</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4 text-right">Số tiền</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredTransactions.map((tx) => {
                  const isExpense = tx.transaction_type === 'EXPENSE';
                  const isIncome = tx.transaction_type === 'INCOME';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-500">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tx.category?.color || '#94a3b8' }}
                          />
                          {tx.category?.name || 'Khác'}
                        </div>
                        {tx.payee_vendor && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm mt-0.5">
                            {tx.payee_vendor} {tx.notes ? `• ${tx.notes}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {tx.wallet?.name || 'Ví'}
                          {tx.to_wallet && ` ➜ ${tx.to_wallet.name}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.asset_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold">
                            <Car className="w-3 h-3" />
                            Mazda 2
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.is_essential ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Thiết yếu (Needs)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            Mong muốn (Wants)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {fmt(tx.amount)} ₫
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        defaultType={modalDefaultType}
      />
    </div>
  );
}

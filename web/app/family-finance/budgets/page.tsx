'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FamilyBudget,
  TransactionCategory,
  FamilyTransaction,
} from '@/types/finance';
import {
  getCategories,
  getBudgets,
  getFamilyTransactions,
  saveBudget,
} from '@/lib/services/familyFinanceService';
import DraggableModal from '@/components/ui/DraggableModal';
import {
  PieChart,
  Calendar,
  ChevronLeft,
  RefreshCw,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Plus,
  Car,
  TrendingUp,
  Tag,
  ShieldAlert,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');

export default function BudgetsManagementPage() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<FamilyBudget[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'6_JARS' | '50_30_20' | 'CATEGORIES'>('6_JARS');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [budgetAmountStr, setBudgetAmountStr] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, bList] = await Promise.all([
        getCategories(),
        getBudgets(selectedMonth, selectedYear),
      ]);
      setCategories(cList);
      setBudgets(bList);

      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const txList = await getFamilyTransactions({
        startDate: startStr,
        endDate: endStr,
      });
      setTransactions(txList);
    } catch (err) {
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Total monthly income as benchmark baseline
  const monthlyIncome = useMemo(() => {
    const inc = transactions
      .filter((t) => t.transaction_type === 'INCOME' && !t.exclude_from_reports)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return inc > 0 ? inc : 50000000; // Baseline 50m VND if not yet recorded
  }, [transactions]);

  // Actual monthly expense
  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [transactions]);

  // 6 Jars Configuration & Stats
  const jarsConfig = [
    {
      key: 'NECESSITY',
      name: 'Hũ Thiết Yếu (NEC)',
      percent: 55,
      color: '#10b981',
      bgBar: 'bg-emerald-500',
      desc: 'Chi phí sinh hoạt tối cần thiết: Ăn uống, thuê/mua nhà, hóa đơn điện nước, xăng xe, bảo dưỡng xe Mazda 2, học phí',
    },
    {
      key: 'SAVINGS',
      name: 'Hũ Tiết Kiệm Dài Hạn (LTSS)',
      percent: 10,
      color: '#0ea5e9',
      bgBar: 'bg-sky-500',
      desc: 'Quỹ dự phòng khẩn cấp 3-6 tháng, mua sắm lớn trong tương lai, bảo hiểm nhân thọ',
    },
    {
      key: 'EDUCATION',
      name: 'Hũ Giáo Dục & Học Tập (EDU)',
      percent: 10,
      color: '#8b5cf6',
      bgBar: 'bg-purple-500',
      desc: 'Học phí con cái, sách vở, khóa học nâng cao kỹ năng cho bố mẹ',
    },
    {
      key: 'PLAY',
      name: 'Hũ Hưởng Thụ & Du Lịch (PLAY)',
      percent: 10,
      color: '#f59e0b',
      bgBar: 'bg-amber-500',
      desc: 'Du lịch cuối tuần, ăn ngoài nhà hàng cao cấp, mua sắm giải trí, spa (chi tiêu không hối tiếc)',
    },
    {
      key: 'INVESTMENT',
      name: 'Hũ Tự Do Tài Chính (FFA)',
      percent: 10,
      color: '#6366f1',
      bgBar: 'bg-indigo-500',
      desc: 'Đầu tư sinh lời: Cổ phiếu, trái phiếu, kinh doanh phụ, tạo dòng thu nhập thụ động',
    },
    {
      key: 'GIVE',
      name: 'Hũ Cho Đi & Biếu Tặng (GIVE)',
      percent: 5,
      color: '#f43f5e',
      bgBar: 'bg-rose-500',
      desc: 'Biếu ông bà cha mẹ, từ thiện, quà sinh nhật hiếu hỉ người thân',
    },
  ];

  const jarList = useMemo(() => {
    return jarsConfig.map((jar) => {
      const budgetCap = (monthlyIncome * jar.percent) / 100;
      const spent = transactions
        .filter((t) => t.transaction_type === 'EXPENSE' && t.category?.budget_bucket === jar.key)
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const ratio = budgetCap > 0 ? Math.round((spent / budgetCap) * 100) : 0;
      const remaining = budgetCap - spent;

      return {
        ...jar,
        budgetCap,
        spent,
        ratio,
        remaining,
      };
    });
  }, [jarsConfig, monthlyIncome, transactions]);

  // Category level breakdown
  const categoryBudgets = useMemo(() => {
    return categories
      .filter((c) => c.type === 'EXPENSE')
      .map((cat) => {
        const bg = budgets.find((b) => b.category_id === cat.id);
        const target = bg?.budget_amount || 0;
        const alertThresh = bg?.alert_threshold_percent || 80;

        const spent = transactions
          .filter((t) => t.transaction_type === 'EXPENSE' && t.category_id === cat.id)
          .reduce((s, t) => s + Number(t.amount || 0), 0);

        const ratio = target > 0 ? Math.round((spent / target) * 100) : 0;

        return {
          category: cat,
          budgetId: bg?.id,
          target,
          spent,
          alertThresh,
          ratio,
        };
      });
  }, [categories, budgets, transactions]);

  const openEditCategoryBudget = (cat: TransactionCategory, currentTarget: number, currentThresh: number) => {
    setEditingCategory(cat);
    setBudgetAmountStr(currentTarget > 0 ? currentTarget.toLocaleString('vi-VN') : '');
    setAlertThreshold(currentThresh.toString());
    setIsModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const amount = parseInt(budgetAmountStr.replace(/[^0-9]/g, ''), 10) || 0;

    try {
      await saveBudget({
        category_id: editingCategory.id,
        month: selectedMonth,
        year: selectedYear,
        budget_amount: amount,
        alert_threshold_percent: parseInt(alertThreshold, 10) || 80,
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Lưu ngân sách thất bại');
    }
  };

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
              Kế Hoạch & Ngân Sách Thông Minh
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản trị ngân sách theo Mô hình 6 Chiếc Hũ (6 Jars), Quy tắc 50/30/20 và hạn mức danh mục
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
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('6_JARS')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === '6_JARS'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Mô hình 6 Chiếc Hũ (6 Jars)
        </button>
        <button
          onClick={() => setActiveTab('50_30_20')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === '50_30_20'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Quy tắc 50/30/20
        </button>
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'CATEGORIES'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Hạn mức từng Danh mục ({categoryBudgets.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: 6 JARS VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === '6_JARS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jarList.map((jar) => {
            const isOver = jar.ratio > 100;
            const isWarning = jar.ratio >= 80 && !isOver;

            return (
              <div
                key={jar.key}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between transition-all ${
                  isOver
                    ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-500/20'
                    : isWarning
                    ? 'border-amber-300 dark:border-amber-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Định mức {jar.percent}%
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOver
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                    >
                      {isOver ? '⚠️ Vượt hạn mức' : isWarning ? '⚡ Cảnh báo 80%' : '✓ Trong định mức'}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${jar.bgBar}`} />
                    {jar.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {jar.desc}
                  </p>
                </div>

                <div className="mt-5 space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <span className="text-slate-400">Đã chi tiêu</span>
                      <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                        {fmt(jar.spent)} ₫
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Hạn mức hũ</span>
                      <div className="font-mono font-bold text-slate-600 dark:text-slate-300">
                        {fmt(jar.budgetCap)} ₫
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : jar.bgBar
                      }`}
                      style={{ width: `${Math.min(100, jar.ratio)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-medium">Tỷ lệ: {jar.ratio}%</span>
                    <span
                      className={`font-mono font-semibold ${
                        jar.remaining < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {jar.remaining < 0
                        ? `Vượt -${fmt(Math.abs(jar.remaining))} ₫`
                        : `Còn lại +${fmt(jar.remaining)} ₫`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: 50/30/20 VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === '50_30_20' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Needs 50% */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                50% Ngân sách
              </span>
              <span className="text-xs text-slate-400">Needs</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Nhu Cầu Thiết Yếu</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chi phí không thể trì hoãn: Tiền thuê/mua nhà, thực phẩm, hóa đơn điện nước thoại, xăng xe & bảo dưỡng định kỳ xe ô tô Mazda 2.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">Hạn mức gợi ý:</span>
              <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                {fmt(monthlyIncome * 0.5)} ₫
              </div>
            </div>
          </div>

          {/* Wants 30% */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                30% Ngân sách
              </span>
              <span className="text-xs text-slate-400">Wants</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Mong Muốn Linh Hoạt</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nâng cao chất lượng cuộc sống: Du lịch gia đình, cà phê ăn uống với bạn bè, mua sắm thời trang đồ chơi xe, giải trí cuối tuần.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">Hạn mức gợi ý:</span>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {fmt(monthlyIncome * 0.3)} ₫
              </div>
            </div>
          </div>

          {/* Savings 20% */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                20% Ngân sách
              </span>
              <span className="text-xs text-slate-400">Savings & Debt</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Tiết Kiệm & Trả Nợ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tạo lập nền tảng an toàn: Trả nợ gốc khoản vay mua xe, tích lũy vào sổ tiết kiệm ngân hàng, đầu tư cổ phiếu dài hạn.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">Mục tiêu tích lũy:</span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {fmt(monthlyIncome * 0.2)} ₫
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: CATEGORY BUDGETS LIST
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'CATEGORIES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Hạng mục thu chi</th>
                  <th className="py-3 px-4">Hũ ngân sách (Bucket)</th>
                  <th className="py-3 px-4 text-right">Hạn mức tháng</th>
                  <th className="py-3 px-4 text-right">Đã chi thực tế</th>
                  <th className="py-3 px-4">Tiến độ chi tiêu</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {categoryBudgets.map((item) => {
                  const isExceeded = item.target > 0 && item.ratio > 100;
                  const isWarning = item.target > 0 && item.ratio >= item.alertThresh && !isExceeded;

                  return (
                    <tr
                      key={item.category.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        !item.category.parent_id
                          ? 'bg-slate-50/40 dark:bg-slate-800/20 font-extrabold'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {item.category.parent_id ? (
                            <span className="text-slate-400 pl-4 font-normal text-xs">↳</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400 uppercase">
                              Nhóm mẹ
                            </span>
                          )}
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.category.color || '#94a3b8' }}
                          />
                          <span className={item.category.parent_id ? 'text-xs text-slate-700 dark:text-slate-300' : 'text-xs font-black'}>
                            {item.category.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category.budget_bucket || 'NECESSITY'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap text-slate-900 dark:text-white">
                        {item.target > 0 ? `${fmt(item.target)} ₫` : 'Chưa đặt'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap text-rose-600 dark:text-rose-400">
                        {fmt(item.spent)} ₫
                      </td>
                      <td className="py-3 px-4 min-w-[160px]">
                        {item.target > 0 ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span
                                className={
                                  isExceeded
                                    ? 'text-rose-600 font-bold'
                                    : isWarning
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-400'
                                }
                              >
                                {item.ratio}% (Báo {item.alertThresh}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, item.ratio)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() =>
                            openEditCategoryBudget(item.category, item.target, item.alertThresh)
                          }
                          className="flex items-center gap-1 mx-auto px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Cài đặt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Budget Modal */}
      <DraggableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Cài đặt hạn mức: ${editingCategory?.name}`}
        className="max-w-md w-full"
      >
        <form onSubmit={handleSaveBudget} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hạn mức chi tiêu tháng {selectedMonth}/{selectedYear} (VNĐ)
            </label>
            <input
              type="text"
              required
              placeholder="VD: 5,000,000"
              value={budgetAmountStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setBudgetAmountStr(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
              }}
              className="w-full px-3 py-2 text-base font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngưỡng cảnh báo khi chạm hạn mức (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Hệ thống sẽ gửi cảnh báo màu vàng khi bạn đã tiêu chạm ngưỡng này.
            </p>
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
              className="px-5 py-2 font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-md shadow-sky-600/20"
            >
              Lưu hạn mức
            </button>
          </div>
        </form>
      </DraggableModal>
    </div>
  );
}

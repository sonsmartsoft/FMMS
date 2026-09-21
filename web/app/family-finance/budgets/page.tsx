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
  Sliders,
  Settings2,
  Info,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import FinanceErrorBoundary from '@/components/finance/FinanceErrorBoundary';
import { safeFormatCurrency as fmt, safeFormatDate as fmtDate } from '@/lib/utils/formatters';
import {
  get6JarsConfig,
  save6JarsConfig,
  reset6JarsConfig,
  getBaseMonthlyIncome,
  saveBaseMonthlyIncome,
  JarItemConfig,
  DEFAULT_6JARS_CONFIG,
  DEFAULT_BASE_INCOME,
} from '@/lib/utils/jarsConfig';

export default function BudgetsManagementPage() {
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<FamilyBudget[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'6_JARS' | '50_30_20' | 'CATEGORIES'>('6_JARS');

  // Edit Category Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TransactionCategory | null>(null);
  const [budgetAmountStr, setBudgetAmountStr] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  // 6 Jars Configuration State
  const [jarsConfig, setJarsConfig] = useState<JarItemConfig[]>(DEFAULT_6JARS_CONFIG);
  const [baseIncome, setBaseIncome] = useState<number>(DEFAULT_BASE_INCOME);
  const [isJarsModalOpen, setIsJarsModalOpen] = useState(false);
  const [tempJarsConfig, setTempJarsConfig] = useState<JarItemConfig[]>(DEFAULT_6JARS_CONFIG);
  const [tempBaseIncomeStr, setTempBaseIncomeStr] = useState('50,000,000');
  const [jarsErrorMsg, setJarsErrorMsg] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Initial load of 6 jars config
  useEffect(() => {
    setIsMounted(true);
    setJarsConfig(get6JarsConfig());
    const bInc = getBaseMonthlyIncome();
    setBaseIncome(bInc);
    setTempBaseIncomeStr(bInc.toLocaleString('vi-VN'));
  }, []);

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
    return inc > 0 ? inc : baseIncome; // Baseline from setting if not yet recorded
  }, [transactions, baseIncome]);

  // Actual monthly expense
  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
  }, [transactions]);

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

  // ── Chart Data Calculations ──
  const jarsBarData = useMemo(() => {
    return jarList.map((j) => ({
      name: j.name.replace('Hũ ', '').replace(/ \(.*\)/, ''),
      fullName: j.name,
      'Hạn mức định mức': j.budgetCap,
      'Đã chi thực tế': j.spent,
    }));
  }, [jarList]);

  const jarsPieData = useMemo(() => {
    return jarList.map((j) => ({
      name: j.name,
      value: j.budgetCap,
      spent: j.spent,
      percent: j.percent,
      color: j.color,
    }));
  }, [jarList]);

  const rule503020Data = useMemo(() => {
    const needsBudget = monthlyIncome * 0.5;
    const wantsBudget = monthlyIncome * 0.3;
    const savingsBudget = monthlyIncome * 0.2;

    const needsSpent = transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && (t.is_essential || t.category?.budget_bucket === 'NECESSITY'))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const wantsSpent = transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.is_essential && t.category?.budget_bucket !== 'NECESSITY')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const savingsSpent = Math.max(0, monthlyIncome - totalExpense);

    return [
      {
        name: 'Thiết yếu (50%)',
        'Định mức chuẩn': needsBudget,
        'Thực tế': needsSpent,
        color: '#0ea5e9',
      },
      {
        name: 'Mong muốn (30%)',
        'Định mức chuẩn': wantsBudget,
        'Thực tế': wantsSpent,
        color: '#f59e0b',
      },
      {
        name: 'Tiết kiệm (20%)',
        'Định mức chuẩn': savingsBudget,
        'Thực tế': savingsSpent,
        color: '#10b981',
      },
    ];
  }, [monthlyIncome, totalExpense, transactions]);

  const topCategoriesChartData = useMemo(() => {
    return [...categoryBudgets]
      .filter((item) => item.target > 0 || item.spent > 0)
      .sort((a, b) => (b.spent || b.target) - (a.spent || a.target))
      .slice(0, 8)
      .map((item) => ({
        name: item.category.name,
        'Hạn mức đặt ra': item.target,
        'Đã chi': item.spent,
      }));
  }, [categoryBudgets]);

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

  const tempTotalPercent = useMemo(() => {
    return tempJarsConfig.reduce((s, j) => s + (Number(j.percent) || 0), 0);
  }, [tempJarsConfig]);

  const handleSaveJarsConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempTotalPercent !== 100) {
      setJarsErrorMsg(`Tổng tỷ lệ các hũ phải bằng đúng 100% (Hiện tại là ${tempTotalPercent}%)`);
      return;
    }
    const incomeNum = parseInt(tempBaseIncomeStr.replace(/[^0-9]/g, ''), 10) || 50000000;
    save6JarsConfig(tempJarsConfig);
    saveBaseMonthlyIncome(incomeNum);
    setJarsConfig([...tempJarsConfig]);
    setBaseIncome(incomeNum);
    setIsJarsModalOpen(false);
  };

  const handleResetJarsConfig = () => {
    const def = reset6JarsConfig();
    setTempJarsConfig(def);
    setTempBaseIncomeStr((50000000).toLocaleString('vi-VN'));
    setJarsErrorMsg('');
  };

  return (
    <FinanceErrorBoundary fallbackTitle="Không thể tải ngân sách thông minh">
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
        <div className="space-y-4">
          {/* 6 Jars Header & Config Card */}
          <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 dark:from-sky-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-sky-200/60 dark:border-sky-800/60 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Cơ chế phân bổ 6 Chiếc Hũ (T. Harv Eker)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Hệ thống tự động tính từ thu nhập
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Ngân sách được tính tự động từ dòng thu nhập thực tế tháng này ({fmt(monthlyIncome)} ₫).
                  Mọi khoản chi xăng xe, bảo dưỡng xe Mazda 2 được tự động hạch toán vào Hũ Thiết Yếu (NEC).
                  Bạn có thể tùy biến tỷ lệ % hoặc đổi mức thu nhập cơ sở theo mục tiêu riêng của gia đình.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setTempJarsConfig([...jarsConfig]);
                setTempBaseIncomeStr(baseIncome.toLocaleString('vi-VN'));
                setJarsErrorMsg('');
                setIsJarsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Settings2 className="w-4 h-4" />
              Cấu hình tỷ lệ 6 Hũ
            </button>
          </div>

          {/* 6 Jars Interactive Analysis Charts */}
          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Chart 1: Grouped Bar Chart - Budget vs Actual */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        So sánh Hạn Mức Hũ vs Đã Chi Thực Tế
                      </h3>
                      <p className="text-[10px] text-slate-400">Đơn vị: VNĐ (Biểu đồ cột so sánh)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Hạn mức
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Đã chi
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jarsBarData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        fontWeight={600}
                        tickLine={false}
                        interval={0}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                      />
                      <ReTooltip
                        formatter={(val: any) => [`${fmt(Number(val))} ₫`, '']}
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.94)',
                          borderColor: 'rgba(56, 189, 248, 0.3)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      />
                      <Bar dataKey="Hạn mức định mức" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Đã chi thực tế" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Donut Chart - 6 Jars Allocation */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Cơ Cấu Phân Bổ 6 Chiếc Hũ
                      </h3>
                      <p className="text-[10px] text-slate-400">Theo chuẩn Harv Eker &amp; tùy biến</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    100% Thu nhập
                  </span>
                </div>

                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={jarsPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {jarsPieData.map((entry, idx) => (
                          <Cell key={`jar-pie-${idx}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <ReTooltip
                        formatter={(val: any, name: any, props: any) => [
                          `${fmt(Number(val))} ₫ (${props.payload.percent}%)`,
                          name,
                        ]}
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.94)',
                          borderColor: 'rgba(99, 102, 241, 0.3)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng định mức</span>
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                      {fmt(monthlyIncome)} ₫
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  {jarsPieData.map((j) => (
                    <div key={j.name} className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: j.color }} />
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {j.name.split(' (')[0]}: <b>{j.percent}%</b>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jarList.map((jar) => {
              const isOver = jar.ratio > 100;
              const isWarning = jar.ratio >= 80 && !isOver;

            return (
              <div
                key={jar.key}
                className="p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-all group relative overflow-hidden hover:shadow-md hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${jar.color}0d, var(--bg-surface, #ffffff))`,
                  borderColor: isOver ? '#f43f5e' : isWarning ? '#f59e0b' : `${jar.color}45`,
                }}
              >
                <div
                  className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none opacity-25"
                  style={{ backgroundColor: jar.color }}
                />
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: 50/30/20 VIEW
         ───────────────────────────────────────────────────────────── */}
      {activeTab === '50_30_20' && (
        <div className="space-y-6">
          {/* Interactive Chart for 50/30/20 Rule */}
          {isMounted && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Bar Chart 50/30/20 */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Đối Sánh Quy Tắc 50/30/20 vs Thực Tế
                      </h3>
                      <p className="text-[10px] text-slate-400">Đơn vị: VNĐ (Định mức chuẩn vs Thực tế tháng)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Định mức
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Thực tế
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rule503020Data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                      />
                      <ReTooltip
                        formatter={(val: any) => [`${fmt(Number(val))} ₫`, '']}
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.94)',
                          borderColor: 'rgba(245, 158, 11, 0.3)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      />
                      <Bar dataKey="Định mức chuẩn" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Thực tế" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart 50/30/20 */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                      <PieChart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Cơ Cấu Chuẩn 50 / 30 / 20
                      </h3>
                      <p className="text-[10px] text-slate-400">Tỷ trọng khuyến nghị từ chuyên gia</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                    {fmt(monthlyIncome)} ₫
                  </span>
                </div>

                <div className="h-56 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={[
                          { name: 'Nhu cầu Thiết yếu (50%)', value: monthlyIncome * 0.5, color: '#0ea5e9' },
                          { name: 'Mong muốn Linh hoạt (30%)', value: monthlyIncome * 0.3, color: '#f59e0b' },
                          { name: 'Tiết kiệm & Trả nợ (20%)', value: monthlyIncome * 0.2, color: '#10b981' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                      >
                        <Cell fill="#0ea5e9" stroke="transparent" />
                        <Cell fill="#f59e0b" stroke="transparent" />
                        <Cell fill="#10b981" stroke="transparent" />
                      </Pie>
                      <ReTooltip
                        formatter={(val: any) => [`${fmt(Number(val))} ₫`, 'Định mức']}
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.94)',
                          borderColor: 'rgba(14, 165, 233, 0.3)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Mô hình</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">50 / 30 / 20</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900">
                    <span className="text-sky-600 dark:text-sky-400 font-bold block">50% Needs</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{fmt(monthlyIncome * 0.5)} ₫</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900">
                    <span className="text-amber-600 dark:text-amber-400 font-bold block">30% Wants</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{fmt(monthlyIncome * 0.3)} ₫</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block">20% Savings</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{fmt(monthlyIncome * 0.2)} ₫</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Needs 50% */}
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.06), var(--bg-surface, #ffffff))',
              borderColor: 'rgba(14,165,233,0.35)',
            }}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                50% Ngân sách
              </span>
              <span className="text-xs text-slate-400">Needs</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Nhu Cầu Thiết Yếu</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chi phí không thể trì hoãn: Tiền thuê/mua nhà, thực phẩm, hóa đơn điện nước thoại, xăng xe &amp; bảo dưỡng định kỳ xe ô tô Mazda 2AT.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400">Hạn mức gợi ý:</span>
              <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                {fmt(monthlyIncome * 0.5)} ₫
              </div>
            </div>
          </div>

          {/* Wants 30% */}
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.06), var(--bg-surface, #ffffff))',
              borderColor: 'rgba(245,158,11,0.35)',
            }}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
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
          <div
            className="p-6 rounded-2xl border shadow-sm space-y-4 relative overflow-hidden group hover:shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.06), var(--bg-surface, #ffffff))',
              borderColor: 'rgba(16,185,129,0.35)',
            }}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                20% Ngân sách
              </span>
              <span className="text-xs text-slate-400">Savings &amp; Debt</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Tiết Kiệm &amp; Trả Nợ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tạo lập nền tảng an toàn: Trả nợ gốc khoản vay mua xe, tích lũy vào sổ tiết kiệm ngân hàng, đầu tư sinh lời dài hạn.
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
        <div className="space-y-6">
          {/* Interactive Chart for Categories Budget vs Spent */}
          {isMounted && topCategoriesChartData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      So Sánh Hạn Mức Đặt Ra vs Đã Chi Theo Danh Mục
                    </h3>
                    <p className="text-[10px] text-slate-400">Top danh mục chi tiêu lớn nhất trong tháng (Đơn vị: VNĐ)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Hạn mức
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Đã chi
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCategoriesChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                    />
                    <ReTooltip
                      formatter={(val: any) => [`${fmt(Number(val))} ₫`, '']}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.94)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    />
                    <Bar dataKey="Hạn mức đặt ra" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Đã chi" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

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

      {/* 6 Jars Percentage Configuration Modal */}
      <DraggableModal
        isOpen={isJarsModalOpen}
        onClose={() => setIsJarsModalOpen(false)}
        title="⚙️ Cấu hình tỷ lệ 6 Chiếc Hũ & Thu nhập cơ sở"
        className="max-w-xl w-full"
      >
        <form onSubmit={handleSaveJarsConfig} className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
              <Info className="w-4 h-4 text-sky-500 shrink-0" />
              Cơ chế phân bổ tự động theo phương pháp 6 Chiếc Hũ (T. Harv Eker)
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Khi bạn ghi chép nguồn thu (Lương, Thưởng, Cổ tức...), hệ thống sẽ tự động phân bổ theo % từng hũ để tính định mức chi tiêu an toàn.
              Mọi chi phí xe (xăng xe, bảo dưỡng, cầu đường) được tự động trừ vào Hũ Thiết Yếu (NEC). Tổng tỷ lệ 6 hũ bắt buộc phải bằng <strong>100%</strong>.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mức thu nhập cơ sở ước tính hàng tháng (VNĐ)
            </label>
            <input
              type="text"
              required
              value={tempBaseIncomeStr}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setTempBaseIncomeStr(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
              }}
              className="w-full px-3 py-2 text-sm font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="VD: 50,000,000"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Áp dụng làm mốc ngân sách chuẩn khi tháng mới chưa ghi chép đủ dòng tiền vào.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Tỷ lệ phân bổ 6 Hũ (%)
              </label>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  tempTotalPercent === 100
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                Tổng: {tempTotalPercent}% {tempTotalPercent === 100 ? '✓ Hợp lệ 100%' : `(Cần điều chỉnh về 100%)`}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {tempJarsConfig.map((jar, idx) => (
                <div
                  key={jar.key}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: jar.color }} />
                    <div className="truncate">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                        {jar.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-sm">{jar.desc}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={jar.percent}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                        const next = [...tempJarsConfig];
                        next[idx] = { ...next[idx], percent: val };
                        setTempJarsConfig(next);
                      }}
                      className="w-16 px-2 py-1 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {jarsErrorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {jarsErrorMsg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleResetJarsConfig}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục chuẩn 55/10/10/10/10/5
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsJarsModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={tempTotalPercent !== 100}
                className="px-5 py-2 font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md shadow-sky-600/20"
              >
                Lưu cấu hình 6 Hũ
              </button>
            </div>
          </div>
        </form>
      </DraggableModal>
      </div>
    </FinanceErrorBoundary>
  );
}

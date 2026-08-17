'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getLoans, getLoanPayments, createLoanPayment, updateLoan, LoanRow, LoanPaymentRow } from '@/lib/services/loanService';
import { ExpenseRecord } from '@/types/mobility';
import { DollarSign, CreditCard, Plus, X, TrendingDown, CheckCircle2, Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

const CAT_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu', MAINTENANCE: 'Bảo dưỡng', INSURANCE: 'Bảo hiểm',
  REGISTRATION: 'Đăng ký/KT', PARKING: 'Đỗ xe', TOLL: 'Cầu đường',
  PARTS: 'Phụ tùng', LABOR: 'Nhân công', INSPECTION: 'Đăng kiểm', OTHER: 'Khác',
};
const CAT_COLORS: Record<string, string> = {
  FUEL: '#F59E0B', MAINTENANCE: '#38BDF8', INSURANCE: '#A78BFA',
  REGISTRATION: '#34D399', PARKING: '#94A3B8', TOLL: '#CBD5E1',
  PARTS: '#FB923C', LABOR: '#60A5FA', INSPECTION: '#4ADE80', OTHER: '#6B7280',
};

// Generate loan payment schedule
function generateLoanSchedule(loan: LoanRow, payments: LoanPaymentRow[]) {
  const monthly = loan.monthly_payment;
  const rate = loan.interest_rate_percent / 100 / 12;
  const start = new Date(loan.start_date || new Date().toISOString().slice(0, 10));
  let balance = loan.principal;
  const schedule = [];
  const paidKeys = new Set(payments.filter(p => p.status === 'PAID' || p.paid_date).map(p => {
    const d = new Date(p.due_date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));
  for (let i = 1; i <= loan.term_months; i++) {
    const interest = Math.round(balance * rate);
    const principal = Math.round(monthly - interest);
    balance = Math.max(0, balance - principal);
    const due = new Date(start);
    due.setMonth(due.getMonth() + i - 1);
    due.setDate(loan.payment_day);
    const dueStr = due.toISOString().split('T')[0];
    const today = new Date();
    const key = `${due.getFullYear()}-${due.getMonth()}`;
    let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';
    if (paidKeys.has(key)) status = 'PAID';
    else if (new Date(dueStr) < today) status = 'OVERDUE';
    schedule.push({ payment_number: i, due_date: dueStr, principal_paid: principal, interest_paid: interest, total_payment: monthly, status, remaining_balance: balance });
  }
  return schedule;
}

export default function FinancePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [payments, setPayments] = useState<LoanPaymentRow[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'expenses' | 'loans'>('expenses');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paid_date: '', notes: '' });
  const [form, setForm] = useState({
    asset_id: '', date: '', category: 'FUEL',
    amount: '', vendor: '', description: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, e, l] = await Promise.all([getAssets(), getExpenses(), getLoans()]);
        if (cancelled) return;
        setAssets(a);
        setExpenses(e);
        setLoans(l);
        if (a.length > 0) setForm(p => ({ ...p, asset_id: a[0].id }));
        if (l.length > 0) setPayments(await getLoanPayments(l[0].id));
      } catch {
        /* rỗng */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loan = loans[0] || null;
  const loanSchedule = useMemo(() => loan ? generateLoanSchedule(loan, payments) : [], [loan, payments]);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const paidPrincipal = loan ? loan.principal - loan.current_balance : 0;
  const loanProgress = loan ? (paidPrincipal / loan.principal) * 100 : 0;
  const paidPayments = loanSchedule.filter(p => p.status === 'PAID').length;
  const overduePayments = loanSchedule.filter(p => p.status === 'OVERDUE').length;

  const breakdown = Object.entries(CAT_LABELS).map(([k]) => ({
    category: k, label: CAT_LABELS[k],
    total: expenses.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0),
    color: CAT_COLORS[k] || '#6B7280',
  })).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

  const openEdit = (e: ExpenseRecord) => {
    setEditId(e.id);
    setForm({ asset_id: e.asset_id, date: e.date, category: e.category, amount: String(e.amount), vendor: e.vendor || '', description: e.description || '' });
    setOpenModal(true);
  };

  const saveExpense = async () => {
    const payload = {
      asset_id: form.asset_id,
      date: form.date,
      category: form.category as ExpenseRecord['category'],
      amount: parseFloat(form.amount) || 0,
      currency: 'VND',
      vendor: form.vendor || undefined,
      description: form.description || undefined,
    };
    try {
      if (editId) {
        const updated = await updateExpense(editId, payload);
        setExpenses(prev => prev.map(e => e.id === editId ? updated : e));
      } else {
        const created = await createExpense(payload);
        setExpenses(prev => [created, ...prev]);
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(false); setEditId(null);
    setForm({ asset_id: assets[0]?.id || '', date: '', category: 'FUEL', amount: '', vendor: '', description: '' });
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Xóa chi phí này?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const confirmPayment = async () => {
    if (!loan) return;
    const next = loanSchedule.find(p => p.status !== 'PAID');
    const amount = parseFloat(paymentForm.amount) || loan.monthly_payment;
    try {
      await createLoanPayment({
        loan_id: loan.id,
        payment_number: next?.payment_number ?? (loanSchedule.length + 1),
        due_date: next?.due_date ?? new Date().toISOString().slice(0, 10),
        principal_paid: next?.principal_paid ?? Math.round(amount),
        interest_paid: next?.interest_paid ?? 0,
        total_payment: amount,
        paid_date: paymentForm.paid_date || new Date().toISOString().slice(0, 10),
        status: 'PAID',
        remaining_balance: Math.max(0, loan.current_balance - amount),
      });
      await updateLoan(loan.id, { current_balance: Math.max(0, loan.current_balance - amount) });
      const [newLoan] = await getLoans();
      setLoans(newLoan ? [newLoan] : []);
      setPayments(await getLoanPayments(loan.id));
    } catch (err: any) {
      alert(`Lỗi khi ghi thanh toán: ${err?.message ?? 'Không ghi được'}`);
    }
    setShowPaymentModal(false);
    setPaymentForm({ amount: '', paid_date: '', notes: '' });
  };

  const statusBadge = (s: 'PAID' | 'PENDING' | 'OVERDUE') => {
    const map = {
      PAID: { label: '✓ Đã trả', color: 'var(--status-green)', bg: 'rgba(52,211,153,0.12)' },
      PENDING: { label: '⏳ Chưa đến hạn', color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
      OVERDUE: { label: '⚠ Quá hạn', color: 'var(--status-red)', bg: 'rgba(248,113,113,0.12)' },
    };
    return map[s] || map.PENDING;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Chi Phí & Khoản Vay</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Tổng chi phí: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong>
            {overduePayments > 0 && <span className="ml-3" style={{ color: 'var(--status-red)' }}>⚠ {overduePayments} khoản vay quá hạn</span>}
          </p>
        </div>
        <button onClick={() => { setEditId(null); setOpenModal(true); }}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm chi phí</span>
        </button>
      </div>

      {/* Tab */}
      <div className="flex space-x-2">
        {(['expenses', 'loans'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition"
            style={activeSection === tab
              ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            {tab === 'expenses' ? '💳 Chi Phí Phát Sinh' : '🏦 Khoản Vay & Lịch Trả Nợ'}
          </button>
        ))}
      </div>

      {/* ─── EXPENSES ─── */}
      {activeSection === 'expenses' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {breakdown.map(b => (
              <div key={b.category} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                </div>
                <p className="text-sm font-extrabold" style={{ color: b.color }}>{(b.total / 1_000_000).toFixed(1)}M ₫</p>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{((b.total / totalExpenses) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Ngày', 'Phương tiện', 'Danh mục', 'Mô tả', 'Nhà cung cấp', 'Số tiền', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(e.date)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{assets.find(a => a.id === e.asset_id)?.name?.split(' ')[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${CAT_COLORS[e.category]}22`, color: CAT_COLORS[e.category] || '#6B7280' }}>
                        {CAT_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{e.vendor || '—'}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button onClick={() => openEdit(e)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--accent-cyan)' }} title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteExpense(e.id)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--status-red)' }} title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── LOANS ─── */}
      {activeSection === 'loans' && loan && (
        <div className="space-y-5">
          {/* Loan Summary Card */}
          <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Vay mua {assets.find(a => a.id === loan.asset_id)?.name || 'phương tiện'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{loan.lender}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>● ACTIVE</span>
                <button onClick={() => setShowPaymentModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <Plus className="w-3.5 h-3.5" /><span>Ghi nhận thanh toán</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-5">
              {[
                { label: 'Số tiền gốc', value: `${fmt(loan.principal)} ₫`, color: 'var(--text-primary)' },
                { label: 'Trả trước', value: `${fmt(loan.down_payment)} ₫`, color: 'var(--text-secondary)' },
                { label: 'Lãi suất', value: `${loan.interest_rate_percent}%/năm`, color: 'var(--status-amber)' },
                { label: 'Kỳ hạn', value: `${loan.term_months} tháng`, color: 'var(--text-secondary)' },
                { label: 'Thanh toán/tháng', value: `${fmt(loan.monthly_payment)} ₫`, color: 'var(--accent-cyan)' },
                { label: 'Ngày thanh toán', value: `Ngày ${loan.payment_day}/tháng`, color: 'var(--text-secondary)' },
                { label: 'Đã trả', value: `${paidPayments} / ${loan.term_months} kỳ`, color: 'var(--status-green)' },
                { label: 'Quá hạn', value: overduePayments > 0 ? `${overduePayments} kỳ` : 'Không có', color: overduePayments > 0 ? 'var(--status-red)' : 'var(--status-green)' },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                  <p className="font-bold mt-0.5 text-xs" style={{ color: r.color }}>{r.value}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl text-center mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dư nợ còn lại</p>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--status-red)' }}>{fmt(loan.current_balance)} ₫</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Đã trả: {fmt(paidPrincipal)} ₫ ({loanProgress.toFixed(1)}%)</p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>Tiến độ trả nợ</span>
                <span>{loanProgress.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${loanProgress}%`, background: 'linear-gradient(90deg, var(--accent-cyan), #3B82F6)' }} />
              </div>
            </div>
          </div>

          {/* ─── Loan Payment Schedule Table ─── */}
          <div>
            <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              📋 Lịch trả nợ chi tiết ({loan.term_months} kỳ)
            </h3>
            <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Kỳ #', 'Ngày đến hạn', 'Gốc', 'Lãi', 'Tổng thanh toán', 'Dư nợ còn lại', 'Trạng thái'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loanSchedule.map((p, i) => {
                    const st = statusBadge(p.status);
                    return (
                      <tr key={p.payment_number}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: p.status === 'OVERDUE' ? 'rgba(248,113,113,0.04)' : i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                        }}>
                        <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--text-muted)' }}>{p.payment_number}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.due_date)}</td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--accent-cyan)' }}>{fmt(p.principal_paid)} ₫</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--status-amber)' }}>{fmt(p.interest_paid)} ₫</td>
                        <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(p.total_payment)} ₫</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{fmt(p.remaining_balance)} ₫</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
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

      {/* ─── Add/Edit Expense Modal ─── */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{editId ? 'Sửa chi phí' : 'Thêm chi phí phát sinh'}</h3>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Phương tiện', el: <select className="theme-select" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> },
                { label: 'Ngày', el: <input type="date" className="theme-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /> },
                { label: 'Danh mục', el: <select className="theme-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> },
                { label: 'Số tiền (₫)', el: <input type="number" className="theme-input" placeholder="500000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /> },
                { label: 'Nhà cung cấp', el: <input type="text" className="theme-input" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} /> },
                { label: 'Mô tả', el: <input type="text" className="theme-input" placeholder="Mô tả ngắn gọn" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /> },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  {el}
                </div>
              ))}
              <div className="flex space-x-2 pt-2">
                <button onClick={saveExpense} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'var(--accent-cyan)' }}>Lưu</button>
                <button onClick={() => setOpenModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Payment Modal ─── */}
      {showPaymentModal && loan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setShowPaymentModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-sm" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ghi nhận thanh toán khoản vay</h3>
              <button onClick={() => setShowPaymentModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                <p style={{ color: 'var(--accent-cyan)' }}>Thanh toán chuẩn: <strong>{fmt(loan.monthly_payment)} ₫</strong></p>
                <p style={{ color: 'var(--text-muted)' }} className="mt-0.5">Ngày đến hạn: {loan.payment_day}/tháng</p>
              </div>
              {[
                { label: 'Số tiền thanh toán (₫)', el: <input type="number" className="theme-input" placeholder={String(loan.monthly_payment)} value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} /> },
                { label: 'Ngày thanh toán', el: <input type="date" className="theme-input" value={paymentForm.paid_date} onChange={e => setPaymentForm(p => ({ ...p, paid_date: e.target.value }))} /> },
                { label: 'Ghi chú', el: <input type="text" className="theme-input" placeholder="VD: Chuyển khoản BIDV..." value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} /> },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  {el}
                </div>
              ))}
              <div className="flex space-x-2 pt-2">
                <button onClick={confirmPayment}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Xác nhận
                </button>
                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

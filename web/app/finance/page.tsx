'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getLoans, getLoanPayments, createLoan, createLoanPayment, updateLoan, LoanRow, LoanPaymentRow } from '@/lib/services/loanService';
import { ExpenseRecord } from '@/types/mobility';
import { VehicleFinanceOverview } from '@/components/assets/VehicleFinanceOverview';
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
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [openAddLoanModal, setOpenAddLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRow | null>(null);
  const [loanForm, setLoanForm] = useState({
    asset_id: '',
    lender: 'Ngân hàng Techcombank',
    principal: '400000000',
    down_payment: '100000000',
    interest_rate_percent: '8.5',
    term_months: '36',
    start_date: new Date().toISOString().slice(0, 10),
    monthly_payment: '',
    payment_day: '15',
    bank_contact_name: '',
    bank_contact_phone: '',
    bank_hotline: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const [a, e, l] = await Promise.all([getAssets(), getExpenses(), getLoans()]);
      setAssets(a);
      setExpenses(e);
      setLoans(l);
      if (a.length > 0 && !form.asset_id) setForm(p => ({ ...p, asset_id: a[0].id }));
      if (a.length > 0 && !loanForm.asset_id) setLoanForm(p => ({ ...p, asset_id: a[0].id }));
      if (l.length > 0) {
        const targetId = selectedLoanId && l.some(x => x.id === selectedLoanId) ? selectedLoanId : l[0].id;
        setSelectedLoanId(targetId);
        setPayments(await getLoanPayments(targetId));
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedLoanId) {
      getLoanPayments(selectedLoanId).then(setPayments).catch(() => {});
    }
  }, [selectedLoanId]);

  const selectedLoan = useMemo(() => {
    return loans.find(l => l.id === selectedLoanId) || loans[0] || null;
  }, [loans, selectedLoanId]);

  // Auto-calculate monthly payment (EMI formula)
  const calculatedMonthly = useMemo(() => {
    const p = parseFloat(loanForm.principal) || 0;
    const r = (parseFloat(loanForm.interest_rate_percent) || 0) / 100 / 12;
    const n = parseInt(loanForm.term_months) || 12;
    if (p > 0 && r > 0 && n > 0) {
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return Math.round(emi);
    }
    return 0;
  }, [loanForm.principal, loanForm.interest_rate_percent, loanForm.term_months]);

  const loanSchedule = useMemo(() => selectedLoan ? generateLoanSchedule(selectedLoan, payments) : [], [selectedLoan, payments]);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const paidPrincipal = selectedLoan ? selectedLoan.principal - selectedLoan.current_balance : 0;
  const loanProgress = selectedLoan && selectedLoan.principal > 0 ? (paidPrincipal / selectedLoan.principal) * 100 : 0;
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

  const deleteExpenseHandler = async (id: string) => {
    if (!confirm('Xóa chi phí này?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const openAddLoan = () => {
    setEditingLoan(null);
    setLoanForm({
      asset_id: assets[0]?.id || '',
      lender: 'Ngân hàng Techcombank',
      principal: '400000000',
      down_payment: '100000000',
      interest_rate_percent: '8.5',
      term_months: '36',
      start_date: new Date().toISOString().slice(0, 10),
      monthly_payment: '',
      payment_day: '15',
      bank_contact_name: '',
      bank_contact_phone: '',
      bank_hotline: '',
      notes: '',
    });
    setOpenAddLoanModal(true);
  };

  const openEditLoan = (l: LoanRow) => {
    setEditingLoan(l);
    setLoanForm({
      asset_id: l.asset_id,
      lender: l.lender || '',
      principal: String(l.principal),
      down_payment: String(l.down_payment || 0),
      interest_rate_percent: String(l.interest_rate_percent),
      term_months: String(l.term_months),
      start_date: l.start_date ? l.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      monthly_payment: String(l.monthly_payment),
      payment_day: String(l.payment_day || 15),
      bank_contact_name: l.bank_contact_name || '',
      bank_contact_phone: l.bank_contact_phone || '',
      bank_hotline: l.bank_hotline || '',
      notes: l.notes || '',
    });
    setOpenAddLoanModal(true);
  };

  const handleSaveLoan = async () => {
    const p = parseFloat(loanForm.principal) || 0;
    const m = parseFloat(loanForm.monthly_payment) || calculatedMonthly;
    const input = {
      asset_id: loanForm.asset_id || assets[0]?.id,
      lender: loanForm.lender || 'Ngân hàng',
      principal: p,
      down_payment: parseFloat(loanForm.down_payment) || 0,
      interest_rate_percent: parseFloat(loanForm.interest_rate_percent) || 8.5,
      term_months: parseInt(loanForm.term_months) || 36,
      start_date: loanForm.start_date || new Date().toISOString().slice(0, 10),
      monthly_payment: m,
      payment_day: parseInt(loanForm.payment_day) || 15,
      current_balance: editingLoan ? editingLoan.current_balance : p,
      bank_contact_name: loanForm.bank_contact_name || undefined,
      bank_contact_phone: loanForm.bank_contact_phone || undefined,
      bank_hotline: loanForm.bank_hotline || undefined,
      notes: loanForm.notes || undefined,
    };

    try {
      if (editingLoan) {
        const { updateLoanFull } = await import('@/lib/services/loanService');
        await updateLoanFull(editingLoan.id, input);
      } else {
        const created = await createLoan(input);
        setSelectedLoanId(created.id);
      }
      await loadData();
      setOpenAddLoanModal(false);
      setEditingLoan(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu khoản vay: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản vay này?')) return;
    try {
      const { deleteLoan } = await import('@/lib/services/loanService');
      await deleteLoan(loanId);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi xóa khoản vay: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const confirmPayment = async () => {
    if (!selectedLoan) return;
    const next = loanSchedule.find(p => p.status !== 'PAID');
    const amount = parseFloat(paymentForm.amount) || selectedLoan.monthly_payment;
    try {
      await createLoanPayment({
        loan_id: selectedLoan.id,
        payment_number: next?.payment_number ?? (loanSchedule.length + 1),
        due_date: next?.due_date ?? new Date().toISOString().slice(0, 10),
        principal_paid: next?.principal_paid ?? Math.round(amount),
        interest_paid: next?.interest_paid ?? 0,
        total_payment: amount,
        paid_date: paymentForm.paid_date || new Date().toISOString().slice(0, 10),
        status: 'PAID',
        remaining_balance: Math.max(0, selectedLoan.current_balance - amount),
      });
      await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.current_balance - amount) });
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi ghi thanh toán: ${err?.message ?? 'Không ghi được'}`);
    }
    setShowPaymentModal(false);
    setPaymentForm({ amount: '', paid_date: '', notes: '' });
  };

  const toggleSchedulePayment = async (item: any) => {
    if (!selectedLoan) return;
    try {
      if (item.status === 'PAID') {
        const match = payments.find(p => p.payment_number === item.payment_number);
        if (match) {
          const { updateLoanPayment } = await import('@/lib/services/loanService');
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
          await updateLoan(selectedLoan.id, { current_balance: Math.min(selectedLoan.principal, selectedLoan.current_balance + item.principal_paid) });
        }
      } else {
        await createLoanPayment({
          loan_id: selectedLoan.id,
          payment_number: item.payment_number,
          due_date: item.due_date,
          principal_paid: item.principal_paid,
          interest_paid: item.interest_paid,
          total_payment: item.total_payment,
          paid_date: new Date().toISOString().slice(0, 10),
          status: 'PAID',
          remaining_balance: Math.max(0, selectedLoan.current_balance - item.principal_paid),
        });
        await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.current_balance - item.principal_paid) });
      }
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
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
        <div className="flex items-center space-x-2">
          {activeSection === 'expenses' ? (
            <button onClick={() => { setEditId(null); setOpenModal(true); }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
              <Plus className="w-4 h-4" /><span>Thêm chi phí</span>
            </button>
          ) : (
            <button onClick={openAddLoan}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <Plus className="w-4 h-4" /><span>Tạo khoản vay mới</span>
            </button>
          )}
        </div>
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
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${CAT_COLORS[e.category] || '#6B7280'}22`, color: CAT_COLORS[e.category] || 'var(--text-muted)' }}>
                        {CAT_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{e.description || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{e.vendor || '—'}</td>
                    <td className="px-4 py-3 font-extrabold" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button onClick={() => openEdit(e)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--accent-cyan)' }} title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteExpenseHandler(e.id)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--status-red)' }} title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
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
      {activeSection === 'loans' && (
        <div className="space-y-5">
          {/* Loan Selector Bar */}
          {loans.length > 0 ? (
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Chọn khoản vay phương tiện:</span>
                <select
                  className="theme-select text-xs font-bold"
                  value={selectedLoanId || ''}
                  onChange={e => setSelectedLoanId(e.target.value)}
                >
                  {loans.map(l => {
                    const vehicleName = assets.find(a => a.id === l.asset_id)?.name || 'Xe';
                    return (
                      <option key={l.id} value={l.id}>
                        {vehicleName} ({l.lender}) — Vay {fmt(l.principal)}₫
                      </option>
                    );
                  })}
                </select>
              </div>
              <button onClick={openAddLoan} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                + Thêm khoản vay khác
              </button>
            </div>
          ) : (
            <div className="p-8 rounded-2xl text-center space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <CreditCard className="w-10 h-10 mx-auto opacity-40 text-cyan-400" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Chưa có khoản vay mua xe nào</p>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                Bạn có thể tạo khoản vay mua xe trả góp cho bất kỳ phương tiện nào trong gia đình để tự động tính lịch trả nợ dư nợ giảm dần.
              </p>
              <button onClick={openAddLoan} className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                + Tạo khoản vay đầu tiên
              </button>
            </div>
          )}

          {selectedLoan && (
            <div className="space-y-5">
              {(() => {
                const targetAsset = assets.find(a => a.id === selectedLoan.asset_id);
                if (!targetAsset) return null;
                return (
                  <VehicleFinanceOverview
                    asset={targetAsset}
                    loan={selectedLoan as any}
                    expenses={expenses.filter(e => e.asset_id === selectedLoan.asset_id)}
                    onRefresh={loadData}
                  />
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ─── Add / Edit Loan Modal ─── */}
      {openAddLoanModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenAddLoanModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-lg my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {editingLoan ? '✏️ Chỉnh sửa thông tin khoản vay' : '🏦 Thêm khoản vay mua xe mới'}
              </h3>
              <button onClick={() => setOpenAddLoanModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện vay *</label>
                <select className="theme-select" value={loanForm.asset_id} onChange={e => setLoanForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tổ chức tín dụng / Ngân hàng *</label>
                  <input type="text" className="theme-input" placeholder="VD: Techcombank, VPBank..." value={loanForm.lender} onChange={e => setLoanForm(p => ({ ...p, lender: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ghi chú / Tên hợp đồng</label>
                  <input type="text" className="theme-input" placeholder="VD: Vay mua xe trả góp 4 năm" value={loanForm.notes} onChange={e => setLoanForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền gốc vay (₫) *</label>
                  <input type="number" className="theme-input font-mono font-bold" placeholder="400000000" value={loanForm.principal} onChange={e => setLoanForm(p => ({ ...p, principal: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền trả trước (₫)</label>
                  <input type="number" className="theme-input font-mono" placeholder="100000000" value={loanForm.down_payment} onChange={e => setLoanForm(p => ({ ...p, down_payment: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Lãi suất (%/năm) *</label>
                  <input type="number" step="0.1" className="theme-input font-mono" placeholder="8.5" value={loanForm.interest_rate_percent} onChange={e => setLoanForm(p => ({ ...p, interest_rate_percent: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ hạn (tháng) *</label>
                  <input type="number" className="theme-input font-mono" placeholder="36" value={loanForm.term_months} onChange={e => setLoanForm(p => ({ ...p, term_months: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Hạn đóng (ngày)</label>
                  <input type="number" min="1" max="31" className="theme-input font-mono" placeholder="15" value={loanForm.payment_day} onChange={e => setLoanForm(p => ({ ...p, payment_day: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày bắt đầu vay *</label>
                  <input type="date" className="theme-input" value={loanForm.start_date} onChange={e => setLoanForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Trả hàng tháng (₫)</label>
                  <input
                    type="number"
                    className="theme-input font-mono font-bold"
                    placeholder={calculatedMonthly > 0 ? String(calculatedMonthly) : 'Tự động tính'}
                    value={loanForm.monthly_payment}
                    onChange={e => setLoanForm(p => ({ ...p, monthly_payment: e.target.value }))}
                  />
                  {calculatedMonthly > 0 && !loanForm.monthly_payment && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--accent-cyan)' }}>Gợi ý tính toán EMI: {fmt(calculatedMonthly)} ₫/tháng</p>
                  )}
                </div>
              </div>

              {/* Bank Contact & Hotline Fields */}
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <span className="font-bold text-[11px] uppercase flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                  📞 Cán bộ tín dụng &amp; Hotline Ngân hàng
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Tên cán bộ tín dụng..." className="theme-input text-xs" value={loanForm.bank_contact_name} onChange={e => setLoanForm(p => ({ ...p, bank_contact_name: e.target.value }))} />
                  <input type="tel" placeholder="SĐT cán bộ tín dụng..." className="theme-input text-xs font-mono font-bold" value={loanForm.bank_contact_phone} onChange={e => setLoanForm(p => ({ ...p, bank_contact_phone: e.target.value }))} />
                  <input type="tel" placeholder="Hotline/Tổng đài ngân hàng..." className="theme-input text-xs font-mono col-span-2" value={loanForm.bank_hotline} onChange={e => setLoanForm(p => ({ ...p, bank_hotline: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={handleSaveLoan} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {editingLoan ? 'Cập nhật khoản vay' : 'Lưu khoản vay mới'}
              </button>
              <button onClick={() => setOpenAddLoanModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Expense Modal ─── */}
      {openModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{editId ? 'Sửa chi phí' : 'Thêm chi phí phát sinh'}</h3>
              <button onClick={() => setOpenModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
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
            </div>
            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={saveExpense} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>Lưu chi phí</button>
              <button onClick={() => setOpenModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Payment Modal ─── */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowPaymentModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-sm my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ghi nhận thanh toán khoản vay</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                <p style={{ color: 'var(--accent-cyan)' }}>Thanh toán chuẩn: <strong>{fmt(selectedLoan.monthly_payment)} ₫</strong></p>
                <p style={{ color: 'var(--text-muted)' }} className="mt-0.5">Hạn đóng: Ngày {selectedLoan.payment_day}/tháng</p>
              </div>
              {[
                { label: 'Số tiền thanh toán (₫)', el: <input type="number" className="theme-input" placeholder={String(selectedLoan.monthly_payment)} value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} /> },
                { label: 'Ngày thanh toán', el: <input type="date" className="theme-input" value={paymentForm.paid_date} onChange={e => setPaymentForm(p => ({ ...p, paid_date: e.target.value }))} /> },
                { label: 'Ghi chú', el: <input type="text" className="theme-input" placeholder="VD: Chuyển khoản ngân hàng..." value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} /> },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={confirmPayment}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Xác nhận
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { INITIAL_ASSETS, MOCK_EXPENSES, MOCK_LOAN } from '@/lib/data/mockData';
import { ExpenseRecord } from '@/types/mobility';
import { DollarSign, CreditCard, TrendingDown, Plus, X, PieChart } from 'lucide-react';

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

export default function FinancePage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([...MOCK_EXPENSES]);
  const [openModal, setOpenModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'expenses' | 'loans'>('expenses');
  const [form, setForm] = useState({
    asset_id: INITIAL_ASSETS[0].id, date: '', category: 'FUEL',
    amount: '', vendor: '', description: '',
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const loan = MOCK_LOAN;
  const paidPrincipal = loan.principal - loan.current_balance;
  const loanProgress = (paidPrincipal / loan.principal) * 100;

  const save = () => {
    setExpenses([{
      id: `e${Date.now()}`,
      asset_id: form.asset_id,
      date: form.date,
      category: form.category as ExpenseRecord['category'],
      amount: parseFloat(form.amount) || 0,
      currency: 'VND',
      vendor: form.vendor,
      description: form.description,
    }, ...expenses]);
    setOpenModal(false);
    setForm({ asset_id: INITIAL_ASSETS[0].id, date: '', category: 'FUEL', amount: '', vendor: '', description: '' });
  };

  // Breakdown by category
  const breakdown = Object.entries(CAT_LABELS).map(([k]) => ({
    category: k,
    label: CAT_LABELS[k],
    total: expenses.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0),
    color: CAT_COLORS[k] || '#6B7280',
  })).filter(b => b.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Chi Phí & Khoản Vay</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Tổng chi phí: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong>
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm chi phí</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex space-x-2">
        {(['expenses', 'loans'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition"
            style={activeSection === tab
              ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            {tab === 'expenses' ? '💳 Chi Phí Phát Sinh' : '🏦 Khoản Vay Mua Xe'}
          </button>
        ))}
      </div>

      {activeSection === 'expenses' && (
        <>
          {/* Category Breakdown */}
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

          {/* Expenses Table */}
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Ngày', 'Phương tiện', 'Danh mục', 'Mô tả', 'Nhà cung cấp', 'Số tiền'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(e.date)}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{INITIAL_ASSETS.find(a => a.id === e.asset_id)?.name?.split(' ')[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${CAT_COLORS[e.category]}22`, color: CAT_COLORS[e.category] || '#6B7280' }}>
                        {CAT_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{e.description}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{e.vendor || '—'}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeSection === 'loans' && (
        <div className="space-y-5">
          {/* Loan Card */}
          <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Vay mua Mazda2 Base 2026</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{loan.lender}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>● ACTIVE</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs mb-6">
              {[
                { label: 'Số tiền gốc', value: `${fmt(loan.principal)} ₫`, color: 'var(--text-primary)' },
                { label: 'Trả trước', value: `${fmt(loan.down_payment)} ₫`, color: 'var(--text-secondary)' },
                { label: 'Lãi suất', value: `${loan.interest_rate_percent}%/năm`, color: 'var(--status-amber)' },
                { label: 'Kỳ hạn', value: `${loan.term_months} tháng`, color: 'var(--text-secondary)' },
                { label: 'Thanh toán hàng tháng', value: `${fmt(loan.monthly_payment)} ₫`, color: 'var(--accent-cyan)' },
                { label: 'Ngày thanh toán', value: `Ngày ${loan.payment_day}/tháng`, color: 'var(--text-secondary)' },
              ].map((r, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                  <p className="font-bold mt-0.5" style={{ color: r.color }}>{r.value}</p>
                </div>
              ))}
            </div>

            {/* Big balance highlight */}
            <div className="p-4 rounded-2xl text-center mb-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Dư nợ còn lại</p>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--status-red)' }}>{fmt(loan.current_balance)} ₫</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>Đã trả: {fmt(paidPrincipal)} ₫ ({loanProgress.toFixed(1)}%)</p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>Tiến độ trả nợ</span>
                <span>{loanProgress.toFixed(1)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded-full" style={{ width: `${loanProgress}%`, background: 'linear-gradient(90deg, var(--accent-cyan), #3B82F6)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Thêm chi phí phát sinh</h3>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Phương tiện', el: <select className="theme-select" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>{INITIAL_ASSETS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select> },
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
                <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'var(--accent-cyan)' }}>Lưu</button>
                <button onClick={() => setOpenModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

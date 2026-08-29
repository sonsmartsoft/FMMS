'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Asset, ExpenseRecord, MaintenanceRecord, TripRecord, LoanRecord, TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import { FuelLog, getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog } from '@/lib/services/fuelService';
import { getAsset, getAssets, updateAsset } from '@/lib/services/assetService';
import { getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord } from '@/lib/services/maintenanceService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getTrips, createTrip } from '@/lib/services/tripService';
import { getParts, createPart, updatePart, deletePart } from '@/lib/services/partService';
import { getInsurancePolicies, createInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy, InsuranceRow } from '@/lib/services/insuranceService';
import { getLoadByAsset } from '@/lib/services/loanService';
import { createOdometerAdjustment, getOdometerLogs, createOdometerLog, updateOdometerLog, deleteOdometerLog, OdometerLogRecord } from '@/lib/services/odometerService';
import { getWarranties, createWarranty, updateWarranty, deleteWarranty, createWarrantyClaim } from '@/lib/services/warrantyService';
import { createClient } from '@/lib/supabase/client';
import { VehicleFinanceOverview } from '@/components/assets/VehicleFinanceOverview';
import DraggableModal from '@/components/ui/DraggableModal';
import {
  ArrowLeft, Gauge, Fuel, Wrench, DollarSign, FileText, BarChart3,
  Cpu, CheckCircle2, Plus, MapPin, Activity, Layers, Car, X, Pencil,
  Zap, Clock, TrendingDown, Shield, CreditCard, Award, Trash2, Edit2,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
const durFmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

const DEFAULT_MAINT_CATEGORIES = [
  'Thay dầu máy', 'Thay lọc dầu / Lọc nhớt', 'Thay lọc gió động cơ', 'Thay lọc gió điều hòa',
  'Thay bugi đánh lửa', 'Thay má phanh', 'Thay nước làm mát', 'Thay ắc-quy / Pin', 'Thay lốp xe',
  'Thay dầu hộp số', 'Bơm lốp & Cân thước lái', 'Vệ sinh buồng đốt / Kim phun', 'Sửa chữa & Khác'
];

function generateLoanSchedule(loan: any, payments: any[]) {
  if (!loan) return [];
  const monthly = loan.monthly_payment;
  const rate = (loan.interest_rate_percent || 0) / 100 / 12;
  const start = new Date(loan.start_date || new Date().toISOString().slice(0, 10));
  let balance = loan.principal;
  const schedule = [];

  const paymentMap = new Map<number, any>();
  (payments || []).forEach(p => {
    paymentMap.set(p.payment_number, p);
  });

  for (let i = 1; i <= loan.term_months; i++) {
    const customPayment = paymentMap.get(i);
    let interest = Math.round(balance * rate);
    let principal = Math.round(monthly - interest);
    let total = monthly;
    let dueStr = '';
    let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';
    let paidDate: string | undefined = undefined;

    if (customPayment) {
      dueStr = customPayment.due_date ? customPayment.due_date.slice(0, 10) : '';
      principal = Number(customPayment.principal_paid) || principal;
      interest = Number(customPayment.interest_paid) || interest;
      total = Number(customPayment.total_payment) || (principal + interest);
      status = customPayment.status;
      paidDate = customPayment.paid_date;
    }

    if (!dueStr) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i - 1);
      due.setDate(loan.payment_day || 15);
      dueStr = due.toISOString().split('T')[0];
    }

    const today = new Date();
    if (!customPayment) {
      if (new Date(dueStr) < today) status = 'OVERDUE';
    }

    balance = Math.max(0, balance - principal);

    schedule.push({
      payment_number: i,
      due_date: dueStr,
      principal_paid: principal,
      interest_paid: interest,
      total_payment: total,
      status,
      paid_date: paidDate,
      remaining_balance: balance,
    });
  }
  return schedule;
}

/* ── Shared Modal Wrapper ─────────────────────────────────────── */
function Modal({ title, onClose, children, maxWidth = 'max-w-2xl' }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto backdrop-blur-md"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className={`rounded-2xl w-full ${maxWidth} my-auto flex flex-col shadow-2xl overflow-hidden`}
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <h3 className="font-extrabold text-sm uppercase tracking-wide flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>{title}</span>
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl transition hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-[250px] overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">{children}</div>
      </div>
    </div>
  );
}

/* ── Form Field ───────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ── Category badge for expenses ─────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  FUEL: '#F59E0B', MAINTENANCE: '#38BDF8', INSURANCE: '#A78BFA',
  REGISTRATION: '#34D399', PARKING: '#94A3B8', TOLL: '#CBD5E1',
  PARTS: '#FB923C', LABOR: '#60A5FA', INSPECTION: '#4ADE80',
  LOAN: '#EC4899', LOAN_PAYMENT: '#8B5CF6', LOAN_INTEREST: '#EF4444',
  INITIAL: '#10B981', UPGRADE: '#6366F1', CAR_WASH: '#06B6D4', OTHER: '#6B7280',
};
const CAT_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu', MAINTENANCE: 'Bảo dưỡng', INSURANCE: 'Bảo hiểm',
  REGISTRATION: 'Đăng ký/Lăn bánh', PARKING: 'Đỗ xe', TOLL: 'Cầu đường',
  PARTS: 'Phụ tùng', LABOR: 'Nhân công', INSPECTION: 'Đăng kiểm',
  LOAN: 'Khoản vay', LOAN_PAYMENT: 'Trả gốc vay', LOAN_INTEREST: 'Trả lãi vay',
  INITIAL: 'Vốn mua xe', UPGRADE: 'Nâng cấp/Đồ chơi', CAR_WASH: 'Rửa xe', OTHER: 'Khác',
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = (params?.id as string) ?? '';

  const [asset, setAsset] = useState<Asset | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Local state for each data list ── */
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [odometerLogs, setOdometerLogs] = useState<OdometerLogRecord[]>([]);
  const [editingOdoLog, setEditingOdoLog] = useState<OdometerLogRecord | null>(null);
  const [odoLogForm, setOdoLogForm] = useState({ date: '', odometer_km: '', note: '' });
  const [editingInsurance, setEditingInsurance] = useState<any | null>(null);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [editingWarranty, setEditingWarranty] = useState<any | null>(null);
  const [warrantyForm, setWarrantyForm] = useState({
    item_type: 'VEHICLE',
    item_name: 'Bảo hành chính hãng',
    provider: 'Thaco / Mazda',
    policy_number: '',
    start_date: '',
    expiry_date: '',
    coverage_details: '',
  });

  /* ── Live OBD telemetry (realtime from Android app) ── */
  const [live, setLive] = useState<{ speed: number | null; rpm: number | null; coolant: number | null; voltage: number | null }>({
    speed: null, rpm: null, coolant: null, voltage: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await getAsset(assetId);
        if (cancelled) return;
        if (!a) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setAsset(a);
        setEditForm({
          name: a.name, brand: a.brand, model: a.model, year: String(a.year || ''),
          color: a.color || '', license_plate: a.license_plate || '',
          vin: a.vin || '', engine: a.engine || '', fuel_type: a.fuel_type || 'PETROL',
          tank_capacity_liters: String(a.tank_capacity_liters ?? ''),
          battery_capacity_kwh: String(a.battery_capacity_kwh ?? ''),
          purchase_price: String(a.purchase_price || ''), current_value: String(a.current_value || ''),
          purchase_date: a.purchase_date || '', image_url: a.image_url || '',
          current_odometer_km: String(a.current_odometer_km || 0),
          status: a.status || 'ACTIVE', description: a.description || '',
          sales_rep_name: a.sales_rep_name || '',
          sales_rep_phone: a.sales_rep_phone || '',
          brand_hotline: a.brand_hotline || '',
        });

        const [f, m, e, t, p, i, l, odo, w] = await Promise.all([
          getFuelLogs(assetId),
          getMaintenanceRecords(assetId),
          getExpenses(assetId),
          getTrips(assetId),
          getParts(assetId),
          getInsurancePolicies(assetId),
          getLoadByAsset(assetId),
          getOdometerLogs(assetId),
          getWarranties(assetId),
        ]);
        if (cancelled) return;
        setFuelLogs(f);
        setMaintenance(m);
        setExpenses(e);
        setTrips(t);
        setParts(p);
        setOdometerLogs(odo);
        if (w?.data) setWarranties(w.data);
        setInsurances(
          i.map((r: InsuranceRow) => ({
            id: r.id,
            type: r.policy_type === 'COMPREHENSIVE'
              ? 'Bảo hiểm vật chất'
              : r.policy_type === 'MANDATORY'
                ? 'Bảo hiểm TNDS bắt buộc'
                : 'Khác',
            company: r.provider,
            policy_number: r.policy_number,
            start_date: r.start_date,
            expiry_date: r.expiry_date,
            annual_fee: r.cost,
            coverage_amount: r.coverage_amount ?? 0,
            status: 'ACTIVE',
          })),
        );
        setLoan(l ? { ...l } as LoanRecord : null);
        if (l) {
          const { getLoanPayments } = await import('@/lib/services/loanService');
          const lp = await getLoanPayments(l.id);
          setLoanPayments(lp);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Không tải được dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  /* ── Realtime subscription: live OBD gauges from Android ── */
  useEffect(() => {
    if (!assetId) return;
    const sb = createClient();
    const ch = sb
      .channel(`telemetry-${assetId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_samples', filter: `asset_id=eq.${assetId}` },
        (payload) => {
          const r = payload.new as any;
          setLive({
            speed: r.speed_kmh != null ? Number(r.speed_kmh) : null,
            rpm: r.rpm != null ? Number(r.rpm) : null,
            coolant: r.coolant_temp_c != null ? Number(r.coolant_temp_c) : null,
            voltage: r.battery_voltage != null ? Number(r.battery_voltage) : null,
          });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [assetId]);

  const hasLive = live.speed != null || live.rpm != null || live.coolant != null || live.voltage != null;

  /* ── Modal open states ── */
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  /* ── Loan states & schedule ── */
  const [loanPayments, setLoanPayments] = useState<any[]>([]);
  const [openLoanModal, setOpenLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any | null>(null);
  const [loanForm, setLoanForm] = useState({
    lender: 'Ngân hàng Techcombank',
    principal: '400000000',
    down_payment: '100000000',
    interest_rate_percent: '8.5',
    term_months: '36',
    start_date: new Date().toISOString().slice(0, 10),
    monthly_payment: '',
    payment_day: '15',
    notes: '',
  });

  const assetLoanSchedule = useMemo(() => generateLoanSchedule(loan, loanPayments), [loan, loanPayments]);

  const handleSaveAssetLoan = async () => {
    if (!assetId) return;
    const p = parseFloat(loanForm.principal) || 0;
    const r = (parseFloat(loanForm.interest_rate_percent) || 0) / 100 / 12;
    const n = parseInt(loanForm.term_months) || 12;
    const emi = (p > 0 && r > 0 && n > 0) ? Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
    const m = parseFloat(loanForm.monthly_payment) || emi;

    const input = {
      asset_id: assetId,
      lender: loanForm.lender || 'Ngân hàng',
      principal: p,
      down_payment: parseFloat(loanForm.down_payment) || 0,
      interest_rate_percent: parseFloat(loanForm.interest_rate_percent) || 8.5,
      term_months: n,
      start_date: loanForm.start_date || new Date().toISOString().slice(0, 10),
      monthly_payment: m,
      payment_day: parseInt(loanForm.payment_day) || 15,
      current_balance: editingLoan ? editingLoan.current_balance : p,
      notes: loanForm.notes || undefined,
    };

    try {
      const { createLoan, updateLoanFull, getLoadByAsset, getLoanPayments } = await import('@/lib/services/loanService');
      if (editingLoan) {
        await updateLoanFull(editingLoan.id, input);
      } else {
        await createLoan(input);
      }
      const newL = await getLoadByAsset(assetId);
      setLoan(newL ? { ...newL } as LoanRecord : null);
      if (newL) {
        const lp = await getLoanPayments(newL.id);
        setLoanPayments(lp);
      }
      setOpenLoanModal(false);
    } catch (err: any) {
      alert(`Lỗi khi lưu khoản vay: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const handleDeleteAssetLoan = async (loanId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản vay của phương tiện này?')) return;
    try {
      const { deleteLoan } = await import('@/lib/services/loanService');
      await deleteLoan(loanId);
      setLoan(null);
      setLoanPayments([]);
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const [openEditPeriodModal, setOpenEditPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any | null>(null);
  const [periodForm, setPeriodForm] = useState({
    payment_number: 1,
    due_date: '',
    principal_paid: '',
    interest_paid: '',
    total_payment: '',
    paid_date: '',
    status: 'PENDING' as 'PAID' | 'PENDING' | 'OVERDUE',
  });

  const handleOpenEditPeriod = (p: any) => {
    setEditingPeriod(p);
    setPeriodForm({
      payment_number: p.payment_number,
      due_date: p.due_date ? p.due_date.slice(0, 10) : '',
      principal_paid: String(p.principal_paid || ''),
      interest_paid: String(p.interest_paid || ''),
      total_payment: String(p.total_payment || (p.principal_paid + p.interest_paid) || ''),
      paid_date: p.paid_date ? p.paid_date.slice(0, 10) : (p.status === 'PAID' ? (p.due_date ? p.due_date.slice(0, 10) : new Date().toISOString().slice(0, 10)) : ''),
      status: p.status || 'PENDING',
    });
    setOpenEditPeriodModal(true);
  };

  const handleSavePeriod = async () => {
    if (!loan || !editingPeriod) return;
    const princ = parseFloat(periodForm.principal_paid) || 0;
    const intr = parseFloat(periodForm.interest_paid) || 0;
    const tot = parseFloat(periodForm.total_payment) || (princ + intr);
    try {
      const { createLoanPayment, updateLoanPayment, getLoanPayments, getLoadByAsset } = await import('@/lib/services/loanService');
      const existing = loanPayments.find(pm => pm.payment_number === editingPeriod.payment_number);
      if (existing) {
        await updateLoanPayment(existing.id, {
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : undefined,
          status: periodForm.status,
        });
      } else {
        await createLoanPayment({
          loan_id: loan.id,
          payment_number: editingPeriod.payment_number,
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : undefined,
          status: periodForm.status,
          remaining_balance: editingPeriod.remaining_balance || 0,
        });
      }

      if (periodForm.status === 'PAID') {
        try {
          const paidDate = periodForm.paid_date || new Date().toISOString().slice(0, 10);
          const lenderName = loan.lender || 'Ngân hàng';
          const periodNum = editingPeriod.payment_number;

          if (princ > 0) {
            await createExpense({
              asset_id: asset?.id || assetId,
              date: paidDate,
              category: 'Loan',
              subcategory: 'Monthly Payment',
              amount: princ,
              currency: 'VND',
              vendor: lenderName,
              description: `Trả gốc khoản vay kỳ ${periodNum} (${lenderName})`,
            });
          }
          if (intr > 0) {
            await createExpense({
              asset_id: asset?.id || assetId,
              date: paidDate,
              category: 'Loan',
              subcategory: 'Interest',
              amount: intr,
              currency: 'VND',
              vendor: lenderName,
              description: `Tiền lãi khoản vay kỳ ${periodNum} (${lenderName})`,
            });
          }
          const refreshedExps = await getExpenses(assetId);
          setExpenses(refreshedExps);
        } catch (eErr) {
          console.warn('Auto expense sync error:', eErr);
        }
      }

      const newL = await getLoadByAsset(assetId);
      setLoan(newL ? { ...newL } as LoanRecord : null);
      if (newL) setLoanPayments(await getLoanPayments(newL.id));
      setOpenEditPeriodModal(false);
      setEditingPeriod(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật kỳ thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const toggleAssetLoanPayment = async (item: any) => {
    if (!loan) return;
    try {
      const { createLoanPayment, updateLoanPayment, updateLoan, getLoanPayments, getLoadByAsset } = await import('@/lib/services/loanService');
      if (item.status === 'PAID') {
        const match = loanPayments.find(p => p.payment_number === item.payment_number);
        if (match) {
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
          await updateLoan(loan.id, { current_balance: Math.min(loan.principal, loan.current_balance + item.principal_paid) });
        }
      } else {
        const paidDateStr = new Date().toISOString().slice(0, 10);
        const lenderName = loan.lender || 'Ngân hàng';
        const periodNum = item.payment_number;
        const princ = item.principal_paid || 0;
        const intr = item.interest_paid || 0;

        await createLoanPayment({
          loan_id: loan.id,
          payment_number: periodNum,
          due_date: item.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: item.total_payment,
          paid_date: paidDateStr,
          status: 'PAID',
          remaining_balance: Math.max(0, loan.current_balance - princ),
        });
        await updateLoan(loan.id, { current_balance: Math.max(0, loan.current_balance - princ) });

        // Auto create expense (Split Principal & Interest)
        try {
          if (princ > 0) {
            await createExpense({
              asset_id: asset?.id || assetId,
              date: paidDateStr,
              category: 'Loan',
              subcategory: 'Monthly Payment',
              amount: princ,
              currency: 'VND',
              vendor: lenderName,
              description: `Trả gốc khoản vay kỳ ${periodNum} (${lenderName})`,
            });
          }
          if (intr > 0) {
            await createExpense({
              asset_id: asset?.id || assetId,
              date: paidDateStr,
              category: 'Loan',
              subcategory: 'Interest',
              amount: intr,
              currency: 'VND',
              vendor: lenderName,
              description: `Tiền lãi khoản vay kỳ ${periodNum} (${lenderName})`,
            });
          }
          const refreshedExps = await getExpenses(assetId);
          setExpenses(refreshedExps);
        } catch (eErr) {
          console.warn('Auto expense sync error:', eErr);
        }
      }
      const newL = await getLoadByAsset(assetId);
      setLoan(newL ? { ...newL } as LoanRecord : null);
      if (newL) setLoanPayments(await getLoanPayments(newL.id));
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  /* ── Form states ── */
  const [odoViewMode, setOdoViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [fuelForm, setFuelForm] = useState({ date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  const [maintForm, setMaintForm] = useState({ date: '', maintenance_type: 'Thay dầu máy', odometer_km: '', cost: '', discount: '', vendor: '', notes: '', next_due_km: '', next_due_date: '' });
  const [categories, setCategories] = useState<string[]>(DEFAULT_MAINT_CATEGORIES);
  const [serviceItems, setServiceItems] = useState<{ name: string; cost: string }[]>([
    { name: 'Thay dầu máy', cost: '' },
  ]);

  useEffect(() => {
    const loadMasterCategories = () => {
      try {
        const saved = localStorage.getItem('fmms_master_maint');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(parsed.map((c: any) => typeof c === 'string' ? c : c.name));
            return;
          }
        }
      } catch {}
      setCategories(DEFAULT_MAINT_CATEGORIES);
    };

    loadMasterCategories();
    window.addEventListener('fmms_master_updated', loadMasterCategories);
    return () => window.removeEventListener('fmms_master_updated', loadMasterCategories);
  }, []);

  const addServiceItem = () => setServiceItems(p => [...p, { name: categories[0] || 'Thay dầu máy', cost: '' }]);
  const removeServiceItem = (index: number) => setServiceItems(p => p.filter((_, i) => i !== index));
  const updateServiceItem = (index: number, field: 'name' | 'cost', value: string) => {
    setServiceItems(p => p.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const calculatedItemsCost = useMemo(() => {
    return serviceItems.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);
  }, [serviceItems]);

  const [taxMap, setTaxMap] = useState<Record<string, { label: string; subcategories: Record<string, string> }>>(TAXONOMY);

  useEffect(() => {
    setTaxMap(getDynamicTaxonomy());
    const handleUpdate = () => setTaxMap(getDynamicTaxonomy());
    window.addEventListener('fmms_master_updated', handleUpdate);
    return () => window.removeEventListener('fmms_master_updated', handleUpdate);
  }, []);

  const [editingExp, setEditingExp] = useState<ExpenseRecord | null>(null);
  const [editingMaint, setEditingMaint] = useState<MaintenanceRecord | null>(null);
  const [editingFuel, setEditingFuel] = useState<FuelLog | null>(null);
  const [editingPartItem, setEditingPartItem] = useState<any | null>(null);

  const [expForm, setExpForm] = useState({ date: '', category: 'Running', subcategory: 'Fuel', amount: '', discount: '', vendor: '', odometer_km: '', description: '' });
  const [tripForm, setTripForm] = useState({ start_time: '', end_time: '', distance_km: '', start_location: '', end_location: '', fuel_used_liters: '', average_speed_kmh: '' });
  const [partForm, setPartForm] = useState({ name: '', brand: '', category: 'Điện tử', install_date: '', cost: '', discount: '', odometer_km: '', warranty_months: '', notes: '' });
  const [insForm, setInsForm] = useState({ type: 'Bảo hiểm vật chất', company: '', policy_number: '', start_date: '', expiry_date: '', annual_fee: '', coverage_amount: '', agent_name: '', agent_phone: '', provider_hotline: '', notes: '' });
  const [editForm, setEditForm] = useState({
    name: '', brand: '', model: '', year: '', color: '',
    license_plate: '', vin: '', engine: '', fuel_type: 'PETROL',
    tank_capacity_liters: '', battery_capacity_kwh: '',
    purchase_price: '', current_value: '',
    purchase_date: '', image_url: '', current_odometer_km: '', status: 'ACTIVE', description: '',
    sales_rep_name: '', sales_rep_phone: '', brand_hotline: '',
  });
  const [odoForm, setOdoForm] = useState({ new_value_km: '', reason: 'Hiệu chỉnh sai số đồng hồ' });
  const [claimForm, setClaimForm] = useState({ item_name: '', description: '', amount_claimed: '', vendor: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [tabStartDate, setTabStartDate] = useState<string>('');
  const [tabEndDate, setTabEndDate] = useState<string>('');
  const [expSortCol, setExpSortCol] = useState<string>('date');
  const [expSortDir, setExpSortDir] = useState<'asc' | 'desc'>('desc');
  const [fuelSortCol, setFuelSortCol] = useState<string>('date');
  const [fuelSortDir, setFuelSortDir] = useState<'asc' | 'desc'>('desc');
  const [partSortCol, setPartSortCol] = useState<string>('install_date');
  const [partSortDir, setPartSortDir] = useState<'asc' | 'desc'>('desc');
  const [maintSortCol, setMaintSortCol] = useState<string>('date');
  const [maintSortDir, setMaintSortDir] = useState<'asc' | 'desc'>('desc');
  const [loanSortCol, setLoanSortCol] = useState<string>('payment_number');
  const [loanSortDir, setLoanSortDir] = useState<'asc' | 'desc'>('asc');

  const displayedExpenses = useMemo(() => {
    let list = expenses;
    if (tabStartDate) list = list.filter(e => e.date && e.date.slice(0, 10) >= tabStartDate);
    if (tabEndDate) list = list.filter(e => e.date && e.date.slice(0, 10) <= tabEndDate);
    return [...list].sort((a, b) => {
      let valA: any = a[expSortCol as keyof ExpenseRecord] ?? '';
      let valB: any = b[expSortCol as keyof ExpenseRecord] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return expSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return expSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [expenses, tabStartDate, tabEndDate, expSortCol, expSortDir]);

  const displayedFuelLogs = useMemo(() => {
    let list = fuelLogs;
    if (tabStartDate) list = list.filter(f => f.date && f.date.slice(0, 10) >= tabStartDate);
    if (tabEndDate) list = list.filter(f => f.date && f.date.slice(0, 10) <= tabEndDate);
    return [...list].sort((a, b) => {
      let valA: any = a[fuelSortCol as keyof FuelLog] ?? '';
      let valB: any = b[fuelSortCol as keyof FuelLog] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return fuelSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return fuelSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [fuelLogs, tabStartDate, tabEndDate, fuelSortCol, fuelSortDir]);

  const displayedMaintenance = useMemo(() => {
    let list = maintenance;
    if (tabStartDate) list = list.filter(m => m.date && m.date.slice(0, 10) >= tabStartDate);
    if (tabEndDate) list = list.filter(m => m.date && m.date.slice(0, 10) <= tabEndDate);
    return [...list].sort((a, b) => {
      let valA: any = a[maintSortCol as keyof MaintenanceRecord] ?? '';
      let valB: any = b[maintSortCol as keyof MaintenanceRecord] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return maintSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return maintSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [maintenance, tabStartDate, tabEndDate, maintSortCol, maintSortDir]);

  const displayedParts = useMemo(() => {
    let list = parts;
    if (tabStartDate) list = list.filter(p => p.install_date && p.install_date.slice(0, 10) >= tabStartDate);
    if (tabEndDate) list = list.filter(p => p.install_date && p.install_date.slice(0, 10) <= tabEndDate);
    return [...list].sort((a: any, b: any) => {
      let valA: any = a[partSortCol] ?? '';
      let valB: any = b[partSortCol] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return partSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return partSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [parts, tabStartDate, tabEndDate, partSortCol, partSortDir]);

  const displayedLoanSchedule = useMemo(() => {
    const sched = loan ? generateLoanSchedule(loan, loanPayments) : [];
    return [...sched].sort((a: any, b: any) => {
      const valA = a[loanSortCol] ?? '';
      const valB = b[loanSortCol] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return loanSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return loanSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [loan, loanPayments, loanSortCol, loanSortDir]);

  const mileageAnalytics = useMemo(() => {
    type OdoEvent = {
      date: string;
      odometer_km: number;
      type: 'ODO_LOG' | 'FUEL' | 'MAINTENANCE' | 'TRIP';
      note: string;
      id: string;
      raw?: any;
    };

    const events: OdoEvent[] = [];

    // Odometer logs
    odometerLogs.forEach(o => {
      if (o.odometer_km) {
        events.push({
          date: o.date ? o.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          odometer_km: o.odometer_km,
          type: 'ODO_LOG',
          note: o.note || 'Ghi nhận Odometer',
          id: o.id,
          raw: o,
        });
      }
    });

    // Fuel logs
    fuelLogs.forEach(f => {
      if (f.odometer_km) {
        events.push({
          date: f.date ? f.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          odometer_km: f.odometer_km,
          type: 'FUEL',
          note: `Đổ ${f.liters}L xăng${f.station ? ` tại ${f.station}` : ''}${f.notes ? ` (${f.notes})` : ''}`,
          id: f.id,
          raw: f,
        });
      }
    });

    // Maintenance records
    maintenance.forEach(m => {
      if (m.odometer_km) {
        events.push({
          date: m.date ? m.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
          odometer_km: m.odometer_km,
          type: 'MAINTENANCE',
          note: `Bảo dưỡng: ${m.maintenance_type}${m.vendor ? ` tại ${m.vendor}` : ''}`,
          id: m.id,
          raw: m,
        });
      }
    });

    // Trips
    trips.forEach(t => {
      const dStr = t.start_time ? t.start_time.slice(0, 10) : new Date().toISOString().slice(0, 10);
      events.push({
        date: dStr,
        odometer_km: 0,
        type: 'TRIP',
        note: `Chuyến đi: ${t.start_location || 'Xuất phát'} → ${t.end_location || 'Điểm đến'} (${t.distance_km} km)`,
        id: t.id,
        raw: t,
      });
    });

    // Sort events by date ascending
    events.sort((a, b) => {
      const dCmp = a.date.localeCompare(b.date);
      if (dCmp !== 0) return dCmp;
      return a.odometer_km - b.odometer_km;
    });

    // Group by Day
    const dailyMap = new Map<string, {
      date: string;
      minOdo: number;
      maxOdo: number;
      tripDistance: number;
      notes: { type: string; text: string; id: string; raw?: any }[];
    }>();

    events.forEach(ev => {
      if (!dailyMap.has(ev.date)) {
        dailyMap.set(ev.date, {
          date: ev.date,
          minOdo: ev.odometer_km || 0,
          maxOdo: ev.odometer_km || 0,
          tripDistance: ev.type === 'TRIP' ? (ev.raw?.distance_km || 0) : 0,
          notes: [{ type: ev.type, text: ev.note, id: ev.id, raw: ev.raw }],
        });
      } else {
        const cur = dailyMap.get(ev.date)!;
        if (ev.odometer_km > 0) {
          if (cur.minOdo === 0 || ev.odometer_km < cur.minOdo) cur.minOdo = ev.odometer_km;
          if (ev.odometer_km > cur.maxOdo) cur.maxOdo = ev.odometer_km;
        }
        if (ev.type === 'TRIP') {
          cur.tripDistance += (ev.raw?.distance_km || 0);
        }
        cur.notes.push({ type: ev.type, text: ev.note, id: ev.id, raw: ev.raw });
      }
    });

    const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    let prevOdo = 0;

    const dailyReport = sortedDays.map((day) => {
      let kmRun = 0;
      if (day.maxOdo > 0 && prevOdo > 0 && day.maxOdo >= prevOdo) {
        kmRun = day.maxOdo - prevOdo;
      } else if (day.tripDistance > 0) {
        kmRun = day.tripDistance;
      } else if (day.maxOdo > 0 && day.minOdo > 0 && day.maxOdo > day.minOdo) {
        kmRun = day.maxOdo - day.minOdo;
      }

      if (day.maxOdo > 0) {
        prevOdo = day.maxOdo;
      }

      const dObj = new Date(day.date);
      const dayOfWeekNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayOfWeek = dayOfWeekNames[dObj.getDay()] || '';

      return {
        ...day,
        dayOfWeek,
        kmRun,
        displayOdo: day.maxOdo || prevOdo,
      };
    }).reverse();

    // Group by Month
    const monthlyMap = new Map<string, {
      monthKey: string;
      monthLabel: string;
      totalKm: number;
      activeDays: number;
      fuelCost: number;
      maintCost: number;
      otherCost: number;
      dayList: typeof dailyReport;
    }>();

    dailyReport.forEach(day => {
      const mKey = day.date.slice(0, 7);
      const [year, month] = mKey.split('-');
      const mLabel = `Tháng ${month}/${year}`;

      if (!monthlyMap.has(mKey)) {
        monthlyMap.set(mKey, {
          monthKey: mKey,
          monthLabel: mLabel,
          totalKm: 0,
          activeDays: 0,
          fuelCost: 0,
          maintCost: 0,
          otherCost: 0,
          dayList: [],
        });
      }

      const mData = monthlyMap.get(mKey)!;
      mData.totalKm += day.kmRun;
      if (day.kmRun > 0 || day.notes.length > 0) mData.activeDays += 1;
      mData.dayList.push(day);
    });

    expenses.forEach(exp => {
      if (exp.date) {
        const mKey = exp.date.slice(0, 7);
        if (monthlyMap.has(mKey)) {
          const mData = monthlyMap.get(mKey)!;
          if (exp.category === 'Running' || exp.category === 'Fuel') mData.fuelCost += exp.amount;
          else if (exp.category === 'Maintenance') mData.maintCost += exp.amount;
          else mData.otherCost += exp.amount;
        }
      }
    });

    const monthlyReport = Array.from(monthlyMap.values()).map(m => {
      const totalCost = m.fuelCost + m.maintCost + m.otherCost;
      const costPerKm = m.totalKm > 0 ? Math.round(totalCost / m.totalKm) : 0;
      const avgKmPerActiveDay = m.activeDays > 0 ? Math.round(m.totalKm / m.activeDays) : 0;
      return {
        ...m,
        totalCost,
        costPerKm,
        avgKmPerActiveDay,
      };
    }).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // Group by Year
    const yearlyMap = new Map<string, {
      yearKey: string;
      totalKm: number;
      totalCost: number;
      fuelCost: number;
      maintCost: number;
      monthsCount: number;
      activeDays: number;
    }>();

    monthlyReport.forEach(m => {
      const yKey = m.monthKey.slice(0, 4);
      if (!yearlyMap.has(yKey)) {
        yearlyMap.set(yKey, {
          yearKey: yKey,
          totalKm: 0,
          totalCost: 0,
          fuelCost: 0,
          maintCost: 0,
          monthsCount: 0,
          activeDays: 0,
        });
      }
      const yData = yearlyMap.get(yKey)!;
      yData.totalKm += m.totalKm;
      yData.totalCost += m.totalCost;
      yData.fuelCost += m.fuelCost;
      yData.maintCost += m.maintCost;
      yData.monthsCount += 1;
      yData.activeDays += m.activeDays;
    });

    const yearlyReport = Array.from(yearlyMap.values()).map(y => {
      const costPerKm = y.totalKm > 0 ? Math.round(y.totalCost / y.totalKm) : 0;
      const avgKmPerMonth = y.monthsCount > 0 ? Math.round(y.totalKm / y.monthsCount) : 0;
      const avgKmPerDay = y.activeDays > 0 ? Math.round(y.totalKm / y.activeDays) : 0;
      return {
        ...y,
        costPerKm,
        avgKmPerMonth,
        avgKmPerDay,
      };
    }).sort((a, b) => b.yearKey.localeCompare(a.yearKey));

    const currentMKey = new Date().toISOString().slice(0, 7);
    const currentMonthData = monthlyMap.get(currentMKey);
    const currentMonthKm = currentMonthData?.totalKm || 0;

    return {
      dailyReport,
      monthlyReport,
      yearlyReport,
      currentMonthKm,
      totalActiveDays: dailyReport.filter(d => d.kmRun > 0).length,
    };
  }, [odometerLogs, fuelLogs, maintenance, trips, expenses]);


  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
        <div className="mx-auto mb-3 w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-cyan)' }} />
        <p className="font-semibold">Đang tải dữ liệu phương tiện...</p>
      </div>
    );
  }
  if (notFound || !asset) {
    return (
      <div className="space-y-5 pb-12">
        <button onClick={() => router.push('/')} className="flex items-center space-x-2 text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Dashboard gia đình</span>
        </button>
        <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
          <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Không tìm thấy phương tiện hoặc bạn không có quyền truy cập</p>
        </div>
      </div>
    );
  }

  /* ── Tabs ── */
  const tabs = [
    { id: 'overview', label: 'Tổng quan', show: true, icon: Activity },
    { id: 'operation', label: 'Vận hành & OBD', show: asset.capabilities.has_obd || asset.capabilities.has_mileage, icon: Cpu },
    { id: 'trips', label: asset.asset_type === 'BICYCLE' ? 'Chuyến đạp' : 'Chuyến đi', show: asset.capabilities.has_ride || asset.capabilities.has_gps, icon: MapPin },
    { id: 'fuel', label: asset.capabilities.has_battery ? 'Pin' : 'Nhiên liệu', show: asset.capabilities.has_fuel || asset.capabilities.has_battery, icon: Fuel },
    { id: 'maintenance', label: 'Bảo dưỡng', show: asset.capabilities.has_maintenance, icon: Wrench },
    { id: 'parts', label: 'Phụ tùng & Nâng cấp', show: asset.capabilities.has_parts, icon: Layers },
    { id: 'expenses', label: 'Chi phí', show: true, icon: DollarSign },
    { id: 'finance', label: 'Khoản vay', show: asset.capabilities.has_finance, icon: CreditCard },
    { id: 'insurance', label: 'Bảo hiểm & Giấy tờ', show: asset.capabilities.has_documents, icon: Shield },
    { id: 'warranty', label: 'Bảo hành & Claim', show: true, icon: Award },
    { id: 'analytics', label: 'Phân tích TCO', show: true, icon: BarChart3 },
  ].filter((t) => t.show);

  /* ══════════════════════════════════════════════
     SAVE HANDLERS
     ══════════════════════════════════════════════ */
  /* ── Handlers for Odometer Log ── */
  const handleOpenEditOdoLog = (item: OdometerLogRecord) => {
    setEditingOdoLog(item);
    setOdoLogForm({
      date: item.date ? item.date.slice(0, 10) : '',
      odometer_km: String(item.odometer_km || ''),
      note: item.note || '',
    });
    setOpenModal('odolog');
  };

  const handleDeleteOdoLog = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mốc Odometer này?')) return;
    try {
      await deleteOdometerLog(id);
      setOdometerLogs(prev => prev.filter(o => o.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const saveOdoLog = async () => {
    const km = parseFloat(odoLogForm.odometer_km) || 0;
    try {
      if (editingOdoLog) {
        const updated = await updateOdometerLog(editingOdoLog.id, {
          asset_id: asset.id,
          date: odoLogForm.date || new Date().toISOString().slice(0, 10),
          odometer_km: km,
          note: odoLogForm.note,
        });
        setOdometerLogs(prev => prev.map(o => o.id === editingOdoLog.id ? updated : o));
        if (km > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: km } : p);
        }
      } else {
        const created = await createOdometerLog({
          asset_id: asset.id,
          date: odoLogForm.date || new Date().toISOString().slice(0, 10),
          odometer_km: km,
          note: odoLogForm.note,
        });
        setOdometerLogs([created, ...odometerLogs]);
        if (km > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: km } : p);
        }
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingOdoLog(null);
    setOdoLogForm({ date: '', odometer_km: '', note: '' });
  };

  const normalizeCategory = (cat?: string, sub?: string) => {
    if (!cat) return { category: 'Running', subcategory: 'Fuel' };
    if (taxMap[cat]) {
      const subKeys = Object.keys(taxMap[cat]?.subcategories || {});
      const matchedSub = sub && subKeys.includes(sub) ? sub : (subKeys[0] || 'Other');
      return { category: cat, subcategory: matchedSub };
    }

    const legacyMap: Record<string, { cat: string; sub: string }> = {
      FUEL: { cat: 'Running', sub: 'Fuel' },
      MAINTENANCE: { cat: 'Maintenance', sub: 'General Service' },
      PARTS: { cat: 'Maintenance', sub: 'Brake' },
      LABOR: { cat: 'Maintenance', sub: 'General Service' },
      INSURANCE: { cat: 'Initial', sub: 'Insurance' },
      REGISTRATION: { cat: 'Initial', sub: 'Registration' },
      INSPECTION: { cat: 'Initial', sub: 'Registration' },
      TOLL: { cat: 'Running', sub: 'Epass Fee' },
      PARKING: { cat: 'Running', sub: 'Parking' },
      WASH: { cat: 'Running', sub: 'Car Wash' },
      CAR_WASH: { cat: 'Running', sub: 'Car Wash' },
      UPGRADE: { cat: 'Upgrade', sub: 'Accessorie' },
      LOAN: { cat: 'Loan', sub: 'Monthly Payment' },
      LOAN_PAYMENT: { cat: 'Loan', sub: 'Monthly Payment' },
      LOAN_INTEREST: { cat: 'Loan', sub: 'Interest' },
      INITIAL: { cat: 'Initial', sub: 'Purchase' },
      OTHER: { cat: 'Maintenance', sub: 'Other' },
    };

    const upperCat = cat.toUpperCase();
    if (legacyMap[upperCat]) {
      const found = legacyMap[upperCat];
      const validSub = sub && taxMap[found.cat]?.subcategories?.[sub] ? sub : found.sub;
      return { category: found.cat, subcategory: validSub };
    }

    for (const [cKey, cVal] of Object.entries(taxMap)) {
      if (cKey.toLowerCase() === cat.toLowerCase()) {
        const subKeys = Object.keys(cVal.subcategories || {});
        return { category: cKey, subcategory: sub && subKeys.includes(sub) ? sub : (subKeys[0] || 'Other') };
      }
      for (const sKey of Object.keys(cVal.subcategories || {})) {
        if (sKey.toLowerCase() === cat.toLowerCase() || (sub && sKey.toLowerCase() === sub.toLowerCase())) {
          return { category: cKey, subcategory: sKey };
        }
      }
    }

    return { category: Object.keys(taxMap)[0] || 'Running', subcategory: 'Fuel' };
  };

  /* ── Edit & Delete Handlers for Expenses ── */
  const handleOpenEditExpense = (item: ExpenseRecord) => {
    setEditingExp(item);
    const norm = normalizeCategory(item.category, item.subcategory);
    setExpForm({
      date: item.date ? item.date.slice(0, 10) : '',
      category: norm.category,
      subcategory: norm.subcategory,
      amount: String(item.amount || ''),
      discount: '',
      vendor: item.vendor || '',
      odometer_km: item.odometer_km ? String(item.odometer_km) : '',
      description: item.description || '',
    });
    setOpenModal('expense');
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản chi phí này?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const parseMaintenanceNotes = (notes?: string, defaultCost?: number, defaultType?: string) => {
    let discount = '';
    let items: { name: string; cost: string }[] = [];
    let userNotes = notes || '';

    if (userNotes) {
      const discountMatch = userNotes.match(/\[Giảm giá:\s*-?([0-9.,]+)\s*₫?\]/i);
      if (discountMatch) {
        const discRaw = discountMatch[1].replace(/[.,]/g, '');
        if (discRaw) discount = discRaw;
        userNotes = userNotes.replace(discountMatch[0], '').trim();
      }

      const itemsPrefixMatch = userNotes.match(/Các hạng mục:\s*([^|]+)/i);
      if (itemsPrefixMatch) {
        const itemsStr = itemsPrefixMatch[1];
        const rawParts = itemsStr.split('+');
        rawParts.forEach(p => {
          const colonIdx = p.lastIndexOf(':');
          if (colonIdx > 0) {
            const name = p.slice(0, colonIdx).trim();
            const costStr = p.slice(colonIdx + 1).replace(/[^0-9]/g, '');
            if (name) items.push({ name, cost: costStr });
          }
        });
        userNotes = userNotes.replace(itemsPrefixMatch[0], '').trim();
      } else {
        const itemMatches = Array.from(userNotes.matchAll(/([^,|]+?)\s*\(([0-9.,]+)\s*₫?\)/g));
        if (itemMatches.length > 0) {
          itemMatches.forEach(m => {
            const name = m[1].trim();
            const costStr = m[2].replace(/[.,]/g, '');
            if (name && !name.includes('Giảm giá')) {
              items.push({ name, cost: costStr });
            }
          });
          userNotes = userNotes.replace(/([^,|]+?)\s*\(([0-9.,]+)\s*₫?\)[,\s]*/g, '').trim();
        }
      }

      userNotes = userNotes.replace(/^[|\s,]+|[|\s,]+$/g, '').trim();
    }

    if (items.length === 0) {
      items = [{ name: defaultType || 'Thay dầu máy', cost: defaultCost ? String(defaultCost) : '' }];
    }

    return { discount, items, cleanNotes: userNotes };
  };

  /* ── Edit & Delete Handlers for Maintenance ── */
  const handleOpenEditMaint = (item: MaintenanceRecord) => {
    setEditingMaint(item);
    const parsed = parseMaintenanceNotes(item.notes, item.cost, item.maintenance_type);
    setServiceItems(parsed.items);
    setMaintForm({
      date: item.date ? item.date.slice(0, 10) : '',
      maintenance_type: item.maintenance_type || parsed.items[0]?.name || 'Thay dầu máy',
      odometer_km: item.odometer_km ? String(item.odometer_km) : '',
      cost: String(item.cost || ''),
      discount: parsed.discount,
      vendor: item.vendor || '',
      notes: parsed.cleanNotes,
      next_due_km: item.next_due_km ? String(item.next_due_km) : '',
      next_due_date: item.next_due_date ? item.next_due_date.slice(0, 10) : '',
    });
    setOpenModal('maintenance');
  };

  const handleOpenAddMaint = () => {
    setEditingMaint(null);
    setMaintForm({
      date: new Date().toISOString().split('T')[0],
      maintenance_type: 'Thay dầu máy',
      odometer_km: asset?.current_odometer_km ? String(asset.current_odometer_km) : '',
      cost: '',
      discount: '',
      vendor: '',
      notes: '',
      next_due_km: '',
      next_due_date: '',
    });
    setServiceItems([
      { name: 'Thay dầu máy', cost: '650000' },
      { name: 'Thay lọc dầu', cost: '220000' },
    ]);
    setOpenModal('maintenance');
  };

  const handleDeleteMaint = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhật ký bảo dưỡng này?')) return;
    try {
      await deleteMaintenanceRecord(id);
      setMaintenance(prev => prev.filter(m => m.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  /* ── Edit & Delete Handlers for Fuel ── */
  const handleOpenEditFuel = (item: FuelLog) => {
    setEditingFuel(item);
    setFuelForm({
      date: item.date ? item.date.slice(0, 10) : '',
      liters: String(item.liters || ''),
      price_per_liter: String(item.price_per_liter || ''),
      odometer_km: item.odometer_km ? String(item.odometer_km) : '',
      station: item.station || '',
      notes: item.notes || '',
    });
    setOpenModal('fuel');
  };

  const handleDeleteFuel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhật ký đổ xăng này?')) return;
    try {
      await deleteFuelLog(id);
      setFuelLogs(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  /* ── Edit & Delete Handlers for Parts ── */
  const handleOpenEditPart = (item: any) => {
    setEditingPartItem(item);
    setPartForm({
      name: item.name || '',
      brand: item.brand || '',
      category: item.category || 'Điện tử',
      install_date: item.install_date ? item.install_date.slice(0, 10) : '',
      cost: String(item.cost || ''),
      discount: '',
      odometer_km: item.odometer_km ? String(item.odometer_km) : '',
      warranty_months: item.warranty_months ? String(item.warranty_months) : '',
      notes: item.notes || '',
    });
    setOpenModal('part');
  };

  const handleDeletePart = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phụ tùng / nâng cấp này?')) return;
    try {
      await deletePart(id);
      setParts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const saveFuel = async () => {
    const l = parseFloat(fuelForm.liters) || 0;
    const p = parseFloat(fuelForm.price_per_liter) || 0;
    try {
      if (editingFuel) {
        const updated = await updateFuelLog(editingFuel.id, {
          timestamp: new Date(fuelForm.date || Date.now()).toISOString(),
          fuel_liters: l,
          price_per_liter: p,
          total_cost: l * p,
          odometer_km: parseFloat(fuelForm.odometer_km) || 0,
          station: fuelForm.station || undefined,
          notes: fuelForm.notes || undefined,
        });
        setFuelLogs(prev => prev.map(f => f.id === editingFuel.id ? updated : f));
        const odo = parseFloat(fuelForm.odometer_km) || 0;
        if (odo > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: odo } : p);
        }
      } else {
        const created = await createFuelLog({
          asset_id: asset.id,
          timestamp: new Date(fuelForm.date || Date.now()).toISOString(),
          odometer_km: parseFloat(fuelForm.odometer_km) || 0,
          fuel_liters: l,
          price_per_liter: p,
          station: fuelForm.station || undefined,
          notes: fuelForm.notes || undefined,
          tank_full: true,
        });
        setFuelLogs([created, ...fuelLogs]);
        const odo = parseFloat(fuelForm.odometer_km) || 0;
        if (odo > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: odo } : p);
        }
      }
      const refreshedExps = await getExpenses(assetId);
      setExpenses(refreshedExps);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingFuel(null);
    setFuelForm({ date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  };

  const saveTrip = async () => {
    try {
      const created = await createTrip({
        asset_id: asset.id,
        start_time: tripForm.start_time || new Date().toISOString(),
        end_time: tripForm.end_time || undefined,
        distance_km: parseFloat(tripForm.distance_km) || 0,
        fuel_used_liters: tripForm.fuel_used_liters ? parseFloat(tripForm.fuel_used_liters) : undefined,
        average_speed_kmh: tripForm.average_speed_kmh ? parseFloat(tripForm.average_speed_kmh) : undefined,
        start_location: tripForm.start_location || undefined,
        end_location: tripForm.end_location || undefined,
      });
      setTrips([created, ...trips]);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
  };

  const saveMaint = async () => {
    try {
      const subtotal = calculatedItemsCost > 0 ? calculatedItemsCost : (parseFloat(maintForm.cost) || 0);
      const discount = parseFloat(maintForm.discount) || 0;
      const totalCost = Math.max(0, subtotal - discount);
      const itemsSummary = serviceItems.map(s => `${s.name}: ${s.cost ? parseInt(s.cost).toLocaleString('vi-VN') + '₫' : '—'}`).join(' + ');
      const discountNote = discount > 0 ? `[Giảm giá: -${parseInt(String(discount)).toLocaleString('vi-VN')}₫]` : '';
      const fullNotes = [maintForm.notes, `Các hạng mục: ${itemsSummary}`, discountNote].filter(Boolean).join(' | ');

      if (editingMaint) {
        const updated = await updateMaintenanceRecord(editingMaint.id, {
          maintenance_type: maintForm.maintenance_type || serviceItems[0]?.name || 'Thay dầu máy',
          date: maintForm.date || new Date().toISOString().split('T')[0],
          odometer_km: parseFloat(maintForm.odometer_km) || 0,
          cost: totalCost,
          vendor: maintForm.vendor || undefined,
          notes: fullNotes,
          next_due_km: maintForm.next_due_km ? parseFloat(maintForm.next_due_km) : undefined,
          next_due_date: maintForm.next_due_date || undefined,
        });
        setMaintenance(prev => prev.map(m => m.id === editingMaint.id ? updated : m));
        const odo = parseFloat(maintForm.odometer_km) || 0;
        if (odo > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: odo } : p);
        }
      } else {
        const created = await createMaintenanceRecord({
          asset_id: asset.id,
          maintenance_type: maintForm.maintenance_type || serviceItems[0]?.name || 'Thay dầu máy',
          date: maintForm.date || new Date().toISOString().split('T')[0],
          odometer_km: parseFloat(maintForm.odometer_km) || 0,
          cost: totalCost,
          vendor: maintForm.vendor || undefined,
          notes: fullNotes,
          next_due_km: maintForm.next_due_km ? parseFloat(maintForm.next_due_km) : undefined,
          next_due_date: maintForm.next_due_date || undefined,
        });
        setMaintenance([created, ...maintenance]);
        const odo = parseFloat(maintForm.odometer_km) || 0;
        if (odo > (asset.current_odometer_km || 0)) {
          setAsset(p => p ? { ...p, current_odometer_km: odo } : p);
        }

        // Auto-create expense record if totalCost > 0
        if (totalCost > 0) {
          try {
            const expDate = maintForm.date || new Date().toISOString().split('T')[0];
            await createExpense({
              asset_id: asset.id,
              date: expDate,
              category: 'Maintenance',
              subcategory: 'Maintenance',
              amount: totalCost,
              currency: 'VND',
              vendor: maintForm.vendor || undefined,
              odometer_km: maintForm.odometer_km ? parseFloat(maintForm.odometer_km) : undefined,
              description: `Bảo dưỡng: ${maintForm.maintenance_type || serviceItems[0]?.name || 'Bảo dưỡng định kỳ'}${discount > 0 ? ` (Giảm -${parseInt(String(discount)).toLocaleString('vi-VN')}₫)` : ''}`,
            });
            const refreshedExps = await getExpenses(assetId);
            setExpenses(refreshedExps);
          } catch (expErr) {
            console.warn('Auto expense sync warning:', expErr);
          }
        }
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingMaint(null);
    setServiceItems([{ name: 'Thay dầu máy', cost: '' }]);
  };

  const saveExpense = async () => {
    try {
      const subtotal = parseFloat(expForm.amount) || 0;
      const discount = parseFloat(expForm.discount) || 0;
      const expAmount = Math.max(0, subtotal - discount);
      const expCategory = expForm.category as ExpenseRecord['category'];
      const expDate = expForm.date || new Date().toISOString().slice(0, 10);
      const fullDesc = discount > 0 ? `${expForm.description || ''} [Giảm giá: -${parseInt(String(discount)).toLocaleString('vi-VN')}₫]`.trim() : (expForm.description || undefined);

      if (editingExp) {
        const updated = await updateExpense(editingExp.id, {
          date: expForm.date,
          category: expForm.category as ExpenseRecord['category'],
          subcategory: expForm.subcategory,
          amount: expAmount,
          vendor: expForm.vendor || undefined,
          odometer_km: expForm.odometer_km ? parseFloat(expForm.odometer_km) : undefined,
          description: fullDesc,
        });
        setExpenses(prev => prev.map(e => e.id === editingExp.id ? updated : e));
      } else {
        const created = await createExpense({
          asset_id: asset.id,
          date: expDate,
          category: expCategory,
          subcategory: expForm.subcategory,
          amount: expAmount,
          vendor: expForm.vendor || undefined,
          odometer_km: expForm.odometer_km ? parseFloat(expForm.odometer_km) : undefined,
          description: fullDesc,
        });
        setExpenses([created, ...expenses]);

        // Auto 1: If expense is Upgrade or Maintenance parts, auto create part record
        if ((expCategory === 'Upgrade' || expCategory === 'Maintenance') && expAmount > 0 && expForm.description) {
          try {
            const createdPart = await createPart({
              asset_id: asset.id,
              part_name: expForm.description,
              brand: expForm.vendor || undefined,
              supplier: expCategory === 'Upgrade' ? 'Nâng cấp' : 'Bảo dưỡng',
              installation_date: expDate,
              cost: expAmount,
              installed_odometer_km: expForm.odometer_km ? parseFloat(expForm.odometer_km) : undefined,
              notes: `Tự động tạo từ chi phí ${expForm.subcategory || expCategory}`,
            });
            setParts(p => [createdPart, ...p]);
          } catch (partErr) {
            console.warn('Auto part link error:', partErr);
          }
        }

        // Auto 2: If expense is Loan payment, auto mark next pending period as PAID
        if ((expCategory === 'Loan' || expForm.subcategory === 'Monthly Payment') && loan) {
          try {
            const sched = generateLoanSchedule(loan, loanPayments);
            const nextPending = sched.find((s: any) => s.status !== 'PAID');
            if (nextPending) {
              const { createLoanPayment, updateLoanPayment, updateLoan, getLoanPayments, getLoadByAsset } = await import('@/lib/services/loanService');
              const existingPayment = loanPayments.find(p => p.payment_number === nextPending.payment_number);
              const princ = nextPending.principal_paid;
              const intr = nextPending.interest_paid;
              const tot = expAmount || nextPending.total_payment;
              if (existingPayment) {
                await updateLoanPayment(existingPayment.id, {
                  status: 'PAID',
                  paid_date: expDate,
                  total_payment: tot,
                });
              } else {
                await createLoanPayment({
                  loan_id: loan.id,
                  payment_number: nextPending.payment_number,
                  due_date: nextPending.due_date,
                  principal_paid: princ,
                  interest_paid: intr,
                  total_payment: tot,
                  paid_date: expDate,
                  status: 'PAID',
                  remaining_balance: Math.max(0, loan.current_balance - princ),
                });
              }
              await updateLoan(loan.id, { current_balance: Math.max(0, loan.current_balance - princ) });
              const newL = await getLoadByAsset(assetId);
              setLoan(newL ? { ...newL } as LoanRecord : null);
              if (newL) setLoanPayments(await getLoanPayments(newL.id));
            }
          } catch (loanErr) {
            console.warn('Auto loan sync error:', loanErr);
          }
        }
      }
      const [refreshedExps, refreshedFuels, refreshedMaints] = await Promise.all([
        getExpenses(assetId),
        getFuelLogs(assetId),
        getMaintenanceRecords(assetId),
      ]);
      setExpenses(refreshedExps);
      setFuelLogs(refreshedFuels);
      setMaintenance(refreshedMaints);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingExp(null);
    setExpForm({ date: '', category: 'Running', subcategory: 'Fuel', amount: '', discount: '', vendor: '', odometer_km: '', description: '' });
  };

  const savePart = async () => {
    try {
      let partResult: any = null;
      const subtotal = parseFloat(partForm.cost) || 0;
      const discount = parseFloat(partForm.discount) || 0;
      const partCost = Math.max(0, subtotal - discount);
      const partName = partForm.name || 'Phụ tùng';
      const wMonths = parseInt(partForm.warranty_months) || 0;
      const discountNote = discount > 0 ? `[Giảm giá: -${parseInt(String(discount)).toLocaleString('vi-VN')}₫]` : '';
      const fullPartNotes = [partForm.notes, discountNote].filter(Boolean).join(' | ');

      if (editingPartItem) {
        partResult = await updatePart(editingPartItem.id, {
          part_name: partName,
          brand: partForm.brand || undefined,
          supplier: partForm.category || undefined,
          installation_date: partForm.install_date || undefined,
          cost: partCost,
          installed_odometer_km: partForm.odometer_km ? parseFloat(partForm.odometer_km) : undefined,
          notes: fullPartNotes || undefined,
        });
        setParts(prev => prev.map(p => p.id === editingPartItem.id ? partResult : p));
      } else {
        partResult = await createPart({
          asset_id: asset.id,
          part_name: partName,
          brand: partForm.brand || undefined,
          supplier: partForm.category || undefined,
          installation_date: partForm.install_date || undefined,
          cost: partCost,
          installed_odometer_km: partForm.odometer_km ? parseFloat(partForm.odometer_km) : undefined,
          notes: fullPartNotes || undefined,
        });
        setParts([partResult, ...parts]);

        // Auto 1: Create expense record if cost > 0
        if (partCost > 0) {
          try {
            const expDate = partForm.install_date || new Date().toISOString().slice(0, 10);
            const isUpgrade = partForm.category === 'Điện tử' || partForm.category === 'Nội thất' || partForm.category === 'Ngoại thất';
            await createExpense({
              asset_id: asset.id,
              date: expDate,
              category: isUpgrade ? 'Upgrade' : 'Maintenance',
              subcategory: partForm.category === 'Điện tử' ? 'Screen' : (isUpgrade ? 'Accessorie' : 'Brake'),
              amount: partCost,
              vendor: partForm.brand || undefined,
              odometer_km: partForm.odometer_km ? parseFloat(partForm.odometer_km) : undefined,
              description: `Lắp phụ tùng: ${partName}${partForm.brand ? ' (' + partForm.brand + ')' : ''}${discount > 0 ? ` (Giảm -${parseInt(String(discount)).toLocaleString('vi-VN')}₫)` : ''}`,
            });
            const refreshedExps = await getExpenses(assetId);
            setExpenses(refreshedExps);
          } catch (expErr) {
            console.warn('Auto expense link error:', expErr);
          }
        }

        // Auto 2: Create warranty record if warranty_months > 0
        if (wMonths > 0) {
          try {
            const startDateStr = partForm.install_date || new Date().toISOString().slice(0, 10);
            const sDate = new Date(startDateStr);
            const eDate = new Date(sDate);
            eDate.setMonth(eDate.getMonth() + wMonths);
            const endDateStr = eDate.toISOString().slice(0, 10);

            const { createWarranty, getWarranties } = await import('@/lib/services/warrantyService');
            await createWarranty({
              asset_id: asset.id,
              item_type: 'PART',
              item_name: partName,
              provider: partForm.brand || 'Nhà phân phối',
              start_date: startDateStr,
              expiry_date: endDateStr,
              coverage_details: `Bảo hành ${wMonths} tháng chính hãng (${partForm.brand || 'Nhà cung cấp'})`,
              status: 'ACTIVE',
            });
            const wRes = await getWarranties(asset.id);
            if (wRes?.data) setWarranties(wRes.data);
          } catch (wErr) {
            console.warn('Auto warranty creation error:', wErr);
          }
        }
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingPartItem(null);
  };

  /* ── Insurance Edit & Delete ── */
  const handleOpenEditInsurance = (ins: any) => {
    setEditingInsurance(ins);
    setInsForm({
      type: ins.type || 'Bảo hiểm vật chất',
      company: ins.company || '',
      policy_number: ins.policy_number || '',
      start_date: ins.start_date || '',
      expiry_date: ins.expiry_date || '',
      annual_fee: String(ins.annual_fee || ''),
      coverage_amount: String(ins.coverage_amount || ''),
      agent_name: ins.agent_name || '',
      agent_phone: ins.agent_phone || '',
      provider_hotline: ins.provider_hotline || '',
      notes: '',
    });
    setOpenModal('insurance');
  };

  const handleDeleteInsurance = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hợp đồng bảo hiểm này?')) return;
    try {
      await deleteInsurancePolicy(id);
      setInsurances(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  /* ── Warranty Edit & Delete ── */
  const handleOpenEditWarranty = (w: any) => {
    setEditingWarranty(w);
    setWarrantyForm({
      item_type: w.item_type || 'VEHICLE',
      item_name: w.item_name || 'Bảo hành chính hãng',
      provider: w.provider || '',
      policy_number: w.policy_number || '',
      start_date: w.start_date ? w.start_date.slice(0, 10) : '',
      expiry_date: w.expiry_date ? w.expiry_date.slice(0, 10) : '',
      coverage_details: w.coverage_details || '',
    });
    setOpenModal('warranty');
  };

  const handleDeleteWarranty = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bảo hành này?')) return;
    try {
      await deleteWarranty(id);
      setWarranties(prev => prev.filter(w => w.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const saveWarranty = async () => {
    try {
      if (editingWarranty) {
        const { data } = await updateWarranty(editingWarranty.id, {
          item_type: warrantyForm.item_type as any,
          item_name: warrantyForm.item_name,
          provider: warrantyForm.provider,
          policy_number: warrantyForm.policy_number || undefined,
          start_date: warrantyForm.start_date || new Date().toISOString().slice(0, 10),
          expiry_date: warrantyForm.expiry_date || undefined,
          coverage_details: warrantyForm.coverage_details || undefined,
        });
        if (data) setWarranties(prev => prev.map(w => w.id === editingWarranty.id ? data : w));
      } else {
        const { data } = await createWarranty({
          asset_id: asset.id,
          item_type: warrantyForm.item_type as any,
          item_name: warrantyForm.item_name,
          provider: warrantyForm.provider,
          policy_number: warrantyForm.policy_number || undefined,
          start_date: warrantyForm.start_date || new Date().toISOString().slice(0, 10),
          expiry_date: warrantyForm.expiry_date || undefined,
          coverage_details: warrantyForm.coverage_details || undefined,
          status: 'ACTIVE',
        });
        if (data) setWarranties([data, ...warranties]);
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingWarranty(null);
  };

  const saveInsurance = async () => {
    try {
      if (editingInsurance) {
        const updated = await updateInsurancePolicy(editingInsurance.id, {
          provider: insForm.company,
          policy_number: insForm.policy_number,
          policy_type: insForm.type.includes('TNDS') ? 'MANDATORY' : insForm.type.includes('vật chất') ? 'COMPREHENSIVE' : 'OTHER',
          start_date: insForm.start_date,
          expiry_date: insForm.expiry_date,
          cost: parseFloat(insForm.annual_fee) || 0,
          coverage_amount: parseFloat(insForm.coverage_amount) || 0,
          agent_name: insForm.agent_name || undefined,
          agent_phone: insForm.agent_phone || undefined,
          provider_hotline: insForm.provider_hotline || undefined,
        });
        const mapped = {
          id: updated.id,
          type: updated.policy_type === 'COMPREHENSIVE' ? 'Bảo hiểm vật chất' : updated.policy_type === 'MANDATORY' ? 'Bảo hiểm TNDS bắt buộc' : 'Khác',
          company: updated.provider,
          policy_number: updated.policy_number,
          start_date: updated.start_date,
          expiry_date: updated.expiry_date,
          annual_fee: updated.cost,
          coverage_amount: updated.coverage_amount ?? 0,
          agent_name: updated.agent_name,
          agent_phone: updated.agent_phone,
          provider_hotline: updated.provider_hotline,
          status: 'ACTIVE',
        };
        setInsurances(prev => prev.map(i => i.id === editingInsurance.id ? mapped : i));
      } else {
        const created = await createInsurancePolicy({
          asset_id: asset.id,
          provider: insForm.company,
          policy_number: insForm.policy_number,
          policy_type: insForm.type.includes('TNDS') ? 'MANDATORY' : insForm.type.includes('vật chất') ? 'COMPREHENSIVE' : 'OTHER',
          start_date: insForm.start_date,
          expiry_date: insForm.expiry_date,
          cost: parseFloat(insForm.annual_fee) || 0,
          coverage_amount: parseFloat(insForm.coverage_amount) || 0,
          agent_name: insForm.agent_name || undefined,
          agent_phone: insForm.agent_phone || undefined,
          provider_hotline: insForm.provider_hotline || undefined,
        });
        setInsurances([{
          id: created.id,
          type: created.policy_type === 'COMPREHENSIVE' ? 'Bảo hiểm vật chất' : created.policy_type === 'MANDATORY' ? 'Bảo hiểm TNDS bắt buộc' : 'Khác',
          company: created.provider,
          policy_number: created.policy_number,
          start_date: created.start_date,
          expiry_date: created.expiry_date,
          annual_fee: created.cost,
          coverage_amount: created.coverage_amount ?? 0,
          agent_name: created.agent_name,
          agent_phone: created.agent_phone,
          provider_hotline: created.provider_hotline,
          status: 'ACTIVE',
        }, ...insurances]);
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(null);
    setEditingInsurance(null);
    setInsForm({ type: 'Bảo hiểm vật chất', company: '', policy_number: '', start_date: '', expiry_date: '', annual_fee: '', coverage_amount: '', agent_name: '', agent_phone: '', provider_hotline: '', notes: '' });
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const updated = await updateAsset(asset.id, {
        name: editForm.name,
        brand: editForm.brand,
        model: editForm.model,
        year: editForm.year ? parseInt(editForm.year) : undefined,
        color: editForm.color || undefined,
        license_plate: editForm.license_plate || undefined,
        vin: editForm.vin || undefined,
        engine: editForm.engine || undefined,
        fuel_type: editForm.fuel_type || undefined,
        tank_capacity_liters: editForm.tank_capacity_liters ? parseFloat(editForm.tank_capacity_liters) : undefined,
        battery_capacity_kwh: editForm.battery_capacity_kwh ? parseFloat(editForm.battery_capacity_kwh) : undefined,
        purchase_price: editForm.purchase_price ? parseFloat(editForm.purchase_price) : undefined,
        current_value: editForm.current_value ? parseFloat(editForm.current_value) : undefined,
        purchase_date: editForm.purchase_date || undefined,
        image_url: editForm.image_url || undefined,
        current_odometer_km: parseFloat(editForm.current_odometer_km) || 0,
        status: editForm.status as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SOLD',
        description: editForm.description || undefined,
        sales_rep_name: editForm.sales_rep_name || undefined,
        sales_rep_phone: editForm.sales_rep_phone || undefined,
        brand_hotline: editForm.brand_hotline || undefined,
      });
      if (updated) setAsset(updated);
      setOpenModal(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setSavingEdit(false);
  };

  const saveOdoAdjustment = async () => {
    const newKm = parseFloat(odoForm.new_value_km);
    if (!newKm || newKm < 0) {
      alert('Vui lòng nhập số km hợp lệ');
      return;
    }
    try {
      await createOdometerAdjustment({
        asset_id: asset.id,
        previous_value_km: asset.current_odometer_km || 0,
        adjustment_km: newKm - (asset.current_odometer_km || 0),
        new_value_km: newKm,
        reason: odoForm.reason || 'Hiệu chỉnh Odometer',
      });
      setAsset(p => p ? { ...p, current_odometer_km: newKm } : p);
      setOpenModal(null);
      alert('Đã lưu hiệu chỉnh Odometer thành công!');
    } catch (e: any) {
      alert(`Lỗi khi hiệu chỉnh: ${e?.message ?? 'Không lưu được'}`);
    }
  };

  const saveClaim = async () => {
    if (!claimForm.item_name || !claimForm.description) {
      alert('Vui lòng nhập tên hạng mục và mô tả yêu cầu');
      return;
    }
    try {
      await createWarrantyClaim({
        asset_id: asset.id,
        claim_date: new Date().toISOString().split('T')[0],
        description: `${claimForm.item_name}: ${claimForm.description}`,
        amount_claimed: parseFloat(claimForm.amount_claimed) || 0,
        amount_approved: 0,
        status: 'PENDING',
        vendor: claimForm.vendor || undefined,
      });
      setOpenModal(null);
      alert('Đã gửi yêu cầu bảo hành (Claim) thành công!');
    } catch (e: any) {
      alert(`Lỗi khi gửi claim: ${e?.message ?? 'Không gửi được'}`);
    }
  };

  /* ══════════════════════════════════════════════
     ANALYTICS CALCULATIONS
     ══════════════════════════════════════════════ */
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.total_cost, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const totalInsurance = expenses.filter(e => e.category === 'INSURANCE').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = asset.current_odometer_km;
  const totalTCO = asset.purchase_price + totalExpenses;
  const costPerKm = totalKm > 0 ? totalTCO / totalKm : 0;
  const depreciation = asset.purchase_price - asset.current_value;
  const paidPrincipal = loan ? loan.principal - loan.current_balance : 0;
  const loanProgress = loan && loan.principal > 0 ? (paidPrincipal / loan.principal) * 100 : 0;


  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-5 pb-12">

      {/* Back */}
      <button onClick={() => router.push('/')} className="flex items-center space-x-2 text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Dashboard gia đình</span>
      </button>

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            {asset.image_url
              ? <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
              : <Car className="w-8 h-8 m-auto" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }}>{asset.asset_type}</span>
              {asset.license_plate && <span className="px-2 py-0.5 rounded font-mono text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>{asset.license_plate}</span>}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>● ACTIVE</span>
            </div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{asset.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{asset.brand} {asset.model} ({asset.year}) • {asset.color}</p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setEditForm({
            name: asset.name, brand: asset.brand, model: asset.model, year: String(asset.year || ''),
            color: asset.color || '', license_plate: asset.license_plate || '',
            vin: asset.vin || '', engine: asset.engine || '', fuel_type: asset.fuel_type || 'PETROL',
            tank_capacity_liters: String(asset.tank_capacity_liters ?? ''),
            battery_capacity_kwh: String(asset.battery_capacity_kwh ?? ''),
            purchase_price: String(asset.purchase_price || ''), current_value: String(asset.current_value || ''),
            purchase_date: asset.purchase_date || '', image_url: asset.image_url || '',
            current_odometer_km: String(asset.current_odometer_km || 0),
            status: asset.status || 'ACTIVE', description: asset.description || '',
            sales_rep_name: asset.sales_rep_name || '',
            sales_rep_phone: asset.sales_rep_phone || '',
            brand_hotline: asset.brand_hotline || '',
          }); setOpenModal('edit'); }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition hover:opacity-90"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            <Pencil className="w-3.5 h-3.5" /><span>Sửa thông tin</span>
          </button>
          <button onClick={() => setOpenModal('expense')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition hover:opacity-90"
            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--status-amber)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Plus className="w-3.5 h-3.5" /><span>Thêm chi phí</span>
          </button>
          <button onClick={handleOpenAddMaint}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition hover:opacity-90"
            style={{ background: 'rgba(56,189,248,0.15)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }}>
            <Wrench className="w-3.5 h-3.5" /><span>Thêm bảo dưỡng</span>
          </button>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Virtual Odometer</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--accent-cyan)' }}>{fmt(asset.current_odometer_km)} km</p>
                <button onClick={() => setOpenModal('odometer')} className="text-[10px] font-bold hover:underline block mt-0.5" style={{ color: 'var(--accent-cyan)' }}>
                  Hiệu chỉnh ODO ✎
                </button>
              </div>
              {(asset.fuel_level_percent !== undefined) && (
                <div className="border-l pl-4" style={{ borderColor: 'var(--border-default)' }}>
                  <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>{asset.capabilities.has_battery ? 'Pin' : 'Nhiên liệu'}</p>
                  <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--status-amber)' }}>{asset.fuel_level_percent}%</p>
                  <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>~{asset.estimated_range_km} km</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={isActive
                ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="glass-panel p-6 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 9-Metric Financial & TCO Overview Dashboard */}
            <VehicleFinanceOverview
              asset={asset}
              loan={loan}
              expenses={expenses}
              parts={parts}
              onRefresh={() => { window.location.reload(); }}
              onNavigateTab={(tabId) => setActiveTab(tabId)}
            />

            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Thông số tổng quan</h3>
              <button
                onClick={() => {
                  setEditForm({
                    name: asset.name, brand: asset.brand, model: asset.model, year: String(asset.year || ''),
                    color: asset.color || '', license_plate: asset.license_plate || '',
                    vin: asset.vin || '', engine: asset.engine || '', fuel_type: asset.fuel_type || 'PETROL',
                    tank_capacity_liters: String(asset.tank_capacity_liters ?? ''),
                    battery_capacity_kwh: String(asset.battery_capacity_kwh ?? ''),
                    purchase_price: String(asset.purchase_price || ''), current_value: String(asset.current_value || ''),
                    purchase_date: asset.purchase_date || '', image_url: asset.image_url || '',
                    current_odometer_km: String(asset.current_odometer_km || 0),
                    status: asset.status || 'ACTIVE', description: asset.description || '',
                    sales_rep_name: asset.sales_rep_name || '',
                    sales_rep_phone: asset.sales_rep_phone || '',
                    brand_hotline: asset.brand_hotline || '',
                  });
                  setOpenModal('edit');
                }}
                className="text-xs font-semibold text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Sửa thông số xe</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {[
                { label: 'Giá mua ban đầu', value: `${fmt(asset.purchase_price)} ₫`, sub: `Ngày mua: ${fmtDate(asset.purchase_date || '')}`, color: 'var(--text-primary)' },
                { label: 'Giá trị ước tính hiện tại', value: `${fmt(asset.current_value)} ₫`, sub: `Khấu hao: ${(((asset.purchase_price - asset.current_value) / asset.purchase_price) * 100).toFixed(1)}%`, color: 'var(--status-green)' },
                { label: 'Bảo dưỡng tiếp theo', value: asset.next_maintenance_due || 'OK', sub: 'Trạng thái: Bình thường', color: 'var(--status-amber)' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <p className="text-base font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
                  <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{item.sub}</span>
                </div>
              ))}
            </div>

            {/* Extended Overview — spec §91 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: 'Quãng đường tích lũy', value: `${fmt(asset.current_odometer_km)} km`, color: 'var(--accent-cyan)' },
                { label: 'Trạng thái xe', value: asset.status || 'ACTIVE', color: 'var(--status-green)' },
                { label: 'Tổng TCO', value: `${fmt(totalTCO)} ₫`, color: 'var(--status-rose)' },
                { label: 'Chi phí / km', value: totalKm > 0 ? `${fmt(Math.round(costPerKm))} ₫/km` : 'N/A', color: 'var(--text-primary)' },
                { label: 'Động cơ', value: asset.engine || '—' },
                { label: 'Nhiên liệu', value: asset.fuel_type || '—' },
                { label: 'Dung tích bình', value: asset.tank_capacity_liters ? `${asset.tank_capacity_liters}L` : (asset.battery_capacity_kwh ? `${asset.battery_capacity_kwh} kWh` : '—') },
                { label: 'TB L/100km', value: asset.avg_consumption_l100km ? `${asset.avg_consumption_l100km} L/100km` : 'N/A' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <p className="font-bold mt-0.5" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {asset.description && (
              <div className="p-4 rounded-xl text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{asset.description}</p>
              </div>
            )}

            {/* 📞 Danh bạ Liên hệ & Tổng đài cứu hộ hỗ trợ */}
            <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📞 Danh Bạ Liên Hệ &amp; Tổng Đài Hỗ Trợ</span>
                </h4>
                <button
                  onClick={() => {
                    setEditForm({
                      name: asset.name, brand: asset.brand, model: asset.model, year: String(asset.year || ''),
                      color: asset.color || '', license_plate: asset.license_plate || '',
                      vin: asset.vin || '', engine: asset.engine || '', fuel_type: asset.fuel_type || 'PETROL',
                      tank_capacity_liters: String(asset.tank_capacity_liters ?? ''),
                      battery_capacity_kwh: String(asset.battery_capacity_kwh ?? ''),
                      purchase_price: String(asset.purchase_price || ''), current_value: String(asset.current_value || ''),
                      purchase_date: asset.purchase_date || '', image_url: asset.image_url || '',
                      current_odometer_km: String(asset.current_odometer_km || 0),
                      status: asset.status || 'ACTIVE', description: asset.description || '',
                      sales_rep_name: asset.sales_rep_name || '',
                      sales_rep_phone: asset.sales_rep_phone || '',
                      brand_hotline: asset.brand_hotline || '',
                    });
                    setOpenModal('edit');
                  }}
                  className="text-[11px] font-bold text-cyan-400 hover:underline"
                >
                  ✏️ Sửa danh bạ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. Mua xe & Hãng */}
                <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-bold text-[11px] uppercase text-cyan-400">🚘 Đại lý &amp; Bán xe ({asset.brand})</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Cố vấn: <strong>{asset.sales_rep_name || 'Chưa cập nhật'}</strong></p>
                  <div className="flex flex-col gap-1 pt-1">
                    {asset.sales_rep_phone ? (
                      <a href={`tel:${asset.sales_rep_phone}`} className="px-2.5 py-1 rounded-lg bg-cyan-500 text-white font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit">
                        <span>📞 SĐT Sale: {asset.sales_rep_phone}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có SĐT sale</span>}

                    {asset.brand_hotline ? (
                      <a href={`tel:${asset.brand_hotline}`} className="px-2.5 py-1 rounded-lg bg-slate-700 text-cyan-300 font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit" style={{ border: '1px solid rgba(14,165,233,0.3)' }}>
                        <span>☎️ Hotline {asset.brand}: {asset.brand_hotline}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có hotline hãng</span>}
                  </div>
                </div>

                {/* 2. Ngân hàng & Tín dụng */}
                <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-bold text-[11px] uppercase text-emerald-400">🏦 Khoản Vay ({loan?.lender || 'Ngân hàng'})</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Cán bộ TD: <strong>{loan?.bank_contact_name || 'Chưa cập nhật'}</strong></p>
                  <div className="flex flex-col gap-1 pt-1">
                    {loan?.bank_contact_phone ? (
                      <a href={`tel:${loan.bank_contact_phone}`} className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit">
                        <span>📞 SĐT Cán bộ: {loan.bank_contact_phone}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có SĐT cán bộ</span>}

                    {loan?.bank_hotline ? (
                      <a href={`tel:${loan.bank_hotline}`} className="px-2.5 py-1 rounded-lg bg-slate-700 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
                        <span>☎️ Hotline NH: {loan.bank_hotline}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có hotline ngân hàng</span>}
                  </div>
                </div>

                {/* 3. Bảo hiểm */}
                <div className="p-3.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <p className="font-bold text-[11px] uppercase text-purple-400">🛡️ Bảo Hiểm ({insurances[0]?.company || 'Bảo hiểm'})</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Đại lý / Cán bộ: <strong>{insurances[0]?.agent_name || 'Chưa cập nhật'}</strong></p>
                  <div className="flex flex-col gap-1 pt-1">
                    {insurances[0]?.agent_phone ? (
                      <a href={`tel:${insurances[0].agent_phone}`} className="px-2.5 py-1 rounded-lg bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit">
                        <span>📞 SĐT Cán bộ BH: {insurances[0].agent_phone}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có SĐT cán bộ BH</span>}

                    {insurances[0]?.provider_hotline ? (
                      <a href={`tel:${insurances[0].provider_hotline}`} className="px-2.5 py-1 rounded-lg bg-slate-700 text-purple-300 font-bold text-[11px] flex items-center gap-1.5 hover:opacity-90 w-fit" style={{ border: '1px solid rgba(167,139,250,0.3)' }}>
                        <span>☎️ Cứu hộ BH: {insurances[0].provider_hotline}</span>
                      </a>
                    ) : <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có hotline cứu hộ BH</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ OPERATION ═══ */}
        {activeTab === 'operation' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Vận hành &amp; OBD</h3>
              {asset.capabilities.has_obd
                ? <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>OBD Connected</span>
                  </span>
                : <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-faint)' }} /><span>OBD chưa kết nối</span>
                  </span>
              }
            </div>

            {/* OBD Gauges — realtime từ Android app via Supabase Realtime */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Tốc độ', value: live.speed != null ? `${Math.round(live.speed)}` : 'N/A', unit: 'km/h', color: live.speed != null ? 'var(--accent-cyan)' : 'var(--text-muted)' },
                { label: 'Vòng tua RPM', value: live.rpm != null ? `${Math.round(live.rpm)}` : 'N/A', unit: 'rpm', color: live.rpm != null ? 'var(--accent-cyan)' : 'var(--text-muted)' },
                { label: 'Nhiệt độ nước', value: live.coolant != null ? `${Math.round(live.coolant)}` : 'N/A', unit: '°C', color: live.coolant != null ? 'var(--accent-cyan)' : 'var(--text-muted)' },
                { label: 'Điện áp bình', value: live.voltage != null ? live.voltage.toFixed(1) : 'N/A', unit: 'V', color: live.voltage != null ? 'var(--accent-cyan)' : 'var(--text-muted)' },
              ].map((g, i) => (
                <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>{g.label}</span>
                  <p className="text-2xl font-black mt-2" style={{ color: g.color }}>{g.value}</p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.unit}</span>
                </div>
              ))}
            </div>

            {hasLive ? (
              <div className="p-4 rounded-xl text-xs" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--status-green)' }}>⚡ Dữ liệu OBD thời gian thực từ Android app (ZESTECH + KW906)</p>
                <p style={{ color: 'var(--text-muted)' }}>Đang cập nhật qua Supabase Realtime mỗi giây từ ứng dụng Android.</p>
              </div>
            ) : (
              <div className="p-4 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <p className="font-semibold mb-1" style={{ color: 'var(--status-amber)' }}>⚠️ Dữ liệu OBD chưa có</p>
                <p style={{ color: 'var(--text-muted)' }}>Kết nối Android app với đầu OBD2 ELM327 (KW906/ZESTECH) để thấy dữ liệu thời gian thực. Các giá trị sẽ tự động cập nhật qua Supabase Realtime.</p>
              </div>
            )}

            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <h4 className="text-xs font-bold uppercase" style={{ color: 'var(--accent-cyan)' }}>Virtual Odometer Strategy Ledger</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Verified Dashboard ODO', value: 'N/A (Hạn chế PID)', color: 'var(--text-muted)' },
                  { label: 'GPS Trip Accumulated', value: `${fmt(asset.current_odometer_km)} km`, color: 'var(--accent-cyan)' },
                  { label: 'App Virtual ODO', value: `${fmt(asset.current_odometer_km)} km ✓ High Confidence`, color: 'var(--status-green)' },
                ].map((r, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}:</span>
                    <p className="font-bold mt-0.5" style={{ color: r.color }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 📊 BÁO CÁO PHÂN TÍCH QUÃNG ĐƯỜNG & NHẬT KÝ ODOMETER THEO NGÀY/THÁNG/NĂM */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 text-cyan-400">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Báo Cáo Phân Tích Di Chuyển &amp; Nhật Ký Hành Trình (ODO)</span>
                  </h4>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Tổng ODO hiện tại: <strong className="text-cyan-400">{fmt(asset.current_odometer_km)} km</strong> • Tháng này: <strong className="text-emerald-400">+{fmt(mileageAnalytics.currentMonthKm)} km</strong> • Lăn bánh: <strong>{mileageAnalytics.totalActiveDays} ngày</strong>
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setEditingOdoLog(null); setOdoLogForm({ date: new Date().toISOString().slice(0, 10), odometer_km: String(asset.current_odometer_km || ''), note: '' }); setOpenModal('odolog'); }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90 flex items-center space-x-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /><span>Ghi nhận mốc Odometer</span>
                  </button>
                </div>
              </div>

              {/* View Switcher: Theo Ngày / Theo Tháng / Theo Năm */}
              <div className="flex items-center space-x-2 border-b pb-2 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold text-[11px] uppercase text-cyan-400">📊 Chế độ xem:</span>
                {[
                  { id: 'daily', label: '📅 Theo Ngày (Nhật ký hành trình)', count: mileageAnalytics.dailyReport.length },
                  { id: 'monthly', label: '📆 Theo Tháng (Báo cáo tháng)', count: mileageAnalytics.monthlyReport.length },
                  { id: 'yearly', label: '🗓️ Theo Năm (Báo cáo năm)', count: mileageAnalytics.yearlyReport.length },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setOdoViewMode(m.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      odoViewMode === m.id
                        ? 'bg-cyan-500 text-white shadow-md'
                        : 'hover:bg-white/10'
                    }`}
                    style={odoViewMode !== m.id ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' } : {}}
                  >
                    <span>{m.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${odoViewMode === m.id ? 'bg-white/25 text-white' : 'bg-black/20 text-slate-400'}`}>
                      {m.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* 1. THEO NGÀY (DAILY VIEW) */}
              {odoViewMode === 'daily' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-2xl max-h-[500px] overflow-y-auto" style={{ border: '1px solid var(--border-default)' }}>
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Ngày</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Km trong ngày</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Mốc ODO</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Nội dung hành trình / Sự kiện ghi nhận</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mileageAnalytics.dailyReport.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                              Chưa có dữ liệu nhật ký di chuyển. Bấm "Ghi nhận mốc Odometer" để bắt đầu theo dõi.
                            </td>
                          </tr>
                        ) : (
                          mileageAnalytics.dailyReport.map((day, idx) => (
                            <tr key={day.date} className="transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmtDate(day.date)}</p>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{day.dayOfWeek}</span>
                              </td>
                              <td className="px-3.5 py-2.5 font-mono whitespace-nowrap">
                                {day.kmRun > 0 ? (
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    +{fmt(day.kmRun)} km
                                  </span>
                                ) : (
                                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>— 0 km</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono font-bold text-cyan-400 whitespace-nowrap">
                                {day.displayOdo > 0 ? `${fmt(day.displayOdo)} km` : '—'}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="space-y-1">
                                  {day.notes.map((n, nIdx) => (
                                    <div key={nIdx} className="flex items-center gap-1.5 text-xs flex-wrap">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{
                                        background: n.type === 'FUEL' ? 'rgba(245,158,11,0.15)' : n.type === 'MAINTENANCE' ? 'rgba(56,189,248,0.15)' : n.type === 'TRIP' ? 'rgba(168,85,247,0.15)' : 'rgba(52,211,153,0.15)',
                                        color: n.type === 'FUEL' ? 'var(--status-amber)' : n.type === 'MAINTENANCE' ? 'var(--accent-cyan)' : n.type === 'TRIP' ? '#C084FC' : 'var(--status-green)',
                                      }}>
                                        {n.type === 'FUEL' ? '⛽ Xăng' : n.type === 'MAINTENANCE' ? '🔧 Bảo dưỡng' : n.type === 'TRIP' ? '📍 Chuyến đi' : '🚗 ODO'}
                                      </span>
                                      <span style={{ color: 'var(--text-secondary)' }}>{n.text}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                {day.notes.some(n => n.type === 'ODO_LOG') && (
                                  <div className="flex items-center space-x-1">
                                    {day.notes.filter(n => n.type === 'ODO_LOG').map(n => (
                                      <React.Fragment key={n.id}>
                                        <button onClick={() => handleOpenEditOdoLog(n.raw || { id: n.id, date: day.date, odometer_km: day.displayOdo, note: n.text })} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa mốc ODO">
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeleteOdoLog(n.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. THEO THÁNG (MONTHLY VIEW) */}
              {odoViewMode === 'monthly' && (
                <div className="space-y-4">
                  {/* Monthly Summary Cards / Bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mileageAnalytics.monthlyReport.map((m) => {
                      const maxKmInMonth = Math.max(...mileageAnalytics.monthlyReport.map(x => x.totalKm), 1000);
                      const percent = Math.min(100, (m.totalKm / maxKmInMonth) * 100);
                      return (
                        <div key={m.monthKey} className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                          <div className="flex items-center justify-between">
                            <h5 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{m.monthLabel}</h5>
                            <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 font-mono">
                              {fmt(m.totalKm)} km
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #0EA5E9, #10B981)' }} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Lăn bánh:</span>
                              <p className="font-bold text-xs" style={{ color: 'var(--text-secondary)' }}>{m.activeDays} ngày ({m.avgKmPerActiveDay} km/ngày)</p>
                            </div>
                            <div className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                              <span style={{ color: 'var(--text-muted)' }}>Chi phí vận hành:</span>
                              <p className="font-bold text-xs" style={{ color: 'var(--status-amber)' }}>{fmt(m.totalCost)} ₫</p>
                            </div>
                          </div>

                          {m.totalKm > 0 && (
                            <p className="text-[11px] text-right font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                              Chi phí / km: <strong>{fmt(m.costPerKm)} ₫/km</strong>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Table Details */}
                  <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Tháng</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Tổng Km chạy</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Số ngày lăn bánh</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">TB Km / Ngày chạy</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Tiền Xăng (₫)</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Bảo Dưỡng (₫)</th>
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px]">Chi phí / Km</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mileageAnalytics.monthlyReport.map((m, idx) => (
                          <tr key={m.monthKey} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                            <td className="px-3.5 py-2.5 font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{m.monthLabel}</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-400 whitespace-nowrap">{fmt(m.totalKm)} km</td>
                            <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>{m.activeDays} ngày</td>
                            <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--accent-cyan)' }}>{m.avgKmPerActiveDay} km/ngày</td>
                            <td className="px-3.5 py-2.5 font-mono text-amber-400">{fmt(m.fuelCost)} ₫</td>
                            <td className="px-3.5 py-2.5 font-mono text-cyan-400">{fmt(m.maintCost)} ₫</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold" style={{ color: 'var(--status-red)' }}>{m.costPerKm > 0 ? `${fmt(m.costPerKm)} ₫` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. THEO NĂM (YEARLY VIEW) */}
              {odoViewMode === 'yearly' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {mileageAnalytics.yearlyReport.map((y) => (
                      <div key={y.yearKey} className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                        <div className="flex items-center justify-between">
                          <h5 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Năm {y.yearKey}</h5>
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            {fmt(y.totalKm)} km
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                            <span>Trung bình mỗi tháng:</span>
                            <strong className="font-mono text-cyan-400">{fmt(y.avgKmPerMonth)} km/tháng</strong>
                          </div>
                          <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                            <span>Tổng chi phí vận hành:</span>
                            <strong className="font-mono text-amber-400">{fmt(y.totalCost)} ₫</strong>
                          </div>
                          <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                            <span>Chi phí trung bình / km:</span>
                            <strong className="font-mono text-rose-400">{fmt(y.costPerKm)} ₫/km</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ TRIPS ═══ */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Nhật ký chuyến đi</h3>
              <button onClick={() => setOpenModal('trip')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Ghi nhận chuyến đi</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-center mb-2">
              {[
                { label: 'Tổng chuyến', value: trips.length },
                { label: 'Tổng km tháng này', value: `${fmt(trips.reduce((s,t)=>s+t.distance_km,0).toFixed(0) as any)} km` },
                { label: 'TB tiêu thụ', value: `${asset.avg_consumption_l100km || '—'} L/100` },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="font-extrabold text-base" style={{ color: 'var(--accent-cyan)' }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {trips.map((trip) => (
                <div key={trip.id} className="p-3.5 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {trip.start_location} → {trip.end_location}
                    </p>
                    <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {fmtDate(trip.start_time)} • {durFmt(trip.duration_seconds)} • TB {trip.average_speed_kmh} km/h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{trip.distance_km} km</p>
                    {trip.fuel_used_liters && <p style={{ color: 'var(--status-amber)' }}>{trip.fuel_used_liters}L xăng</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FUEL ═══ */}
        {activeTab === 'fuel' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                {asset.capabilities.has_battery ? 'Lịch sử sạc pin' : 'Nhật ký đổ nhiên liệu'}
              </h3>
              <button onClick={() => setOpenModal('fuel')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Ghi nhận đổ xăng</span>
              </button>
            </div>

            {/* 📅 Date Filter */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {[
                  { label: 'Tất cả', start: '', end: '' },
                  { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
                  { label: 'Tháng này', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) },
                  { label: 'Tháng trước', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10) },
                  { label: 'Năm nay', start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` },
                ].map(p => (
                  <button key={p.label} onClick={() => { setTabStartDate(p.start); setTabEndDate(p.end); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${tabStartDate === p.start && tabEndDate === p.end ? 'bg-cyan-500 text-white' : 'hover:bg-white/10'}`}
                    style={!(tabStartDate === p.start && tabEndDate === p.end) ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input type="date" value={tabStartDate} onChange={e => setTabStartDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" value={tabEndDate} onChange={e => setTabEndDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                {(tabStartDate || tabEndDate) && (
                  <button onClick={() => { setTabStartDate(''); setTabEndDate(''); }} className="text-[10px] font-bold text-rose-400">✕ Xóa</button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              {[
                { label: 'Tổng chi phí xăng', value: `${fmt(totalFuelCost)} ₫`, color: 'var(--status-amber)' },
                { label: 'TB L/100km', value: `${asset.avg_consumption_l100km || '—'} L`, color: 'var(--accent-cyan)' },
                { label: 'Số lần đổ', value: displayedFuelLogs.length, color: 'var(--text-primary)' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="font-extrabold text-sm" style={{ color: s.color }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    {[
                      { key: 'date', label: 'Ngày' },
                      { key: 'liters', label: 'Số lít' },
                      { key: 'price_per_liter', label: 'Giá/L' },
                      { key: 'total_cost', label: 'Tổng tiền' },
                      { key: 'odometer_km', label: 'Odometer' },
                      { key: 'station', label: 'Cây xăng' },
                      { key: 'consumption_l100km', label: 'L/100km' },
                    ].map(col => {
                      const isSorted = fuelSortCol === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (fuelSortCol === col.key) {
                              setFuelSortDir(p => p === 'asc' ? 'desc' : 'asc');
                            } else {
                              setFuelSortCol(col.key);
                              setFuelSortDir('asc');
                            }
                          }}
                          className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide cursor-pointer select-none hover:text-cyan-400 transition"
                          style={{ color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{col.label}</span>
                            <span className="text-[9px]">{isSorted ? (fuelSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedFuelLogs.map((f, i) => (
                    <tr key={f.id} className="transition" style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtDate(f.date)}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--accent-cyan)' }}>{f.liters}L</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(f.price_per_liter)}₫</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--status-amber)' }}>{fmt(f.total_cost)}₫</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{fmt(f.odometer_km)} km</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{f.station}</td>
                      <td className="px-3 py-2.5" style={{ color: f.consumption_l100km && f.consumption_l100km > 7.5 ? 'var(--status-red)' : 'var(--status-green)' }}>
                        {f.consumption_l100km ? `${f.consumption_l100km}L` : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center space-x-1">
                          <button onClick={() => handleOpenEditFuel(f)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteFuel(f.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ MAINTENANCE ═══ */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Lịch sử bảo dưỡng</h3>
              <button onClick={handleOpenAddMaint} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm bảo dưỡng</span>
              </button>
            </div>

            {/* 📅 Date Filter & Sort */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {[
                  { label: 'Tất cả', start: '', end: '' },
                  { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
                  { label: 'Tháng này', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) },
                  { label: 'Tháng trước', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10) },
                  { label: 'Năm nay', start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` },
                ].map(p => (
                  <button key={p.label} onClick={() => { setTabStartDate(p.start); setTabEndDate(p.end); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${tabStartDate === p.start && tabEndDate === p.end ? 'bg-cyan-500 text-white' : 'hover:bg-white/10'}`}
                    style={!(tabStartDate === p.start && tabEndDate === p.end) ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input type="date" value={tabStartDate} onChange={e => setTabStartDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" value={tabEndDate} onChange={e => setTabEndDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                {(tabStartDate || tabEndDate) && (
                  <button onClick={() => { setTabStartDate(''); setTabEndDate(''); }} className="text-[10px] font-bold text-rose-400">✕ Xóa</button>
                )}
                <div className="flex items-center space-x-1 border-l pl-2" style={{ borderColor: 'var(--border-default)' }}>
                  <select value={maintSortCol} onChange={e => setMaintSortCol(e.target.value)} className="theme-select text-[10px] py-1 px-1.5 font-semibold" style={{ width: 'auto' }}>
                    <option value="date">Ngày</option>
                    <option value="cost">Chi phí</option>
                    <option value="maintenance_type">Hạng mục</option>
                    <option value="odometer_km">Số Km</option>
                  </select>
                  <button onClick={() => setMaintSortDir(p => p === 'asc' ? 'desc' : 'asc')} className="px-1.5 py-1 rounded text-[10px] font-bold border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--accent-cyan)' }}>
                    {maintSortDir === 'asc' ? '▲' : '▼'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {displayedMaintenance.map((m) => (
                <div key={m.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={m.status === 'OK' ? { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' } :
                            m.status === 'DUE_SOON' ? { background: 'rgba(251,191,36,0.15)', color: 'var(--status-amber)' } :
                              { background: 'rgba(248,113,113,0.15)', color: 'var(--status-red)' }}>
                          {m.status === 'OK' ? '✓ OK' : m.status === 'DUE_SOON' ? '⚠ Sắp đến' : '❌ Quá hạn'}
                        </span>
                      </div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{m.maintenance_type}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {fmtDate(m.date)} • {fmt(m.odometer_km)} km • {m.vendor || 'Đại lý chính hãng'}
                      </p>
                        {/* Itemized Service Breakdown Badges */}
                        {(() => {
                          const parsed = parseMaintenanceNotes(m.notes, m.cost, m.maintenance_type);
                          return (
                            <>
                              {parsed.items.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                  {parsed.items.map((item, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                                      <span>🔧 {item.name}:</span>
                                      <strong className="text-cyan-400 font-mono">{item.cost ? `${fmt(parseFloat(item.cost))}₫` : '—'}</strong>
                                    </span>
                                  ))}
                                  {parsed.discount && parseFloat(parsed.discount) > 0 && (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border text-amber-400 border-amber-500/30" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                      🎁 Giảm giá: -{fmt(parseFloat(parsed.discount))}₫
                                    </span>
                                  )}
                                </div>
                              )}
                              {parsed.cleanNotes && <p className="text-[10px] mt-1.5 p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>📝 {parsed.cleanNotes}</p>}
                            </>
                          );
                        })()}
                      {m.next_due_km && <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-cyan)' }}>Kỳ tiếp: {fmt(m.next_due_km)} km {m.next_due_date ? `(${fmtDate(m.next_due_date)})` : ''}</p>}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-sm" style={{ color: 'var(--status-red)' }}>{fmt(m.cost)} ₫</span>
                      <button onClick={() => handleOpenEditMaint(m)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteMaint(m.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PARTS ═══ */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phụ tùng & Nâng cấp</h3>
              <button onClick={() => { setEditingPartItem(null); setOpenModal('part'); }} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm phụ tùng</span>
              </button>
            </div>

            {/* 📅 Date Filter & Sort */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {[
                  { label: 'Tất cả', start: '', end: '' },
                  { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
                  { label: 'Tháng này', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) },
                  { label: 'Tháng trước', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10) },
                  { label: 'Năm nay', start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` },
                ].map(p => (
                  <button key={p.label} onClick={() => { setTabStartDate(p.start); setTabEndDate(p.end); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${tabStartDate === p.start && tabEndDate === p.end ? 'bg-cyan-500 text-white' : 'hover:bg-white/10'}`}
                    style={!(tabStartDate === p.start && tabEndDate === p.end) ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input type="date" value={tabStartDate} onChange={e => setTabStartDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" value={tabEndDate} onChange={e => setTabEndDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                {(tabStartDate || tabEndDate) && (
                  <button onClick={() => { setTabStartDate(''); setTabEndDate(''); }} className="text-[10px] font-bold text-rose-400">✕ Xóa</button>
                )}
                <div className="flex items-center space-x-1 border-l pl-2" style={{ borderColor: 'var(--border-default)' }}>
                  <select value={partSortCol} onChange={e => setPartSortCol(e.target.value)} className="theme-select text-[10px] py-1 px-1.5 font-semibold" style={{ width: 'auto' }}>
                    <option value="install_date">Ngày lắp</option>
                    <option value="cost">Chi phí</option>
                    <option value="name">Tên (A-Z)</option>
                    <option value="brand">Thương hiệu</option>
                  </select>
                  <button onClick={() => setPartSortDir(p => p === 'asc' ? 'desc' : 'asc')} className="px-1.5 py-1 rounded text-[10px] font-bold border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--accent-cyan)' }}>
                    {partSortDir === 'asc' ? '▲' : '▼'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {displayedParts.map((p) => (
                <div key={p.id} className="p-4 rounded-xl flex justify-between items-start" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div>
                    <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {p.brand} • {p.category} • Lắp: {fmtDate(p.install_date)} • {fmt(p.odometer_km)} km
                    </p>
                    {p.warranty_months && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-green)' }}>Bảo hành: {p.warranty_months} tháng</p>}
                    {p.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-faint)' }}>{p.notes}</p>}
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-bold text-sm" style={{ color: 'var(--status-amber)' }}>{fmt(p.cost)} ₫</span>
                    <button onClick={() => handleOpenEditPart(p)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeletePart(p.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXPENSES ═══ */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Chi phí phát sinh</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tổng: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong></p>
              </div>
              <button onClick={() => { setEditingExp(null); setOpenModal('expense'); }} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm chi phí</span>
              </button>
            </div>

            {/* 📅 Date Filter & Sort */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {[
                  { label: 'Tất cả', start: '', end: '' },
                  { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
                  { label: 'Tháng này', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10) },
                  { label: 'Tháng trước', start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10), end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10) },
                  { label: 'Năm nay', start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` },
                ].map(p => (
                  <button key={p.label} onClick={() => { setTabStartDate(p.start); setTabEndDate(p.end); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${tabStartDate === p.start && tabEndDate === p.end ? 'bg-cyan-500 text-white' : 'hover:bg-white/10'}`}
                    style={!(tabStartDate === p.start && tabEndDate === p.end) ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input type="date" value={tabStartDate} onChange={e => setTabStartDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="date" value={tabEndDate} onChange={e => setTabEndDate(e.target.value)} className="theme-input text-[10px] py-1 px-1.5 font-mono" style={{ width: '120px' }} />
                {(tabStartDate || tabEndDate) && (
                  <button onClick={() => { setTabStartDate(''); setTabEndDate(''); }} className="text-[10px] font-bold text-rose-400">✕ Xóa</button>
                )}
                <div className="flex items-center space-x-1 border-l pl-2" style={{ borderColor: 'var(--border-default)' }}>
                  <select value={expSortCol} onChange={e => setExpSortCol(e.target.value)} className="theme-select text-[10px] py-1 px-1.5 font-semibold" style={{ width: 'auto' }}>
                    <option value="date">Ngày</option>
                    <option value="amount">Số tiền</option>
                    <option value="category">Danh mục</option>
                    <option value="description">Mô tả</option>
                  </select>
                  <button onClick={() => setExpSortDir(p => p === 'asc' ? 'desc' : 'asc')} className="px-1.5 py-1 rounded text-[10px] font-bold border" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--accent-cyan)' }}>
                    {expSortDir === 'asc' ? '▲' : '▼'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {displayedExpenses.map((e) => (
                <div key={e.id} className="p-3.5 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[e.category] || '#6B7280' }} />
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{e.description}</p>
                      <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {fmtDate(e.date)} {e.vendor ? `• ${e.vendor}` : ''} •
                        <span className="ml-1 px-1.5 py-0.5 rounded" style={{ background: `${CAT_COLORS[e.category]}22`, color: CAT_COLORS[e.category] || '#6B7280', fontSize: 10 }}>
                          {e.category} {e.subcategory ? `> ${e.subcategory}` : ''}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="font-bold" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</span>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleOpenEditExpense(e)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteExpense(e.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FINANCE (KHOẢN VAY & LỊCH TRẢ NỢ) ═══ */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Khoản Vay &amp; Lịch Trả Nợ Chi Tiết</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Quản lý dư nợ trả góp, lãi suất 2 giai đoạn &amp; nhật ký đóng tiền hàng tháng</p>
              </div>
              {loan ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    setEditingLoan(loan);
                    setLoanForm({
                      lender: loan.lender || 'Ngân hàng',
                      principal: String(loan.principal || 0),
                      down_payment: String(loan.down_payment || 0),
                      interest_rate_percent: String(loan.interest_rate_percent || 8.5),
                      term_months: String(loan.term_months || 36),
                      start_date: loan.start_date ? loan.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
                      monthly_payment: String(loan.monthly_payment || ''),
                      payment_day: String(loan.payment_day || 15),
                      notes: loan.notes || '',
                    });
                    setOpenLoanModal(true);
                  }} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:opacity-90 transition shadow-sm">
                    ✏️ Điều chỉnh khoản vay
                  </button>
                  <button onClick={() => handleDeleteAssetLoan(loan.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition">
                    ❌ Xóa khoản vay
                  </button>
                </div>
              ) : (
                <button onClick={() => {
                  setEditingLoan(null);
                  setLoanForm({
                    lender: 'Ngân hàng Techcombank',
                    principal: String(asset.purchase_price ? Math.round(asset.purchase_price * 0.8) : 400000000),
                    down_payment: String(asset.purchase_price ? Math.round(asset.purchase_price * 0.2) : 100000000),
                    interest_rate_percent: '8.5',
                    term_months: '36',
                    start_date: new Date().toISOString().slice(0, 10),
                    monthly_payment: '',
                    payment_day: '15',
                    notes: '',
                  });
                  setOpenLoanModal(true);
                }} className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-md transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <Plus className="w-4 h-4" /><span>+ Thêm khoản vay cho xe này</span>
                </button>
              )}
            </div>

            {!loan ? (
              <div className="p-8 rounded-2xl text-center text-xs space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <CreditCard className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Phương tiện này chưa được cấu hình khoản vay</p>
                <p className="max-w-md mx-auto">Tạo khoản vay mua xe trả góp để theo dõi dư nợ giảm dần, tính toán bảng chia gốc lãi 2 giai đoạn và theo dõi từng tháng đóng tiền.</p>
                <button onClick={() => {
                  setEditingLoan(null);
                  setLoanForm({
                    lender: 'Ngân hàng Techcombank',
                    principal: String(asset.purchase_price ? Math.round(asset.purchase_price * 0.8) : 400000000),
                    down_payment: String(asset.purchase_price ? Math.round(asset.purchase_price * 0.2) : 100000000),
                    interest_rate_percent: '8.5',
                    term_months: '36',
                    start_date: new Date().toISOString().slice(0, 10),
                    monthly_payment: '',
                    payment_day: '15',
                    notes: '',
                  });
                  setOpenLoanModal(true);
                }} className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  + Tạo khoản vay ngay
                </button>
              </div>
            ) : (
              <>
                {/* Loan Overview Cards */}
                <div className="p-5 rounded-2xl space-y-4 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Ngân hàng cho vay', value: loan.lender, color: 'var(--accent-cyan)' },
                      { label: 'Số tiền gốc vay', value: `${fmt(loan.principal)} ₫`, color: 'var(--text-primary)' },
                      { label: 'Số tiền trả trước', value: `${fmt(loan.down_payment)} ₫`, color: 'var(--text-secondary)' },
                      { label: 'Tỷ lệ vay', value: asset.purchase_price > 0 ? `${((loan.principal / asset.purchase_price) * 100).toFixed(0)}% giá trị xe` : '—', color: 'var(--status-amber)' },
                      { label: 'Lãi suất ưu đãi', value: `${loan.preferred_rate_percent || loan.interest_rate_percent}%/năm (${loan.preferred_months || 12}T đầu)`, color: 'var(--status-green)' },
                      { label: 'Lãi thả nổi', value: `${loan.floating_rate_percent || loan.interest_rate_percent}%/năm`, color: 'var(--status-amber)' },
                      { label: 'Kỳ hạn vay', value: `${loan.term_months} tháng`, color: 'var(--text-secondary)' },
                      { label: 'Dư nợ còn lại', value: `${fmt(loan.current_balance)} ₫`, color: 'var(--status-red)' },
                    ].map((r, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.label}</p>
                        <p className="font-bold mt-0.5 text-xs" style={{ color: r.color }}>{r.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Loan Officer Call Card */}
                  {(loan.bank_contact_phone || loan.bank_hotline) && (
                    <div className="p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <span className="font-bold text-emerald-400">📞 Liên hệ Cán bộ tín dụng:</span>
                      <div className="flex flex-wrap gap-2">
                        {loan.bank_contact_phone && (
                          <a href={`tel:${loan.bank_contact_phone}`} className="px-3 py-1 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 hover:opacity-90">
                            <span>👤 {loan.bank_contact_name || 'Cán bộ'}: {loan.bank_contact_phone}</span>
                          </a>
                        )}
                        {loan.bank_hotline && (
                          <a href={`tel:${loan.bank_hotline}`} className="px-3 py-1 rounded-lg bg-slate-700 text-emerald-300 font-bold text-xs flex items-center gap-1 hover:opacity-90" style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
                            <span>☎️ Hotline {loan.lender}: {loan.bank_hotline}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Repayment Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold" style={{ color: 'var(--text-muted)' }}>
                      <span>Đã trả gốc: {fmt(loan.principal - loan.current_balance)} ₫ ({(((loan.principal - loan.current_balance) / loan.principal) * 100).toFixed(1)}%)</span>
                      <span>Dư nợ còn lại: {fmt(loan.current_balance)} ₫</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (((loan.principal - loan.current_balance) / loan.principal) * 100)))}%`, background: 'linear-gradient(90deg, #10B981, #0EA5E9)' }} />
                    </div>
                  </div>
                </div>

                {/* 📋 Monthly Repayment Schedule Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      📋 Lịch Trả Nợ Chi Tiết Dư Nợ Giảm Dần ({loan.term_months} tháng)
                    </h4>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Bấm <strong>"✓ Đã trả"</strong> để cập nhật tiến độ tự động</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                          {[
                            { key: 'payment_number', label: 'Kỳ #' },
                            { key: 'due_date', label: 'Hạn đóng' },
                            { key: 'principal_paid', label: 'Tiền gốc (₫)' },
                            { key: 'interest_paid', label: 'Tiền lãi (₫)' },
                            { key: 'total_payment', label: 'Tổng trả (₫)' },
                            { key: 'remaining_balance', label: 'Dư nợ còn (₫)' },
                            { key: 'status', label: 'Trạng thái' },
                          ].map(col => {
                            const isSorted = loanSortCol === col.key;
                            return (
                              <th
                                key={col.key}
                                onClick={() => {
                                  if (loanSortCol === col.key) {
                                    setLoanSortDir(p => p === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setLoanSortCol(col.key);
                                    setLoanSortDir('asc');
                                  }
                                }}
                                className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-emerald-400 transition"
                                style={{ color: isSorted ? 'var(--status-green)' : 'var(--text-muted)' }}
                              >
                                <div className="flex items-center space-x-1">
                                  <span>{col.label}</span>
                                  <span className="text-[9px]">{isSorted ? (loanSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                                </div>
                              </th>
                            );
                          })}
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedLoanSchedule.map((p: any, i: number) => (
                          <tr key={p.payment_number} style={{ borderBottom: '1px solid var(--border-subtle)', background: p.status === 'OVERDUE' ? 'rgba(248,113,113,0.05)' : i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                            <td className="px-3.5 py-2.5 font-bold" style={{ color: 'var(--text-muted)' }}>Kỳ {p.payment_number}</td>
                            <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.due_date)}</td>
                            <td className="px-3.5 py-2.5 font-mono font-medium text-emerald-400">{fmt(p.principal_paid)} ₫</td>
                            <td className="px-3.5 py-2.5 font-mono text-amber-400">{fmt(p.interest_paid)} ₫</td>
                            <td className="px-3.5 py-2.5 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(p.total_payment)} ₫</td>
                            <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-muted)' }}>{fmt(p.remaining_balance)} ₫</td>
                            <td className="px-3.5 py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                                background: p.status === 'PAID' ? 'rgba(52,211,153,0.15)' : p.status === 'OVERDUE' ? 'rgba(248,113,113,0.15)' : 'var(--bg-hover)',
                                color: p.status === 'PAID' ? 'var(--status-green)' : p.status === 'OVERDUE' ? 'var(--status-red)' : 'var(--text-muted)',
                              }}>
                                {p.status === 'PAID' ? '✓ Đã trả' : p.status === 'OVERDUE' ? '⚠ Quá hạn' : '⏳ Chưa trả'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => handleOpenEditPeriod(p)}
                                  className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/15 transition"
                                  title="Sửa chi tiết kỳ này (tiền lãi thực tế, gốc, ngày đến hạn...)"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => toggleAssetLoanPayment(p)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition hover:opacity-80"
                                  style={p.status === 'PAID'
                                    ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }
                                    : { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}
                                >
                                  {p.status === 'PAID' ? '↺ Chưa trả' : '✓ Đã trả'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ INSURANCE ═══ */}
        {activeTab === 'insurance' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Bảo hiểm &amp; Giấy tờ xe</h3>
              <button onClick={() => { setEditingInsurance(null); setInsForm({ type: 'Bảo hiểm vật chất', company: '', policy_number: '', start_date: '', expiry_date: '', annual_fee: '', coverage_amount: '', agent_name: '', agent_phone: '', provider_hotline: '', notes: '' }); setOpenModal('insurance'); }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm bảo hiểm</span>
              </button>
            </div>

            {/* Insurance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {insurances.map((ins) => {
                const daysLeft = Math.ceil((new Date(ins.expiry_date).getTime() - Date.now()) / 86400000);
                const sc = daysLeft < 0 ? 'var(--status-red)' : daysLeft <= 30 ? 'var(--status-amber)' : 'var(--status-green)';
                return (
                  <div key={ins.id} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{ins.type}</p>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${sc}22`, color: sc }}>
                          {daysLeft < 0 ? 'Hết hạn' : daysLeft <= 30 ? `Sắp hết (${daysLeft}d)` : 'CÒN HẠN'}
                        </span>
                        <button onClick={() => handleOpenEditInsurance(ins)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteInsurance(ins.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {([
                      ['Công ty', ins.company],
                      ['Số HĐ', ins.policy_number],
                      ['Hết hạn', new Date(ins.expiry_date).toLocaleDateString('vi-VN')],
                      ['Phí/năm', ins.annual_fee > 0 ? `${fmt(ins.annual_fee)} ₫` : '—'],
                      ['Bồi thường', ins.coverage_amount > 0 ? `${fmt(ins.coverage_amount)} ₫` : 'Theo HĐ'],
                    ] as [string, string][]).map(([k, v], i) => (
                      <div key={i} className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {insurances.length === 0 && (
                <div className="col-span-2 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Chưa có bảo hiểm — Nhấn "Thêm bảo hiểm" để thêm</p>
                </div>
              )}
            </div>

            {/* Registration & Specs */}
            <div className="p-4 rounded-xl space-y-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Đăng kiểm &amp; Giấy tờ xe</p>
                <button
                  onClick={() => {
                    setEditForm({
                      name: asset.name, brand: asset.brand, model: asset.model, year: String(asset.year || ''),
                      color: asset.color || '', license_plate: asset.license_plate || '',
                      vin: asset.vin || '', engine: asset.engine || '', fuel_type: asset.fuel_type || 'PETROL',
                      tank_capacity_liters: String(asset.tank_capacity_liters ?? ''),
                      battery_capacity_kwh: String(asset.battery_capacity_kwh ?? ''),
                      purchase_price: String(asset.purchase_price || ''), current_value: String(asset.current_value || ''),
                      purchase_date: asset.purchase_date || '', image_url: asset.image_url || '',
                      current_odometer_km: String(asset.current_odometer_km || 0),
                      status: asset.status || 'ACTIVE', description: asset.description || '',
                      sales_rep_name: asset.sales_rep_name || '',
                      sales_rep_phone: asset.sales_rep_phone || '',
                      brand_hotline: asset.brand_hotline || '',
                    });
                    setOpenModal('edit');
                  }}
                  className="text-xs font-semibold text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Cập nhật giấy tờ &amp; Đăng kiểm</span>
                </button>
              </div>
              {([
                ['Biển số xe', asset.license_plate || 'Chưa có'],
                ['Năm sản xuất', asset.year?.toString() || '—'],
                ['Loại phương tiện', asset.asset_type],
                ['Hạn đăng kiểm', asset.next_maintenance_due || '—'],
              ] as [string, string][]).map(([k, v], i) => (
                <div key={i} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ WARRANTY ═══ */}
        {activeTab === 'warranty' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Sổ Bảo Hành &amp; Sổ Claim Phụ Tùng</h3>
              <div className="flex items-center space-x-2">
                <button onClick={() => setOpenModal('claim')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold transition hover:opacity-90">
                  <Plus className="w-3.5 h-3.5" /><span>Tạo Yêu cầu Claim</span>
                </button>
                <button onClick={() => { setEditingWarranty(null); setWarrantyForm({ item_type: 'VEHICLE', item_name: 'Bảo hành chính hãng', provider: `${asset.brand} Việt Nam`, policy_number: '', start_date: asset.purchase_date || '', expiry_date: '', coverage_details: '3 năm / 100,000 km' }); setOpenModal('warranty'); }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold transition hover:opacity-90">
                  <Plus className="w-3.5 h-3.5" /><span>Thêm bảo hành</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Bảo hành Hãng xe / Phương tiện</p>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>CÒN HẠN</span>
                    <button onClick={() => { setEditForm({ name: asset.name, brand: asset.brand, model: asset.model, year: String(asset.year || ''), color: asset.color || '', license_plate: asset.license_plate || '', vin: asset.vin || '', engine: asset.engine || '', fuel_type: asset.fuel_type || 'PETROL', tank_capacity_liters: String(asset.tank_capacity_liters ?? ''), battery_capacity_kwh: String(asset.battery_capacity_kwh ?? ''), purchase_price: String(asset.purchase_price || ''), current_value: String(asset.current_value || ''), purchase_date: asset.purchase_date || '', image_url: asset.image_url || '', current_odometer_km: String(asset.current_odometer_km || 0), status: asset.status || 'ACTIVE', description: asset.description || '', sales_rep_name: asset.sales_rep_name || '', sales_rep_phone: asset.sales_rep_phone || '', brand_hotline: asset.brand_hotline || '' }); setOpenModal('edit'); }} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa thông số xe">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {[
                  ['Hạng mục', `${asset.brand} ${asset.model}`],
                  ['Đơn vị bảo hành', `${asset.brand} Việt Nam`],
                  ['Thời hạn', '3 năm / 100,000 km'],
                  ['Ngày bắt đầu', asset.purchase_date || '01/01/2026'],
                  ['Trạng thái', 'Đang áp dụng'],
                ].map(([k, v], i) => (
                  <div key={i} className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {warranties.map((w) => (
                <div key={w.id} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{w.item_name}</p>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>{w.status || 'ACTIVE'}</span>
                      <button onClick={() => handleOpenEditWarranty(w)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteWarranty(w.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {[
                    ['Nhà cung cấp', w.provider],
                    ['Số hợp đồng / Phiếu', w.policy_number || '—'],
                    ['Ngày bắt đầu', w.start_date ? w.start_date.slice(0, 10) : '—'],
                    ['Ngày hết hạn', w.expiry_date ? w.expiry_date.slice(0, 10) : 'Theo hãng'],
                    ['Chi tiết', w.coverage_details || 'Bảo hành chính hãng'],
                  ].map(([k, v], i) => (
                    <div key={i} className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Bảo hành Phụ tùng / Nâng cấp</p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>{parts.length} phụ tùng</span>
                </div>
                {parts.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex justify-between items-center py-1" style={{ borderBottom: i < parts.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{p.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{p.brand || 'Chính hãng'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--status-green)' }}>
                        {p.warranty_months ? `${p.warranty_months} tháng` : 'Theo hãng'}
                      </span>
                      <button onClick={() => handleOpenEditPart(p)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa phụ tùng">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phân tích TCO — Total Cost of Ownership</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              {[
                { label: 'Tổng chi phí vận hành', value: `${(totalExpenses / 1000000).toFixed(1)}M ₫`, color: 'var(--status-red)' },
                { label: 'Chi phí / km', value: `${costPerKm.toFixed(0)} ₫/km`, color: 'var(--accent-cyan)' },
                { label: 'Khấu hao', value: `${(depreciation / 1000000).toFixed(1)}M ₫`, color: 'var(--status-amber)' },
                { label: 'TCO toàn bộ', value: `${(totalTCO / 1000000).toFixed(0)}M ₫`, color: 'var(--status-purple)' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Hạng mục chi phí', 'Tổng chi tiêu', '% Tổng', 'TB/tháng'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Nhiên liệu (Xăng)', total: totalFuelCost, color: 'var(--status-amber)' },
                    { name: 'Bảo dưỡng định kỳ', total: totalMaintCost, color: 'var(--accent-cyan)' },
                    { name: 'Bảo hiểm', total: totalInsurance, color: 'var(--status-purple)' },
                    { name: 'Chi phí khác', total: totalExpenses - totalFuelCost - totalMaintCost - totalInsurance, color: 'var(--text-muted)' },
                  ].map((row, i) => {
                    const pct = totalExpenses > 0 ? ((row.total / totalExpenses) * 100).toFixed(1) : '0';
                    const months = 7; // approx months since purchase
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: row.color }} />
                          {row.name}
                        </td>
                        <td className="px-3 py-2.5 font-bold" style={{ color: row.color }}>{fmt(row.total)} ₫</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{pct}%</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(Math.round(row.total / months))} ₫</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}

      {/* Fuel Modal */}
      {openModal === 'edit' && (
        <Modal title="Sửa thông tin chi tiết phương tiện" onClose={() => setOpenModal(null)}>
          <Field label="Tên xe *"><input type="text" className="theme-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Hãng (Brand)"><input type="text" className="theme-input" value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))} /></Field>
          <Field label="Model"><input type="text" className="theme-input" value={editForm.model} onChange={e => setEditForm(p => ({ ...p, model: e.target.value }))} /></Field>
          <Field label="Năm sản xuất"><input type="number" className="theme-input" value={editForm.year} onChange={e => setEditForm(p => ({ ...p, year: e.target.value }))} /></Field>
          <Field label="Giá mua ban đầu (₫)"><input type="number" className="theme-input" placeholder="VD: 520000000" value={editForm.purchase_price} onChange={e => setEditForm(p => ({ ...p, purchase_price: e.target.value }))} /></Field>
          <Field label="Giá trị ước tính hiện tại (₫)"><input type="number" className="theme-input" placeholder="VD: 490000000" value={editForm.current_value} onChange={e => setEditForm(p => ({ ...p, current_value: e.target.value }))} /></Field>
          <Field label="Ngày mua"><input type="date" className="theme-input" value={editForm.purchase_date} onChange={e => setEditForm(p => ({ ...p, purchase_date: e.target.value }))} /></Field>
          <Field label="Biển số xe"><input type="text" className="theme-input" value={editForm.license_plate} onChange={e => setEditForm(p => ({ ...p, license_plate: e.target.value }))} /></Field>
          <Field label="Số khung / VIN"><input type="text" className="theme-input" value={editForm.vin} onChange={e => setEditForm(p => ({ ...p, vin: e.target.value }))} /></Field>
          <Field label="Số máy / Động cơ"><input type="text" className="theme-input" placeholder="VD: 1.5L SkyActiv" value={editForm.engine} onChange={e => setEditForm(p => ({ ...p, engine: e.target.value }))} /></Field>
          <Field label="Loại nhiên liệu">
            <select className="theme-select" value={editForm.fuel_type} onChange={e => setEditForm(p => ({ ...p, fuel_type: e.target.value }))}>
              <option value="PETROL">Xăng (Petrol)</option>
              <option value="DIESEL">Dầu (Diesel)</option>
              <option value="ELECTRIC">Điện (Electric)</option>
              <option value="HYBRID">Hybrid</option>
              <option value="HUMAN_POWER">Sức người (Xe đạp)</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dung tích bình (L)"><input type="number" className="theme-input" placeholder="VD: 45" value={editForm.tank_capacity_liters} onChange={e => setEditForm(p => ({ ...p, tank_capacity_liters: e.target.value }))} /></Field>
            <Field label="Dung lượng pin (kWh)"><input type="number" className="theme-input" placeholder="VD: 52" value={editForm.battery_capacity_kwh} onChange={e => setEditForm(p => ({ ...p, battery_capacity_kwh: e.target.value }))} /></Field>
          </div>
          <Field label="Màu sắc"><input type="text" className="theme-input" value={editForm.color} onChange={e => setEditForm(p => ({ ...p, color: e.target.value }))} /></Field>
          <Field label="Link ảnh phương tiện (URL)"><input type="text" className="theme-input" placeholder="https://..." value={editForm.image_url} onChange={e => setEditForm(p => ({ ...p, image_url: e.target.value }))} /></Field>
          <Field label="Odometer (km)"><input type="number" className="theme-input" value={editForm.current_odometer_km} onChange={e => setEditForm(p => ({ ...p, current_odometer_km: e.target.value }))} /></Field>
          <Field label="Trạng thái">
            <select className="theme-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
              {['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Mô tả ghi chú"><input type="text" className="theme-input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} /></Field>
          
          <div className="p-3 rounded-xl space-y-2 mt-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="font-bold text-[11px] uppercase text-cyan-400">📞 Danh bạ Cố vấn bán xe &amp; Hotline Hãng</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Tên đại diện/Sale xe"><input type="text" className="theme-input" placeholder="VD: Anh Nam Showroom" value={editForm.sales_rep_name} onChange={e => setEditForm(p => ({ ...p, sales_rep_name: e.target.value }))} /></Field>
              <Field label="SĐT Sale bán xe"><input type="tel" className="theme-input font-mono font-bold" placeholder="0912..." value={editForm.sales_rep_phone} onChange={e => setEditForm(p => ({ ...p, sales_rep_phone: e.target.value }))} /></Field>
            </div>
            <Field label="Số tổng đài cứu hộ Hãng xe"><input type="tel" className="theme-input font-mono" placeholder="VD: 1900 54 54 54" value={editForm.brand_hotline} onChange={e => setEditForm(p => ({ ...p, brand_hotline: e.target.value }))} /></Field>
          </div>

          <div className="flex space-x-2 pt-2">
            <button onClick={saveEdit} disabled={savingEdit} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">
              {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {openModal === 'fuel' && (
        <Modal title="Ghi nhận đổ nhiên liệu" onClose={() => setOpenModal(null)}>
          <Field label="Ngày đổ xăng"><input type="date" className="theme-input" value={fuelForm.date} onChange={e => setFuelForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Số lít (L)"><input type="number" className="theme-input" placeholder="VD: 35.0" value={fuelForm.liters} onChange={e => setFuelForm(p => ({ ...p, liters: e.target.value }))} /></Field>
          <Field label="Đơn giá (₫/L)"><input type="number" className="theme-input" placeholder="VD: 23100" value={fuelForm.price_per_liter} onChange={e => setFuelForm(p => ({ ...p, price_per_liter: e.target.value }))} /></Field>
          {fuelForm.liters && fuelForm.price_per_liter && (
            <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
              Tổng: {fmt(parseFloat(fuelForm.liters) * parseFloat(fuelForm.price_per_liter))} ₫
            </div>
          )}
          <Field label="Odometer (km)"><input type="number" className="theme-input" placeholder="VD: 12846" value={fuelForm.odometer_km} onChange={e => setFuelForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Cây xăng"><input type="text" className="theme-input" placeholder="VD: PV OIL Cầu Giấy" value={fuelForm.station} onChange={e => setFuelForm(p => ({ ...p, station: e.target.value }))} /></Field>
          <Field label="Ghi chú (tuỳ chọn)"><input type="text" className="theme-input" value={fuelForm.notes} onChange={e => setFuelForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveFuel} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Maintenance Modal */}
      {openModal === 'maintenance' && (
        <Modal title="Thêm đợt bảo dưỡng / Thay phụ tùng" onClose={() => setOpenModal(null)}>
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thực hiện *</label>
                <input type="date" className="theme-input" value={maintForm.date} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Odometer lúc BD (km)</label>
                <input type="number" className="theme-input" placeholder="12846" value={maintForm.odometer_km} onChange={e => setMaintForm(p => ({ ...p, odometer_km: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Gói / Loại bảo dưỡng chính</label>
                <select className="theme-select" value={maintForm.maintenance_type} onChange={e => setMaintForm(p => ({ ...p, maintenance_type: e.target.value }))}>
                  {categories.map((t: string) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Multi-Service Line Items Section */}
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--accent-cyan)' }}>
                  Chi tiết các hạng mục / Dịch vụ ({serviceItems.length})
                </span>
                <button type="button" onClick={addServiceItem} className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: 'var(--accent-cyan)' }}>
                  + Thêm dịch vụ
                </button>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Thêm nhanh:</span>
                {categories.slice(0, 6).map((cat, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setServiceItems(p => [...p, { name: cat, cost: '' }])}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold hover:opacity-80 transition"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  >
                    + {cat}
                  </button>
                ))}
              </div>

              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider px-1 pt-1" style={{ color: 'var(--text-muted)' }}>
                <div className="col-span-7">Tên Hạng Mục / Dịch Vụ Bảo Dưỡng *</div>
                <div className="col-span-4">Đơn Giá Nhập (₫) *</div>
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {serviceItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-7">
                        <select
                          className="theme-select text-xs font-semibold"
                          value={categories.includes(item.name) ? item.name : 'OTHER'}
                          onChange={e => {
                            const selected = e.target.value;
                            if (selected === 'OTHER') {
                              updateServiceItem(idx, 'name', '');
                            } else {
                              updateServiceItem(idx, 'name', selected);
                            }
                          }}
                        >
                          <option value="" disabled>-- Chọn dịch vụ từ Master Data --</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="OTHER">✍️ Tùy chọn khác (Nhập tay...)</option>
                        </select>

                        {(!categories.includes(item.name) || item.name === '') && (
                          <input
                            type="text"
                            className="theme-input text-xs mt-1.5"
                            placeholder="Nhập tên dịch vụ tùy chỉnh (VD: Thay xích, Cân vành...)"
                            value={item.name}
                            onChange={e => updateServiceItem(idx, 'name', e.target.value)}
                          />
                        )}
                      </div>

                      <div className="col-span-4">
                        <input
                          type="number"
                          className="theme-input font-mono font-bold text-xs"
                          placeholder="Điền giá thực tế (₫)"
                          value={item.cost}
                          onChange={e => updateServiceItem(idx, 'cost', e.target.value)}
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        {serviceItems.length > 1 && (
                          <button type="button" onClick={() => removeServiceItem(idx)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discount & Net Total */}
              <div className="p-3 rounded-xl space-y-2 mt-2" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-bold text-amber-400">🎁 Giảm giá / Chiết khấu (₫):</label>
                  <input
                    type="number"
                    className="theme-input font-mono font-bold text-xs text-amber-400"
                    style={{ width: '150px' }}
                    placeholder="0"
                    value={maintForm.discount}
                    onChange={e => setMaintForm(p => ({ ...p, discount: e.target.value }))}
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t font-bold text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tổng thanh toán thực tế:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    {fmt(Math.max(0, (calculatedItemsCost > 0 ? calculatedItemsCost : (parseFloat(maintForm.cost) || 0)) - (parseFloat(maintForm.discount) || 0)))} ₫
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Garage / Đại lý</label>
                <input type="text" className="theme-input" placeholder="VD: Honda Tây Hồ, Garage Hà Đông" value={maintForm.vendor} onChange={e => setMaintForm(p => ({ ...p, vendor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ tiếp theo (km)</label>
                <input type="number" className="theme-input" placeholder="17846" value={maintForm.next_due_km} onChange={e => setMaintForm(p => ({ ...p, next_due_km: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ghi chú thêm</label>
              <input type="text" className="theme-input" placeholder="Ghi chú thêm..." value={maintForm.notes} onChange={e => setMaintForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex space-x-2 pt-2">
              <button onClick={saveMaint} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                Lưu đợt bảo dưỡng
              </button>
              <button onClick={() => setOpenModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Expense Modal */}
      {openModal === 'expense' && (
        <Modal title={editingExp ? 'Chỉnh sửa chi phí phát sinh' : 'Thêm chi phí phát sinh'} onClose={() => { setOpenModal(null); setEditingExp(null); }}>
          <Field label="Ngày"><input type="date" className="theme-input" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} /></Field>
          
          <Field label="Danh mục chính (Category)">
            <select
              className="theme-select font-semibold"
              value={expForm.category}
              onChange={e => {
                const newCat = e.target.value;
                const firstSub = Object.keys(taxMap[newCat]?.subcategories || {})[0] || 'Fuel';
                setExpForm(p => ({ ...p, category: newCat, subcategory: firstSub }));
              }}
            >
              {Object.entries(taxMap).map(([catKey, catVal]) => (
                <option key={catKey} value={catKey}>{catVal.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Danh mục con (SubCategory)">
            <select
              className="theme-select"
              value={expForm.subcategory}
              onChange={e => setExpForm(p => ({ ...p, subcategory: e.target.value }))}
            >
              {Object.entries(taxMap[expForm.category]?.subcategories || { Other: 'Khác' }).map(([subKey, subLabel]) => (
                <option key={subKey} value={subKey}>{subLabel} ({subKey})</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Số tiền gốc (₫)"><input type="number" className="theme-input font-mono font-bold" placeholder="VD: 808500" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} /></Field>
            <Field label="🎁 Giảm giá / Chiết khấu (₫)"><input type="number" className="theme-input font-mono font-bold text-amber-400" placeholder="0" value={expForm.discount} onChange={e => setExpForm(p => ({ ...p, discount: e.target.value }))} /></Field>
          </div>
          {parseFloat(expForm.discount) > 0 && (
            <div className="p-2 rounded-xl text-xs flex justify-between items-center font-bold" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Thực chi sau giảm:</span>
              <span className="font-mono text-emerald-400 text-sm">
                {fmt(Math.max(0, (parseFloat(expForm.amount) || 0) - (parseFloat(expForm.discount) || 0)))} ₫
              </span>
            </div>
          )}
          <Field label="Nhà cung cấp / Địa điểm"><input type="text" className="theme-input" value={expForm.vendor} onChange={e => setExpForm(p => ({ ...p, vendor: e.target.value }))} /></Field>
          <Field label="Odometer (km - tuỳ chọn)"><input type="number" className="theme-input font-mono" value={expForm.odometer_km} onChange={e => setExpForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Mô tả"><input type="text" className="theme-input" placeholder="Mô tả ngắn gọn..." value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveExpense} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">
              {editingExp ? 'Cập nhật chi phí' : 'Lưu chi phí'}
            </button>
            <button onClick={() => { setOpenModal(null); setEditingExp(null); }} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Odometer Log Modal */}
      {openModal === 'odolog' && (
        <Modal title={editingOdoLog ? 'Chỉnh sửa mốc Odometer' : 'Ghi nhận mốc Odometer mới'} onClose={() => { setOpenModal(null); setEditingOdoLog(null); }}>
          <Field label="Ngày ghi nhận"><input type="date" className="theme-input" value={odoLogForm.date} onChange={e => setOdoLogForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Mốc Odometer (km)"><input type="number" className="theme-input font-mono font-bold" placeholder="VD: 2651" value={odoLogForm.odometer_km} onChange={e => setOdoLogForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Ghi chú chuyến đi / Sự kiện"><input type="text" className="theme-input" placeholder="VD: Xem nhà thầy tiếng Anh ở Bắc Đầm Vạc, Nhận xe..." value={odoLogForm.note} onChange={e => setOdoLogForm(p => ({ ...p, note: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveOdoLog} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">
              {editingOdoLog ? 'Cập nhật' : 'Lưu mốc Odometer'}
            </button>
            <button onClick={() => { setOpenModal(null); setEditingOdoLog(null); }} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Trip Modal */}
      {openModal === 'trip' && (
        <Modal title="Ghi nhận chuyến đi thủ công" onClose={() => setOpenModal(null)}>
          <Field label="Điểm xuất phát"><input type="text" className="theme-input" value={tripForm.start_location} onChange={e => setTripForm(p => ({ ...p, start_location: e.target.value }))} /></Field>
          <Field label="Điểm đến"><input type="text" className="theme-input" value={tripForm.end_location} onChange={e => setTripForm(p => ({ ...p, end_location: e.target.value }))} /></Field>
          <Field label="Thời gian khởi hành"><input type="datetime-local" className="theme-input" value={tripForm.start_time} onChange={e => setTripForm(p => ({ ...p, start_time: e.target.value }))} /></Field>
          <Field label="Thời gian kết thúc"><input type="datetime-local" className="theme-input" value={tripForm.end_time} onChange={e => setTripForm(p => ({ ...p, end_time: e.target.value }))} /></Field>
          <Field label="Quãng đường (km)"><input type="number" className="theme-input" value={tripForm.distance_km} onChange={e => setTripForm(p => ({ ...p, distance_km: e.target.value }))} /></Field>
          <Field label="Xăng tiêu thụ (L, tuỳ chọn)"><input type="number" className="theme-input" value={tripForm.fuel_used_liters} onChange={e => setTripForm(p => ({ ...p, fuel_used_liters: e.target.value }))} /></Field>
          <Field label="Vận tốc TB (km/h)"><input type="number" className="theme-input" value={tripForm.average_speed_kmh} onChange={e => setTripForm(p => ({ ...p, average_speed_kmh: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveTrip} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Part Modal */}
      {openModal === 'part' && (
        <Modal title="Thêm phụ tùng / Nâng cấp" onClose={() => setOpenModal(null)}>
          <Field label="Tên phụ tùng / Nâng cấp"><input type="text" className="theme-input" value={partForm.name} onChange={e => setPartForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Thương hiệu"><input type="text" className="theme-input" value={partForm.brand} onChange={e => setPartForm(p => ({ ...p, brand: e.target.value }))} /></Field>
          <Field label="Loại">
            <select className="theme-select" value={partForm.category} onChange={e => setPartForm(p => ({ ...p, category: e.target.value }))}>
              {['Điện tử', 'Camera', 'Lốp xe', 'Phanh', 'Động cơ', 'Ngoại thất', 'Nội thất', 'Bảo vệ sơn', 'Âm thanh', 'Khác'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Ngày lắp đặt"><input type="date" className="theme-input" value={partForm.install_date} onChange={e => setPartForm(p => ({ ...p, install_date: e.target.value }))} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Chi phí gốc (₫)"><input type="number" className="theme-input font-mono font-bold" placeholder="VD: 1500000" value={partForm.cost} onChange={e => setPartForm(p => ({ ...p, cost: e.target.value }))} /></Field>
            <Field label="🎁 Giảm giá / Chiết khấu (₫)"><input type="number" className="theme-input font-mono font-bold text-amber-400" placeholder="0" value={partForm.discount} onChange={e => setPartForm(p => ({ ...p, discount: e.target.value }))} /></Field>
          </div>
          {parseFloat(partForm.discount) > 0 && (
            <div className="p-2 rounded-xl text-xs flex justify-between items-center font-bold" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Thực chi sau giảm:</span>
              <span className="font-mono text-emerald-400 text-sm">
                {fmt(Math.max(0, (parseFloat(partForm.cost) || 0) - (parseFloat(partForm.discount) || 0)))} ₫
              </span>
            </div>
          )}
          <Field label="Odometer lúc lắp (km)"><input type="number" className="theme-input" value={partForm.odometer_km} onChange={e => setPartForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Bảo hành (tháng)"><input type="number" className="theme-input" value={partForm.warranty_months} onChange={e => setPartForm(p => ({ ...p, warranty_months: e.target.value }))} /></Field>
          <Field label="Ghi chú"><input type="text" className="theme-input" value={partForm.notes} onChange={e => setPartForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={savePart} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Insurance Modal */}
      {openModal === 'insurance' && (
        <Modal title={editingInsurance ? 'Chỉnh sửa hợp đồng bảo hiểm' : 'Thêm thông tin bảo hiểm'} onClose={() => { setOpenModal(null); setEditingInsurance(null); }}>
          <div className="space-y-4">
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">1. Thông tin hợp đồng bảo hiểm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Loại bảo hiểm *</label>
                  <select className="theme-select font-semibold" value={insForm.type} onChange={e => setInsForm(p => ({ ...p, type: e.target.value }))}>
                    {['Bảo hiểm vật chất', 'Bảo hiểm TNDS bắt buộc', 'Bảo hiểm thân vỏ', 'Bảo hiểm ngập nước/thủy kích', 'Khác'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Công ty / Nhà bảo hiểm *</label>
                  <input type="text" className="theme-input" placeholder="VD: Bảo hiểm Quân Đội (MIC), Bảo Việt, PJICO..." value={insForm.company} onChange={e => setInsForm(p => ({ ...p, company: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số hợp đồng / Giấy chứng nhận BH</label>
                  <input type="text" className="theme-input" placeholder="VD: BV-2026-12345" value={insForm.policy_number} onChange={e => setInsForm(p => ({ ...p, policy_number: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày bắt đầu hiệu lực</label>
                  <input type="date" className="theme-input" value={insForm.start_date} onChange={e => setInsForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn *</label>
                  <input type="date" className="theme-input" value={insForm.expiry_date} onChange={e => setInsForm(p => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">2. Chi phí &amp; Quyền lợi bồi thường</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Phí hàng năm (₫)</label>
                  <input type="number" className="theme-input font-mono font-bold text-cyan-400" placeholder="VD: 6500000" value={insForm.annual_fee} onChange={e => setInsForm(p => ({ ...p, annual_fee: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Mức bồi thường tối đa (₫)</label>
                  <input type="number" className="theme-input font-mono font-bold text-emerald-400" placeholder="VD: 500000000" value={insForm.coverage_amount} onChange={e => setInsForm(p => ({ ...p, coverage_amount: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">3. Đại lý phụ trách &amp; Hotline cứu hộ</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Tên cán bộ / Đại lý BH</label>
                  <input type="text" className="theme-input" placeholder="VD: Chị Mai Bảo Việt" value={insForm.agent_name} onChange={e => setInsForm(p => ({ ...p, agent_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>SĐT cán bộ BH</label>
                  <input type="tel" className="theme-input font-mono font-bold text-cyan-400" placeholder="0988..." value={insForm.agent_phone} onChange={e => setInsForm(p => ({ ...p, agent_phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Hotline bồi thường / Cứu hộ 24/7</label>
                  <input type="tel" className="theme-input font-mono" placeholder="VD: 1900 55 88 99" value={insForm.provider_hotline} onChange={e => setInsForm(p => ({ ...p, provider_hotline: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-3 border-t mt-4 sticky bottom-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            <button onClick={saveInsurance} className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:opacity-90 shadow-md transition">
              {editingInsurance ? 'Cập nhật bảo hiểm' : 'Lưu bảo hiểm'}
            </button>
            <button onClick={() => { setOpenModal(null); setEditingInsurance(null); }} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Warranty Modal */}
      {openModal === 'warranty' && (
        <Modal title={editingWarranty ? 'Chỉnh sửa sổ bảo hành' : 'Thêm sổ bảo hành mới'} onClose={() => { setOpenModal(null); setEditingWarranty(null); }}>
          <div className="space-y-4">
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">1. Thông tin bảo hành</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Loại hạng mục *</label>
                  <select className="theme-select font-semibold" value={warrantyForm.item_type} onChange={e => setWarrantyForm(p => ({ ...p, item_type: e.target.value }))}>
                    <option value="VEHICLE">Toàn xe / Chính hãng</option>
                    <option value="BATTERY">Pin &amp; Động cơ</option>
                    <option value="PART">Phụ tùng / Phụ kiện</option>
                    <option value="COATING">Sơn &amp; Phim cách nhiệt</option>
                    <option value="TIRE">Lốp &amp; La-zăng</option>
                    <option value="OTHER">Hạng mục khác</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Tên hạng mục *</label>
                  <input type="text" className="theme-input" placeholder="VD: Bảo hành chính hãng Thaco, Phim 3M Crystalline..." value={warrantyForm.item_name} onChange={e => setWarrantyForm(p => ({ ...p, item_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Nhà cung cấp / Đại lý</label>
                  <input type="text" className="theme-input" placeholder="VD: Mazda Lê Văn Lương, 3M Auto..." value={warrantyForm.provider} onChange={e => setWarrantyForm(p => ({ ...p, provider: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số sổ BH / Mã kích hoạt điện tử</label>
                  <input type="text" className="theme-input" placeholder="VD: EW-2026-9988" value={warrantyForm.policy_number} onChange={e => setWarrantyForm(p => ({ ...p, policy_number: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">2. Thời hạn &amp; Điều khoản bảo hành</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày bắt đầu hiệu lực</label>
                  <input type="date" className="theme-input" value={warrantyForm.start_date} onChange={e => setWarrantyForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn bảo hành *</label>
                  <input type="date" className="theme-input" value={warrantyForm.expiry_date} onChange={e => setWarrantyForm(p => ({ ...p, expiry_date: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Phạm vi &amp; Điều khoản cam kết</label>
                  <textarea rows={2} className="theme-input" placeholder="VD: 5 năm hoặc 150.000 km tùy điều kiện nào đến trước, miễn phí công sửa chữa..." value={warrantyForm.coverage_details} onChange={e => setWarrantyForm(p => ({ ...p, coverage_details: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-3 border-t mt-4 sticky bottom-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            <button onClick={saveWarranty} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:opacity-90 shadow-md transition">
              {editingWarranty ? 'Cập nhật sổ bảo hành' : 'Lưu sổ bảo hành'}
            </button>
            <button onClick={() => { setOpenModal(null); setEditingWarranty(null); }} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Claim Modal */}
      {openModal === 'claim' && (
        <Modal title="Tạo yêu cầu Claim Bảo hành" onClose={() => setOpenModal(null)}>
          <div className="space-y-3">
            <Field label="Hạng mục / Phụ tùng yêu cầu claim *">
              <input type="text" className="theme-input" placeholder="VD: Cảm biến lùi kêu bất thường, Hỏng mô tơ gập gương..." value={claimForm.item_name} onChange={e => setClaimForm(p => ({ ...p, item_name: e.target.value }))} />
            </Field>
            <Field label="Garage / Đại lý tiếp nhận">
              <input type="text" className="theme-input" placeholder="VD: Mazda Cầu Giấy" value={claimForm.vendor} onChange={e => setClaimForm(p => ({ ...p, vendor: e.target.value }))} />
            </Field>
            <Field label="Số tiền ước tính yêu cầu claim (₫)">
              <input type="number" className="theme-input font-mono font-bold text-amber-400" placeholder="0 nếu bảo hành 100%" value={claimForm.amount_claimed} onChange={e => setClaimForm(p => ({ ...p, amount_claimed: e.target.value }))} />
            </Field>
            <Field label="Mô tả hiện tượng &amp; Lý do claim *">
              <textarea rows={3} className="theme-input" placeholder="Mô tả chi tiết hiện tượng lỗi để theo dõi giải quyết..." value={claimForm.description} onChange={e => setClaimForm(p => ({ ...p, description: e.target.value }))} />
            </Field>
            <div className="flex space-x-2 pt-2">
              <button onClick={saveClaim} className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:opacity-90 shadow-md transition">
                Gửi yêu cầu claim
              </button>
              <button onClick={() => setOpenModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Loan Modal */}
      {openLoanModal && (
        <Modal title={editingLoan ? '✏️ Chỉnh sửa thông tin khoản vay' : '🏦 Thêm khoản vay mua xe mới'} onClose={() => setOpenLoanModal(false)}>
          <Field label="Tổ chức tín dụng / Ngân hàng *">
            <input type="text" className="theme-input" placeholder="VD: Techcombank, VPBank..." value={loanForm.lender} onChange={e => setLoanForm(p => ({ ...p, lender: e.target.value }))} />
          </Field>
          <Field label="Ghi chú / Tên hợp đồng">
            <input type="text" className="theme-input" placeholder="VD: Khoản vay trả góp 3 năm" value={loanForm.notes} onChange={e => setLoanForm(p => ({ ...p, notes: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số tiền gốc vay (₫) *">
              <input type="number" className="theme-input font-mono font-bold" placeholder="400000000" value={loanForm.principal} onChange={e => setLoanForm(p => ({ ...p, principal: e.target.value }))} />
            </Field>
            <Field label="Số tiền trả trước (₫)">
              <input type="number" className="theme-input font-mono" placeholder="100000000" value={loanForm.down_payment} onChange={e => setLoanForm(p => ({ ...p, down_payment: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Lãi suất (%/năm) *">
              <input type="number" step="0.1" className="theme-input font-mono" placeholder="8.5" value={loanForm.interest_rate_percent} onChange={e => setLoanForm(p => ({ ...p, interest_rate_percent: e.target.value }))} />
            </Field>
            <Field label="Kỳ hạn (tháng) *">
              <input type="number" className="theme-input font-mono" placeholder="36" value={loanForm.term_months} onChange={e => setLoanForm(p => ({ ...p, term_months: e.target.value }))} />
            </Field>
            <Field label="Hạn đóng (ngày)">
              <input type="number" min="1" max="31" className="theme-input font-mono" placeholder="15" value={loanForm.payment_day} onChange={e => setLoanForm(p => ({ ...p, payment_day: e.target.value }))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày bắt đầu vay *">
              <input type="date" className="theme-input" value={loanForm.start_date} onChange={e => setLoanForm(p => ({ ...p, start_date: e.target.value }))} />
            </Field>
            <Field label="Trả hàng tháng (₫)">
              <input type="number" className="theme-input font-mono font-bold" placeholder="Tự động tính" value={loanForm.monthly_payment} onChange={e => setLoanForm(p => ({ ...p, monthly_payment: e.target.value }))} />
            </Field>
          </div>
          <div className="flex space-x-2 pt-2">
            <button onClick={handleSaveAssetLoan} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:opacity-90 transition shadow-md">
              {editingLoan ? 'Cập nhật khoản vay' : 'Lưu khoản vay mới'}
            </button>
            <button onClick={() => setOpenLoanModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Edit Single Period Payment Modal */}
      {openEditPeriodModal && editingPeriod && (
        <DraggableModal isOpen={true} onClose={() => setOpenEditPeriodModal(false)}>
<div
              className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-lg flex flex-col shadow-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(88vh, 640px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>✏️ Chỉnh Sửa Kỳ Trả Góp #{periodForm.payment_number}</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cập nhật số tiền gốc, lãi thực tế theo thông báo ngân hàng</p>
                </div>
                <button onClick={() => setOpenEditPeriodModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl text-xs space-y-1" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                  <p className="font-bold text-cyan-400">ℹ️ Lưu ý ngân hàng tính theo ngày làm việc thực tế</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Số tiền lãi và hạn đóng từng tháng có thể lệch nhẹ so với dự kiến. Bạn hãy nhập chính xác số tiền theo sao kê ngân hàng.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Hạn thanh toán *</label>
                    <input
                      type="date"
                      className="theme-input font-mono"
                      value={periodForm.due_date}
                      onChange={e => setPeriodForm(p => ({ ...p, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Trạng thái thanh toán *</label>
                    <select
                      className="theme-select font-bold"
                      value={periodForm.status}
                      onChange={e => setPeriodForm(p => ({ ...p, status: e.target.value as any }))}
                    >
                      <option value="PENDING">⏳ Chưa thanh toán (Pending)</option>
                      <option value="PAID">✓ Đã thanh toán (Paid)</option>
                      <option value="OVERDUE">⚠ Quá hạn (Overdue)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Chi tiết số tiền kỳ này</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tiền gốc thực tế (₫) *</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-emerald-400"
                        value={periodForm.principal_paid}
                        onChange={e => {
                          const val = e.target.value;
                          setPeriodForm(p => {
                            const newP = parseFloat(val) || 0;
                            const intr = parseFloat(p.interest_paid) || 0;
                            return { ...p, principal_paid: val, total_payment: String(newP + intr) };
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tiền lãi thực tế (₫) *</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-amber-400"
                        value={periodForm.interest_paid}
                        onChange={e => {
                          const val = e.target.value;
                          setPeriodForm(p => {
                            const newI = parseFloat(val) || 0;
                            const princ = parseFloat(p.principal_paid) || 0;
                            return { ...p, interest_paid: val, total_payment: String(princ + newI) };
                          });
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tổng tiền thanh toán kỳ này (₫)</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-cyan-400"
                        value={periodForm.total_payment}
                        onChange={e => setPeriodForm(p => ({ ...p, total_payment: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {periodForm.status === 'PAID' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thanh toán thực tế</label>
                    <input
                      type="date"
                      className="theme-input font-mono"
                      value={periodForm.paid_date}
                      onChange={e => setPeriodForm(p => ({ ...p, paid_date: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <button
                  onClick={handleSavePeriod}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  Lưu kỳ thanh toán
                </button>
                <button
                  onClick={() => setOpenEditPeriodModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  Hủy
                </button>
              </div>
            
</div>
</DraggableModal>

      )}
    </div>
  );
}

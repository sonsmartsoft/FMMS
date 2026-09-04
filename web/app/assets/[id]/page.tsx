'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, BarChart, AreaChart, PieChart, Pie, Cell,
} from 'recharts';


import { useParams, useRouter } from 'next/navigation';
import { Asset, ExpenseRecord, MaintenanceRecord, TripRecord, LoanRecord, TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import { FuelLog, getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog } from '@/lib/services/fuelService';
import { getAsset, getAssets, updateAsset } from '@/lib/services/assetService';
import { getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord } from '@/lib/services/maintenanceService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getTrips, createTrip } from '@/lib/services/tripService';
import { getParts, createPart, updatePart, deletePart } from '@/lib/services/partService';
import { getInsurancePolicies, createInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy, InsuranceRow } from '@/lib/services/insuranceService';
import { getLoadByAsset, cleanupDuplicateLoanExpenses } from '@/lib/services/loanService';

import { createOdometerAdjustment, getOdometerLogs, createOdometerLog, updateOdometerLog, deleteOdometerLog, OdometerLogRecord } from '@/lib/services/odometerService';
import { getDailySummaries, DailySummary } from '@/lib/services/analyticsService';
import { getWarranties, createWarranty, updateWarranty, deleteWarranty, createWarrantyClaim } from '@/lib/services/warrantyService';

import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/lib/theme/ThemeContext';
import { VehicleFinanceOverview } from '@/components/assets/VehicleFinanceOverview';
import DraggableModal from '@/components/ui/DraggableModal';
import AdminSecurityPinModal from '@/components/security/AdminSecurityPinModal';

import {
  ArrowLeft, Gauge, Fuel, Wrench, DollarSign, FileText, BarChart3,
  Cpu, CheckCircle2, Plus, MapPin, Activity, Layers, Car, X, Pencil,
  Zap, Clock, TrendingDown, Shield, CreditCard, Award, Trash2, Edit2,
  SlidersHorizontal, Calendar, CalendarDays, CalendarRange, Search, Filter,
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
    <DraggableModal isOpen={true} onClose={() => onClose}>
<div
        className={`rounded-2xl w-[90vw] sm:w-[600px] ${maxWidth} my-auto flex flex-col shadow-2xl overflow-hidden`}
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
</DraggableModal>

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

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

  const [asset, setAsset] = useState<Asset | null>(null);

  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Local state for each data list ── */
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
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
  const [docsForm, setDocsForm] = useState({
    license_plate: '',
    vin: '',
    engine: '',
    registration_date: '',
    next_maintenance_due: '',
    notes: '',
  });
  const [hideRestDays, setHideRestDays] = useState(true);
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; title?: string; description?: string; actionName?: string; onConfirm?: () => void }>({ isOpen: false });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

        await cleanupDuplicateLoanExpenses();
        const [f, m, e, t, p, i, l, odo, w, ds] = await Promise.all([
          getFuelLogs(assetId),
          getMaintenanceRecords(assetId),
          getExpenses(assetId),
          getTrips(assetId),
          getParts(assetId),
          getInsurancePolicies(assetId),
          getLoadByAsset(assetId),
          getOdometerLogs(assetId),
          getWarranties(assetId),
          getDailySummaries(assetId).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setFuelLogs(f);
        setMaintenance(m);
        setExpenses(e);
        setTrips(t);
        if (ds?.data) setDailySummaries(ds.data);
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
            agent_name: r.agent_name,
            agent_phone: r.agent_phone,
            provider_hotline: r.provider_hotline,
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

    // Fetch most recent telemetry sample on initial load
    (async () => {
      try {
        const { data } = await sb
          .from('telemetry_samples')
          .select('*')
          .eq('asset_id', assetId)
          .order('timestamp', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          const r = data[0];
          setLive({
            speed: r.speed_kmh != null ? Number(r.speed_kmh) : null,
            rpm: r.rpm != null ? Number(r.rpm) : null,
            coolant: r.coolant_temp_c != null ? Number(r.coolant_temp_c) : null,
            voltage: r.battery_voltage != null ? Number(r.battery_voltage) : null,
          });
        }
      } catch {}
    })();

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

  const handleDeleteAssetLoan = (loanId: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Khoản Vay (Admin PIN)',
      description: 'CẢNH BÁO: Toàn bộ cấu hình khoản vay, bảng phân bổ các kỳ và các chi phí liên quan đến khoản vay của xe này sẽ bị xóa vĩnh viễn. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xóa vĩnh viễn khoản vay',
      onConfirm: async () => {
        try {
          const { deleteLoanWithCascade } = await import('@/lib/services/loanService');
          await deleteLoanWithCascade(loanId);
          setLoan(null);
          setLoanPayments([]);
          const refreshedExps = await getExpenses(assetId);
          setExpenses(refreshedExps);
          showToast('✅ Đã xóa khoản vay thành công');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
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
    const paidDate = periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : '';

    try {
      const { createLoanPayment, updateLoanPayment, updateLoan, syncLoanPaymentExpense, getLoanPayments, getLoadByAsset } = await import('@/lib/services/loanService');
      const existing = loanPayments.find(pm => pm.payment_number === editingPeriod.payment_number);
      if (existing) {
        await updateLoanPayment(existing.id, {
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? paidDate : undefined,
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
          paid_date: periodForm.status === 'PAID' ? paidDate : undefined,
          status: periodForm.status,
          remaining_balance: editingPeriod.remaining_balance || 0,
        });
      }

      // Synchronize exact expense records
      await syncLoanPaymentExpense({
        loan,
        paymentNumber: editingPeriod.payment_number,
        status: periodForm.status,
        principalPaid: princ,
        interestPaid: intr,
        paidDate: paidDate || new Date().toISOString().slice(0, 10),
      });

      // Recalculate remaining loan balance
      const updatedPayments = await getLoanPayments(loan.id);
      const totalPaidPrincipal = updatedPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.principal_paid || 0), 0);
      await updateLoan(loan.id, { current_balance: Math.max(0, loan.principal - totalPaidPrincipal) });

      const newL = await getLoadByAsset(assetId);
      setLoan(newL ? { ...newL } as LoanRecord : null);
      if (newL) setLoanPayments(await getLoanPayments(newL.id));
      const refreshedExps = await getExpenses(assetId);
      setExpenses(refreshedExps);

      setOpenEditPeriodModal(false);
      setEditingPeriod(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật kỳ thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const toggleAssetLoanPayment = async (item: any) => {
    if (!loan) return;
    try {
      const { createLoanPayment, updateLoanPayment, updateLoan, syncLoanPaymentExpense, getLoanPayments, getLoadByAsset } = await import('@/lib/services/loanService');
      const periodNum = item.payment_number;
      const princ = item.principal_paid || 0;
      const intr = item.interest_paid || 0;

      if (item.status === 'PAID') {
        // Switch from PAID -> PENDING (Unpaid)
        const match = loanPayments.find(p => p.payment_number === periodNum);
        if (match) {
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
        }
        // Dọn sạch chi phí của kỳ này trong bảng expenses
        await syncLoanPaymentExpense({
          loan,
          paymentNumber: periodNum,
          status: 'PENDING',
          principalPaid: 0,
          interestPaid: 0,
          paidDate: '',
        });
      } else {
        // Switch from PENDING -> PAID
        const paidDateStr = new Date().toISOString().slice(0, 10);
        const match = loanPayments.find(p => p.payment_number === periodNum);
        if (match) {
          await updateLoanPayment(match.id, {
            status: 'PAID',
            paid_date: paidDateStr,
            principal_paid: princ,
            interest_paid: intr,
            total_payment: item.total_payment,
          });
        } else {
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
        }
        // Đồng bộ chi phí: tạo hoặc cập nhật đúng 1 bản ghi gốc và 1 bản ghi lãi
        await syncLoanPaymentExpense({
          loan,
          paymentNumber: periodNum,
          status: 'PAID',
          principalPaid: princ,
          interestPaid: intr,
          paidDate: paidDateStr,
        });
      }

      // Recalculate remaining loan balance
      const updatedPayments = await getLoanPayments(loan.id);
      const totalPaidPrincipal = updatedPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.principal_paid || 0), 0);
      await updateLoan(loan.id, { current_balance: Math.max(0, loan.principal - totalPaidPrincipal) });

      const newL = await getLoadByAsset(assetId);
      setLoan(newL ? { ...newL } as LoanRecord : null);
      if (newL) setLoanPayments(await getLoanPayments(newL.id));
      const refreshedExps = await getExpenses(assetId);
      setExpenses(refreshedExps);
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
  const [tabExpSearch, setTabExpSearch] = useState<string>('');
  const [hiddenExpKeys, setHiddenExpKeys] = useState<string[]>([]);
  const [expSortCol, setExpSortCol] = useState<string>('date');
  const [expSortDir, setExpSortDir] = useState<'asc' | 'desc'>('desc');
  const [fuelSortCol, setFuelSortCol] = useState<string>('date');
  const [fuelSortDir, setFuelSortDir] = useState<'asc' | 'desc'>('desc');
  const [partSortCol, setPartSortCol] = useState<string>('install_date');
  const [partSortDir, setPartSortDir] = useState<'asc' | 'desc'>('desc');
  const [maintSortCol, setMaintSortCol] = useState<string>('date');
  const [maintSortDir, setMaintSortDir] = useState<'asc' | 'desc'>('desc');
  const [tcoDrillDown, setTcoDrillDown] = useState<{
    title: string;
    color: string;
    items: { date: string; description: string; vendor?: string; amount: number; odo?: number }[];
  } | null>(null);
  const [loanSortCol, setLoanSortCol] = useState<string>('payment_number');
  const [loanSortDir, setLoanSortDir] = useState<'asc' | 'desc'>('asc');
  const [tripSortCol, setTripSortCol] = useState<string>('start_time');
  const [tripSortDir, setTripSortDir] = useState<'asc' | 'desc'>('desc');
  const [dailySortCol, setDailySortCol] = useState<string>('date');
  const [dailySortDir, setDailySortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpKey = (key: string) => {
    setHiddenExpKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toLocalDateString = (isoOrDateStr?: string) => {

    if (!isoOrDateStr) return new Date().toISOString().slice(0, 10);
    try {
      const d = new Date(isoOrDateStr);
      if (isNaN(d.getTime())) return isoOrDateStr.slice(0, 10);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return isoOrDateStr.slice(0, 10);
    }
  };

  const nowD = new Date();
  const todayLocalDate = toLocalDateString(nowD.toISOString());
  const currentMonthStart = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-01`;
  const currentMonthEnd = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const prevMonthDate = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
  const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
  const prevMonthEnd = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const thisYearStart = `${nowD.getFullYear()}-01-01`;
  const thisYearEnd = `${nowD.getFullYear()}-12-31`;

  const purchaseDateStr = asset?.purchase_date ? asset.purchase_date.slice(0, 10) : '';
  let purchaseLabel = 'Tất cả thời gian';
  if (purchaseDateStr) {
    const pDate = new Date(purchaseDateStr);
    const day = String(pDate.getDate()).padStart(2, '0');
    const month = String(pDate.getMonth() + 1).padStart(2, '0');
    purchaseLabel = `Tất cả từ ngày nhận xe (${day}/${month})`;
  }

  const dateFilterPresets = [
    { label: purchaseLabel, start: purchaseDateStr, end: '' },
    { label: 'Tháng 4', start: '2026-04-01', end: '2026-04-30' },
    { label: 'Tháng 5', start: '2026-05-01', end: '2026-05-31' },
    { label: 'Tháng 6', start: '2026-06-01', end: '2026-06-30' },
    { label: 'Tháng 7', start: '2026-07-01', end: '2026-07-31' },
    { label: 'Tháng 8', start: '2026-08-01', end: '2026-08-31' },
    { label: 'Tháng 9', start: '2026-09-01', end: '2026-09-30' },
    { label: 'Hôm nay', start: todayLocalDate, end: todayLocalDate },
  ];


  const displayedTrips = useMemo(() => {
    let list = trips;
    if (tabStartDate) list = list.filter(t => t.start_time && toLocalDateString(t.start_time) >= tabStartDate);
    if (tabEndDate) list = list.filter(t => t.start_time && toLocalDateString(t.start_time) <= tabEndDate);
    return [...list].sort((a: any, b: any) => {
      let valA = a[tripSortCol] ?? '';
      let valB = b[tripSortCol] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return tripSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return tripSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [trips, tabStartDate, tabEndDate, tripSortCol, tripSortDir]);


  const displayedExpenses = useMemo(() => {
    let list = expenses;
    if (tabStartDate) list = list.filter(e => e.date && e.date.slice(0, 10) >= tabStartDate);
    if (tabEndDate) list = list.filter(e => e.date && e.date.slice(0, 10) <= tabEndDate);
    if (hiddenExpKeys.length > 0) {
      list = list.filter(e => {
        const cat = (e.category || '').toUpperCase();
        if (hiddenExpKeys.includes('fuel') && (cat === 'FUEL' || cat === 'RUNNING')) return false;
        if (hiddenExpKeys.includes('maint') && (cat === 'MAINTENANCE' || cat === 'PARTS' || cat === 'LABOR')) return false;
        if (hiddenExpKeys.includes('upgrade') && cat === 'UPGRADE') return false;
        if (hiddenExpKeys.includes('ins') && (cat === 'INSURANCE' || cat === 'INITIAL' || cat === 'REGISTRATION')) return false;
        if (hiddenExpKeys.includes('loan') && (cat === 'LOAN' || cat === 'LOAN_PAYMENT' || cat === 'LOAN_INTEREST')) return false;
        if (hiddenExpKeys.includes('other') && !['FUEL', 'RUNNING', 'MAINTENANCE', 'PARTS', 'LABOR', 'UPGRADE', 'INSURANCE', 'INITIAL', 'REGISTRATION', 'LOAN', 'LOAN_PAYMENT', 'LOAN_INTEREST'].includes(cat)) return false;
        return true;
      });
    }
    if (tabExpSearch.trim()) {
      const q = tabExpSearch.toLowerCase();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.subcategory || '').toLowerCase().includes(q)
      );
    }
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
  }, [expenses, tabStartDate, tabEndDate, hiddenExpKeys, tabExpSearch, expSortCol, expSortDir]);



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
    const initialHandoverDate = asset?.purchase_date ? toLocalDateString(asset.purchase_date) : '';

    // 0. Initial vehicle handover / purchase baseline (if vehicle has purchase_date)
    if (asset && initialHandoverDate) {
      events.push({
        date: initialHandoverDate,
        odometer_km: asset.current_odometer_km > 0 ? Math.min(12, asset.current_odometer_km) : 0,
        type: 'ODO_LOG',
        note: `Bàn giao xe (${asset.name || 'Khởi điểm'})`,
        id: `handover_baseline_${asset.id}`,
        raw: { date: initialHandoverDate, odometer_km: 12 },
      });
    }

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
          date: toLocalDateString(f.date),
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
          date: toLocalDateString(m.date),
          odometer_km: m.odometer_km,
          type: 'MAINTENANCE',
          note: `Bảo dưỡng: ${m.maintenance_type}${m.vendor ? ` tại ${m.vendor}` : ''}`,
          id: m.id,
          raw: m,
        });
      }
    });

    // Expenses with Odometer
    expenses.forEach(e => {
      if (e.odometer_km && e.odometer_km > 0) {
        events.push({
          date: toLocalDateString(e.date),
          odometer_km: e.odometer_km,
          type: 'ODO_LOG',
          note: `Chi phí: ${e.description || e.category} (${fmt(e.amount)}₫)`,
          id: `exp_odo_${e.id}`,
          raw: e,
        });
      }
    });

    // Trips
    trips.forEach(t => {
      const dStr = toLocalDateString(t.start_time);
      events.push({
        date: dStr,
        odometer_km: 0,
        type: 'TRIP',
        note: `Chuyến đi: ${t.start_location || 'Xuất phát'} → ${t.end_location || 'Điểm đến'} (${t.distance_km} km)`,
        id: t.id,
        raw: t,
      });
    });

    // Daily Summaries (only for days without individual trips to prevent double-counting)
    const datesWithTrips = new Set(trips.map(t => toLocalDateString(t.start_time)));
    dailySummaries.forEach(ds => {
      const dStr = toLocalDateString(ds.date);
      if (!datesWithTrips.has(dStr) && Number(ds.distance_km) > 0) {
        events.push({
          date: dStr,
          odometer_km: 0,
          type: 'TRIP',
          note: `Tổng kết ngày: ${ds.distance_km} km`,
          id: `ds_${ds.id || dStr}`,
          raw: { distance_km: Number(ds.distance_km) },
        });
      }
    });


    // Check if current asset odometer is higher than highest event ODO
    const maxEventOdo = events.reduce((max, ev) => Math.max(max, ev.odometer_km || 0), 0);
    const todayStr = toLocalDateString(new Date().toISOString());
    if (asset && asset.current_odometer_km > maxEventOdo) {
      events.push({
        date: todayStr,
        odometer_km: asset.current_odometer_km,
        type: 'ODO_LOG',
        note: `Chỉ số ODO hiện tại xe: ${fmt(asset.current_odometer_km)} km`,
        id: `current_asset_odo_${todayStr}`,
        raw: { date: todayStr, odometer_km: asset.current_odometer_km },
      });
    }

    // Filter out any events before vehicle handover date (if purchase_date is set)
    const validEvents = initialHandoverDate ? events.filter(e => e.date >= initialHandoverDate) : events;

    // Sort events by date ascending
    validEvents.sort((a, b) => {
      const dCmp = a.date.localeCompare(b.date);
      if (dCmp !== 0) return dCmp;
      return a.odometer_km - b.odometer_km;
    });

    // Group by Day (Chỉ tạo các ngày thực sự có sự kiện lăn bánh/đổ xăng/bảo dưỡng/trips)
    const dailyMap = new Map<string, {
      date: string;
      minOdo: number;
      maxOdo: number;
      tripDistance: number;
      notes: { type: string; text: string; id: string; raw?: any }[];
    }>();

    validEvents.forEach(ev => {
      if (!dailyMap.has(ev.date)) {
        dailyMap.set(ev.date, {
          date: ev.date,
          minOdo: ev.odometer_km || 0,
          maxOdo: ev.odometer_km || 0,
          tripDistance: ev.type === 'TRIP' ? (Number(ev.raw?.distance_km) || 0) : 0,
          notes: [{ type: ev.type, text: ev.note, id: ev.id, raw: ev.raw }],
        });
      } else {
        const cur = dailyMap.get(ev.date)!;
        if (ev.odometer_km > 0) {
          if (cur.minOdo === 0 || ev.odometer_km < cur.minOdo) cur.minOdo = ev.odometer_km;
          if (ev.odometer_km > cur.maxOdo) cur.maxOdo = ev.odometer_km;
        }
        if (ev.type === 'TRIP') {
          cur.tripDistance += (Number(ev.raw?.distance_km) || 0);
        }
        cur.notes.push({ type: ev.type, text: ev.note, id: ev.id, raw: ev.raw });
      }
    });

    const sortedDays = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    let prevOdo = 0;

    const dailyReport = sortedDays.map((day) => {
      let kmRun = 0;
      // 1. Determine kmRun for the day
      if (day.tripDistance > 0) {
        kmRun = day.tripDistance;
      } else if (day.maxOdo > 0 && prevOdo > 0 && day.maxOdo > prevOdo) {
        kmRun = day.maxOdo - prevOdo;
      } else if (day.maxOdo > 0 && day.minOdo > 0 && day.maxOdo > day.minOdo) {
        kmRun = day.maxOdo - day.minOdo;
      }

      // 2. Advance prevOdo reliably (trips take precedence over point-in-time manual logs)
      if (day.tripDistance > 0) {
        if (prevOdo > 0) {
          prevOdo += day.tripDistance;
        } else if (day.maxOdo > 0) {
          prevOdo = day.maxOdo;
        }
        if (day.maxOdo > prevOdo) {
          prevOdo = day.maxOdo;
        }
      } else if (day.maxOdo > 0) {
        if (day.maxOdo > prevOdo) {
          prevOdo = day.maxOdo;
        }
      }

      const dObj = new Date(day.date);
      const dayOfWeekNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayOfWeek = dayOfWeekNames[dObj.getDay()] || '';

      return {
        ...day,
        dayOfWeek,
        kmRun: Number(kmRun.toFixed(2)),
        displayOdo: Number((asset?.current_odometer_km && asset.current_odometer_km > 0 ? Math.min(asset.current_odometer_km, Math.max(day.maxOdo || 0, prevOdo)) : Math.max(day.maxOdo || 0, prevOdo)).toFixed(1)),
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
  }, [odometerLogs, fuelLogs, maintenance, trips, dailySummaries, expenses, asset]);

  const displayedDailyReport = useMemo(() => {
    let list = mileageAnalytics.dailyReport;
    if (tabStartDate) list = list.filter(d => d.date >= tabStartDate);
    if (tabEndDate) list = list.filter(d => d.date <= tabEndDate);
    if (hideRestDays) list = list.filter(d => d.kmRun > 0 || (d.notes && d.notes.some(n => n.type !== 'REST')));
    return [...list].sort((a: any, b: any) => {
      let valA = a[dailySortCol] ?? '';
      let valB = b[dailySortCol] ?? '';
      if (dailySortCol === 'kmRun') {
        valA = a.kmRun || 0;
        valB = b.kmRun || 0;
      } else if (dailySortCol === 'displayOdo') {
        valA = a.displayOdo || 0;
        valB = b.displayOdo || 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return dailySortDir === 'asc' ? valA - valB : valB - valA;
      }
      return dailySortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [mileageAnalytics.dailyReport, tabStartDate, tabEndDate, hideRestDays, dailySortCol, dailySortDir]);


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

  const handleDeleteOdoLog = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Mốc ODO (Admin PIN)',
      description: 'Xác nhận xóa mốc Odometer này khỏi lịch sử đo lường của xe. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa ODO',
      onConfirm: async () => {
        try {
          await deleteOdometerLog(id);
          setOdometerLogs(prev => prev.filter(o => o.id !== id));
          showToast('✅ Đã xóa mốc Odometer');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
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

  const handleDeleteExpense = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Chi Phí (Admin PIN)',
      description: 'Xác nhận xóa vĩnh viễn khoản chi phí này khỏi sổ chi tiêu của xe. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa chi phí',
      onConfirm: async () => {
        try {
          await deleteExpense(id);
          setExpenses(prev => prev.filter(e => e.id !== id));
          showToast('✅ Đã xóa chi phí thành công');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
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

  const handleDeleteMaint = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Bản Ghi Bảo Dưỡng (Admin PIN)',
      description: 'Xác nhận xóa bản ghi lịch sử bảo dưỡng này khỏi hồ sơ phương tiện. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa bảo dưỡng',
      onConfirm: async () => {
        try {
          await deleteMaintenanceRecord(id);
          setMaintenance(prev => prev.filter(m => m.id !== id));
          showToast('✅ Đã xóa lịch sử bảo dưỡng');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
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

  const handleDeleteFuel = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Nhật Ký Nhiên Liệu (Admin PIN)',
      description: 'Xác nhận xóa lượt đổ xăng này khỏi lịch sử tiêu thụ nhiên liệu của xe. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa đổ xăng',
      onConfirm: async () => {
        try {
          await deleteFuelLog(id);
          setFuelLogs(prev => prev.filter(f => f.id !== id));
          showToast('✅ Đã xóa nhật ký đổ xăng');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
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

  const handleDeletePart = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Phụ Tùng / Nâng Cấp (Admin PIN)',
      description: 'Xác nhận xóa phụ tùng / đồ chơi nâng cấp này khỏi danh sách trang bị của xe. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa phụ tùng',
      onConfirm: async () => {
        try {
          await deletePart(id);
          setParts(prev => prev.filter(p => p.id !== id));
          showToast('✅ Đã xóa phụ tùng nâng cấp');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
        }
      },
    });
  };

  const saveFuel = async () => {
    const l = parseFloat(fuelForm.liters) || 0;
    const p = parseFloat(fuelForm.price_per_liter) || 0;
    try {
      if (editingFuel) {
        const updated = await updateFuelLog(editingFuel.id, {
          date: fuelForm.date || new Date().toISOString().slice(0, 10),
          liters: l,
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
          date: fuelForm.date || new Date().toISOString().slice(0, 10),
          odometer_km: parseFloat(fuelForm.odometer_km) || 0,
          liters: l,
          price_per_liter: p,
          total_cost: l * p,
          station: fuelForm.station || undefined,
          notes: fuelForm.notes || undefined,
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
        // Auto-update next_maintenance_due on the asset
        if (maintForm.next_due_date) {
          setAsset(p => p ? { ...p, next_maintenance_due: maintForm.next_due_date } : p);
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
        // Auto-update next_maintenance_due on the asset
        if (maintForm.next_due_date) {
          setAsset(p => p ? { ...p, next_maintenance_due: maintForm.next_due_date } : p);
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

  const handleDeleteInsurance = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Hợp Đồng Bảo Hiểm (Admin PIN)',
      description: 'Xác nhận xóa hợp đồng bảo hiểm này khỏi hồ sơ phương tiện. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa bảo hiểm',
      onConfirm: async () => {
        try {
          await deleteInsurancePolicy(id);
          setInsurances(prev => prev.filter(i => i.id !== id));
          showToast('✅ Đã xóa hợp đồng bảo hiểm');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
        }
      },
    });
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

  const handleDeleteWarranty = (id: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Sổ Bảo Hành (Admin PIN)',
      description: 'Xác nhận xóa sổ bảo hành này khỏi danh sách. Vui lòng nhập mã PIN Admin (0075) để tiếp tục.',
      actionName: 'Xác nhận xóa bảo hành',
      onConfirm: async () => {
        try {
          await deleteWarranty(id);
          setWarranties(prev => prev.filter(w => w.id !== id));
          showToast('✅ Đã xóa sổ bảo hành');
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
        }
      },
    });
  };

  const handleDeleteVehicle = () => {
    if (!asset) return;
    setSecurityModal({
      isOpen: true,
      title: `Xác thực XÓA VĨNH VIỄN XE "${asset.name}" (Admin PIN)`,
      description: `CẢNH BÁO CỰC KỲ NGUY HIỂM: Bạn đang chuẩn bị xóa vĩnh viễn xe "${asset.name}" (${asset.license_plate || asset.brand}) cùng toàn bộ dữ liệu lịch sử vận hành, chi phí, khoản vay, bảo dưỡng và bảo hiểm. Hành động này KHÔNG THỂ HOÀN TÁC. Vui lòng nhập mã PIN Admin (0075) để xác nhận.`,
      actionName: 'Xóa vĩnh viễn xe này',
      onConfirm: async () => {
        try {
          const { deleteAsset } = await import('@/lib/services/assetService');
          await deleteAsset(asset.id);
          alert(`Đã xóa vĩnh viễn phương tiện ${asset.name}`);
          router.push('/assets');
        } catch (err: any) {
          alert(`Lỗi khi xóa phương tiện: ${err?.message}`);
        }
      },
    });
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

  const saveVehicleDocs = async () => {
    try {
      if (!asset) return;
      const updated = await updateAsset(asset.id, {
        license_plate: docsForm.license_plate || undefined,
        vin: docsForm.vin || undefined,
        engine: docsForm.engine || undefined,
        next_maintenance_due: docsForm.next_maintenance_due || undefined,
      });
      if (updated) {
        setAsset(updated);
        showToast('✅ Đã cập nhật Giấy tờ xe & Hạn đăng kiểm thành công!');
      }
      setOpenModal(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu giấy tờ xe: ${err?.message ?? 'Không lưu được'}`);
    }
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

      // Auto-create OdometerLog when Odometer is changed so journey log records the event
      const newOdoKm = parseFloat(editForm.current_odometer_km) || 0;
      if (newOdoKm > 0 && newOdoKm !== asset.current_odometer_km) {
        try {
          await createOdometerLog({
            asset_id: asset.id,
            date: new Date().toISOString().slice(0, 10),
            odometer_km: newOdoKm,
            note: 'Cập nhật Odometer định kỳ',
          });
          const freshOdoLogs = await getOdometerLogs(asset.id);
          setOdometerLogs(freshOdoLogs);
        } catch (odoErr) {
          console.warn('Auto create odometer log error:', odoErr);
        }
      }

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
      try {
        const freshOdoLogs = await getOdometerLogs(asset.id);
        setOdometerLogs(freshOdoLogs);
      } catch {}
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
          <div className="relative w-28 h-20 rounded-2xl overflow-hidden border shrink-0 flex items-center justify-center shadow-inner" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            {asset.image_url
              ? <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover object-center" />
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
          <button onClick={handleDeleteVehicle}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition hover:bg-rose-500/20"
            style={{ background: 'rgba(244,63,94,0.12)', color: 'var(--status-rose)', border: '1px solid rgba(244,63,94,0.3)' }}
            title="Xóa vĩnh viễn phương tiện (Yêu cầu mã PIN 0075)"
          >
            <Trash2 className="w-3.5 h-3.5" /><span>Xóa xe</span>
          </button>
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Virtual Odometer</p>
                <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--accent-cyan)' }}>
                  {fmt(asset.current_odometer_km || 0)} km
                </p>
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
              fuelLogs={fuelLogs}
              maintenance={maintenance}
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
              {(() => {
                // Tính ngày bảo dưỡng tiếp theo từ maintenance records thực tế
                const futureDates = maintenance
                  .filter(m => m.next_due_date)
                  .map(m => m.next_due_date!)
                  .sort();
                const maintDateStr = futureDates.length > 0 ? futureDates[0] : (asset.next_maintenance_due || null);
                let maintValue = 'Chưa lên lịch';
                let maintSub = 'Chưa có kế hoạch bảo dưỡng';
                let maintColor = 'var(--text-muted)';
                if (maintDateStr) {
                  const maintDate = new Date(maintDateStr);
                  const today = new Date();
                  const diffDays = Math.ceil((maintDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const fmtMaintDate = maintDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  maintValue = fmtMaintDate;
                  if (diffDays < 0) {
                    maintSub = `Đã quá hạn ${Math.abs(diffDays)} ngày`;
                    maintColor = 'var(--status-rose)';
                  } else if (diffDays === 0) {
                    maintSub = 'Hôm nay là ngày bảo dưỡng';
                    maintColor = 'var(--status-rose)';
                  } else if (diffDays <= 7) {
                    maintSub = `Còn ${diffDays} ngày (sắp đến)`;
                    maintColor = 'var(--status-amber)';
                  } else if (diffDays <= 30) {
                    maintSub = `Còn ${diffDays} ngày`;
                    maintColor = 'var(--status-amber)';
                  } else {
                    maintSub = `Còn ${diffDays} ngày`;
                    maintColor = 'var(--status-green)';
                  }
                }
                return [
                  { label: 'Giá mua ban đầu', value: `${fmt(asset.purchase_price)} ₫`, sub: `Ngày mua: ${fmtDate(asset.purchase_date || '')}`, color: 'var(--text-primary)' },
                  { label: 'Tổng chi phí phát sinh', value: `${fmt(totalExpenses)} ₫`, sub: `Chi phí vận hành, bảo dưỡng & nuôi xe`, color: 'var(--status-amber)' },
                  { label: 'Bảo dưỡng tiếp theo', value: maintValue, sub: maintSub, color: maintColor },
                ];

              })().map((item, i) => (
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
              {hasLive || asset.capabilities.has_obd
                ? <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>OBD Connected</span>
                  </span>
                : <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-faint)' }} /><span>OBD chưa kết nối</span>
                  </span>
              }
            </div>

            {/* OBD Modern Radial Gauge Meters — Realtime từ Android CarLogger */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const gauges = [
                  {
                    label: 'Tốc độ xe',
                    icon: '⚡',
                    value: live.speed,
                    displayValue: live.speed != null ? `${Math.round(live.speed)}` : '0',
                    unit: 'km/h',
                    min: 0,
                    max: 160,
                    color: 'var(--accent-cyan)',
                    bgColor: 'rgba(6,182,212,0.12)',
                    borderColor: 'rgba(6,182,212,0.25)',
                    gradId: 'grad-speed',
                    gradColors: ['#06B6D4', '#10B981'] as [string, string],
                    subLabel: live.speed == null ? 'Chờ tín hiệu OBD...' : live.speed === 0 ? 'Xe dừng / Nổ máy tại chỗ' : live.speed < 40 ? 'Đang chạy trong phố' : live.speed < 80 ? 'Tốc độ đường trường' : 'Đang chạy cao tốc',
                  },
                  {
                    label: 'Vòng tua máy RPM',
                    icon: '🔄',
                    value: live.rpm,
                    displayValue: live.rpm != null ? `${Math.round(live.rpm)}` : '0',
                    unit: 'rpm',
                    min: 0,
                    max: 6000,
                    color: live.rpm != null && live.rpm > 3500 ? 'var(--status-rose)' : 'var(--status-amber)',
                    bgColor: 'rgba(245,158,11,0.12)',
                    borderColor: 'rgba(245,158,11,0.25)',
                    gradId: 'grad-rpm',
                    gradColors: live.rpm != null && live.rpm > 3500 ? ['#F59E0B', '#EF4444'] as [string, string] : ['#F59E0B', '#F97316'] as [string, string],
                    subLabel: live.rpm == null ? 'Chờ tín hiệu OBD...' : live.rpm === 0 ? 'Động cơ đang tắt' : live.rpm < 950 ? 'Garanti / Không tải chuẩn' : live.rpm < 2500 ? 'Vùng tiết kiệm nhiên liệu' : live.rpm < 4000 ? 'Vòng tua cao' : '⚠️ Vùng đỏ Redline',
                  },
                  {
                    label: 'Nhiệt độ nước làm mát',
                    icon: '🌡️',
                    value: live.coolant,
                    displayValue: live.coolant != null ? `${Math.round(live.coolant)}` : '0',
                    unit: '°C',
                    min: 0,
                    max: 120,
                    color: live.coolant != null && live.coolant > 100 ? 'var(--status-rose)' : live.coolant != null && live.coolant < 60 ? 'var(--accent-cyan)' : 'var(--status-green)',
                    bgColor: 'rgba(16,185,129,0.12)',
                    borderColor: 'rgba(16,185,129,0.25)',
                    gradId: 'grad-coolant',
                    gradColors: live.coolant != null && live.coolant > 100 ? ['#F59E0B', '#EF4444'] as [string, string] : ['#10B981', '#06B6D4'] as [string, string],
                    subLabel: live.coolant == null ? 'Chờ tín hiệu OBD...' : live.coolant < 60 ? '🔵 Đang làm nóng máy' : live.coolant <= 95 ? '✅ Nhiệt độ tối ưu' : live.coolant <= 105 ? '🟠 Quạt gió làm việc' : '🔴 Cảnh báo quá nhiệt!',
                  },
                  {
                    label: 'Điện áp bình ắc quy',
                    icon: '🔋',
                    value: live.voltage,
                    displayValue: live.voltage != null ? live.voltage.toFixed(1) : '0.0',
                    unit: 'V',
                    min: 10,
                    max: 16,
                    color: live.voltage != null && live.voltage < 11.8 ? 'var(--status-rose)' : 'var(--status-purple)',
                    bgColor: 'rgba(168,85,247,0.12)',
                    borderColor: 'rgba(168,85,247,0.25)',
                    gradId: 'grad-voltage',
                    gradColors: ['#A855F7', '#6366F1'] as [string, string],
                    subLabel: live.voltage == null ? 'Chờ tín hiệu OBD...' : live.voltage < 11.8 ? '🔴 Bình yếu, cần sạc' : live.voltage <= 12.8 ? '🟡 Điện áp bình tốt' : live.voltage <= 14.8 ? '⚡ Máy phát đang sạc tốt' : '⚠️ Quá áp máy phát',
                  },
                ];

                return gauges.map((g, idx) => {
                  const numVal = g.value != null ? Math.max(g.min, Math.min(g.max, g.value)) : g.min;
                  const pct = Math.max(0, Math.min(100, ((numVal - g.min) / (g.max - g.min)) * 100));
                  const radius = 36;
                  const strokeWidth = 7;
                  const circumference = 2 * Math.PI * radius; // ~226.19
                  const arcLength = circumference * 0.72; // 260-degree arc ~162.8
                  const strokeDashoffset = arcLength - (arcLength * pct) / 100;

                  return (
                    <div
                      key={idx}
                      className="relative p-5 rounded-2xl flex flex-col items-center justify-between transition-all duration-300 hover:scale-[1.02] shadow-lg overflow-hidden group"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: `1px solid ${g.borderColor}`,
                        boxShadow: `0 10px 30px -10px ${g.color}25`,
                      }}
                    >
                      {/* Ambient light glow */}
                      <div
                        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none transition-all group-hover:opacity-30"
                        style={{ background: g.color }}
                      />

                      {/* Header */}
                      <div className="w-full flex items-center justify-between mb-1 z-10">
                        <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span>{g.icon}</span>
                          <span>{g.label}</span>
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: g.bgColor, color: g.color }}
                        >
                          {g.unit}
                        </span>
                      </div>

                      {/* Radial Gauge SVG */}
                      <div className="relative w-36 h-36 flex items-center justify-center my-2">
                        <svg className="w-full h-full -rotate-[125deg]" viewBox="0 0 100 100">
                          <defs>
                            <linearGradient id={g.gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={g.gradColors[0]} />
                              <stop offset="100%" stopColor={g.gradColors[1]} />
                            </linearGradient>
                          </defs>
                          {/* Background Track */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${arcLength} ${circumference}`}
                            strokeLinecap="round"
                            className="text-slate-200 dark:text-slate-800/80"
                          />
                          {/* Active Value Arc */}
                          <circle
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={`url(#${g.gradId})`}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${arcLength} ${circumference}`}
                            strokeDashoffset={g.value != null ? strokeDashoffset : arcLength}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>

                        {/* Center Value */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span
                            className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm transition-all"
                            style={{ color: g.value != null ? g.color : 'var(--text-muted)' }}
                          >
                            {g.displayValue}
                          </span>
                          <span className="text-[10px] font-bold uppercase mt-0.5 tracking-wider" style={{ color: 'var(--text-faint)' }}>
                            {g.unit}
                          </span>
                        </div>
                      </div>

                      {/* Smart Status Badge */}
                      <div className="w-full mt-1 pt-2.5 border-t text-center z-10" style={{ borderColor: 'var(--border-default)' }}>
                        <p className="text-[11px] font-semibold truncate" style={{ color: g.value != null ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                          {g.subLabel}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
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
              <div className="flex items-center flex-wrap gap-2 border-b pb-3 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400">
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Chế độ xem</span>
                </div>
                {[
                  { id: 'daily', label: 'Theo Ngày', sub: 'Nhật ký hành trình', icon: Calendar, count: mileageAnalytics.dailyReport.length },
                  { id: 'monthly', label: 'Theo Tháng', sub: 'Báo cáo tháng', icon: CalendarDays, count: mileageAnalytics.monthlyReport.length },
                  { id: 'yearly', label: 'Theo Năm', sub: 'Báo cáo năm', icon: CalendarRange, count: mileageAnalytics.yearlyReport.length },
                ].map((m) => {
                  const Icon = m.icon;
                  const active = odoViewMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setOdoViewMode(m.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        active
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                      }`}
                      style={!active ? { background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' } : {}}
                    >
                      <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-cyan-500 dark:text-cyan-400'}`} />
                      <span>{m.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${active ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        {m.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 1. THEO NGÀY (DAILY VIEW) */}
              {odoViewMode === 'daily' && (
                <div className="space-y-4">
                  {/* 📅 Date Filter & Presets */}
                  <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc thời gian:</span>
                      {dateFilterPresets.map(p => (
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
                        <button onClick={() => { setTabStartDate(''); setTabEndDate(''); }} className="text-[10px] font-bold text-rose-400">✕ Xóa lọc</button>
                      )}
                    </div>
                  </div>

                  {/* Daily Km Recharts */}
                  {mileageAnalytics.dailyReport.length > 0 && (
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                            Biểu đồ Quãng đường Di chuyển Theo Ngày
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setHideRestDays(p => !p)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                              hideRestDays
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                            title="Bấm để chuyển đổi hiển thị ngày xe nghỉ"
                          >
                            <span>{hideRestDays ? '✓ Ẩn ngày xe nghỉ (0 km)' : 'Hiện tất cả'}</span>
                          </button>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            ({displayedDailyReport.length} ngày)
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={[...displayedDailyReport]
                              .reverse()
                              .map(d => ({
                                date: d.date ? `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}` : '',
                                km: d.kmRun,
                                odo: d.displayOdo,
                              }))}
                            margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
                            <YAxis
                              yAxisId="km"
                              tickFormatter={v => `${v}km`}
                              tick={{ fill: axisColor, fontSize: 10 }}
                              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                              tickLine={false}
                              width={45}
                            />
                            <YAxis
                              yAxisId="odo"
                              orientation="right"
                              domain={['auto', 'auto']}
                              tickFormatter={v => `${Math.round(v)}`}
                              tick={{ fill: axisColor, fontSize: 9 }}
                              axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}
                              tickLine={false}
                              width={50}
                            />
                            <ReTooltip
                              formatter={(v: number, name: string) => [
                                name === 'Km chạy' ? `+${fmt(v)} km` : `${fmt(v)} km`,
                                name,
                              ]}
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            />

                            <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 10, paddingTop: 6 }} />
                            <Bar yAxisId="km" dataKey="km" name="Km chạy" fill="rgba(56,189,248,0.4)" stroke="#38BDF8" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="odo" type="monotone" dataKey="odo" name="Mốc ODO" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 3 }} />
                          </ComposedChart>

                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}


                  <div className="overflow-x-auto rounded-2xl max-h-[500px] overflow-y-auto" style={{ border: '1px solid var(--border-default)' }}>

                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                          {[
                            { key: 'date', label: 'Ngày' },
                            { key: 'kmRun', label: 'Km trong ngày' },
                            { key: 'displayOdo', label: 'Mốc ODO' },
                            { key: 'notes', label: 'Nội dung hành trình / Sự kiện ghi nhận' },
                          ].map(col => {
                            const isSorted = dailySortCol === col.key;
                            return (
                              <th
                                key={col.key}
                                onClick={() => {
                                  if (dailySortCol === col.key) {
                                    setDailySortDir(p => p === 'asc' ? 'desc' : 'asc');
                                  } else {
                                    setDailySortCol(col.key);
                                    setDailySortDir(col.key === 'date' ? 'desc' : 'asc');
                                  }
                                }}
                                className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide cursor-pointer select-none hover:text-cyan-400 transition"
                                style={{ color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                              >
                                <div className="flex items-center space-x-1">
                                  <span>{col.label}</span>
                                  <span className="text-[9px]">{isSorted ? (dailySortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                                </div>
                              </th>
                            );
                          })}
                          <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedDailyReport.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                              Chưa có dữ liệu nhật ký di chuyển. Bấm "Ghi nhận mốc Odometer" để bắt đầu theo dõi.
                            </td>
                          </tr>
                        ) : (
                          displayedDailyReport.map((day, idx) => (
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
                <div className="space-y-5">

                  {/* Recharts: ComposedChart km + cost per month */}
                  {mileageAnalytics.monthlyReport.length > 0 && (
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Biểu đồ Km &amp; Chi phí theo tháng</p>
                      </div>

                      <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={mileageAnalytics.monthlyReport.map(m => ({
                              label: m.monthLabel.replace('Tháng ', 'T'),
                              km: m.totalKm,
                              fuel: m.fuelCost,
                              maint: m.maintCost,
                              cost: m.totalCost,
                            }))}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
                            <YAxis yAxisId="left" tickFormatter={v => v > 0 ? `${(v / 1_000_000).toFixed(1)}M` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={46} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={v => v > 0 ? `${Math.round(v)}km` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={55} />
                            <ReTooltip
                              formatter={(v: number, name: string) => [
                                name === 'Km di chuyển' ? `${Math.round(v).toLocaleString('vi-VN')} km` : `${(v / 1_000_000).toFixed(2)}M ₫`,
                                name,
                              ]}
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            />

                            <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                            <Area yAxisId="left" type="monotone" dataKey="fuel" stackId="cost" name="Nhiên liệu" fill="#F59E0B40" stroke="#F59E0B" strokeWidth={1.5} />
                            <Area yAxisId="left" type="monotone" dataKey="maint" stackId="cost" name="Bảo dưỡng" fill="#06B6D440" stroke="#06B6D4" strokeWidth={1.5} />
                            <Bar yAxisId="right" dataKey="km" name="Km di chuyển" fill="#10B98135" stroke="#10B981" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                            <Line yAxisId="left" type="monotone" dataKey="cost" name="Tổng chi phí" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171', r: 3 }} strokeDasharray="4 2" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

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
                <div className="space-y-5">

                  {/* Recharts: Yearly overview bar chart */}
                  {mileageAnalytics.yearlyReport.length > 0 && (
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                          <BarChart3 className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Biểu đồ Km &amp; Chi phí theo năm</p>
                      </div>

                      <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={mileageAnalytics.yearlyReport.map(y => ({
                              label: `${y.yearKey}`,
                              km: y.totalKm,
                              cost: y.totalCost,
                              cpkm: y.costPerKm,
                            }))}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                            <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
                            <YAxis yAxisId="left" tickFormatter={v => v > 0 ? `${(v / 1_000_000).toFixed(0)}M` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={42} />
                            <YAxis yAxisId="right" orientation="right" tickFormatter={v => v > 0 ? `${Math.round(v)}km` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={55} />
                            <ReTooltip
                              formatter={(v: number, name: string) => [
                                name === 'Km di chuyển' ? `${Math.round(v).toLocaleString('vi-VN')} km` : `${(v / 1_000_000).toFixed(1)}M ₫`,
                                name,
                              ]}
                              contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                            />

                            <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                            <Bar yAxisId="left" dataKey="cost" name="Tổng chi phí" fill="#F59E0B80" stroke="#F59E0B" strokeWidth={1} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="km" name="Km di chuyển" fill="#10B98135" stroke="#10B981" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}



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

            {/* 📅 Date Filter & Sort Bar */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {dateFilterPresets.map(p => (
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

            <div className="grid grid-cols-3 gap-3 text-xs text-center mb-2">
              {[
                { label: 'Tổng chuyến', value: displayedTrips.length },
                { label: 'Tổng km', value: `${fmt(displayedTrips.reduce((s,t)=>s+(t.distance_km || 0),0).toFixed(0) as any)} km` },
                { label: 'TB tiêu thụ', value: `${asset.avg_consumption_l100km || '—'} L/100` },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="font-extrabold text-base" style={{ color: 'var(--accent-cyan)' }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    {[
                      { key: 'start_time', label: 'Thời gian' },
                      { key: 'start_location', label: 'Lộ trình (Đi → Đến)' },
                      { key: 'distance_km', label: 'Quãng đường' },
                      { key: 'duration_seconds', label: 'Thời lượng' },
                      { key: 'average_speed_kmh', label: 'Tốc độ TB' },
                      { key: 'fuel_used_liters', label: 'Xăng tiêu thụ' },
                    ].map(col => {
                      const isSorted = tripSortCol === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (tripSortCol === col.key) {
                              setTripSortDir(p => p === 'asc' ? 'desc' : 'asc');
                            } else {
                              setTripSortCol(col.key);
                              setTripSortDir(col.key === 'start_time' ? 'desc' : 'asc');
                            }
                          }}
                          className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide cursor-pointer select-none hover:text-cyan-400 transition"
                          style={{ color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{col.label}</span>
                            <span className="text-[9px]">{isSorted ? (tripSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayedTrips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                        Chưa có chuyến đi nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    displayedTrips.map((trip, idx) => (
                      <tr key={trip.id} className="transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmtDate(trip.start_time)}</p>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{trip.start_time ? new Date(trip.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {trip.start_location || 'Điểm xuất phát'} → {trip.end_location || 'Điểm đến'}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {trip.distance_km} km
                        </td>
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {durFmt(trip.duration_seconds)}
                        </td>
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {trip.average_speed_kmh ? `${trip.average_speed_kmh} km/h` : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                          {trip.fuel_used_liters ? <span className="text-amber-400">{trip.fuel_used_liters} L</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                {dateFilterPresets.map(p => (
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
                {dateFilterPresets.map(p => (
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
                <div className="flex items-center space-x-1 border-l pl-2 flex-wrap gap-1" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="font-bold text-[10px] uppercase text-cyan-400">Sắp xếp:</span>
                  {[
                    { key: 'date', label: 'Ngày' },
                    { key: 'cost', label: 'Chi phí' },
                    { key: 'maintenance_type', label: 'Hạng mục' },
                    { key: 'odometer_km', label: 'Số Km' },
                  ].map(col => {
                    const isSorted = maintSortCol === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => {
                          if (maintSortCol === col.key) {
                            setMaintSortDir(p => p === 'asc' ? 'desc' : 'asc');
                          } else {
                            setMaintSortCol(col.key);
                            setMaintSortDir(col.key === 'date' || col.key === 'cost' ? 'desc' : 'asc');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center space-x-1 ${
                          isSorted ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm' : 'hover:bg-white/10'
                        }`}
                        style={!isSorted ? { background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' } : {}}
                      >
                        <span>{col.label}</span>
                        <span className="text-[8px]">{isSorted ? (maintSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    );
                  })}
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
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phụ tùng & Nâng cấp</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Tổng: <strong style={{ color: 'var(--accent-cyan)' }}>{fmt(displayedParts.reduce((s, p) => s + (p.cost || 0), 0))} ₫</strong> ({displayedParts.length} hạng mục)
                </p>
              </div>
              <button onClick={() => { setEditingPartItem(null); setOpenModal('part'); }} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm phụ tùng</span>
              </button>
            </div>

            {/* 📅 Date Filter & Sort */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>📅 Lọc ngày:</span>
                {dateFilterPresets.map(p => (
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
                <div className="flex items-center space-x-1 border-l pl-2 flex-wrap gap-1" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="font-bold text-[10px] uppercase text-cyan-400">Sắp xếp:</span>
                  {[
                    { key: 'install_date', label: 'Ngày lắp' },
                    { key: 'cost', label: 'Chi phí' },
                    { key: 'name', label: 'Tên' },
                    { key: 'brand', label: 'Thương hiệu' },
                  ].map(col => {
                    const isSorted = partSortCol === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => {
                          if (partSortCol === col.key) {
                            setPartSortDir(p => p === 'asc' ? 'desc' : 'asc');
                          } else {
                            setPartSortCol(col.key);
                            setPartSortDir(col.key === 'install_date' || col.key === 'cost' ? 'desc' : 'asc');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center space-x-1 ${
                          isSorted ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm' : 'hover:bg-white/10'
                        }`}
                        style={!isSorted ? { background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' } : {}}
                      >
                        <span>{col.label}</span>
                        <span className="text-[8px]">{isSorted ? (partSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {displayedParts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: 'var(--accent-cyan)' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Chưa có phụ tùng hay món độ nào được ghi nhận</p>
                  <button onClick={() => { setEditingPartItem(null); setOpenModal('part'); }} className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                    <Plus className="w-3.5 h-3.5" /><span>Thêm phụ tùng đầu tiên</span>
                  </button>
                </div>
              ) : (
                displayedParts.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl flex justify-between items-start" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {p.brand ? `${p.brand} • ` : ''}{p.category || 'Phụ tùng'} {p.install_date ? `• Lắp: ${fmtDate(p.install_date)}` : ''}
                      </p>
                      {p.notes && <p className="text-[10px] mt-1 p-1.5 rounded" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>📝 {p.notes}</p>}
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-bold text-sm text-purple-400">{fmt(p.cost || 0)} ₫</span>
                      <button onClick={() => handleOpenEditPart(p)} className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15" title="Sửa">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeletePart(p.id)} className="p-1 rounded text-rose-400 hover:bg-rose-500/15" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
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

            {/* 📅 Thanh công cụ: Thời gian, Tìm kiếm & Sắp xếp */}
            <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                <span className="font-bold text-[10px] uppercase flex items-center gap-1 shrink-0 text-amber-500">
                  <Calendar className="w-3 h-3" /> Thời gian:
                </span>
                {dateFilterPresets.map(p => (
                  <button key={p.label} onClick={() => { setTabStartDate(p.start); setTabEndDate(p.end); }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${tabStartDate === p.start && tabEndDate === p.end ? 'bg-cyan-500 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'}`}
                    style={!(tabStartDate === p.start && tabEndDate === p.end) ? { background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' } : {}}>
                    {p.label}
                  </button>
                ))}
                <div className="flex items-center space-x-1 ml-1">
                  <input type="date" value={tabStartDate} onChange={e => setTabStartDate(e.target.value)} className="theme-input text-[10px] py-0.5 px-1.5 font-mono rounded-lg" style={{ width: '115px' }} />
                  <span className="text-[10px] text-slate-400">-</span>
                  <input type="date" value={tabEndDate} onChange={e => setTabEndDate(e.target.value)} className="theme-input text-[10px] py-0.5 px-1.5 font-mono rounded-lg" style={{ width: '115px' }} />
                  {(tabStartDate || tabEndDate || tabExpSearch || hiddenExpKeys.length > 0) && (
                    <button onClick={() => { setTabStartDate(''); setTabEndDate(''); setTabExpSearch(''); setHiddenExpKeys([]); }} className="text-[10px] font-bold text-rose-500 hover:underline ml-1">✕ Bỏ lọc</button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Input */}
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 absolute left-2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm mô tả, nơi chi..."
                    value={tabExpSearch}
                    onChange={e => setTabExpSearch(e.target.value)}
                    className="theme-input text-[10px] py-1 pl-7 pr-2 font-medium rounded-lg w-36 sm:w-44"
                  />
                </div>

                {/* Sắp xếp */}
                <div className="flex items-center space-x-1 border-l pl-2 flex-wrap gap-1" style={{ borderColor: 'var(--border-default)' }}>
                  <span className="font-bold text-[10px] uppercase text-cyan-500">Sắp xếp:</span>
                  {[
                    { key: 'date', label: 'Ngày' },
                    { key: 'amount', label: 'Số tiền' },
                    { key: 'category', label: 'Danh mục' },
                  ].map(col => {
                    const isSorted = expSortCol === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => {
                          if (expSortCol === col.key) {
                            setExpSortDir(p => p === 'asc' ? 'desc' : 'asc');
                          } else {
                            setExpSortCol(col.key);
                            setExpSortDir(col.key === 'date' || col.key === 'amount' ? 'desc' : 'asc');
                          }
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition flex items-center space-x-0.5 ${
                          isSorted ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                        }`}
                        style={!isSorted ? { background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)' } : {}}
                      >
                        <span>{col.label}</span>
                        <span className="text-[8px]">{isSorted ? (expSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 📊 Stacked Area Chart Chi Phí Theo Tháng — Click Legend để bật / tắt danh mục */}
            {displayedExpenses.length > 0 ? (() => {
              const map = new Map<string, any>();
              displayedExpenses.forEach(e => {
                const d = e.date || '';
                if (!d) return;
                const mKey = d.slice(0, 7);
                const cat = (e.category || 'Other').toUpperCase();
                const prev = map.get(mKey) || {
                  monthKey: mKey,
                  label: `T${parseInt(mKey.slice(5))}/${mKey.slice(2, 4)}`,
                  fuel: 0,
                  maint: 0,
                  upgrade: 0,
                  ins: 0,
                  loan: 0,
                  other: 0,
                  total: 0,
                };
                const amt = e.amount || 0;
                if (cat === 'FUEL' || cat === 'RUNNING') prev.fuel += amt;
                else if (cat === 'MAINTENANCE' || cat === 'PARTS' || cat === 'LABOR') prev.maint += amt;
                else if (cat === 'UPGRADE') prev.upgrade += amt;
                else if (cat === 'INSURANCE' || cat === 'INITIAL' || cat === 'REGISTRATION') prev.ins += amt;
                else if (cat === 'LOAN' || cat === 'LOAN_PAYMENT' || cat === 'LOAN_INTEREST') prev.loan += amt;
                else prev.other += amt;
                prev.total += amt;
                map.set(mKey, prev);
              });
              const chartData = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
              const filteredSum = displayedExpenses.reduce((s, e) => s + e.amount, 0);

              const seriesDefs = [
                { key: 'fuel', name: 'Nhiên liệu & Pin', color: '#F59E0B', grad: 'astFuel' },
                { key: 'maint', name: 'Bảo dưỡng & Phụ tùng', color: '#06B6D4', grad: 'astMaint' },
                { key: 'upgrade', name: 'Đồ độ / Nâng cấp', color: '#8B5CF6', grad: 'astUpgrade' },
                { key: 'ins', name: 'Bảo hiểm / Giấy tờ', color: '#10B981', grad: 'astIns' },
                { key: 'loan', name: 'Khoản vay & Lãi', color: '#EC4899', grad: 'astLoan' },
                { key: 'other', name: 'Chi phí khác', color: '#64748B', grad: 'astOther' },
              ];

              if (chartData.length === 0) return null;
              return (
                <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                          <span>Biểu Đồ Vùng Xếp Chồng Chi Phí Theo Tháng</span>
                          <span className="text-[9px] font-normal text-slate-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full lowercase">
                            (Bấm vào chú thích để bật/tắt danh mục)
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                          Hiển thị {chartData.length} mốc tháng • Tổng chi: <strong className="text-slate-900 dark:text-white font-mono">{fmt(filteredSum)} ₫</strong> ({displayedExpenses.length} khoản chi)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Đơn vị: Triệu ₫ (M)</span>
                  </div>

                  <div style={{ height: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="astFuel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.08}/>
                          </linearGradient>
                          <linearGradient id="astMaint" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.08}/>
                          </linearGradient>
                          <linearGradient id="astUpgrade" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.08}/>
                          </linearGradient>
                          <linearGradient id="astIns" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.08}/>
                          </linearGradient>
                          <linearGradient id="astLoan" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0.08}/>
                          </linearGradient>
                          <linearGradient id="astOther" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#64748B" stopOpacity={0.75}/>
                            <stop offset="95%" stopColor="#64748B" stopOpacity={0.08}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
                        <YAxis tickFormatter={v => v > 0 ? `${(v / 1_000_000).toFixed(1)}M` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={45} />
                        <ReTooltip
                          formatter={(v: number, name: string) => [`${fmt(v)} ₫`, name]}
                          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                        />

                        {/* Interactive Clickable Legend */}
                        <Legend
                          content={() => (
                            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
                              {seriesDefs.map(item => {
                                const isHidden = hiddenExpKeys.includes(item.key);
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => toggleExpKey(item.key)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer select-none ${
                                      isHidden
                                        ? 'opacity-35 line-through bg-slate-100 dark:bg-slate-800 text-slate-400 border border-dashed border-slate-400/40'
                                        : 'hover:scale-105 bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-sm border'
                                    }`}
                                    style={!isHidden ? { borderColor: `${item.color}50` } : {}}
                                    title={isHidden ? `Bấm để BẬT ${item.name}` : `Bấm để TẮT ${item.name}`}
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform"
                                      style={{
                                        backgroundColor: item.color,
                                        boxShadow: isHidden ? 'none' : `0 0 6px ${item.color}80`,
                                        opacity: isHidden ? 0.4 : 1,
                                      }}
                                    />
                                    <span>{item.name}</span>
                                  </button>
                                );
                              })}
                              {hiddenExpKeys.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setHiddenExpKeys([])}
                                  className="text-[10px] font-bold text-cyan-500 hover:underline px-2 py-1 ml-1"
                                >
                                  Bật tất cả
                                </button>
                              )}
                            </div>
                          )}
                        />

                        <Area type="monotone" dataKey="fuel" stackId="exp" name="Nhiên liệu & Pin" stroke="#F59E0B" fill="url(#astFuel)" strokeWidth={1.5} hide={hiddenExpKeys.includes('fuel')} />
                        <Area type="monotone" dataKey="maint" stackId="exp" name="Bảo dưỡng & Phụ tùng" stroke="#06B6D4" fill="url(#astMaint)" strokeWidth={1.5} hide={hiddenExpKeys.includes('maint')} />
                        <Area type="monotone" dataKey="upgrade" stackId="exp" name="Đồ độ / Nâng cấp" stroke="#8B5CF6" fill="url(#astUpgrade)" strokeWidth={1.5} hide={hiddenExpKeys.includes('upgrade')} />
                        <Area type="monotone" dataKey="ins" stackId="exp" name="Bảo hiểm / Giấy tờ" stroke="#10B981" fill="url(#astIns)" strokeWidth={1.5} hide={hiddenExpKeys.includes('ins')} />
                        <Area type="monotone" dataKey="loan" stackId="exp" name="Khoản vay & Lãi" stroke="#EC4899" fill="url(#astLoan)" strokeWidth={1.5} hide={hiddenExpKeys.includes('loan')} />
                        <Area type="monotone" dataKey="other" stackId="exp" name="Chi phí khác" stroke="#64748B" fill="url(#astOther)" strokeWidth={1.5} hide={hiddenExpKeys.includes('other')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })() : (
              <div className="p-8 rounded-2xl text-center text-xs space-y-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <p className="font-bold text-slate-700 dark:text-slate-300">Không có chi phí nào khớp với bộ lọc hiện tại</p>
                <p className="text-[11px]">Hãy thử chọn mốc thời gian khác hoặc bấm nút "Bỏ lọc".</p>
              </div>
            )}


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
                    setDocsForm({
                      license_plate: asset.license_plate || '',
                      vin: asset.vin || '',
                      engine: asset.engine || '',
                      registration_date: asset.purchase_date || '',
                      next_maintenance_due: asset.next_maintenance_due || '',
                      notes: asset.description || '',
                    });
                    setOpenModal('vehicle_docs');
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

        {/* ═══ ANALYTICS (PHÂN TÍCH TCO THỰC TẾ) ═══ */}
        {activeTab === 'analytics' && (() => {
          // 1. Nâng cấp & Phụ kiện
          const upgradeItems = expenses.filter(e => (e.category || '').toUpperCase() === 'UPGRADE' || (e.subcategory || '').toUpperCase().includes('ACCESSORIE'));
          const upgradeCost = upgradeItems.reduce((s, e) => s + e.amount, 0);

          // 2. Bảo hiểm & Giấy tờ định kỳ
          const insItems = expenses.filter(e => {
            const cat = (e.category || '').toUpperCase();
            const sub = (e.subcategory || '').toUpperCase();
            const desc = (e.description || '').toUpperCase();
            return cat.includes('INSUR') || sub.includes('INSUR') || desc.includes('BẢO HIỂM') || desc.includes('ĐĂNG KIỂM') || desc.includes('PHÍ ĐƯỜNG BỘ');
          });
          const insFromTable = insurances.reduce((s, ins) => s + (Number(ins.annual_fee) || 0), 0);
          const insFromExp = insItems.reduce((s, e) => s + e.amount, 0);
          const effectiveInsurance = Math.max(insFromTable, insFromExp);

          // 3. Lệ phí Trước bạ & Thủ tục Lăn bánh ban đầu
          const registrationItems = expenses.filter(e => {
            const cat = (e.category || '').toUpperCase();
            const desc = (e.description || '').toUpperCase();
            return (
              desc.includes('TRƯỚC BẠ') ||
              desc.includes('LỆ PHÍ TRƯỚC BẠ') ||
              desc.includes('ĐĂNG KÝ BIỂN SỐ') ||
              desc.includes('DỊCH VỤ NGÂN HÀNG') ||
              desc.includes('BẢO HIỂM KHOẢN VAY') ||
              (cat === 'INITIAL' && !desc.includes('CỌC') && !desc.includes('CHUYỂN TIỀN') && !desc.includes('TIỀN MẶT XE'))
            );
          });
          const registrationCost = registrationItems.reduce((s, e) => s + e.amount, 0);

          // 4. Tiền cọc & Đối ứng mua xe ban đầu (Vốn tự có)
          const downpaymentItems = expenses.filter(e => {
            const cat = (e.category || '').toUpperCase();
            const desc = (e.description || '').toUpperCase();
            return cat === 'INITIAL' && (desc.includes('CỌC') || desc.includes('CHUYỂN TIỀN') || desc.includes('TIỀN MẶT XE') || desc.includes('ĐỐI ỨNG'));
          });
          const downpaymentCost = downpaymentItems.reduce((s, e) => s + e.amount, 0);

          // 5. Chi phí khoản vay (Lãi vay ngân hàng)
          const loanItems = expenses.filter(e => {
            const cat = (e.category || '').toUpperCase();
            const sub = (e.subcategory || '').toUpperCase();
            const desc = (e.description || '').toUpperCase();
            return cat.includes('LOAN') || sub.includes('LOAN') || desc.includes('LÃI VAY') || desc.includes('TRẢ GÓP') || desc.includes('LÃI NGÂN HÀNG');
          });
          const loanInterestFromExpenses = loanItems.reduce((s, e) => s + e.amount, 0);
          const loanInterestFromSchedule = assetLoanSchedule.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (s.interest_paid || 0), 0);
          const loanCost = loanInterestFromExpenses > 0 
            ? loanInterestFromExpenses 
            : (loanInterestFromSchedule > 0 
                ? loanInterestFromSchedule 
                : (loan && loan.interest_rate_percent > 0 ? Math.round(loan.principal * (loan.interest_rate_percent / 100) * ((loan.term_months || 12) / 12)) : 0));

          // 6. Chi phí Vận hành thường xuyên khác (Gửi xe, Rửa xe, BOT, Sân đỗ...)
          const knownAccountedExpenseSum = upgradeCost + insFromExp + registrationCost + downpaymentCost + loanInterestFromExpenses;
          const otherRunningCost = Math.max(0, totalExpenses - totalFuelCost - totalMaintCost - knownAccountedExpenseSum);

          const otherRunningItems = expenses.filter(e => {
            const isUpgrade = upgradeItems.some(x => x.id === e.id);
            const isIns = insItems.some(x => x.id === e.id);
            const isReg = registrationItems.some(x => x.id === e.id);
            const isDown = downpaymentItems.some(x => x.id === e.id);
            const isLoan = loanItems.some(x => x.id === e.id);
            return !isUpgrade && !isIns && !isReg && !isDown && !isLoan;
          });

          const purchasePrice = asset.purchase_price || 0;
          const totalRealSpent = purchasePrice + totalExpenses + (loanCost > loanInterestFromExpenses ? loanCost : 0);

          const tcoDonutData = [
            { name: 'Giá mua ban đầu', value: purchasePrice, color: '#3B82F6' },
            { name: 'Nhiên liệu & Pin', value: totalFuelCost, color: '#EF4444' },
            { name: 'Bảo dưỡng & Phụ tùng', value: totalMaintCost, color: '#0EA5E9' },
            { name: 'Bảo hiểm & Giấy tờ', value: effectiveInsurance, color: '#10B981' },
            { name: 'Lệ phí Trước bạ & Lăn bánh', value: registrationCost, color: '#F59E0B' },
            { name: 'Nâng cấp / Phụ kiện', value: upgradeCost, color: '#8B5CF6' },
            { name: 'Chi phí khoản vay', value: loanCost, color: '#EC4899' },
            { name: 'Vận hành khác (BOT, rửa xe...)', value: otherRunningCost, color: '#64748B' },
          ].filter(d => d.value > 0);

          const tcoTableRows = [
            {
              id: 'fuel',
              name: 'Nhiên liệu (Xăng / Điện)',
              total: totalFuelCost,
              color: '#EF4444',
              items: fuelLogs.map(f => ({ date: f.date, description: `Đổ nhiên liệu ${f.liters ? `${f.liters}L` : ''}`, vendor: f.station, amount: f.total_cost, odo: f.odometer_km })),
            },
            {
              id: 'maint',
              name: 'Bảo dưỡng & Phụ tùng thay thế',
              total: totalMaintCost,
              color: '#0EA5E9',
              items: maintenance.map(m => ({ date: m.date, description: m.maintenance_type || m.notes || 'Bảo dưỡng', vendor: m.vendor, amount: m.cost, odo: m.odometer_km })),
            },
            {
              id: 'insurance',
              name: 'Bảo hiểm & Đăng kiểm định kỳ',
              total: effectiveInsurance,
              color: '#10B981',
              items: insItems.map(e => ({ date: e.date, description: e.description, vendor: e.vendor, amount: e.amount, odo: e.odometer_km })),
            },
            {
              id: 'registration',
              name: 'Lệ phí Trước bạ & Thủ tục Lăn bánh ban đầu',
              total: registrationCost,
              color: '#F59E0B',
              items: registrationItems.map(e => ({ date: e.date, description: e.description, vendor: e.vendor, amount: e.amount, odo: e.odometer_km })),
            },
            {
              id: 'upgrade',
              name: 'Nâng cấp / Đồ chơi & Phụ kiện xe',
              total: upgradeCost,
              color: '#8B5CF6',
              items: upgradeItems.map(e => ({ date: e.date, description: e.description, vendor: e.vendor, amount: e.amount, odo: e.odometer_km })),
            },
            {
              id: 'loan',
              name: 'Chi phí khoản vay (Tiền lãi vay)',
              total: loanCost,
              color: '#EC4899',
              items: assetLoanSchedule.filter(s => s.status === 'PAID').map(s => ({ date: s.paid_date || s.due_date, description: `Lãi vay kỳ #${s.payment_number}`, vendor: loan?.lender || 'Ngân hàng', amount: s.interest_paid })),
            },
            {
              id: 'downpayment',
              name: 'Vốn tự có / Tiền đối ứng mua xe ban đầu',
              total: downpaymentCost,
              color: '#3B82F6',
              items: downpaymentItems.map(e => ({ date: e.date, description: e.description, vendor: e.vendor, amount: e.amount, odo: e.odometer_km })),
            },
            {
              id: 'other',
              name: 'Chi phí Vận hành khác (Rửa xe, gửi xe, BOT, sân bãi...)',
              total: otherRunningCost,
              color: '#64748B',
              items: otherRunningItems.map(e => ({ date: e.date, description: e.description, vendor: e.vendor, amount: e.amount, odo: e.odometer_km })),
            },
          ].filter(r => r.total > 0);

          return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phân tích Dòng Tiền &amp; Chi Phí Thực Tế (TCO)</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tổng dòng tiền thực chi cho xe (Giá mua ban đầu + Toàn bộ chi phí phát sinh minh bạch)</p>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                {[
                  { label: 'Giá mua ban đầu', value: `${(purchasePrice / 1000000).toFixed(1)}M ₫`, color: 'var(--accent-cyan)' },
                  { label: 'Tổng chi phí nuôi xe', value: `${(totalExpenses / 1000000).toFixed(1)}M ₫`, color: 'var(--status-amber)' },
                  { label: 'Chi phí / km', value: totalKm > 0 ? `${(totalExpenses / totalKm).toFixed(0)} ₫/km` : '0 ₫/km', color: 'var(--status-green)' },
                  { label: 'Tổng tiền thực tế đã chi', value: `${(totalRealSpent / 1000000).toFixed(1)}M ₫`, color: 'var(--status-purple)' },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <p className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</p>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* 📊 Biểu Đồ Trực Quan TCO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Donut Chart */}
                <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500/15 text-amber-500 border border-amber-500/30">
                      <PieChart className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cơ cấu Tổng Chi Phí Thực Tế</p>
                  </div>
                  {tcoDonutData.length > 0 ? (
                    <div>
                      <div className="relative" style={{ height: 150 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={tcoDonutData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                              {tcoDonutData.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <ReTooltip formatter={(v: number, name: string) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Tổng thực chi</span>
                          <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{(totalRealSpent / 1_000_000).toFixed(1)}M</span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {tcoDonutData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                              <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{d.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-mono">
                              <span className="text-[10px] text-slate-500 dark:text-zinc-400">{(totalRealSpent > 0 ? ((d.value / totalRealSpent) * 100).toFixed(1) : 0)}%</span>
                              <strong className="text-[11px]" style={{ color: d.color }}>{(d.value / 1_000_000).toFixed(1)}M</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Chưa có đủ dữ liệu</p>
                  )}
                </div>

                {/* Horizontal Bar Chart: So sánh Giá trị xe vs Chi phí phát sinh */}
                <div className="p-4 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-500 border border-cyan-500/30">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">So sánh Chi Phí Mua Xe &amp; Nuôi Xe</p>
                  </div>

                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Giá mua ban đầu', amount: purchasePrice, fill: '#3B82F6' },
                          { name: 'Tổng chi nuôi xe', amount: totalExpenses, fill: '#F59E0B' },
                          { name: 'Dư nợ vay hiện tại', amount: (loan?.current_balance || 0), fill: '#EC4899' },
                          { name: 'Tổng tiền thực chi', amount: totalRealSpent, fill: '#10B981' },
                        ]}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                        <XAxis type="number" tickFormatter={v => `${(v / 1_000_000).toFixed(0)}M`} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: isDark ? '#E2E8F0' : '#1E293B', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} width={130} />
                        <ReTooltip formatter={(v: number, name: string) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />

                        <Bar dataKey="amount" name="Số tiền" radius={[0, 6, 6, 0]} barSize={24}>
                          {[
                            <Cell key="0" fill="#3B82F6" />,
                            <Cell key="1" fill="#F59E0B" />,
                            <Cell key="2" fill="#EC4899" />,
                            <Cell key="3" fill="#10B981" />,
                          ]}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Chi tiết từng hạng mục có thể Click xem Drill-down */}
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
                <div className="p-3 bg-cyan-500/5 border-b border-cyan-500/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                    <span className="text-sm">💡</span>
                    <span>Bấm vào bất kỳ hạng mục nào bên dưới để xem chi tiết từng hóa đơn/khoản chi</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Tổng {tcoTableRows.length} danh mục</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                      {['Hạng mục chi phí', 'Tổng chi tiêu', '% Chi phí VH', '% Trên giá xe', 'Hành động'].map(h => (
                        <th key={h} className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tcoTableRows.map((row, i) => {
                      const pctVH = totalExpenses > 0 ? ((row.total / totalExpenses) * 100).toFixed(1) : '0';
                      const pctAsset = (asset.purchase_price || 0) > 0 ? ((row.total / asset.purchase_price) * 100).toFixed(1) : '0';
                      return (
                        <tr
                          key={i}
                          onClick={() => setTcoDrillDown({ title: row.name, color: row.color, items: row.items })}
                          className="cursor-pointer hover:bg-cyan-500/10 transition group"
                          style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}
                          title="Nhấn để xem chi tiết tất cả các khoản chi trong mục này"
                        >
                          <td className="px-3.5 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                            <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ background: row.color }} />
                            <span className="group-hover:text-cyan-500 group-hover:underline transition font-semibold">{row.name}</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-bold font-mono" style={{ color: row.color }}>{fmt(row.total)} ₫</td>
                          <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-muted)' }}>{pctVH}%</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold" style={{ color: 'var(--accent-cyan)' }}>{pctAsset}%</td>
                          <td className="px-3.5 py-2.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-semibold group-hover:bg-cyan-500 group-hover:text-white transition">
                              Xem {row.items.length} mục 🔍
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>📅 Ngày bảo dưỡng tiếp theo</label>
                <input type="date" className="theme-input" value={maintForm.next_due_date} onChange={e => setMaintForm(p => ({ ...p, next_due_date: e.target.value }))} />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                {maintForm.next_due_date && (() => {
                  const d = new Date(maintForm.next_due_date);
                  const today = new Date();
                  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const color = diff < 0 ? 'var(--status-rose)' : diff <= 7 ? 'var(--status-amber)' : 'var(--status-green)';
                  const text = diff < 0 ? `⚠️ Quá hạn ${Math.abs(diff)} ngày` : diff === 0 ? '🔴 Hôm nay!' : diff <= 7 ? `🟠 Còn ${diff} ngày` : `✅ Còn ${diff} ngày`;
                  return <p className="text-xs font-bold mt-1" style={{ color }}>{text}</p>;
                })()}
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

      {/* Vehicle Documents & Inspection Modal */}
      {openModal === 'vehicle_docs' && (
        <Modal title="📋 Cập nhật Đăng kiểm & Giấy tờ xe" onClose={() => setOpenModal(null)}>
          <div className="space-y-4">
            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">1. Đăng kiểm &amp; Lưu hành xe</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Hạn đăng kiểm tiếp theo *</label>
                  <input type="date" className="theme-input font-bold text-amber-400" value={docsForm.next_maintenance_due} onChange={e => setDocsForm(p => ({ ...p, next_maintenance_due: e.target.value }))} />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Xe mới miễn kiểm định lần đầu (36 tháng)</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Biển số đăng ký *</label>
                  <input type="text" className="theme-input font-bold uppercase tracking-wider text-cyan-400" placeholder="VD: 19B-213.87" value={docsForm.license_plate} onChange={e => setDocsForm(p => ({ ...p, license_plate: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">2. Số khung &amp; Số máy (Cà vẹt xe)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số khung (VIN)</label>
                  <input type="text" className="theme-input font-mono font-bold uppercase" placeholder="VD: JM1DJ1010102026" value={docsForm.vin} onChange={e => setDocsForm(p => ({ ...p, vin: e.target.value }))} />
                </div>
                <div>
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số máy / Động cơ</label>
                  <input type="text" className="theme-input font-mono font-bold" placeholder="VD: 1.5L SkyActiv-G" value={docsForm.engine} onChange={e => setDocsForm(p => ({ ...p, engine: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ghi chú tình trạng giấy tờ</label>
                  <input type="text" className="theme-input" placeholder="VD: Đăng ký gốc thế chấp ngân hàng TPBank, Bản sao công chứng còn hạn..." value={docsForm.notes} onChange={e => setDocsForm(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <button onClick={saveVehicleDocs} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 shadow-md transition">
                Lưu Đăng kiểm &amp; Giấy tờ
              </button>
              <button onClick={() => setOpenModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
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

      {/* 📊 TCO Category Drill-down Modal */}
      {tcoDrillDown && (
        <DraggableModal isOpen={true} onClose={() => setTcoDrillDown(null)}>
          <div className="flex flex-col h-full max-h-[85vh] w-[95vw] sm:w-[850px] max-w-4xl" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: tcoDrillDown.color }} />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>{tcoDrillDown.title}</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Danh sách chi tiết {tcoDrillDown.items.length} khoản chi • Tổng cộng: <strong style={{ color: tcoDrillDown.color }}>{fmt(tcoDrillDown.items.reduce((s, x) => s + (x.amount || 0), 0))} ₫</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTcoDrillDown(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 transition"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs">
              {tcoDrillDown.items.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                        {['STT', 'Ngày', 'Mô tả chi phí', 'Đơn vị / Nơi chi', 'ODO', 'Số tiền (₫)'].map(h => (
                          <th key={h} className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tcoDrillDown.items.map((item, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: idx % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                          }}
                        >
                          <td className="px-3.5 py-2.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>#{idx + 1}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                            {item.date ? toLocalDateString(item.date) : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {item.description || '—'}
                          </td>
                          <td className="px-3.5 py-2.5" style={{ color: 'var(--text-muted)' }}>
                            {item.vendor || '—'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--accent-cyan)' }}>
                            {item.odo ? `${fmt(item.odo)} km` : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-bold whitespace-nowrap" style={{ color: tcoDrillDown.color }}>
                            {fmt(item.amount || 0)} ₫
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Không có bản ghi chi tiết nào
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Được tổng hợp từ sổ kế toán &amp; vận hành xe
              </span>
              <button
                onClick={() => setTcoDrillDown(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* 🔒 Master Admin Security PIN Confirmation Modal */}
      <AdminSecurityPinModal
        isOpen={securityModal.isOpen}
        title={securityModal.title}
        description={securityModal.description}
        actionName={securityModal.actionName}
        onClose={() => setSecurityModal(p => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          if (securityModal.onConfirm) securityModal.onConfirm();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center space-x-2 border bg-emerald-950/90 text-emerald-300 border-emerald-500/30 backdrop-blur-md animate-slideIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

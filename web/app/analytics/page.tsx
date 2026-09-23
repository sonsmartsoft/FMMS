'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend, LabelList,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, ComposedChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses } from '@/lib/services/expenseService';
import { getFuelLogs } from '@/lib/services/fuelService';
import { getMaintenanceRecords } from '@/lib/services/maintenanceService';
import { getTrips } from '@/lib/services/tripService';
import { useTheme } from '@/lib/theme/ThemeContext';
import { BarChart3, TrendingDown, TrendingUp, Car, DollarSign, Gauge, Fuel, Wrench, Activity, Calendar } from 'lucide-react';
import { ChartLabelToggle, useChartLabelState } from '@/components/charts/ChartLabelToggle';
import KpiGradientCard from '@/components/ui/KpiGradientCard';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtM = (n: number) => `${(n / 1_000_000).toFixed(1)}M`;

const getCategoryColor = (catName?: string): string => {
  if (!catName) return '#64748B';
  const c = catName.toUpperCase();
  if (c === 'INITIAL' || c.includes('MUA') || c.includes('LĂN BÁNH') || c.includes('PURCHASE')) return '#3B82F6'; // Royal Blue
  if (c === 'FUEL' || c.includes('XĂNG') || c.includes('PIN') || c.includes('NHIÊN LIỆU') || c.includes('RUNNING')) return '#F59E0B'; // Amber
  if (c === 'MAINTENANCE' || c.includes('BẢO DƯỠNG') || c === 'PARTS' || c === 'LABOR') return '#06B6D4'; // Cyan
  if (c === 'UPGRADE' || c.includes('NÂNG CẤP') || c.includes('ĐỒ CHƠI') || c === 'ACCESSORIES') return '#8B5CF6'; // Purple
  if (c === 'INSURANCE' || c.includes('BẢO HIỂM') || c === 'REGISTRATION' || c === 'INSPECTION') return '#10B981'; // Emerald
  if (c === 'LOAN' || c === 'LOAN_PAYMENT' || c === 'LOAN_INTEREST' || c.includes('VAY') || c.includes('TRẢ GÓP')) return '#EC4899'; // Pink
  if (c === 'TOLL' || c === 'PARKING' || c === 'CAR_WASH' || c.includes('RỬA') || c.includes('ĐỖ')) return '#F97316'; // Orange
  return '#64748B';
};

const SectionHeader = ({ icon: Icon, title, sub, color = 'var(--accent-cyan)', action }: { icon: any; title: string; sub?: string; color?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 mb-3 sm:mb-4">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20', border: `1px solid ${color}40` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-extrabold truncate" style={{ color: 'var(--text-primary)' }} title={title}>{title}</h3>
        {sub && <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }} title={sub}>{sub}</p>}
      </div>
    </div>
    {action && <div className="shrink-0 self-end xs:self-auto">{action}</div>}
  </div>
);

const CHART_COLORS = ['#3B82F6', '#F59E0B', '#06B6D4', '#8B5CF6', '#10B981', '#EC4899', '#F97316'];
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const getPieLabelPercent = (percent: any) => {
  const n = Number(percent);
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n > 1 ? n : n * 100);
};

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintRecords, setMaintRecords] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMonthlyLabels, toggleMonthlyLabels] = useChartLabelState('fmms_analytics_monthly_labels', false);
  const [showCompareLabels, toggleCompareLabels] = useChartLabelState('fmms_analytics_compare_labels', false);
  const [showFuelLabels, toggleFuelLabels] = useChartLabelState('fmms_analytics_fuel_labels', false);
  const [showDistanceLabels, toggleDistanceLabels] = useChartLabelState('fmms_analytics_distance_labels', false);
  const [showCategoryLabels, toggleCategoryLabels] = useChartLabelState('fmms_analytics_category_labels', false);
  const [showAssetCostLabels, toggleAssetCostLabels] = useChartLabelState('fmms_analytics_asset_cost_labels', false);

  const isSameAsset = (recAssetId: string, targetAssetId: string) => {
    if (recAssetId === targetAssetId) return true;
    const targetAsset = assets.find(a => a.id === targetAssetId);
    if (targetAsset?.license_plate === '19B-213.87' && (recAssetId === 'CAR01' || recAssetId === '22222222-2222-2222-2222-222222222222' || recAssetId === '20260308-0001-4222-8888-19b213872026')) return true;
    if (targetAsset?.license_plate === '88C1-210.63' && (recAssetId === 'BIKE01' || recAssetId === '20170801-0002-4111-8888-88c121063016')) return true;
    if (targetAsset?.license_plate === '88L1-604.36' && (recAssetId === 'BIKE02' || recAssetId === '20210405-0003-4333-8888-88l160436021')) return true;
    if (targetAsset?.license_plate === 'MTB 26-555' && (recAssetId === 'BIKE03' || recAssetId === '20240310-0004-4444-8888-00000mtb2605')) return true;
    if (targetAsset?.license_plate === 'MTB 20-999' && (recAssetId === 'BIKE04' || recAssetId === '20240310-0005-4555-8888-00000mtb2005')) return true;
    return false;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, f, m, e, t] = await Promise.all([getAssets(), getFuelLogs(), getMaintenanceRecords(), getExpenses(), getTrips()]);
        if (cancelled) return;
        setAssets(a); setFuelLogs(f); setMaintRecords(m); setExpenses(e); setTrips(t);
      } catch { /* ignore */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredFuelLogs = selectedAssetId ? fuelLogs.filter(f => isSameAsset(f.asset_id, selectedAssetId)) : fuelLogs;
  const filteredMaintRecords = selectedAssetId ? maintRecords.filter(m => isSameAsset(m.asset_id, selectedAssetId)) : maintRecords;
  const filteredExpenses = selectedAssetId ? expenses.filter(e => isSameAsset(e.asset_id, selectedAssetId)) : expenses;
  const filteredTrips = selectedAssetId ? trips.filter(t => isSameAsset(t.asset_id, selectedAssetId)) : trips;
  const filteredAssets = selectedAssetId ? assets.filter(a => a.id === selectedAssetId) : assets;

  const totalFuelCost = filteredFuelLogs.reduce((s, f) => s + f.total_cost, 0);
  const totalMaintCost = filteredMaintRecords.reduce((s, m) => s + m.cost, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = filteredAssets.reduce((s, a) => s + (a.current_odometer_km || 0), 0);
  const totalTripKm = filteredTrips.reduce((s, t) => s + (t.distance_km || 0), 0);
  const totalFleetValue = filteredAssets.reduce((s, a) => s + (a.current_value || 0), 0);
  const totalPurchase = filteredAssets.reduce((s, a) => s + (a.purchase_price || 0), 0);
  const totalDepreciation = Math.max(0, totalPurchase - totalFleetValue);
  const avgSpeed = filteredTrips.length > 0 ? filteredTrips.reduce((s, t) => s + (t.average_speed_kmh || 0), 0) / filteredTrips.length : 0;

  // Breakdown calculation from all expense records with granular categories
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    filteredExpenses.forEach(e => {
      const c = (e.category || 'Other').toUpperCase();
      let groupName = 'Chi phí khác';
      let groupColor = '#64748B';

      if (c === 'INITIAL' || c.includes('MUA') || c.includes('PURCHASE')) {
        groupName = 'Mua xe & Lăn bánh';
        groupColor = '#3B82F6';
      } else if (c === 'FUEL' || c === 'RUNNING') {
        groupName = 'Nhiên liệu & Pin';
        groupColor = '#F59E0B';
      } else if (c === 'MAINTENANCE' || c === 'PARTS' || c === 'LABOR') {
        groupName = 'Bảo dưỡng & Phụ tùng';
        groupColor = '#06B6D4';
      } else if (c === 'UPGRADE') {
        groupName = 'Nâng cấp & Đồ chơi';
        groupColor = '#8B5CF6';
      } else if (c === 'INSURANCE' || c === 'REGISTRATION' || c === 'INSPECTION') {
        groupName = 'Bảo hiểm & Giấy tờ';
        groupColor = '#10B981';
      } else if (c === 'LOAN' || c === 'LOAN_PAYMENT' || c === 'LOAN_INTEREST') {
        groupName = 'Khoản vay & Trả góp';
        groupColor = '#EC4899';
      } else if (c === 'TOLL' || c === 'PARKING' || c === 'CAR_WASH') {
        groupName = 'Phí vận hành & Cầu đường';
        groupColor = '#F97316';
      }

      const prev = map.get(groupName) || { name: groupName, value: 0, color: groupColor };
      prev.value += e.amount || 0;
      map.set(groupName, prev);
    });

    return Array.from(map.values()).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    expenses.forEach(e => { if (e.date) yearsSet.add(e.date.slice(0, 4)); });
    fuelLogs.forEach(f => { if (f.date || f.timestamp) yearsSet.add((f.date || f.timestamp).slice(0, 4)); });
    maintRecords.forEach(m => { if (m.date) yearsSet.add(m.date.slice(0, 4)); });
    trips.forEach(t => { if (t.start_time) yearsSet.add(t.start_time.slice(0, 4)); });
    yearsSet.add(String(currentYear));
    return Array.from(yearsSet).filter(y => /^\d{4}$/.test(y)).sort();
  }, [expenses, fuelLogs, maintRecords, trips, currentYear]);

  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const chartTitleYear = selectedYear === 'ALL' ? 'Tất cả các năm' : `Năm ${selectedYear}`;

  const monthlyData = useMemo(() => {
    return MONTHS.map((label, i) => {
      const m = (i + 1).toString().padStart(2, '0');
      let fuel = 0, maint = 0, upgrade = 0, ins = 0, loan = 0, other = 0;
      
      const matchMonth = (dateStr?: string) => {
        if (!dateStr) return false;
        if (selectedYear === 'ALL') {
          return dateStr.slice(5, 7) === m;
        }
        return dateStr.startsWith(`${selectedYear}-${m}`);
      };

      filteredExpenses.filter(e => matchMonth(e.date)).forEach(e => {
        const c = (e.category || '').toUpperCase();
        const amt = e.amount || 0;
        if (c === 'FUEL' || c === 'RUNNING') fuel += amt;
        else if (c === 'MAINTENANCE' || c === 'PARTS' || c === 'LABOR') maint += amt;
        else if (c === 'UPGRADE') upgrade += amt;
        else if (c === 'INSURANCE' || c === 'INITIAL' || c === 'REGISTRATION') ins += amt;
        else if (c === 'LOAN' || c === 'LOAN_PAYMENT' || c === 'LOAN_INTEREST') loan += amt;
        else other += amt;
      });

      const km = filteredTrips
        .filter(t => matchMonth(t.start_time))
        .reduce((s, t) => s + (Number(t.distance_km) || 0), 0);

      return {
        label,
        fuel,
        maint,
        upgrade,
        ins,
        loan,
        other,
        km,
        total: fuel + maint + upgrade + ins + loan + other,
      };
    });
  }, [selectedYear, filteredExpenses, filteredTrips]);

  const assetBarData = filteredAssets.map(a => {
    const totalExp = expenses.filter(e => isSameAsset(e.asset_id, a.id)).reduce((s, e) => s + e.amount, 0);
    return {
      name: `${a.name.split(' ')[0]} ${(a.license_plate || a.model || '').slice(0, 12)}`.slice(0, 18),
      'Giá mua xe': a.purchase_price || 0,
      'Tổng chi nuôi xe': totalExp,
      km: a.current_odometer_km || 0,
    };
  });

  const radarData = assets.length > 0 ? [
    { subject: 'Km đi được', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], Math.min(100, (a.current_odometer_km / 200000) * 100)])) },
    { subject: 'Chi phí phát sinh', ...Object.fromEntries(filteredAssets.map(a => {
      const cost = expenses.filter(e => isSameAsset(e.asset_id, a.id)).reduce((s, e) => s + e.amount, 0);
      return [a.name.split(' ')[0], Math.min(100, (cost / 50_000_000) * 100)];
    })) },
    { subject: 'Giá mua ban đầu', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], Math.min(100, ((a.purchase_price || 0) / 1_000_000_000) * 100)])) },
    { subject: 'Tuổi xe', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], Math.min(100, ((new Date().getFullYear() - (a.year || 2020)) / 15) * 100)])) },
    { subject: 'Số chuyến đi', ...Object.fromEntries(filteredAssets.map(a => {
      const tc = trips.filter(t => isSameAsset(t.asset_id, a.id)).length;
      return [a.name.split(' ')[0], Math.min(100, (tc / 50) * 100)];
    })) },
  ] : [];


  const selectedVehicleObj = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0 max-w-full">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Báo Cáo & Phân Tích</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedAssetId
              ? <span>Phương tiện: <strong className="text-cyan-600 dark:text-cyan-400">{selectedVehicleObj?.name}</strong> • TCO & Hiệu suất vận hành</span>
              : <span>TCO — Total Cost of Ownership • Đội {assets.length} phương tiện • Dữ liệu thực tế</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl max-w-full min-w-0 overflow-x-auto scrollbar-none self-start md:self-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold shrink-0" style={{ color: 'var(--accent-cyan)' }}>
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Năm:</span>
          </div>
          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedYear === 'ALL' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
            style={selectedYear === 'ALL' ? { background: 'var(--accent-cyan)', color: '#0F172A' } : { color: 'var(--text-secondary)' }}
          >
            Tất cả
          </button>
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedYear === yr ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
              style={selectedYear === yr ? { background: 'var(--accent-cyan)', color: '#0F172A' } : { color: 'var(--text-secondary)' }}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Lọc báo cáo theo phương tiện</p>
          {selectedAssetId && <button onClick={() => setSelectedAssetId(null)} className="text-[11px] font-bold underline cursor-pointer" style={{ color: 'var(--accent-cyan)' }}>Xem tất cả</button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div onClick={() => setSelectedAssetId(null)} className={`p-3 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${selectedAssetId === null ? 'ring-2 ring-cyan-400 shadow-lg scale-[1.02]' : 'hover:border-cyan-500/50'}`}
            style={{ background: selectedAssetId === null ? 'rgba(56,189,248,0.15)' : 'var(--bg-secondary)', borderColor: selectedAssetId === null ? 'var(--accent-cyan)' : 'var(--border-default)' }}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm" style={{ background: 'var(--accent-cyan)', color: '#0F172A' }}>ALL</div>
              <div><p className="font-extrabold text-xs" style={{ color: 'var(--text-primary)' }}>Tất cả xe</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{assets.length} xe</p></div>
            </div>
            <p className="text-right text-[11px] font-extrabold mt-2 text-rose-500 dark:text-rose-400 font-mono">{fmtM(expenses.reduce((s, e) => s + e.amount, 0))} ₫</p>
          </div>
          {assets.map((a, ai) => {
            const isSelected = selectedAssetId === a.id;
            const cost = expenses.filter(e => isSameAsset(e.asset_id, a.id)).reduce((s, e) => s + e.amount, 0);
            return (
              <div key={a.id} onClick={() => setSelectedAssetId(isSelected ? null : a.id)}
                className={`p-3 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${isSelected ? 'ring-2 ring-cyan-400 shadow-lg scale-[1.02]' : 'hover:border-cyan-500/50 opacity-90 hover:opacity-100'}`}
                style={{ background: isSelected ? 'rgba(56,189,248,0.15)' : 'var(--bg-secondary)', borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-default)' }}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: 'var(--border-default)', background: CHART_COLORS[ai % CHART_COLORS.length] + '22' }}>
                    {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: CHART_COLORS[ai % CHART_COLORS.length] }}>{a.name.slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.model}</p>
                  </div>
                </div>
                <p className="text-right text-[11px] font-extrabold mt-2 text-rose-500 dark:text-rose-400 font-mono">{fmtM(cost)} ₫</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiGradientCard
          title="Tổng chi phí vận hành"
          value={`${fmtM(totalExpenses)} ₫`}
          subtitle={`${filteredExpenses.length} giao dịch`}
          colorType="rose"
          icon={DollarSign}
        />
        <KpiGradientCard
          title="Tổng km đội xe"
          value={`${fmt(totalKm)} km`}
          subtitle={`${filteredAssets.length} phương tiện`}
          colorType="cyan"
          icon={Gauge}
        />
        <KpiGradientCard
          title="Tổng khấu hao"
          value={`${fmtM(totalDepreciation)} ₫`}
          subtitle={totalPurchase > 0 ? `${((totalDepreciation / totalPurchase) * 100).toFixed(1)}% giá trị ban đầu` : '—'}
          colorType="amber"
          icon={TrendingDown}
        />
        <KpiGradientCard
          title="Giá trị đội xe hiện tại"
          value={`${fmtM(totalFleetValue)} ₫`}
          subtitle="Ước tính thị trường"
          colorType="emerald"
          icon={TrendingUp}
        />
      </div>

      {/* Composed Chart: Multi-category stack + Km bar */}
      <div className="p-3.5 sm:p-5 rounded-2xl space-y-4 shadow-sm max-w-full overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 min-w-0 max-w-full">
          <div className="min-w-0 flex-1">
            <SectionHeader
              icon={Activity}
              title={`Xu hướng chi phí & quãng đường theo tháng — ${chartTitleYear}`}
              sub="Biểu đồ kết hợp: Cột (Km) + Vùng xếp chồng (Chi phí theo nhóm)"
              color="#38BDF8"
            />
          </div>
          <div className="flex items-center justify-between xl:justify-end gap-2 flex-wrap w-full xl:w-auto min-w-0 max-w-full -mt-2 xl:mt-0">
            <div className="flex items-center gap-1 p-1 rounded-xl max-w-full min-w-0 overflow-x-auto scrollbar-none" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <button
                onClick={() => setSelectedYear('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedYear === 'ALL' ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                style={selectedYear === 'ALL' ? { background: 'var(--accent-cyan)', color: '#0F172A' } : { color: 'var(--text-secondary)' }}
              >
                <span className="hidden sm:inline">Tất cả các năm</span>
                <span className="sm:hidden">Tất cả</span>
              </button>
              {availableYears.map(yr => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedYear === yr ? 'shadow-sm' : 'opacity-70 hover:opacity-100'}`}
                  style={selectedYear === yr ? { background: 'var(--accent-cyan)', color: '#0F172A' } : { color: 'var(--text-secondary)' }}
                >
                  {yr}
                </button>
              ))}
            </div>
            <ChartLabelToggle
              showLabels={showMonthlyLabels}
              onToggle={toggleMonthlyLabels}
            />
          </div>
        </div>
        <div style={{ height: showMonthlyLabels ? 335 : 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: showMonthlyLabels ? 22 : 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="kmBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} tickLine={false} />
              <YAxis yAxisId="left" tickFormatter={v => v > 0 ? fmtM(v) : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={48} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={v => v > 0 ? `${fmt(Math.round(v))} km` : '0'}
                tick={{ fill: isDark ? '#34D399' : '#059669', fontSize: 10, fontWeight: 600 }}
                axisLine={{ stroke: isDark ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.3)', strokeWidth: 1 }}
                tickLine={false}
                width={70}
              />
              <ReTooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 12,
                  fontSize: 12,
                  color: tooltipText,
                  boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                }}
                formatter={(v: number, name: string) => {
                  if (name === 'Km di chuyển' || name.includes('Km')) {
                    return [`${fmt(Math.round(v))} km`, 'Quãng đường'];
                  }
                  return [`${fmt(v)} ₫`, name];
                }}
              />
              <Legend
                formatter={(v) => {
                  if (v === 'Km di chuyển') {
                    return <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{v}</span>;
                  }
                  return <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>;
                }}
                wrapperStyle={{ paddingTop: 12 }}
              />
              <Area yAxisId="left" type="monotone" dataKey="fuel" stackId="cost" name="Nhiên liệu" fill="#F59E0B40" stroke="#F59E0B" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="maint" stackId="cost" name="Bảo dưỡng" fill="#06B6D440" stroke="#06B6D4" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="upgrade" stackId="cost" name="Nâng cấp" fill="#8B5CF640" stroke="#8B5CF6" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="ins" stackId="cost" name="Bảo hiểm/Giấy tờ" fill="#10B98140" stroke="#10B981" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="loan" stackId="cost" name="Khoản vay" fill="#EC489940" stroke="#EC4899" strokeWidth={2} />
              <Area yAxisId="left" type="monotone" dataKey="other" stackId="cost" name="Chi phí khác" fill="#64748B40" stroke="#64748B" strokeWidth={2} />
              <Bar yAxisId="right" dataKey="km" name="Km di chuyển" fill="url(#kmBarGrad)" stroke="#10B981" strokeWidth={1} radius={[4, 4, 0, 0]}>
                {showMonthlyLabels && (
                  <LabelList
                    dataKey="km"
                    position="top"
                    formatter={(v: any) => {
                      const n = Number(v) || 0;
                      return n > 0 ? `${Math.round(n)} km` : '';
                    }}
                    style={{ fill: isDark ? '#34D399' : '#059669', fontSize: 9, fontWeight: 700 }}
                    offset={4}
                  />
                )}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Breakdown Donut Chart */}
        <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div>
            <SectionHeader
              icon={DollarSign}
              title="Phân bổ chi phí theo danh mục"
              sub="Tỷ trọng chi tiêu toàn bộ danh mục thực tế"
              color="#F59E0B"
              action={<ChartLabelToggle showLabels={showCategoryLabels} onToggle={toggleCategoryLabels} />}
            />
            {pieData.length > 0 ? (
              <div>
                <div className="relative" style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                        labelLine={false}
                        label={
                          showCategoryLabels
                            ? ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                const pct = getPieLabelPercent(percent);
                                if (pct < 3) return null;
                                const RADIAN = Math.PI / 180;
                                const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                                const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
                                const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="#FFFFFF"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    style={{ fontSize: 10, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                  >
                                    {`${pct}%`}
                                  </text>
                                );
                              }
                            : false
                        }
                      >
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <ReTooltip formatter={(v: number, name) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Tổng chi</span>
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{fmtM(totalExpenses)} ₫</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 max-h-[150px] overflow-y-auto pr-1">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition hover:bg-black/5 dark:hover:bg-white/5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 font-mono">
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400">{totalExpenses > 0 ? ((d.value / totalExpenses) * 100).toFixed(1) : 0}%</span>
                        <strong className="text-[11px]" style={{ color: d.color }}>{fmtM(d.value)} ₫</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu chi phí</div>
            )}
          </div>
        </div>

        {/* Purchase Price vs Total Expenses Comparison Bar Chart */}
        <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div>
            <SectionHeader
              icon={DollarSign}
              title="So sánh Chi phí Mua & Nuôi từng xe"
              sub="So sánh chi tiêu thực tế từng phương tiện trong đội"
              color="#3B82F6"
              action={<ChartLabelToggle showLabels={showCompareLabels} onToggle={toggleCompareLabels} />}
            />
            {assetBarData.length > 0 ? (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetBarData} layout="vertical" margin={{ top: 0, right: showCompareLabels ? 45 : 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: isDark ? '#E2E8F0' : '#1E293B', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={130} />
                    <ReTooltip formatter={(v: number, name) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Giá mua xe" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                      {showCompareLabels && (
                        <LabelList
                          dataKey="Giá mua xe"
                          position="right"
                          formatter={(v: any) => {
                            const n = Number(v) || 0;
                            return n > 0 ? fmtM(n) : '';
                          }}
                          style={{ fill: '#3B82F6', fontSize: 9, fontWeight: 700 }}
                          offset={4}
                        />
                      )}
                    </Bar>
                    <Bar dataKey="Tổng chi nuôi xe" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                      {showCompareLabels && (
                        <LabelList
                          dataKey="Tổng chi nuôi xe"
                          position="right"
                          formatter={(v: any) => {
                            const n = Number(v) || 0;
                            return n > 0 ? fmtM(n) : '';
                          }}
                          style={{ fill: '#F59E0B', fontSize: 9, fontWeight: 700 }}
                          offset={4}
                        />
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

            ) : (
              <div className="h-48 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader
            icon={Fuel}
            title="Chi phí nhiên liệu theo tháng"
            sub={`Biểu đồ cột — ${chartTitleYear}`}
            color="#F59E0B"
            action={<ChartLabelToggle showLabels={showFuelLabels} onToggle={toggleFuelLabels} />}
          />
          <div style={{ height: showFuelLabels ? 235 : 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: showFuelLabels ? 22 : 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} />
                <YAxis tickFormatter={v => v > 0 ? fmtM(v) : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={40} />
                <ReTooltip formatter={(v: number) => [`${fmt(v)} ₫`, 'Chi phí nhiên liệu']} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="fuel" name="Nhiên liệu" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, index) => <Cell key={index} fill={index === new Date().getMonth() ? '#F59E0B' : '#F59E0B70'} />)}
                  {showFuelLabels && (
                    <LabelList
                      dataKey="fuel"
                      position="top"
                      formatter={(v: any) => {
                        const n = Number(v) || 0;
                        return n > 0 ? fmtM(n) : '';
                      }}
                      style={{ fill: '#F59E0B', fontSize: 9, fontWeight: 700 }}
                      offset={4}
                    />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader
            icon={Gauge}
            title="Quãng đường di chuyển theo tháng"
            sub={`Từ dữ liệu nhật ký chuyến đi — ${chartTitleYear}`}
            color="#10B981"
            action={<ChartLabelToggle showLabels={showDistanceLabels} onToggle={toggleDistanceLabels} />}
          />
          <div style={{ height: showDistanceLabels ? 235 : 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: showDistanceLabels ? 22 : 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} />
                <YAxis tickFormatter={v => v > 0 ? `${fmt(Math.round(v))}` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={40} />
                <ReTooltip formatter={(v: number) => [`${fmt(Math.round(v))} km`, 'Quãng đường']} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="km" name="Km di chuyển" stroke="#10B981" strokeWidth={2.5} fill="url(#kmGrad)" dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }}>
                  {showDistanceLabels && (
                    <LabelList
                      dataKey="km"
                      position="top"
                      formatter={(v: any) => {
                        const n = Number(v) || 0;
                        return n > 0 ? `${Math.round(n)}` : '';
                      }}
                      style={{ fill: '#10B981', fontSize: 9, fontWeight: 700 }}
                      offset={6}
                    />
                  )}
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {!selectedAssetId && assets.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <SectionHeader icon={Activity} title="So sánh đa chiều giữa các xe" sub="Radar chart — 5 chỉ số được chuẩn hóa 0–100" color="#8B5CF6" />
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#CBD5E1' : '#334155', fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  {assets.slice(0, 5).map((a, i) => (
                    <Radar key={a.id} name={a.name} dataKey={a.name.split(' ')[0]} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.2} strokeWidth={2} />
                  ))}
                  <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl shadow-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <SectionHeader
              icon={Wrench}
              title="Chi phí bảo dưỡng & nhiên liệu theo xe"
              sub="Tổng chi phí phân theo từng phương tiện"
              color="#06B6D4"
              action={<ChartLabelToggle showLabels={showAssetCostLabels} onToggle={toggleAssetCostLabels} />}
            />
            <div style={{ height: showAssetCostLabels ? 295 : 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assets.map((a, ai) => ({
                  name: a.name.split(' ')[0],
                  'Bảo dưỡng': maintRecords.filter(m => isSameAsset(m.asset_id, a.id)).reduce((s, m) => s + m.cost, 0),
                  'Nhiên liệu': fuelLogs.filter(f => isSameAsset(f.asset_id, a.id)).reduce((s, f) => s + f.total_cost, 0),
                }))} margin={{ top: showAssetCostLabels ? 22 : 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} />
                  <YAxis tickFormatter={v => fmtM(v)} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={40} />
                  <ReTooltip formatter={(v: number, name) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Bảo dưỡng" fill="#06B6D4" radius={[4, 4, 0, 0]}>
                    {showAssetCostLabels && (
                      <LabelList
                        dataKey="Bảo dưỡng"
                        position="top"
                        formatter={(v: number) => (v > 0 ? fmtM(v) : '')}
                        style={{ fontSize: 9, fontWeight: 700, fill: '#06B6D4' }}
                      />
                    )}
                  </Bar>
                  <Bar dataKey="Nhiên liệu" fill="#F59E0B" radius={[4, 4, 0, 0]}>
                    {showAssetCostLabels && (
                      <LabelList
                        dataKey="Nhiên liệu"
                        position="top"
                        formatter={(v: number) => (v > 0 ? fmtM(v) : '')}
                        style={{ fontSize: 9, fontWeight: 700, fill: '#F59E0B' }}
                      />
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="p-3.5 sm:p-5 rounded-2xl space-y-4 shadow-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <SectionHeader icon={Car} title="Thống kê chuyến đi" sub="Phân tích hành trình dựa trên dữ liệu ghi nhận thực tế" color="#10B981" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tổng chuyến đi', value: filteredTrips.length, unit: 'chuyến', color: '#38BDF8' },
            { label: 'Tổng quãng đường', value: fmt(Math.round(totalTripKm)), unit: 'km', color: '#10B981' },
            { label: 'Tốc độ TB', value: avgSpeed > 0 ? avgSpeed.toFixed(1) : '—', unit: 'km/h', color: '#8B5CF6' },
            { label: 'Chi phí / km', value: totalTripKm > 0 ? fmt(Math.round(totalExpenses / totalTripKm)) : '—', unit: '₫/km', color: '#F59E0B' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl text-center shadow-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-2xl font-extrabold font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

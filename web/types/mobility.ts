export type AssetType = 'CAR' | 'MOTORCYCLE' | 'MOTORBIKE' | 'BICYCLE' | 'E_BIKE' | 'SCOOTER' | 'OTHER';

export type OdometerSource = 'OBD' | 'GPS' | 'MANUAL' | 'VIRTUAL' | 'IMPORT';

export interface AssetCapabilities {
  has_mileage: boolean;
  has_gps: boolean;
  has_fuel: boolean;
  has_obd: boolean;
  has_engine: boolean;
  has_battery: boolean;
  has_ride: boolean;
  has_maintenance: boolean;
  has_parts: boolean;
  has_upgrades: boolean;
  has_finance: boolean;
  has_insurance: boolean;
  has_documents: boolean;
}

export interface Asset {
  id: string;
  name: string;
  asset_type: AssetType;
  category?: string;
  brand: string;
  model: string;
  year: number;
  trim?: string;
  color?: string;
  license_plate?: string;
  vin?: string;
  serial_number?: string;
  engine?: string;
  fuel_type?: string;
  tank_capacity_liters?: number;
  battery_capacity_kwh?: number;
  purchase_date?: string;
  purchase_price: number;
  current_value: number;
  current_market_value?: number;
  initial_odometer_km: number;
  current_odometer_km: number;
  virtual_odometer_km: number;
  odometer_source: OdometerSource;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SOLD';
  image_url?: string;
  description?: string;
  sales_rep_name?: string;
  sales_rep_phone?: string;
  brand_hotline?: string;
  capabilities: AssetCapabilities;
  // Derived quick stats
  fuel_level_percent?: number;
  estimated_range_km?: number;
  avg_consumption_l100km?: number;
  total_rides?: number;
  avg_speed_kmh?: number;
  next_maintenance_due?: string;
}

export interface CardDisplaySettings {
  showPhoto: boolean;
  showName: boolean;
  showType: boolean;
  showPrice: boolean;
  showLicensePlate: boolean;
  showOdometer: boolean;
  showFuelLevel: boolean;
  showConsumption: boolean;
  showRange: boolean;
  showLoan: boolean;
  showNextMaintenance: boolean;
  cardStyle: 'grid' | 'compact' | 'list';
}

export const DEFAULT_CARD_SETTINGS: CardDisplaySettings = {
  showPhoto: true, showName: true, showType: true, showPrice: true,
  showLicensePlate: true, showOdometer: true, showFuelLevel: true,
  showConsumption: true, showRange: true, showLoan: true,
  showNextMaintenance: true, cardStyle: 'grid',
};


export const TAXONOMY: Record<string, { label: string; subcategories: Record<string, string> }> = {
  Initial: {
    label: '🚗 Chi phí mua xe & lăn bánh ban đầu (Initial)',
    subcategories: {
      Purchase: 'Đặt cọc & Tiền mua xe',
      Registration: 'Trước bạ, Đăng kiểm, Phí biển số',
      Insurance: 'Bảo hiểm thân vỏ',
      'Loan Fee': 'Phí dịch vụ ngân hàng',
      'Loan Insurance': 'Phí bảo hiểm khoản vay',
    }
  },
  Upgrade: {
    label: '🛠️ Nâng cấp & Đồ chơi xe (Upgrade)',
    subcategories: {
      Screen: 'Màn hình & ADAS',
      'Mirror Folding': 'Gập gương điện',
      'Control button': 'Phím media vô năng',
      TPMS: 'Cảm biến áp suất lốp (TPMS)',
      Accessorie: 'Phụ kiện & Đồ chơi (Thảm, Bơm, Sạc, Thùng rác...)',
    }
  },
  Running: {
    label: '⛽ Chi phí vận hành (Running)',
    subcategories: {
      Fuel: 'Xăng / Nhiên liệu / Sạc pin',
      'Epass Fee': 'Phí trạm VETC / Epass',
      Parking: 'Sân đỗ / Gửi xe',
      'Car Wash': 'Rửa xe & Máy rửa xe gia đình',
      'Running Fine': 'Phí phạt & Phí trạm khác',
    }
  },
  Loan: {
    label: '💳 Khoản vay mua xe (Loan)',
    subcategories: {
      'Monthly Payment': 'Trả gốc vay hàng tháng',
      Interest: 'Trả lãi vay hàng tháng',
    }
  },
  Maintenance: {
    label: '🔧 Bảo dưỡng & Sửa chữa (Maintenance)',
    subcategories: {
      'General Service': 'Bảo dưỡng định kỳ',
      Brake: 'Sửa phanh / Thay lốp / Phụ tùng',
      Other: 'Khác',
    }
  }
};

export function getDynamicTaxonomy(): Record<string, { label: string; subcategories: Record<string, string> }> {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('fmms_master_taxonomy');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return TAXONOMY;
}

export interface ExpenseRecord {
  id: string;
  asset_id: string;
  date: string;
  category: string;
  subcategory?: string;
  amount: number;
  currency: string;
  vendor?: string;
  odometer_km?: number;
  description: string;
}

export interface LoanRecord {
  id: string;
  asset_id: string;
  lender: string;
  principal: number;
  down_payment: number;
  interest_rate_percent: number;
  preferred_rate_percent?: number;
  preferred_months?: number;
  floating_rate_percent?: number;
  loan_ratio_percent?: number;
  term_months: number;
  start_date?: string;
  monthly_payment: number;
  current_balance: number;
  payment_day: number;
  status: 'ACTIVE' | 'CLOSED';
  notes?: string;
  bank_contact_name?: string;
  bank_contact_phone?: string;
  bank_hotline?: string;
}

export interface TripRecord {
  id: string;
  asset_id: string;
  start_time: string;
  end_time: string;
  distance_km: number;
  duration_seconds: number;
  fuel_used_liters?: number;
  average_consumption_l100km?: number;
  average_speed_kmh: number;
  max_speed_kmh: number;
  start_location?: string;
  end_location?: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  maintenance_type: string;
  date: string;
  odometer_km: number;
  cost: number;
  vendor: string;
  notes?: string;
  next_due_km?: number;
  next_due_date?: string;
  status: 'OK' | 'DUE_SOON' | 'OVERDUE';
}

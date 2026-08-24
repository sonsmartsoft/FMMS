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

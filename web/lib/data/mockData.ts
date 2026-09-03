import { Asset, ExpenseRecord, MaintenanceRecord, TripRecord, LoanRecord } from '@/types/mobility';
import { PartRecord } from '@/lib/services/partService';
import { OdometerLogRecord } from '@/lib/services/odometerService';

export const REAL_ASSET_IDS = {
  MAZDA2_2026: '20260308-0001-4222-8888-19b213872026',
  SIRIUS_RC_2017: '20170801-0002-4111-8888-88c121063016',
  SIRIUS_FI_2021: '20210405-0003-4333-8888-88f160436021',
  MTB_26_03: '20240310-0004-4444-8888-000000260555',
  MTB_20_05: '20240310-0005-4555-8888-000000200555',
  HONDA_CRV_RS: '20300308-0006-4666-8888-00000ca20300',
};

export interface FuelLog {
  id: string;
  date: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km: number;
  station: string;
  notes?: string;
  consumption_l100km?: number;
}

export const INITIAL_ASSETS: Asset[] = [];
export const MOCK_FUEL_LOGS: FuelLog[] = [];
export const MOCK_MAINTENANCE_RECORDS: MaintenanceRecord[] = [];
export const MOCK_EXPENSES: ExpenseRecord[] = [];
export const MOCK_TRIPS: TripRecord[] = [];
export const MOCK_PARTS: PartRecord[] = [];
export const MOCK_ODOMETER_LOGS: OdometerLogRecord[] = [];
export const MOCK_LOAN: any = null;

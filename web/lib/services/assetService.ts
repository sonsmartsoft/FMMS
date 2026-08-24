import { createClient } from '@/lib/supabase/client';
import { Asset, AssetCapabilities, AssetType } from '@/types/mobility';
import { INITIAL_ASSETS } from '@/lib/data/mockData';

export type AssetCapabilitiesRow = AssetCapabilities;

const DEFAULT_CAPS: AssetCapabilities = {
  has_mileage: true, has_gps: false, has_fuel: false, has_obd: false, has_engine: false,
  has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
  has_upgrades: true, has_finance: false, has_insurance: false, has_documents: true,
};

function toBoolean(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function toNum(v: unknown): number | undefined {
  return typeof v === 'number' ? v : v != null ? Number(v) : undefined;
}

/** Map a raw `assets` row (+ embedded `asset_capabilities`) into the UI Asset shape */
export function mapAssetRow(row: any, capsRow?: any): Asset {
  const caps: AssetCapabilities = {
    has_mileage: toBoolean(capsRow?.has_mileage, DEFAULT_CAPS.has_mileage),
    has_gps: toBoolean(capsRow?.has_gps, DEFAULT_CAPS.has_gps),
    has_fuel: toBoolean(capsRow?.has_fuel, DEFAULT_CAPS.has_fuel),
    has_obd: toBoolean(capsRow?.has_obd, DEFAULT_CAPS.has_obd),
    has_engine: toBoolean(capsRow?.has_engine, DEFAULT_CAPS.has_engine),
    has_battery: toBoolean(capsRow?.has_battery, DEFAULT_CAPS.has_battery),
    has_ride: toBoolean(capsRow?.has_ride, DEFAULT_CAPS.has_ride),
    has_maintenance: toBoolean(capsRow?.has_maintenance, DEFAULT_CAPS.has_maintenance),
    has_parts: toBoolean(capsRow?.has_parts, DEFAULT_CAPS.has_parts),
    has_upgrades: toBoolean(capsRow?.has_upgrades, DEFAULT_CAPS.has_upgrades),
    has_finance: toBoolean(capsRow?.has_finance, DEFAULT_CAPS.has_finance),
    has_insurance: toBoolean(capsRow?.has_insurance, DEFAULT_CAPS.has_insurance),
    has_documents: toBoolean(capsRow?.has_documents, DEFAULT_CAPS.has_documents),
  };
  return {
    id: row.id,
    name: row.name,
    asset_type: row.asset_type as AssetType,
    category: row.category ?? undefined,
    brand: row.brand,
    model: row.model,
    year: Number(row.year),
    trim: row.trim ?? undefined,
    color: row.color ?? undefined,
    license_plate: row.license_plate ?? undefined,
    vin: row.vin ?? undefined,
    serial_number: row.serial_number ?? undefined,
    engine: row.engine ?? undefined,
    fuel_type: row.fuel_type ?? undefined,
    tank_capacity_liters: toNum(row.tank_capacity_liters),
    battery_capacity_kwh: toNum(row.battery_capacity_kwh),
    purchase_date: row.purchase_date ?? undefined,
    purchase_price: toNum(row.purchase_price) ?? 0,
    current_value: toNum(row.current_value) ?? 0,
    initial_odometer_km: toNum(row.initial_odometer_km) ?? 0,
    current_odometer_km: toNum(row.current_odometer_km) ?? 0,
    virtual_odometer_km: toNum(row.virtual_odometer_km) ?? 0,
    odometer_source: (row.odometer_source ?? 'VIRTUAL') as Asset['odometer_source'],
    status: (row.status ?? 'ACTIVE') as Asset['status'],
    image_url: row.image_url ?? undefined,
    description: row.description ?? undefined,
    sales_rep_name: row.sales_rep_name ?? undefined,
    sales_rep_phone: row.sales_rep_phone ?? undefined,
    brand_hotline: row.brand_hotline ?? undefined,
    capabilities: caps,
  };
}

/** Return the logged-in user's id + first fleet id (auto-creates fleet if missing). */
export async function getUserContext(): Promise<{ userId: string | null; fleetId: string | null }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { userId: null, fleetId: null };

  const { data: fleets } = await supabase
    .from('fleets')
    .select('id')
    .eq('owner_user_id', userId)
    .limit(1);
  if (fleets && fleets.length > 0) {
    return { userId, fleetId: fleets[0].id };
  }

  const { data: created } = await supabase
    .from('fleets')
    .insert({ owner_user_id: userId, name: 'Fleet gia đình', description: 'Fleet mặc định' })
    .select('id')
    .single();
  return { userId, fleetId: created?.id ?? null };
}

export async function getAssets() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_capabilities(*)')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((row: any) => mapAssetRow(row, row.asset_capabilities));
    }
  } catch {}
  return INITIAL_ASSETS;
}

export async function getAsset(id: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_capabilities(*)')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) {
      return mapAssetRow(data, data.asset_capabilities);
    }
  } catch {}
  const found = INITIAL_ASSETS.find(
    a => a.id === id ||
    (id === 'CAR01' && a.id === '22222222-2222-2222-2222-222222222222') ||
    (a.id === 'CAR01' && id === '22222222-2222-2222-2222-222222222222')
  );
  return found || INITIAL_ASSETS[0];
}

export type AssetInput = {
  name: string;
  asset_type: AssetType;
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  year?: number;
  trim?: string;
  color?: string;
  license_plate?: string;
  vin?: string;
  serial_number?: string;
  engine?: string;
  fuel_type?: Asset['fuel_type'];
  tank_capacity_liters?: number;
  battery_capacity_kwh?: number;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  current_market_value?: number;
  initial_odometer_km?: number;
  current_odometer_km?: number;
  virtual_odometer_km?: number;
  odometer_source?: Asset['odometer_source'];
  status?: Asset['status'];
  image_url?: string;
  description?: string;
  sales_rep_name?: string;
  sales_rep_phone?: string;
  brand_hotline?: string;
  capabilities?: Partial<AssetCapabilities>;
};

export async function createAsset(data: AssetInput) {
  const supabase = createClient();
  const { userId, fleetId } = await getUserContext();
  if (!userId) throw new Error('Chưa đăng nhập');

  const { data: created, error } = await supabase
    .from('assets')
    .insert({
      fleet_id: fleetId,
      owner_id: userId,
      name: data.name,
      asset_type: data.asset_type,
      category: data.category,
      subcategory: data.subcategory,
      brand: data.brand,
      model: data.model,
      year: data.year,
      trim: data.trim,
      color: data.color,
      license_plate: data.license_plate,
      vin: data.vin,
      serial_number: data.serial_number,
      engine: data.engine,
      fuel_type:
        data.fuel_type ??
        (data.asset_type === 'E_BIKE'
          ? 'ELECTRIC'
          : data.asset_type === 'BICYCLE'
            ? 'HUMAN_POWER'
            : undefined),
      tank_capacity_liters: data.tank_capacity_liters,
      battery_capacity_kwh: data.battery_capacity_kwh,
      purchase_date: data.purchase_date,
      purchase_price: data.purchase_price ?? 0,
      current_value: data.current_value ?? data.purchase_price ?? 0,
      initial_odometer_km: data.initial_odometer_km ?? 0,
      current_odometer_km: data.current_odometer_km ?? data.initial_odometer_km ?? 0,
      virtual_odometer_km: data.virtual_odometer_km ?? data.current_odometer_km ?? 0,
      odometer_source: data.odometer_source ?? 'VIRTUAL',
      status: data.status ?? 'ACTIVE',
      image_url: data.image_url,
      description: data.description,
    })
    .select()
    .single();
  if (error) throw error;

  if (data.capabilities) {
    const merged = { ...DEFAULT_CAPS, ...data.capabilities };
    await supabase
      .from('asset_capabilities')
      .insert({ asset_id: created.id, ...merged });
  }

  return mapAssetRow(created);
}

export async function updateAsset(id: string, data: Partial<AssetInput>) {
  const supabase = createClient();
  const payload: Record<string, any> = {};
  if ('name' in data) payload.name = data.name;
  if ('asset_type' in data) payload.asset_type = data.asset_type;
  if ('brand' in data) payload.brand = data.brand;
  if ('model' in data) payload.model = data.model;
  if ('year' in data) payload.year = data.year;
  if ('color' in data) payload.color = data.color;
  if ('license_plate' in data) payload.license_plate = data.license_plate;
  if ('vin' in data) payload.vin = data.vin;
  if ('engine' in data) payload.engine = data.engine;
  if ('fuel_type' in data) payload.fuel_type = data.fuel_type;
  if ('tank_capacity_liters' in data) payload.tank_capacity_liters = data.tank_capacity_liters;
  if ('battery_capacity_kwh' in data) payload.battery_capacity_kwh = data.battery_capacity_kwh;
  if ('purchase_date' in data) payload.purchase_date = data.purchase_date;
  if ('purchase_price' in data) payload.purchase_price = data.purchase_price;
  if ('current_value' in data) payload.current_value = data.current_value;
  if ('image_url' in data) payload.image_url = data.image_url;
  if ('current_odometer_km' in data) payload.current_odometer_km = data.current_odometer_km;
  if ('virtual_odometer_km' in data) payload.virtual_odometer_km = data.virtual_odometer_km;
  if ('status' in data) payload.status = data.status;
  if ('description' in data) payload.description = data.description;
  if ('sales_rep_name' in data) payload.sales_rep_name = data.sales_rep_name;
  if ('sales_rep_phone' in data) payload.sales_rep_phone = data.sales_rep_phone;
  if ('brand_hotline' in data) payload.brand_hotline = data.brand_hotline;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('assets')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
  return getAsset(id);
}

export async function deleteAsset(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
}
import { createClient } from '@/lib/supabase/client';
import { Asset, AssetCapabilities, AssetType } from '@/types/mobility';
import { addSyncLog } from './syncLogger';
import { getCurrentUserMember } from './userService';

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
  const isCar = row.asset_type === 'CAR';
  const caps: AssetCapabilities = {
    has_mileage: toBoolean(capsRow?.has_mileage, true),
    has_gps: toBoolean(capsRow?.has_gps, isCar),
    has_fuel: toBoolean(capsRow?.has_fuel, isCar),
    has_obd: toBoolean(capsRow?.has_obd, isCar),
    has_engine: toBoolean(capsRow?.has_engine, isCar),
    has_battery: toBoolean(capsRow?.has_battery, false),
    has_ride: toBoolean(capsRow?.has_ride, !isCar),
    has_maintenance: toBoolean(capsRow?.has_maintenance, true),
    has_parts: toBoolean(capsRow?.has_parts, true),
    has_upgrades: toBoolean(capsRow?.has_upgrades, true),
    has_finance: toBoolean(capsRow?.has_finance, isCar),
    has_insurance: toBoolean(capsRow?.has_insurance, isCar),
    has_documents: toBoolean(capsRow?.has_documents, true),
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
    inspection_expiry_date: row.inspection_expiry_date ?? undefined,
    inspection_date: row.inspection_date ?? undefined,
    registration_date: row.registration_date ?? undefined,
    next_maintenance_due: row.next_maintenance_due ?? undefined,
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
    .order('created_at', { ascending: true })
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

export async function getAssets(options?: { includeAll?: boolean }): Promise<Asset[]> {
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_assets');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbAssets: Asset[] = [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_capabilities(*)')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      dbAssets = data.map((row: any) => mapAssetRow(row, row.asset_capabilities));
    }
  } catch {}

  let allAssets: Asset[] = [...dbAssets];

  // Apply custom edits from localStorage
  allAssets = allAssets.map(a => {
    const custom = customMap[a.id] || customMap[resolveAssetId(a.id)];
    return custom ? { ...a, ...custom } : a;
  });

  if (options?.includeAll) {
    return allAssets;
  }

  // Filter based on member permission if logged in as MEMBER
  try {
    const currentMember = await getCurrentUserMember();
    if (currentMember && currentMember.role === 'MEMBER') {
      const assignedIds = new Set<string>();
      (currentMember.assigned_asset_ids || []).forEach(id => {
        if (id) {
          assignedIds.add(id);
          assignedIds.add(resolveAssetId(id));
        }
      });

      return allAssets.filter(a => assignedIds.has(a.id) || assignedIds.has(resolveAssetId(a.id)));
    }
  } catch (err) {
    console.warn('Filter assets by user permission failed:', err);
  }

  return allAssets;
}

export async function getAllAssets(): Promise<Asset[]> {
  return getAssets({ includeAll: true });
}

export function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function resolveAssetId(id?: string): string {
  if (!id) return '20260308-0001-4222-8888-19b213872026';
  if (id === 'CAR01' || id === '22222222-2222-2222-2222-222222222222') return '20260308-0001-4222-8888-19b213872026';
  if (id === 'BIKE01') return '20170801-0002-4111-8888-88c121063016';
  if (id === 'BIKE02') return '20210405-0003-4333-8888-88f160436021';
  if (id === 'BIKE03') return '20240310-0004-4444-8888-000000260555';
  if (id === 'BIKE04') return '20240310-0005-4555-8888-000000200555';
  if (id === 'CAR02') return '20300308-0006-4666-8888-00000ca20300';
  return id;
}

export async function getAsset(id: string): Promise<Asset> {
  const realId = resolveAssetId(id);
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_assets');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbAsset: Asset | null = null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('assets')
      .select('*, asset_capabilities(*)')
      .or(`id.eq.${realId},id.eq.${id}`)
      .maybeSingle();
    if (!error && data) {
      dbAsset = mapAssetRow(data, data.asset_capabilities);
    }
  } catch {}

  let found = dbAsset;
  if (!found) {
    const all = await getAssets();
    found = all.find(a => a.id === realId || a.id === id) || null;
  }

  if (!found) {
    throw new Error('Không tìm thấy thông tin phương tiện');
  }

  const custom = customMap[id] || customMap[realId] || customMap[found.id];
  return custom ? { ...found, ...custom } : found;
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
  inspection_expiry_date?: string;
  inspection_date?: string;
  registration_date?: string;
  next_maintenance_due?: string;
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
      inspection_expiry_date: data.inspection_expiry_date,
      inspection_date: data.inspection_date,
      registration_date: data.registration_date,
      next_maintenance_due: data.next_maintenance_due,
    })
    .select()
    .single();
  if (error) {
    addSyncLog({
      table: 'assets',
      action: 'INSERT',
      status: 'ERROR',
      summary: `Tạo xe "${data.name}" thất bại`,
      payload: data,
      errorDetails: error.message,
    });
    throw error;
  }

  addSyncLog({
    table: 'assets',
    action: 'INSERT',
    status: 'SUCCESS',
    entityId: created.id,
    summary: `Đã tạo xe "${data.name}" lên Cloud thành công`,
    payload: data,
  });

  if (data.capabilities) {
    const merged = { ...DEFAULT_CAPS, ...data.capabilities };
    await supabase
      .from('asset_capabilities')
      .insert({ asset_id: created.id, ...merged });
  }

  return mapAssetRow(created);
}

export async function updateAsset(id: string, data: Partial<AssetInput>): Promise<Asset> {
  const realId = resolveAssetId(id);

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_assets');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = { ...(customMap[id] || {}), ...data, id: realId };
      customMap[realId] = { ...(customMap[realId] || {}), ...data, id: realId };
      localStorage.setItem('fmms_custom_assets', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Update Supabase
  try {
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
    if ('inspection_expiry_date' in data) payload.inspection_expiry_date = data.inspection_expiry_date;
    if ('inspection_date' in data) payload.inspection_date = data.inspection_date;
    if ('registration_date' in data) payload.registration_date = data.registration_date;
    if ('next_maintenance_due' in data) payload.next_maintenance_due = data.next_maintenance_due;
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('assets')
      .update(payload)
      .or(`id.eq.${realId},id.eq.${id}`);

    if (error) {
      addSyncLog({
        table: 'assets',
        action: 'UPDATE',
        status: 'ERROR',
        entityId: id,
        summary: `Cập nhật xe ${id} thất bại`,
        payload: data,
        errorDetails: error.message,
      });
      if (error.message?.includes('schema cache') || error.message?.includes('column')) {
        delete payload.sales_rep_name;
        delete payload.sales_rep_phone;
        delete payload.brand_hotline;
        delete payload.inspection_expiry_date;
        delete payload.inspection_date;
        delete payload.registration_date;
        delete payload.next_maintenance_due;
        await supabase.from('assets').update(payload).or(`id.eq.${realId},id.eq.${id}`);
      }
    } else {
      addSyncLog({
        table: 'assets',
        action: 'UPDATE',
        status: 'SUCCESS',
        entityId: id,
        summary: `Đã cập nhật xe ${id} lên Cloud thành công`,
        payload: data,
      });
    }
  } catch (err: any) {
    addSyncLog({
      table: 'assets',
      action: 'UPDATE',
      status: 'FALLBACK',
      entityId: id,
      summary: `Cập nhật xe ${id} lưu tạm LocalStorage`,
      errorDetails: err?.message,
    });
    console.warn('updateAsset fallback:', err?.message);
  }

  return getAsset(id);
}

export async function deleteAsset(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) {
    addSyncLog({
      table: 'assets',
      action: 'DELETE',
      status: 'ERROR',
      entityId: id,
      summary: `Xóa xe ${id} thất bại`,
      errorDetails: error.message,
    });
    throw error;
  }
  addSyncLog({
    table: 'assets',
    action: 'DELETE',
    status: 'SUCCESS',
    entityId: id,
    summary: `Đã xóa xe ${id} trên Cloud thành công`,
  });
}
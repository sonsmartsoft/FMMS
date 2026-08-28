-- ================================================================
-- FMMS — CONSOLIDATED SETUP SCRIPT
-- Paste toàn bộ file này vào Supabase SQL Editor và Run
-- Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ================================================================

-- 1. Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES (IF NOT EXISTS — safe to run multiple times)

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fleets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Gia đình',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('CAR', 'MOTORCYCLE', 'MOTORBIKE', 'BICYCLE', 'E_BIKE', 'SCOOTER', 'OTHER')),
    category TEXT,
    subcategory TEXT,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    trim TEXT,
    color TEXT,
    license_plate TEXT,
    vin TEXT,
    serial_number TEXT,
    engine TEXT,
    fuel_type TEXT CHECK (fuel_type IN ('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'HUMAN_POWER', 'NONE')),
    tank_capacity_liters NUMERIC(6,2),
    battery_capacity_kwh NUMERIC(6,2),
    purchase_date DATE,
    purchase_price NUMERIC(14,2) DEFAULT 0,
    current_value NUMERIC(14,2) DEFAULT 0,
    initial_odometer_km NUMERIC(10,2) DEFAULT 0,
    current_odometer_km NUMERIC(10,2) DEFAULT 0,
    virtual_odometer_km NUMERIC(10,2) DEFAULT 0,
    odometer_source TEXT DEFAULT 'VIRTUAL',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD')),
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_capabilities (
    asset_id UUID PRIMARY KEY REFERENCES public.assets(id) ON DELETE CASCADE,
    has_mileage BOOLEAN DEFAULT TRUE,
    has_gps BOOLEAN DEFAULT FALSE,
    has_fuel BOOLEAN DEFAULT FALSE,
    has_obd BOOLEAN DEFAULT FALSE,
    has_engine BOOLEAN DEFAULT FALSE,
    has_battery BOOLEAN DEFAULT FALSE,
    has_ride BOOLEAN DEFAULT FALSE,
    has_maintenance BOOLEAN DEFAULT TRUE,
    has_parts BOOLEAN DEFAULT TRUE,
    has_upgrades BOOLEAN DEFAULT TRUE,
    has_finance BOOLEAN DEFAULT FALSE,
    has_insurance BOOLEAN DEFAULT FALSE,
    has_documents BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    odometer_km NUMERIC(10,2) NOT NULL,
    fuel_liters NUMERIC(6,2) NOT NULL,
    price_per_liter NUMERIC(10,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    station TEXT,
    tank_full BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    maintenance_type TEXT NOT NULL,
    date DATE NOT NULL,
    odometer_km NUMERIC(10,2),
    cost NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    vendor TEXT,
    notes TEXT,
    next_due_km NUMERIC(10,2),
    next_due_date DATE,
    warranty_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('FUEL','MAINTENANCE','PARTS','LABOR','INSURANCE','REGISTRATION','INSPECTION','TOLL','PARKING','UPGRADE','WASH','OTHER')),
    sub_category TEXT,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'VND',
    vendor TEXT,
    odometer_km NUMERIC(10,2),
    description TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    lender TEXT NOT NULL,
    loan_number_alias TEXT,
    principal NUMERIC(14,2) NOT NULL,
    down_payment NUMERIC(14,2) DEFAULT 0,
    interest_rate_percent NUMERIC(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    monthly_payment NUMERIC(12,2) NOT NULL,
    payment_day INTEGER DEFAULT 15,
    current_balance NUMERIC(14,2) NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_paid NUMERIC(12,2) NOT NULL,
    interest_paid NUMERIC(12,2) NOT NULL,
    total_payment NUMERIC(12,2) NOT NULL,
    paid_date DATE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    remaining_balance NUMERIC(14,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    policy_type TEXT CHECK (policy_type IN ('MANDATORY', 'COMPREHENSIVE', 'OTHER')),
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    cost NUMERIC(12,2) NOT NULL,
    coverage_amount NUMERIC(14,2),
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_odometer NUMERIC(10,2),
    end_odometer NUMERIC(10,2),
    distance_km NUMERIC(8,2) DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    fuel_used_liters NUMERIC(6,2) DEFAULT 0,
    average_consumption_l100km NUMERIC(5,2),
    average_speed_kmh NUMERIC(5,2),
    max_speed_kmh NUMERIC(5,2),
    status TEXT DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    part_number TEXT,
    brand TEXT,
    supplier TEXT,
    purchase_date DATE,
    installation_date DATE,
    cost NUMERIC(12,2) DEFAULT 0,
    installed_odometer_km NUMERIC(10,2),
    replacement_interval_km NUMERIC(10,2),
    current_part_km NUMERIC(10,2) DEFAULT 0,
    status TEXT DEFAULT 'INSTALLED' CHECK (status IN ('INSTALLED', 'REPLACED', 'SPARE')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.upgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'ELECTRONICS',
    cost NUMERIC(12,2) DEFAULT 0,
    installation_date DATE,
    vendor TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    document_date DATE,
    expiry_date DATE,
    storage_path TEXT NOT NULL DEFAULT '',
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    device_type TEXT NOT NULL DEFAULT 'ZESTECH_ADAS',
    device_name TEXT NOT NULL,
    mac_address TEXT,
    serial_number TEXT,
    app_version TEXT,
    last_seen TIMESTAMPTZ,
    status TEXT DEFAULT 'ONLINE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.obd_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    adapter_id TEXT DEFAULT 'KONNWEI_KW906',
    protocol TEXT DEFAULT 'AUTO',
    elm_version TEXT,
    supported_pids JSONB DEFAULT '[]'::jsonb,
    polling_profile TEXT DEFAULT 'NORMAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.telemetry_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    rpm NUMERIC(6,1),
    speed_kmh NUMERIC(5,1),
    engine_load_percent NUMERIC(5,1),
    coolant_temp_c NUMERIC(5,1),
    intake_temp_c NUMERIC(5,1),
    maf_gps NUMERIC(6,2),
    throttle_percent NUMERIC(5,1),
    fuel_level_percent NUMERIC(5,1),
    fuel_rate_lph NUMERIC(6,2),
    battery_voltage NUMERIC(4,2),
    engine_runtime_seconds INTEGER,
    stft NUMERIC(5,2),
    ltft NUMERIC(5,2),
    odometer_km NUMERIC(10,2),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    gps_speed_kmh NUMERIC(5,1),
    gps_accuracy NUMERIC(5,2),
    connection_quality TEXT DEFAULT 'GOOD',
    data_quality TEXT DEFAULT 'VALID',
    raw_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.battery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    battery_percent NUMERIC(5,2) NOT NULL,
    health_state_percent NUMERIC(5,2),
    charge_cycles INTEGER,
    estimated_range_km NUMERIC(6,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    distance_km NUMERIC(8,2) DEFAULT 0,
    fuel_used_liters NUMERIC(6,2) DEFAULT 0,
    average_consumption_l100km NUMERIC(5,2) DEFAULT 0,
    fuel_cost NUMERIC(12,2) DEFAULT 0,
    cost_per_km NUMERIC(10,2) DEFAULT 0,
    average_speed_kmh NUMERIC(5,2) DEFAULT 0,
    trip_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, date)
);

CREATE TABLE IF NOT EXISTS public.monthly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    distance_km NUMERIC(10,2) DEFAULT 0,
    fuel_used_liters NUMERIC(8,2) DEFAULT 0,
    average_consumption_l100km NUMERIC(5,2) DEFAULT 0,
    fuel_cost NUMERIC(14,2) DEFAULT 0,
    maintenance_cost NUMERIC(14,2) DEFAULT 0,
    total_expense NUMERIC(14,2) DEFAULT 0,
    cost_per_km NUMERIC(10,2) DEFAULT 0,
    trip_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asset_id, year, month)
);

CREATE TABLE IF NOT EXISTS public.odometer_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    previous_value_km NUMERIC(10,2) NOT NULL,
    adjustment_km NUMERIC(10,2) NOT NULL,
    new_value_km NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    source TEXT DEFAULT 'MANUAL',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    registration_number TEXT,
    inspection_date DATE,
    inspection_expiry DATE,
    road_fee_expiry DATE,
    cost NUMERIC(12,2) DEFAULT 0,
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- 3. INDEXES (skip if exist)
CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_asset ON public.fuel_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON public.maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_expenses_asset ON public.expenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_loans_asset ON public.loans(asset_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_trips_asset ON public.trips(asset_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_asset ON public.telemetry_samples(asset_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_battery_asset ON public.battery_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_daily_asset ON public.daily_summaries(asset_id);
CREATE INDEX IF NOT EXISTS idx_monthly_asset ON public.monthly_summaries(asset_id);
CREATE INDEX IF NOT EXISTS idx_odometer_asset ON public.odometer_adjustments(asset_id);
CREATE INDEX IF NOT EXISTS idx_obd_asset ON public.obd_profiles(asset_id);
CREATE INDEX IF NOT EXISTS idx_registrations_asset ON public.registrations(asset_id);
CREATE INDEX IF NOT EXISTS idx_sync_asset ON public.sync_queue(asset_id);
CREATE INDEX IF NOT EXISTS idx_parts_asset ON public.parts(asset_id);

-- 4. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. AUTO-CREATE FLEET FOR NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.fleets (owner_user_id, name, description)
  VALUES (NEW.id, 'Fleet gia đình', 'Fleet mặc định')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_profile();

-- 6. ROW LEVEL SECURITY

-- Helper: là chủ sở hữu asset? (dùng cho mọi bảng con theo asset)
CREATE OR REPLACE FUNCTION public.is_asset_owner(asset_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.assets
        WHERE id = asset_id_param AND owner_id = auth.uid()
    );
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obd_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odometer_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only themselves
DROP POLICY IF EXISTS "profiles_self" ON public.profiles;
CREATE POLICY "profiles_self" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Fleets: owners only
DROP POLICY IF EXISTS "fleets_owner" ON public.fleets;
CREATE POLICY "fleets_owner" ON public.fleets FOR ALL USING (auth.uid() = owner_user_id);

-- Assets: owner_id matches
DROP POLICY IF EXISTS "assets_owner" ON public.assets;
CREATE POLICY "assets_owner" ON public.assets FOR ALL USING (auth.uid() = owner_id);

-- Asset capabilities: via asset owner
DROP POLICY IF EXISTS "capabilities_via_asset" ON public.asset_capabilities;
CREATE POLICY "capabilities_via_asset" ON public.asset_capabilities FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_capabilities.asset_id AND assets.owner_id = auth.uid()));

-- All operational tables: via asset owner
DROP POLICY IF EXISTS "fuel_logs_via_asset" ON public.fuel_logs;
CREATE POLICY "fuel_logs_via_asset" ON public.fuel_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = fuel_logs.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "maintenance_via_asset" ON public.maintenance_records;
CREATE POLICY "maintenance_via_asset" ON public.maintenance_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = maintenance_records.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "expenses_via_asset" ON public.expenses;
CREATE POLICY "expenses_via_asset" ON public.expenses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = expenses.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "loans_via_asset" ON public.loans;
CREATE POLICY "loans_via_asset" ON public.loans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = loans.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "loan_payments_via_loan" ON public.loan_payments;
CREATE POLICY "loan_payments_via_loan" ON public.loan_payments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.loans
    JOIN public.assets ON assets.id = loans.asset_id
    WHERE loans.id = loan_payments.loan_id AND assets.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "trips_via_asset" ON public.trips;
CREATE POLICY "trips_via_asset" ON public.trips FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = trips.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "parts_via_asset" ON public.parts;
CREATE POLICY "parts_via_asset" ON public.parts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = parts.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "upgrades_via_asset" ON public.upgrades;
CREATE POLICY "upgrades_via_asset" ON public.upgrades FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = upgrades.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "insurance_via_asset" ON public.insurance_policies;
CREATE POLICY "insurance_via_asset" ON public.insurance_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = insurance_policies.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "documents_via_asset" ON public.asset_documents;
CREATE POLICY "documents_via_asset" ON public.asset_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = asset_documents.asset_id AND assets.owner_id = auth.uid()));

-- Devices: gắn asset hoặc chưa gắn (pairing)
DROP POLICY IF EXISTS "devices_via_asset" ON public.devices;
CREATE POLICY "devices_via_asset" ON public.devices FOR ALL
  USING (asset_id IS NULL OR EXISTS (SELECT 1 FROM public.assets WHERE assets.id = devices.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "obd_via_asset" ON public.obd_profiles;
CREATE POLICY "obd_via_asset" ON public.obd_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = obd_profiles.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "telemetry_via_asset" ON public.telemetry_samples;
CREATE POLICY "telemetry_via_asset" ON public.telemetry_samples FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = telemetry_samples.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "battery_via_asset" ON public.battery_logs;
CREATE POLICY "battery_via_asset" ON public.battery_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = battery_logs.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "daily_via_asset" ON public.daily_summaries;
CREATE POLICY "daily_via_asset" ON public.daily_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = daily_summaries.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "monthly_via_asset" ON public.monthly_summaries;
CREATE POLICY "monthly_via_asset" ON public.monthly_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = monthly_summaries.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "odometer_via_asset" ON public.odometer_adjustments;
CREATE POLICY "odometer_via_asset" ON public.odometer_adjustments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = odometer_adjustments.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "registrations_via_asset" ON public.registrations;
CREATE POLICY "registrations_via_asset" ON public.registrations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = registrations.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "sync_queue_via_asset" ON public.sync_queue;
CREATE POLICY "sync_queue_via_asset" ON public.sync_queue FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = sync_queue.asset_id AND assets.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('VEHICLE', 'PART', 'UPGRADE', 'OTHER')),
    item_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    policy_number TEXT,
    start_date DATE NOT NULL,
    expiry_date DATE,
    expiry_km NUMERIC(10,2),
    coverage_details TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CLAIMED', 'VOID')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warranty_id UUID REFERENCES public.warranties(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount_claimed NUMERIC(12,2) DEFAULT 0,
    amount_approved NUMERIC(12,2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED')),
    vendor TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dashboard_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_fields JSONB NOT NULL DEFAULT '["image","name","type","brand","price","plate","mileage","fuel","next_maint"]'::jsonb,
    sort_by TEXT DEFAULT 'created_at',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for v5.2
CREATE INDEX IF NOT EXISTS idx_warranties_asset ON public.warranties(asset_id);
CREATE INDEX IF NOT EXISTS idx_claims_warranty ON public.warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_asset ON public.audit_logs(asset_id);

-- RLS for v5.2
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warranties_via_asset" ON public.warranties;
CREATE POLICY "warranties_via_asset" ON public.warranties FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = warranties.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "claims_via_asset" ON public.warranty_claims;
CREATE POLICY "claims_via_asset" ON public.warranty_claims FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assets WHERE assets.id = warranty_claims.asset_id AND assets.owner_id = auth.uid()));

DROP POLICY IF EXISTS "audit_self" ON public.audit_logs;
CREATE POLICY "audit_self" ON public.audit_logs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dashboard_self" ON public.dashboard_settings;
CREATE POLICY "dashboard_self" ON public.dashboard_settings FOR ALL USING (auth.uid() = user_id);

-- ================================================================
-- XONG! Chạy thành công → đăng ký user trên app → data tự tạo
-- ================================================================

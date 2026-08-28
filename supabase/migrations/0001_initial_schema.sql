-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0001: Initial Schema Definition
-- Core: Assets, Fleet, Devices, Telemetry, Operations, Finance, AI
-- ========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. USER PROFILES & FLEETS
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- 2. ASSETS (CAR, MOTORCYCLE, BICYCLE, E_BIKE, ETC.)
-- --------------------------------------------------------
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
    odometer_source TEXT DEFAULT 'VIRTUAL' CHECK (odometer_source IN ('OBD', 'GPS', 'MANUAL', 'VIRTUAL', 'IMPORT')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SOLD')),
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capability Matrix per Asset
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

-- Backward Compatibility View for Legacy "vehicles" queries
CREATE OR REPLACE VIEW public.vehicles AS
SELECT 
    id, fleet_id, vin, license_plate, brand AS make, model, year, trim, engine, 
    fuel_type, tank_capacity_liters, current_odometer_km AS odometer_km, 
    (status = 'ACTIVE') AS active, created_at, updated_at
FROM public.assets
WHERE asset_type IN ('CAR', 'MOTORCYCLE', 'MOTORBIKE', 'SCOOTER');

-- --------------------------------------------------------
-- 3. DEVICES & OBD PROFILES
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- 4. TRIPS, RIDES & TELEMETRY
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    start_odometer NUMERIC(10,2),
    end_odometer NUMERIC(10,2),
    distance_km NUMERIC(8,2) DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    fuel_start_percent NUMERIC(5,2),
    fuel_end_percent NUMERIC(5,2),
    fuel_used_liters NUMERIC(6,2) DEFAULT 0,
    average_consumption_l100km NUMERIC(5,2),
    average_speed_kmh NUMERIC(5,2),
    max_speed_kmh NUMERIC(5,2),
    elevation_gain_m NUMERIC(6,2) DEFAULT 0,
    start_latitude NUMERIC(10,7),
    start_longitude NUMERIC(10,7),
    end_latitude NUMERIC(10,7),
    end_longitude NUMERIC(10,7),
    gps_polyline TEXT,
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('RECORDING', 'COMPLETED', 'DISCARDED')),
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

-- --------------------------------------------------------
-- 5. FUEL, BATTERY & CHARGING LOGS
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- 6. SUMMARIES & VIRTUAL ODOMETER LEDGER
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- 7. MAINTENANCE, PARTS & UPGRADES
-- --------------------------------------------------------
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

-- --------------------------------------------------------
-- 8. EXPENSES, FINANCE & DOCUMENTS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL CHECK (category IN ('FUEL', 'MAINTENANCE', 'PARTS', 'LABOR', 'INSURANCE', 'REGISTRATION', 'INSPECTION', 'TOLL', 'PARKING', 'UPGRADE', 'WASH', 'OTHER')),
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

CREATE TABLE IF NOT EXISTS public.asset_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    document_date DATE,
    expiry_date DATE,
    storage_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

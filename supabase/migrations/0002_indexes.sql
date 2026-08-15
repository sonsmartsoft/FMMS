-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0002: Performance Indexes
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_fleet ON public.assets(fleet_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(asset_type);

CREATE INDEX IF NOT EXISTS idx_devices_asset ON public.devices(asset_id);

CREATE INDEX IF NOT EXISTS idx_trips_asset_start ON public.trips(asset_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_trips_device ON public.trips(device_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_asset_time ON public.telemetry_samples(asset_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_trip_time ON public.telemetry_samples(trip_id, timestamp ASC);

CREATE INDEX IF NOT EXISTS idx_fuel_asset_time ON public.fuel_logs(asset_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_battery_asset_time ON public.battery_logs(asset_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_asset_date ON public.daily_summaries(asset_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_summaries_asset ON public.monthly_summaries(asset_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset_date ON public.maintenance_records(asset_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_parts_asset ON public.parts(asset_id);
CREATE INDEX IF NOT EXISTS idx_upgrades_asset ON public.upgrades(asset_id);

CREATE INDEX IF NOT EXISTS idx_expenses_asset_date ON public.expenses(asset_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_loans_asset ON public.loans(asset_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON public.loan_payments(loan_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_insurance_asset ON public.insurance_policies(asset_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_documents_asset ON public.asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(asset_id, status);

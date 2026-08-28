-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0003: Row Level Security (RLS) Policies
-- ========================================================

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
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Helper policy functions for owner access
CREATE OR REPLACE FUNCTION public.is_asset_owner(asset_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.assets 
        WHERE id = asset_id_param 
          AND owner_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policy
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Fleets Policy
CREATE POLICY "Owners can manage own fleets" ON public.fleets
    FOR ALL USING (owner_user_id = auth.uid());

-- Assets Policy
CREATE POLICY "Owners can manage own assets" ON public.assets
    FOR ALL USING (owner_id = auth.uid());

-- Asset Capabilities Policy
CREATE POLICY "Owners can manage capabilities" ON public.asset_capabilities
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Devices Policy
CREATE POLICY "Owners can manage devices" ON public.devices
    FOR ALL USING (
        asset_id IS NULL OR public.is_asset_owner(asset_id)
    );

-- Trips Policy
CREATE POLICY "Owners can manage trips" ON public.trips
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Telemetry Samples Policy
CREATE POLICY "Owners can manage telemetry" ON public.telemetry_samples
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Fuel Logs Policy
CREATE POLICY "Owners can manage fuel logs" ON public.fuel_logs
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Battery Logs Policy
CREATE POLICY "Owners can manage battery logs" ON public.battery_logs
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Summaries Policies
CREATE POLICY "Owners can view daily summaries" ON public.daily_summaries
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can view monthly summaries" ON public.monthly_summaries
    FOR ALL USING (public.is_asset_owner(asset_id));

-- Maintenance & Operations Policies
CREATE POLICY "Owners can manage maintenance" ON public.maintenance_records
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage parts" ON public.parts
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage upgrades" ON public.upgrades
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage expenses" ON public.expenses
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage loans" ON public.loans
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage loan payments" ON public.loan_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.loans l 
            JOIN public.assets a ON a.id = l.asset_id 
            WHERE l.id = loan_payments.loan_id AND a.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage insurance" ON public.insurance_policies
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage registrations" ON public.registrations
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage documents" ON public.asset_documents
    FOR ALL USING (public.is_asset_owner(asset_id));

CREATE POLICY "Owners can manage sync queue" ON public.sync_queue
    FOR ALL USING (public.is_asset_owner(asset_id));

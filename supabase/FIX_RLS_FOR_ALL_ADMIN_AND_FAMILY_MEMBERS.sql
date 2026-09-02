-- ========================================================
-- FIX RLS: ALLOW ALL ADMINS AND FAMILY MEMBERS FULL ACCESS TO ASSETS
-- Paste and Run this in Supabase SQL Editor
-- ========================================================

-- 1. ASSETS
DROP POLICY IF EXISTS "Owners can manage own assets" ON public.assets;
DROP POLICY IF EXISTS "Allow all authenticated family users" ON public.assets;
CREATE POLICY "Allow all authenticated family users" ON public.assets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. ASSET CAPABILITIES
DROP POLICY IF EXISTS "Owners can manage capabilities" ON public.asset_capabilities;
DROP POLICY IF EXISTS "Allow all authenticated family capabilities" ON public.asset_capabilities;
CREATE POLICY "Allow all authenticated family capabilities" ON public.asset_capabilities
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. FLEETS
DROP POLICY IF EXISTS "Owners can manage own fleets" ON public.fleets;
DROP POLICY IF EXISTS "Allow all authenticated family fleets" ON public.fleets;
CREATE POLICY "Allow all authenticated family fleets" ON public.fleets
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. DEVICES
DROP POLICY IF EXISTS "Owners can manage devices" ON public.devices;
DROP POLICY IF EXISTS "Allow all authenticated family devices" ON public.devices;
CREATE POLICY "Allow all authenticated family devices" ON public.devices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. TRIPS
DROP POLICY IF EXISTS "Owners can manage trips" ON public.trips;
DROP POLICY IF EXISTS "Allow all authenticated family trips" ON public.trips;
CREATE POLICY "Allow all authenticated family trips" ON public.trips
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. TELEMETRY SAMPLES
DROP POLICY IF EXISTS "Owners can manage telemetry" ON public.telemetry_samples;
DROP POLICY IF EXISTS "Allow all authenticated family telemetry" ON public.telemetry_samples;
CREATE POLICY "Allow all authenticated family telemetry" ON public.telemetry_samples
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. FUEL LOGS
DROP POLICY IF EXISTS "Owners can manage fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Allow all authenticated family fuel logs" ON public.fuel_logs;
CREATE POLICY "Allow all authenticated family fuel logs" ON public.fuel_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. BATTERY LOGS
DROP POLICY IF EXISTS "Owners can manage battery logs" ON public.battery_logs;
DROP POLICY IF EXISTS "Allow all authenticated family battery logs" ON public.battery_logs;
CREATE POLICY "Allow all authenticated family battery logs" ON public.battery_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. MAINTENANCE RECORDS
DROP POLICY IF EXISTS "Owners can manage maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Allow all authenticated family maintenance" ON public.maintenance_records;
CREATE POLICY "Allow all authenticated family maintenance" ON public.maintenance_records
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. PARTS & UPGRADES
DROP POLICY IF EXISTS "Owners can manage parts" ON public.parts;
DROP POLICY IF EXISTS "Allow all authenticated family parts" ON public.parts;
CREATE POLICY "Allow all authenticated family parts" ON public.parts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage upgrades" ON public.upgrades;
DROP POLICY IF EXISTS "Allow all authenticated family upgrades" ON public.upgrades;
CREATE POLICY "Allow all authenticated family upgrades" ON public.upgrades
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. EXPENSES
DROP POLICY IF EXISTS "Owners can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all authenticated family expenses" ON public.expenses;
CREATE POLICY "Allow all authenticated family expenses" ON public.expenses
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. LOANS & LOAN PAYMENTS
DROP POLICY IF EXISTS "Owners can manage loans" ON public.loans;
DROP POLICY IF EXISTS "Allow all authenticated family loans" ON public.loans;
CREATE POLICY "Allow all authenticated family loans" ON public.loans
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage loan payments" ON public.loan_payments;
DROP POLICY IF EXISTS "Allow all authenticated family loan payments" ON public.loan_payments;
CREATE POLICY "Allow all authenticated family loan payments" ON public.loan_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. INSURANCE, REGISTRATIONS, DOCUMENTS
DROP POLICY IF EXISTS "Owners can manage insurance" ON public.insurance_policies;
DROP POLICY IF EXISTS "Allow all authenticated family insurance" ON public.insurance_policies;
CREATE POLICY "Allow all authenticated family insurance" ON public.insurance_policies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow all authenticated family registrations" ON public.registrations;
CREATE POLICY "Allow all authenticated family registrations" ON public.registrations
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage documents" ON public.asset_documents;
DROP POLICY IF EXISTS "Allow all authenticated family documents" ON public.asset_documents;
CREATE POLICY "Allow all authenticated family documents" ON public.asset_documents
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. SUMMARIES & ADJUSTMENTS
DROP POLICY IF EXISTS "Owners can view daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Allow all authenticated family daily summaries" ON public.daily_summaries;
CREATE POLICY "Allow all authenticated family daily summaries" ON public.daily_summaries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can view monthly summaries" ON public.monthly_summaries;
DROP POLICY IF EXISTS "Allow all authenticated family monthly summaries" ON public.monthly_summaries;
CREATE POLICY "Allow all authenticated family monthly summaries" ON public.monthly_summaries
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can manage odometer adjustments" ON public.odometer_adjustments;
DROP POLICY IF EXISTS "Allow all authenticated family odometer adjustments" ON public.odometer_adjustments;
CREATE POLICY "Allow all authenticated family odometer adjustments" ON public.odometer_adjustments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. PROFILES
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated family profiles" ON public.profiles;
CREATE POLICY "Allow all authenticated family profiles" ON public.profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

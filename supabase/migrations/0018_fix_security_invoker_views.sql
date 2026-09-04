-- ========================================================
-- Migration: 0018_fix_security_invoker_views.sql
-- Description: Fix Supabase Security Advisor "Security Definer View" issues
--              by enabling security_invoker = true on all views so RLS
--              policies on underlying tables are properly enforced.
-- ========================================================

-- 1. View: public.vehicles
ALTER VIEW public.vehicles SET (security_invoker = true);

-- 2. View: public.vehicle_latest_positions
ALTER VIEW public.vehicle_latest_positions SET (security_invoker = true);

-- 3. View: public.device_latest_positions
ALTER VIEW public.device_latest_positions SET (security_invoker = true);

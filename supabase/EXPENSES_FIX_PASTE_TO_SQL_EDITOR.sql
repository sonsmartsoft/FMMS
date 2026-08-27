-- ==============================================================================
-- FMMS SUPABASE: EXPENSES TABLE SCHEMA UPGRADE & FIX
-- ==============================================================================
-- Paste this script into Supabase SQL Editor and click RUN.
-- This ensures the expenses table accepts all 2-tier categories and subcategories.

-- 1. Relax or drop check constraint on category to support all taxonomy categories
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- 2. Ensure both subcategory and sub_category columns exist
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- 3. Sync existing values if needed
UPDATE public.expenses 
SET subcategory = sub_category 
WHERE subcategory IS NULL AND sub_category IS NOT NULL;

UPDATE public.expenses 
SET sub_category = subcategory 
WHERE sub_category IS NULL AND subcategory IS NOT NULL;

-- 4. Enable full RLS permissions for expenses
GRANT ALL ON public.expenses TO anon, authenticated, service_role;

-- 5. Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- FMMS DEDUPE VEHICLES — Paste vào Supabase SQL Editor
-- Giữ lại 5 xe: Mazda2 AT, Road Bike, VinFast, BMW, MTB2.
-- Xóa 4 bản trùng, chuyển trips/GPS sang xe giữ trước khi xóa.
-- ============================================================

-- Map: asset bị xóa -> asset giữ
-- Mazda2 Base  -> Mazda2 AT
-- Road Bike dup-> Road Bike cf8f5570
-- VinFast dup  -> VinFast e07b6117
-- BMW dup      -> BMW 710b2f42

-- 1. Chuyển GPS points sang asset được giữ
UPDATE public.gps_track_points
SET vehicle_id = '1e369122-dd2e-4f3f-ab5e-a6f5b47c7473'
WHERE vehicle_id = '45eef635-4753-4a60-9dcc-6f8258b90b68';

UPDATE public.gps_track_points
SET vehicle_id = 'cf8f5570-2a9d-47c7-9399-ecbb55543718'
WHERE vehicle_id = '9abb1afe-c56f-4593-8c31-12b41690f714';

UPDATE public.gps_track_points
SET vehicle_id = 'e07b6117-90d4-4633-b50a-ebac9f54e6b0'
WHERE vehicle_id = '9b3d235f-239d-4d54-a1f6-f4eebae9f3fa';

UPDATE public.gps_track_points
SET vehicle_id = '710b2f42-87ef-49d2-8bc4-65d8f429a6f4'
WHERE vehicle_id = '3142516c-dfa7-4f37-a9fa-419ac9896345';

-- 2. Chuyển trips sang asset được giữ
UPDATE public.trips
SET asset_id = '1e369122-dd2e-4f3f-ab5e-a6f5b47c7473'
WHERE asset_id = '45eef635-4753-4a60-9dcc-6f8258b90b68';

UPDATE public.trips
SET asset_id = 'cf8f5570-2a9d-47c7-9399-ecbb55543718'
WHERE asset_id = '9abb1afe-c56f-4593-8c31-12b41690f714';

UPDATE public.trips
SET asset_id = 'e07b6117-90d4-4633-b50a-ebac9f54e6b0'
WHERE asset_id = '9b3d235f-239d-4d54-a1f6-f4eebae9f3fa';

UPDATE public.trips
SET asset_id = '710b2f42-87ef-49d2-8bc4-65d8f429a6f4'
WHERE asset_id = '3142516c-dfa7-4f37-a9fa-419ac9896345';

-- 3. Đồng bộ device (nếu có) sang xe giữ
UPDATE public.devices
SET vehicle_id = '1e369122-dd2e-4f3f-ab5e-a6f5b47c7473'
WHERE vehicle_id = '45eef635-4753-4a60-9dcc-6f8258b90b68';

UPDATE public.devices
SET vehicle_id = 'cf8f5570-2a9d-47c7-9399-ecbb55543718'
WHERE vehicle_id = '9abb1afe-c56f-4593-8c31-12b41690f714';

UPDATE public.devices
SET vehicle_id = 'e07b6117-90d4-4633-b50a-ebac9f54e6b0'
WHERE vehicle_id = '9b3d235f-239d-4d54-a1f6-f4eebae9f3fa';

UPDATE public.devices
SET vehicle_id = '710b2f42-87ef-49d2-8bc4-65d8f429a6f4'
WHERE vehicle_id = '3142516c-dfa7-4f37-a9fa-419ac9896345';

UPDATE public.devices SET asset_id = vehicle_id WHERE asset_id IS NULL;

-- 4. Xóa 4 assets trùng (CASCADE với các bảng theo dõi)
DELETE FROM public.assets
WHERE id IN (
    '45eef635-4753-4a60-9dcc-6f8258b90b68',
    '9abb1afe-c56f-4593-8c31-12b41690f714',
    '9b3d235f-239d-4d54-a1f6-f4eebae9f3fa',
    '3142516c-dfa7-4f37-a9fa-419ac9896345'
);

-- 5. Kiểm tra
SELECT id, name, status FROM public.assets ORDER BY name;
-- ==============================================================================
-- FMMS: TRA CỨU & DỌN DẸP THIẾT BỊ TRÙNG LẶP KONNWEI KW906
-- ==============================================================================

-- 1. TRA CỨU TẤT CẢ CÁC THIẾT BỊ ĐANG CÓ TRONG BẢNG DEVICES
SELECT 
  d.id AS device_id,
  d.device_name,
  d.device_type,
  d.mac_address,
  d.last_seen,
  d.status,
  d.vehicle_id,
  a.name AS vehicle_name,
  (SELECT COUNT(*) FROM public.telemetry_samples WHERE device_id = d.id) AS telemetry_count,
  (SELECT COUNT(*) FROM public.gps_track_points WHERE device_id = d.id) AS gps_count
FROM public.devices d
LEFT JOIN public.assets a ON a.id = d.vehicle_id OR a.id = d.asset_id
ORDER BY d.last_seen DESC NULLS LAST;

-- 2. DỌN DẸP THIẾT BỊ RÁC / TRÙNG LẶP:
-- Thiết bị THỰC SỰ ĐANG DÙNG là thiết bị có telemetry_count > 0 hoặc có last_seen mới nhất.
-- Thiết bị RÁC (0 telemetry, không có last_seen hoặc MAC rác) sẽ được xóa an toàn bằng lệnh:

-- DELETE FROM public.devices 
-- WHERE id = '<DEVICE_ID_CẦN_XÓA>';

-- Hoặc tự động xóa các thiết bị trùng lặp KONNWEI không có dữ liệu telemetry:
DELETE FROM public.devices d
WHERE (d.device_name ILIKE '%KONNWEI%' OR d.device_name ILIKE '%KW906%')
  AND NOT EXISTS (
    SELECT 1 FROM public.telemetry_samples t WHERE t.device_id = d.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.gps_track_points g WHERE g.device_id = d.id
  )
  AND d.id NOT IN (
    -- Giữ lại 1 thiết bị mới nhất
    SELECT id FROM public.devices 
    WHERE (device_name ILIKE '%KONNWEI%' OR device_name ILIKE '%KW906%')
    ORDER BY last_seen DESC NULLS LAST 
    LIMIT 1
  );

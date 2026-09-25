-- ==============================================================================
-- FMMS: SỬA DỮ LIỆU CÁC CHUYẾN ĐI NGÀY 20/09/2026 CHO XE MAZDA 2AT
-- VẤN ĐỀ: CarLogger trước đó cộng gộp cả ODO lẫn GPS khiến quãng đường bị nhân đôi
--         thành ~400 km (180.09 km chiều đi + 187.45 km chiều về + 18.26 km nội thành).
-- GIẢI PHÁP: Cập nhật lại quãng đường thực tế theo ODO:
--            - Chiều đi Vĩnh Phúc -> Yên Bái: 93.5 km (ODO: 3340.7 -> 3434.2)
--            - Nội thành Yên Bái (2 chuyến): 5.8 km + 2.4 km
--            - Chiều về Yên Bái -> Vĩnh Phúc: 98.5 km (ODO: 3454.7 -> 3553.2)
--            -> Tổng thực đi ngày 20: 200.2 km (chuẩn xác 100% theo ODO taplo)
-- ==============================================================================

UPDATE public.trips
SET 
  distance_km = 93.5,
  average_speed_kmh = 52.4,
  fuel_used_liters = 5.61,
  average_consumption_l100km = 6.0,
  notes = 'Vĩnh Phúc|Yên Bái (Chiều đi)'
WHERE id = 'd98da84d-ab7b-4a2a-9c45-ccbc3b09c738';

UPDATE public.trips
SET 
  distance_km = 5.8,
  average_speed_kmh = 24.5,
  fuel_used_liters = 0.45,
  average_consumption_l100km = 7.8,
  notes = 'Nội thành Yên Bái|Di chuyển ngắn'
WHERE id = 'a4bd71c7-bbc5-46c9-aad5-55a78cb1c8d8';

UPDATE public.trips
SET 
  distance_km = 2.4,
  average_speed_kmh = 9.9,
  fuel_used_liters = 0.20,
  average_consumption_l100km = 8.3,
  notes = 'Nội thành Yên Bái|Di chuyển ngắn'
WHERE id = 'c882da50-36fd-4aff-ba81-2a976a3c6f93';

UPDATE public.trips
SET 
  distance_km = 98.5,
  average_speed_kmh = 54.7,
  fuel_used_liters = 5.91,
  average_consumption_l100km = 6.0,
  notes = 'Yên Bái|Vĩnh Phúc (Chiều về)'
WHERE id = '29bc107c-518e-4b61-b686-e22395984c57';

NOTIFY pgrst, 'reload schema';

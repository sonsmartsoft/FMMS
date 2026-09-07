const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const MAZDA_ID = '20260308-0001-4222-8888-19b213872026';

const RAW_65_TRIPS = [
  // 🚗 CHẶNG SHOWROOM
  { id: '20260409-0000-0000-0000-000000000000', start_time: '2026-04-09 08:00:00+07', end_time: '2026-04-09 08:30:00+07', start_odometer: 0.0, end_odometer: 12.0, distance_km: 12.0, duration_seconds: 1800, average_speed_kmh: 24.0, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3215, end_longitude: 105.4012, notes: 'Nhà máy Thaco|Showroom Mazda Phú Thọ (Nhận xe mới)' },

  // 📅 THÁNG 4/2026 (ODO: 12 km -> 409 km)
  { id: '20260411-0001-0000-0000-000000000001', start_time: '2026-04-11 08:30:00+07', end_time: '2026-04-11 09:15:00+07', start_odometer: 12.0, end_odometer: 24.0, distance_km: 12.0, duration_seconds: 2700, average_speed_kmh: 26.7, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4000, notes: 'Showroom Mazda|Bắt đầu nâng cấp xe' },
  { id: '20260412-0001-0000-0000-000000000002', start_time: '2026-04-12 07:30:00+07', end_time: '2026-04-12 09:30:00+07', start_odometer: 24.0, end_odometer: 108.0, distance_km: 84.0, duration_seconds: 7200, average_speed_kmh: 42.0, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.2500, end_longitude: 105.5200, notes: 'Nhà|Về 2 quê' },
  { id: '20260414-0001-0000-0000-000000000003', start_time: '2026-04-14 08:00:00+07', end_time: '2026-04-14 10:15:00+07', start_odometer: 108.0, end_odometer: 195.0, distance_km: 87.0, duration_seconds: 8100, average_speed_kmh: 38.7, max_speed_kmh: 60.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3800, end_longitude: 105.5500, notes: 'Nhà|Về nhà bà ngoại lấy đồ' },
  { id: '20260417-0001-0000-0000-000000000004', start_time: '2026-04-17 16:00:00+07', end_time: '2026-04-17 16:45:00+07', start_odometer: 195.0, end_odometer: 218.0, distance_km: 23.0, duration_seconds: 2700, average_speed_kmh: 30.7, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3250, end_longitude: 105.4100, notes: 'Nhà|Mưa to trời có dị tượng' },
  { id: '20260419-0001-0000-0000-000000000005', start_time: '2026-04-19 10:30:00+07', end_time: '2026-04-19 11:15:00+07', start_odometer: 218.0, end_odometer: 235.0, distance_km: 17.0, duration_seconds: 2700, average_speed_kmh: 37.8, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4200, notes: 'Nhà|Ăn cưới Giang Thắng' },
  { id: '20260423-0001-0000-0000-000000000006', start_time: '2026-04-23 08:00:00+07', end_time: '2026-04-23 08:40:00+07', start_odometer: 235.0, end_odometer: 251.0, distance_km: 16.0, duration_seconds: 2400, average_speed_kmh: 24.0, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3180, end_longitude: 105.3980, notes: 'Nhà|Di chuyển công việc & gia đình' },
  { id: '20260425-0001-0000-0000-000000000007', start_time: '2026-04-25 08:00:00+07', end_time: '2026-04-25 09:00:00+07', start_odometer: 251.0, end_odometer: 281.0, distance_km: 30.0, duration_seconds: 3600, average_speed_kmh: 30.0, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi lại thường nhật' },
  { id: '20260426-0001-0000-0000-000000000008', start_time: '2026-04-26 07:30:00+07', end_time: '2026-04-26 10:00:00+07', start_odometer: 281.0, end_odometer: 386.0, distance_km: 105.0, duration_seconds: 9000, average_speed_kmh: 42.0, max_speed_kmh: 70.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.1800, end_longitude: 105.6500, notes: 'Nhà|Hành trình đường dài cuối tuần' },
  { id: '20260430-0001-0000-0000-000000000009', start_time: '2026-04-30 08:30:00+07', end_time: '2026-04-30 09:15:00+07', start_odometer: 386.0, end_odometer: 409.0, distance_km: 23.0, duration_seconds: 2700, average_speed_kmh: 30.7, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3250, end_longitude: 105.4100, notes: 'Nhà|Đi lại trước kỳ nghỉ lễ 30/4' },

  // 📅 THÁNG 5/2026 (ODO: 409 km -> 824 km)
  { id: '20260501-0001-0000-0000-000000000010', start_time: '2026-05-01 08:30:00+07', end_time: '2026-05-01 09:30:00+07', start_odometer: 409.0, end_odometer: 437.0, distance_km: 28.0, duration_seconds: 3600, average_speed_kmh: 28.0, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3350, end_longitude: 105.4250, notes: 'Nhà|Du xuân nghỉ lễ 1/5' },
  { id: '20260502-0001-0000-0000-000000000011', start_time: '2026-05-02 08:00:00+07', end_time: '2026-05-02 09:20:00+07', start_odometer: 437.0, end_odometer: 479.0, distance_km: 42.0, duration_seconds: 4800, average_speed_kmh: 31.5, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.2800, end_longitude: 105.4900, notes: 'Nhà|Xuống dì Nga chơi' },
  { id: '20260503-0001-0000-0000-000000000012', start_time: '2026-05-03 08:30:00+07', end_time: '2026-05-03 10:00:00+07', start_odometer: 479.0, end_odometer: 525.0, distance_km: 46.0, duration_seconds: 5400, average_speed_kmh: 30.7, max_speed_kmh: 52.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3600, end_longitude: 105.4800, notes: 'Nhà|Hành trình nghỉ lễ 3/5' },
  { id: '20260504-0001-0000-0000-000000000013', start_time: '2026-05-04 15:30:00+07', end_time: '2026-05-04 17:00:00+07', start_odometer: 525.0, end_odometer: 568.0, distance_km: 43.0, duration_seconds: 5400, average_speed_kmh: 28.7, max_speed_kmh: 50.0, start_latitude: 21.3600, start_longitude: 105.4800, end_latitude: 21.3050, end_longitude: 105.3850, notes: 'Điểm đến|Trở về sau kỳ nghỉ lễ' },
  { id: '20260507-0001-0000-0000-000000000014', start_time: '2026-05-07 08:00:00+07', end_time: '2026-05-07 08:35:00+07', start_odometer: 568.0, end_odometer: 583.0, distance_km: 15.0, duration_seconds: 2100, average_speed_kmh: 25.7, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4050, notes: 'Nhà|Đi làm & công việc' },
  { id: '20260509-0001-0000-0000-000000000015', start_time: '2026-05-09 09:00:00+07', end_time: '2026-05-09 09:45:00+07', start_odometer: 583.0, end_odometer: 601.0, distance_km: 18.0, duration_seconds: 2700, average_speed_kmh: 24.0, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3250, end_longitude: 105.4100, notes: 'Nhà|Di chuyển nội thành' },
  { id: '20260510-0001-0000-0000-000000000016', start_time: '2026-05-10 14:00:00+07', end_time: '2026-05-10 15:30:00+07', start_odometer: 601.0, end_odometer: 653.0, distance_km: 52.0, duration_seconds: 5400, average_speed_kmh: 34.7, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3500, end_longitude: 105.4600, notes: 'Nhà|Xước sau xe va vào cửa bác Nhật' },
  { id: '20260511-0001-0000-0000-000000000017', start_time: '2026-05-11 07:45:00+07', end_time: '2026-05-11 08:45:00+07', start_odometer: 653.0, end_odometer: 683.0, distance_km: 30.0, duration_seconds: 3600, average_speed_kmh: 30.0, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi làm & công việc đầu tuần' },
  { id: '20260512-0001-0000-0000-000000000018', start_time: '2026-05-12 11:30:00+07', end_time: '2026-05-12 11:45:00+07', start_odometer: 683.0, end_odometer: 686.0, distance_km: 3.0, duration_seconds: 900, average_speed_kmh: 12.0, max_speed_kmh: 30.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3100, end_longitude: 105.3900, notes: 'Nhà|Di chuyển ngắn' },
  { id: '20260513-0001-0000-0000-000000000019', start_time: '2026-05-13 08:00:00+07', end_time: '2026-05-13 09:00:00+07', start_odometer: 686.0, end_odometer: 720.0, distance_km: 34.0, duration_seconds: 3600, average_speed_kmh: 34.0, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3450, end_longitude: 105.4400, notes: 'Nhà|Đi lại công việc' },
  { id: '20260518-0001-0000-0000-000000000020', start_time: '2026-05-18 08:00:00+07', end_time: '2026-05-18 08:30:00+07', start_odometer: 720.0, end_odometer: 730.0, distance_km: 10.0, duration_seconds: 1800, average_speed_kmh: 20.0, max_speed_kmh: 40.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3150, end_longitude: 105.3950, notes: 'Nhà|Đi làm đầu tuần' },
  { id: '20260519-0001-0000-0000-000000000021', start_time: '2026-05-19 17:00:00+07', end_time: '2026-05-19 17:15:00+07', start_odometer: 730.0, end_odometer: 732.0, distance_km: 2.0, duration_seconds: 900, average_speed_kmh: 8.0, max_speed_kmh: 25.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3080, end_longitude: 105.3880, notes: 'Nhà|Di chuyển ngắn nội khu' },
  { id: '20260520-0001-0000-0000-000000000022', start_time: '2026-05-20 08:00:00+07', end_time: '2026-05-20 09:15:00+07', start_odometer: 732.0, end_odometer: 771.0, distance_km: 39.0, duration_seconds: 4500, average_speed_kmh: 31.2, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3500, end_longitude: 105.4500, notes: 'Nhà|Đi lại công việc & gia đình' },
  { id: '20260522-0001-0000-0000-000000000023', start_time: '2026-05-22 16:30:00+07', end_time: '2026-05-22 17:05:00+07', start_odometer: 771.0, end_odometer: 784.0, distance_km: 13.0, duration_seconds: 2100, average_speed_kmh: 22.3, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4000, notes: 'Nhà|Đi lại cuối tuần' },
  { id: '20260524-0001-0000-0000-000000000024', start_time: '2026-05-24 09:00:00+07', end_time: '2026-05-24 09:45:00+07', start_odometer: 784.0, end_odometer: 804.0, distance_km: 20.0, duration_seconds: 2700, average_speed_kmh: 26.7, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4150, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260527-0001-0000-0000-000000000025', start_time: '2026-05-27 08:00:00+07', end_time: '2026-05-27 08:45:00+07', start_odometer: 804.0, end_odometer: 824.0, distance_km: 20.0, duration_seconds: 2700, average_speed_kmh: 26.7, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4150, notes: 'Nhà|Đi lại công việc' },

  // 📅 THÁNG 6/2026 (ODO: 824 km -> 1.500 km)
  { id: '20260528-0001-0000-0000-000000000026', start_time: '2026-05-28 08:00:00+07', end_time: '2026-05-28 09:00:00+07', start_odometer: 824.0, end_odometer: 853.0, distance_km: 29.0, duration_seconds: 3600, average_speed_kmh: 29.0, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Di chuyển công việc' },
  { id: '20260529-0001-0000-0000-000000000027', start_time: '2026-05-29 07:30:00+07', end_time: '2026-05-29 09:00:00+07', start_odometer: 853.0, end_odometer: 913.0, distance_km: 60.0, duration_seconds: 5400, average_speed_kmh: 40.0, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3700, end_longitude: 105.5000, notes: 'Nhà|Hành trình công việc cuối tuần' },
  { id: '20260603-0001-0000-0000-000000000028', start_time: '2026-06-03 07:30:00+07', end_time: '2026-06-03 09:30:00+07', start_odometer: 913.0, end_odometer: 989.0, distance_km: 76.0, duration_seconds: 7200, average_speed_kmh: 38.0, max_speed_kmh: 62.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3900, end_longitude: 105.5300, notes: 'Nhà|Chuyến đi công tác & công việc' },
  { id: '20260604-0001-0000-0000-000000000029', start_time: '2026-06-04 08:00:00+07', end_time: '2026-06-04 08:50:00+07', start_odometer: 989.0, end_odometer: 1014.0, distance_km: 25.0, duration_seconds: 3000, average_speed_kmh: 30.0, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3350, end_longitude: 105.4200, notes: 'Nhà|Đi lại công việc' },
  { id: '20260606-0001-0000-0000-000000000030', start_time: '2026-06-06 09:00:00+07', end_time: '2026-06-06 09:45:00+07', start_odometer: 1014.0, end_odometer: 1035.0, distance_km: 21.0, duration_seconds: 2700, average_speed_kmh: 28.0, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4150, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260607-0001-0000-0000-000000000031', start_time: '2026-06-07 15:00:00+07', end_time: '2026-06-07 15:30:00+07', start_odometer: 1035.0, end_odometer: 1044.0, distance_km: 9.0, duration_seconds: 1800, average_speed_kmh: 18.0, max_speed_kmh: 35.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3150, end_longitude: 105.3950, notes: 'Nhà|Đi lại nội thành' },
  { id: '20260613-0001-0000-0000-000000000032', start_time: '2026-06-13 07:30:00+07', end_time: '2026-06-13 09:00:00+07', start_odometer: 1044.0, end_odometer: 1109.0, distance_km: 65.0, duration_seconds: 5400, average_speed_kmh: 43.3, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3800, end_longitude: 105.5100, notes: 'Nhà|Hành trình cuối tuần' },
  { id: '20260614-0001-0000-0000-000000000033', start_time: '2026-06-14 08:00:00+07', end_time: '2026-06-14 09:30:00+07', start_odometer: 1109.0, end_odometer: 1167.0, distance_km: 58.0, duration_seconds: 5400, average_speed_kmh: 38.7, max_speed_kmh: 60.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3700, end_longitude: 105.4900, notes: 'Nhà|Dã ngoại & việc gia đình' },
  { id: '20260618-0001-0000-0000-000000000034', start_time: '2026-06-18 14:00:00+07', end_time: '2026-06-18 14:30:00+07', start_odometer: 1167.0, end_odometer: 1176.0, distance_km: 9.0, duration_seconds: 1800, average_speed_kmh: 18.0, max_speed_kmh: 40.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3150, end_longitude: 105.4050, notes: 'Nhà|Xem nhà thầy tiếng Anh ở Bắc Đầm Vạc' },
  { id: '20260621-0001-0000-0000-000000000035', start_time: '2026-06-21 07:30:00+07', end_time: '2026-06-21 09:45:00+07', start_odometer: 1176.0, end_odometer: 1270.0, distance_km: 94.0, duration_seconds: 8100, average_speed_kmh: 41.8, max_speed_kmh: 68.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.1800, end_longitude: 105.6200, notes: 'Nhà|Chuyến đi tỉnh xa cuối tuần' },
  { id: '20260622-0001-0000-0000-000000000036', start_time: '2026-06-22 08:00:00+07', end_time: '2026-06-22 08:35:00+07', start_odometer: 1270.0, end_odometer: 1286.0, distance_km: 16.0, duration_seconds: 2100, average_speed_kmh: 27.4, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4000, notes: 'Nhà|Đi làm đầu tuần' },
  { id: '20260624-0001-0000-0000-000000000037', start_time: '2026-06-24 08:00:00+07', end_time: '2026-06-24 08:50:00+07', start_odometer: 1286.0, end_odometer: 1312.0, distance_km: 26.0, duration_seconds: 3000, average_speed_kmh: 31.2, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3350, end_longitude: 105.4200, notes: 'Nhà|Đi lại công việc' },
  { id: '20260625-0001-0000-0000-000000000038', start_time: '2026-06-25 08:00:00+07', end_time: '2026-06-25 08:45:00+07', start_odometer: 1312.0, end_odometer: 1332.0, distance_km: 20.0, duration_seconds: 2700, average_speed_kmh: 26.7, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4150, notes: 'Nhà|Di chuyển công việc' },
  { id: '20260630-0001-0000-0000-000000000039', start_time: '2026-06-30 07:00:00+07', end_time: '2026-06-30 11:00:00+07', start_odometer: 1332.0, end_odometer: 1500.0, distance_km: 168.0, duration_seconds: 14400, average_speed_kmh: 42.0, max_speed_kmh: 75.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.0285, end_longitude: 105.8542, notes: 'Nhà|Hành trình đường dài tổng kết tháng 6' },

  // 📅 THÁNG 7/2026 (ODO: 1.500 km -> 2.265 km)
  { id: '20260701-0001-0000-0000-000000000040', start_time: '2026-07-01 08:00:00+07', end_time: '2026-07-01 09:00:00+07', start_odometer: 1500.0, end_odometer: 1531.0, distance_km: 31.0, duration_seconds: 3600, average_speed_kmh: 31.0, max_speed_kmh: 52.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi lại công việc đầu tháng 7' },
  { id: '20260702-0001-0000-0000-000000000041', start_time: '2026-07-02 07:30:00+07', end_time: '2026-07-02 09:30:00+07', start_odometer: 1531.0, end_odometer: 1614.0, distance_km: 83.0, duration_seconds: 7200, average_speed_kmh: 41.5, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.2500, end_longitude: 105.5400, notes: 'Nhà|Chuyến đi công tác tỉnh' },
  { id: '20260703-0001-0000-0000-000000000042', start_time: '2026-07-03 08:00:00+07', end_time: '2026-07-03 09:30:00+07', start_odometer: 1614.0, end_odometer: 1671.0, distance_km: 57.0, duration_seconds: 5400, average_speed_kmh: 38.0, max_speed_kmh: 60.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3650, end_longitude: 105.4850, notes: 'Nhà|Hành trình công việc & gia đình' },
  { id: '20260704-0001-0000-0000-000000000043', start_time: '2026-07-04 15:00:00+07', end_time: '2026-07-04 15:40:00+07', start_odometer: 1671.0, end_odometer: 1686.0, distance_km: 15.0, duration_seconds: 2400, average_speed_kmh: 22.5, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4050, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260705-0001-0000-0000-000000000044', start_time: '2026-07-05 08:30:00+07', end_time: '2026-07-05 09:30:00+07', start_odometer: 1686.0, end_odometer: 1722.0, distance_km: 36.0, duration_seconds: 3600, average_speed_kmh: 36.0, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3450, end_longitude: 105.4400, notes: 'Nhà|Đi việc gia đình cuối tuần' },
  { id: '20260707-0001-0000-0000-000000000045', start_time: '2026-07-07 08:00:00+07', end_time: '2026-07-07 08:50:00+07', start_odometer: 1722.0, end_odometer: 1752.0, distance_km: 30.0, duration_seconds: 3000, average_speed_kmh: 36.0, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi làm & công việc' },
  { id: '20260708-0001-0000-0000-000000000046', start_time: '2026-07-08 17:00:00+07', end_time: '2026-07-08 17:30:00+07', start_odometer: 1752.0, end_odometer: 1765.0, distance_km: 13.0, duration_seconds: 1800, average_speed_kmh: 26.0, max_speed_kmh: 45.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3200, end_longitude: 105.4000, notes: 'Nhà|Di chuyển nội thành' },
  { id: '20260710-0001-0000-0000-000000000047', start_time: '2026-07-10 08:00:00+07', end_time: '2026-07-10 08:55:00+07', start_odometer: 1765.0, end_odometer: 1796.0, distance_km: 31.0, duration_seconds: 3300, average_speed_kmh: 33.8, max_speed_kmh: 52.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi lại công việc cuối tuần' },
  { id: '20260714-0001-0000-0000-000000000048', start_time: '2026-07-14 07:30:00+07', end_time: '2026-07-14 09:30:00+07', start_odometer: 1796.0, end_odometer: 1880.0, distance_km: 84.0, duration_seconds: 7200, average_speed_kmh: 42.0, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3900, end_longitude: 105.5400, notes: 'Nhà|Chuyến đi tỉnh xa' },
  { id: '20260715-0001-0000-0000-000000000049', start_time: '2026-07-15 08:30:00+07', end_time: '2026-07-15 09:45:00+07', start_odometer: 1880.0, end_odometer: 1920.0, distance_km: 40.0, duration_seconds: 4500, average_speed_kmh: 32.0, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3215, end_longitude: 105.4012, notes: 'Nhà|Bảo dưỡng lần đầu Thaco Phú Thọ' },
  { id: '20260716-0001-0000-0000-000000000050', start_time: '2026-07-16 08:00:00+07', end_time: '2026-07-16 08:45:00+07', start_odometer: 1920.0, end_odometer: 1944.0, distance_km: 24.0, duration_seconds: 2700, average_speed_kmh: 32.0, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3350, end_longitude: 105.4200, notes: 'Nhà|Đi làm sau bảo dưỡng' },
  { id: '20260717-0001-0000-0000-000000000051', start_time: '2026-07-17 08:00:00+07', end_time: '2026-07-17 08:50:00+07', start_odometer: 1944.0, end_odometer: 1975.0, distance_km: 31.0, duration_seconds: 3000, average_speed_kmh: 37.2, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4300, notes: 'Nhà|Đi lại công việc' },
  { id: '20260718-0001-0000-0000-000000000052', start_time: '2026-07-18 15:30:00+07', end_time: '2026-07-18 16:15:00+07', start_odometer: 1975.0, end_odometer: 1997.0, distance_km: 22.0, duration_seconds: 2700, average_speed_kmh: 29.3, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4150, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260723-0001-0000-0000-000000000053', start_time: '2026-07-23 07:00:00+07', end_time: '2026-07-23 09:30:00+07', start_odometer: 1997.0, end_odometer: 2109.0, distance_km: 112.0, duration_seconds: 9000, average_speed_kmh: 44.8, max_speed_kmh: 70.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.0285, end_longitude: 105.8542, notes: 'Nhà|Hành trình công tác xa & gia đình' },
  { id: '20260724-0001-0000-0000-000000000054', start_time: '2026-07-24 08:00:00+07', end_time: '2026-07-24 08:45:00+07', start_odometer: 2109.0, end_odometer: 2132.0, distance_km: 23.0, duration_seconds: 2700, average_speed_kmh: 30.7, max_speed_kmh: 50.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3350, end_longitude: 105.4200, notes: 'Nhà|Đi lại công việc' },
  { id: '20260725-0001-0000-0000-000000000055', start_time: '2026-07-25 09:00:00+07', end_time: '2026-07-25 09:40:00+07', start_odometer: 2132.0, end_odometer: 2151.0, distance_km: 19.0, duration_seconds: 2400, average_speed_kmh: 28.5, max_speed_kmh: 48.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3300, end_longitude: 105.4100, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260726-0001-0000-0000-000000000056', start_time: '2026-07-26 16:00:00+07', end_time: '2026-07-26 16:30:00+07', start_odometer: 2151.0, end_odometer: 2163.0, distance_km: 12.0, duration_seconds: 1800, average_speed_kmh: 24.0, max_speed_kmh: 40.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3180, end_longitude: 105.3980, notes: 'Nhà|Đi lại nội thành cuối tuần' },
  { id: '20260731-0001-0000-0000-000000000057', start_time: '2026-07-31 07:30:00+07', end_time: '2026-07-31 09:45:00+07', start_odometer: 2163.0, end_odometer: 2265.0, distance_km: 102.0, duration_seconds: 8100, average_speed_kmh: 45.3, max_speed_kmh: 70.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3950, end_longitude: 105.5500, notes: 'Nhà|Hành trình đường dài cuối tháng 7' },

  // 📅 THÁNG 8/2026 (Đến 23/08: ODO: 2.265 km -> 2.651 km)
  { id: '20260801-0001-0000-0000-000000000058', start_time: '2026-08-01 08:30:00+07', end_time: '2026-08-01 09:20:00+07', start_odometer: 2265.0, end_odometer: 2292.0, distance_km: 27.0, duration_seconds: 3000, average_speed_kmh: 32.4, max_speed_kmh: 52.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3400, end_longitude: 105.4250, notes: 'Nhà|Đi lại đầu tháng 8' },
  { id: '20260804-0001-0000-0000-000000000059', start_time: '2026-08-04 07:45:00+07', end_time: '2026-08-04 09:15:00+07', start_odometer: 2292.0, end_odometer: 2351.0, distance_km: 59.0, duration_seconds: 5400, average_speed_kmh: 39.3, max_speed_kmh: 60.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3700, end_longitude: 105.4900, notes: 'Nhà|Chuyến đi công việc' },
  { id: '20260809-0001-0000-0000-000000000060', start_time: '2026-08-09 07:30:00+07', end_time: '2026-08-09 09:30:00+07', start_odometer: 2351.0, end_odometer: 2436.0, distance_km: 85.0, duration_seconds: 7200, average_speed_kmh: 42.5, max_speed_kmh: 65.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.2500, end_longitude: 105.5400, notes: 'Nhà|Hành trình cuối tuần' },
  { id: '20260814-0001-0000-0000-000000000061', start_time: '2026-08-14 08:00:00+07', end_time: '2026-08-14 08:55:00+07', start_odometer: 2436.0, end_odometer: 2470.0, distance_km: 34.0, duration_seconds: 3300, average_speed_kmh: 37.1, max_speed_kmh: 55.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3450, end_longitude: 105.4350, notes: 'Nhà|Đi lại công việc' },
  { id: '20260815-0001-0000-0000-000000000062', start_time: '2026-08-15 09:00:00+07', end_time: '2026-08-15 09:50:00+07', start_odometer: 2470.0, end_odometer: 2506.0, distance_km: 36.0, duration_seconds: 3000, average_speed_kmh: 43.2, max_speed_kmh: 58.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3450, end_longitude: 105.4400, notes: 'Nhà|Di chuyển cuối tuần' },
  { id: '20260820-0001-0000-0000-000000000063', start_time: '2026-08-20 07:30:00+07', end_time: '2026-08-20 09:45:00+07', start_odometer: 2506.0, end_odometer: 2602.0, distance_km: 96.0, duration_seconds: 8100, average_speed_kmh: 42.7, max_speed_kmh: 68.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.1800, end_longitude: 105.6200, notes: 'Nhà|Chuyến đi công tác tỉnh xa' },
  { id: '20260823-0001-0000-0000-000000000064', start_time: '2026-08-23 08:00:00+07', end_time: '2026-08-23 09:15:00+07', start_odometer: 2602.0, end_odometer: 2651.0, distance_km: 49.0, duration_seconds: 4500, average_speed_kmh: 39.2, max_speed_kmh: 60.0, start_latitude: 21.3050, start_longitude: 105.3850, end_latitude: 21.3600, end_longitude: 105.4700, notes: 'Nhà|Hành trình cuối tuần trước khi bật CarLogger' }
];

async function run() {
  console.log('--- 1. Get device_id for Mazda 2 ---');
  const { data: devices } = await supabase.from('devices').select('id').or(`asset_id.eq.${MAZDA_ID},vehicle_id.eq.${MAZDA_ID}`).limit(1);
  const deviceId = devices && devices.length > 0 ? devices[0].id : null;
  console.log('Using deviceId:', deviceId);

  console.log('--- 2. Prepare payload for all 65 trips ---');
  const tripsToUpsert = RAW_65_TRIPS.map(t => ({
    id: t.id,
    asset_id: MAZDA_ID,
    device_id: deviceId,
    start_time: new Date(t.start_time).toISOString(),
    end_time: new Date(t.end_time).toISOString(),
    start_odometer: t.start_odometer,
    end_odometer: t.end_odometer,
    distance_km: t.distance_km,
    duration_seconds: t.duration_seconds,
    average_speed_kmh: t.average_speed_kmh,
    max_speed_kmh: t.max_speed_kmh,
    start_latitude: t.start_latitude,
    start_longitude: t.start_longitude,
    end_latitude: t.end_latitude,
    end_longitude: t.end_longitude,
    notes: t.notes,
    status: 'COMPLETED'
  }));

  console.log(`Upserting ${tripsToUpsert.length} trips in batches of 20...`);
  for (let i = 0; i < tripsToUpsert.length; i += 20) {
    const batch = tripsToUpsert.slice(i, i + 20);
    const { error } = await supabase.from('trips').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Batch ${i/20 + 1} error:`, error);
    } else {
      console.log(`Batch ${i/20 + 1} (${batch.length} trips) synced successfully.`);
    }
  }

  console.log('--- 3. Verify total trips and total distance ---');
  const { data: allTrips, error: fetchErr } = await supabase
    .from('trips')
    .select('id, start_time, distance_km, start_odometer, end_odometer')
    .eq('asset_id', MAZDA_ID)
    .order('start_time', { ascending: true });

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
  } else {
    let totalKm = 0;
    allTrips.forEach(t => totalKm += Number(t.distance_km) || 0);
    console.log(`\n==============================================`);
    console.log(`TOTAL TRIPS IN SUPABASE: ${allTrips.length}`);
    console.log(`TOTAL DISTANCE: ${totalKm.toFixed(2)} KM`);
    console.log(`FIRST TRIP ODO: ${allTrips[0].start_odometer} -> ${allTrips[0].end_odometer}`);
    console.log(`LAST TRIP ODO: ${allTrips[allTrips.length - 1].start_odometer} -> ${allTrips[allTrips.length - 1].end_odometer}`);
    console.log(`==============================================`);
  }

  process.exit(0);
}

run();

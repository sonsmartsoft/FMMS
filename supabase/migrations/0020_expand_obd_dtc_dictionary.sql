-- Migration 0020: Expand OBD DTC Dictionary with Mazda 2 real-world fault codes
INSERT INTO public.obd_dtc_dictionary (code, category, title_vi, description_vi, description_en, symptoms_vi, possible_causes_vi, severity)
VALUES
('P007E', 'POWERTRAIN', 'Tín hiệu cảm biến nhiệt độ khí nạp (IAT) chập chờn', 'Mạch tín hiệu cảm biến nhiệt độ khí nạp (Intake Air Temperature / Charge Air Cooler) nhận tín hiệu gián đoạn hoặc không ổn định', 'Charge Air Cooler Temperature Sensor Circuit Intermittent/Erratic (Bank 1)', 'Không ảnh hưởng lớn đến cảm giác lái, có thể sáng đèn Check Engine hoặc hao xăng nhẹ khi thời tiết thay đổi', ARRAY['Giắc cắm cụm cảm biến đo gió MAF/IAT ở cổ hút bị lỏng hoặc bẩn', 'Sụt áp ắc quy tạm thời lúc đề nổ', 'Dây tín hiệu cảm biến IAT chập chờn'], 'LOW'),
('B1024', 'BODY', 'Lỗi mạch nút bấm khởi động Start/Stop hoặc nhận diện chìa khóa', 'Hộp BCM/SmartKey phát hiện tín hiệu bất thường từ công tắc nút bấm Start/Stop hoặc ăng-ten nhận diện chìa khóa thông minh', 'Start/Stop Push Button Circuit Fault / Smart Keyless Antenna Signal', 'Xe có thể cần bấm nút Start/Stop dứt khoát hơn hoặc báo chìa khóa ngoài xe', ARRAY['Pin chìa khóa thông minh (SmartKey) bị yếu', 'Bấm nút Start/Stop khi chưa đạp hết hành trình chân phanh', 'Xung điện từ phụ kiện lắp thêm (màn hình Android, camera hành trình) cắm vào cầu chì ACC/IGN'], 'LOW'),
('B0024', 'BODY', 'Lỗi mạch kích nổ túi khí rèm / túi khí ghế phía lái (SRS)', 'Điện trở mạch ngòi nổ túi khí phía bên lái (Left Curtain/Side Airbag Deployment Control) vượt ngoài ngưỡng tiêu chuẩn', 'Left Curtain Deployment Control 2 / Driver Side Airbag Resistance', 'Đèn cảnh báo túi khí (Airbag) trên bảng đồng hồ có thể nhấp nháy hoặc sáng đỏ', ARRAY['Giắc cắm túi khí màu vàng dưới gầm ghế lái bị lỏng hoặc bị xô lệch khi trượt ghế/lắp thảm sàn', 'Dây điện túi khí dưới ghế lái bị chèn ép', 'Tiếp xúc chân giắc ngòi nổ túi khí kém'], 'MEDIUM')
ON CONFLICT (code) DO UPDATE SET
  category = EXCLUDED.category,
  title_vi = EXCLUDED.title_vi,
  description_vi = EXCLUDED.description_vi,
  description_en = EXCLUDED.description_en,
  symptoms_vi = EXCLUDED.symptoms_vi,
  possible_causes_vi = EXCLUDED.possible_causes_vi,
  severity = EXCLUDED.severity;

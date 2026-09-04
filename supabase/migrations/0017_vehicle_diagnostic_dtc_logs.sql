-- Migration 0017: Vehicle Diagnostic Trouble Codes (DTC) & OBD Scan Sessions
-- Description: Stores OBD-II diagnostic scans, active/historical DTC error logs, freeze frames, and DTC dictionary.

-- 1. OBD DTC Dictionary (Master Data tra cứu mã lỗi)
CREATE TABLE IF NOT EXISTS public.obd_dtc_dictionary (
    code VARCHAR(10) PRIMARY KEY,
    category VARCHAR(20) NOT NULL DEFAULT 'POWERTRAIN', -- POWERTRAIN, CHASSIS, BODY, NETWORK
    title_vi TEXT NOT NULL,
    description_vi TEXT NOT NULL,
    description_en TEXT,
    symptoms_vi TEXT,
    possible_causes_vi TEXT[],
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, CRITICAL
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vehicle Diagnostic Scans (Phiên quét chẩn đoán)
CREATE TABLE IF NOT EXISTS public.vehicle_diagnostic_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    device_id UUID,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    odometer_km NUMERIC(10, 2),
    mil_status BOOLEAN NOT NULL DEFAULT FALSE,
    dtc_count INTEGER NOT NULL DEFAULT 0,
    scan_type VARCHAR(30) NOT NULL DEFAULT 'AUTO_BACKGROUND', -- AUTO_BACKGROUND, MANUAL_SCAN
    source VARCHAR(20) NOT NULL DEFAULT 'OBD', -- OBD, MANUAL_ENTRY
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diag_scans_asset_scanned ON public.vehicle_diagnostic_scans (asset_id, scanned_at DESC);

-- 3. Vehicle DTC Logs (Chi tiết từng mã lỗi)
CREATE TABLE IF NOT EXISTS public.vehicle_dtc_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES public.vehicle_diagnostic_scans(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    device_id UUID,
    dtc_code VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- CONFIRMED (Mode 03), PENDING (Mode 07), PERMANENT (Mode 0A), CLEARED
    system_category VARCHAR(20) NOT NULL DEFAULT 'POWERTRAIN', -- POWERTRAIN, CHASSIS, BODY, NETWORK
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, CRITICAL
    description_vi TEXT,
    description_en TEXT,
    freeze_frame JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(20) NOT NULL DEFAULT 'OBD',
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleared_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dtc_logs_asset_active ON public.vehicle_dtc_logs (asset_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dtc_logs_code ON public.vehicle_dtc_logs (dtc_code);

-- 4. Trigger tự động bổ sung thông tin từ từ điển và tiền tố mã lỗi nếu Android gửi lên để trống
CREATE OR REPLACE FUNCTION public.enrich_vehicle_dtc_log()
RETURNS TRIGGER AS $$
DECLARE
    dict_record RECORD;
    prefix CHAR(1);
BEGIN
    -- Xác định category từ tiền tố nếu chưa có
    prefix := UPPER(SUBSTRING(NEW.dtc_code FROM 1 FOR 1));
    IF NEW.system_category IS NULL OR NEW.system_category = '' THEN
        IF prefix = 'P' THEN NEW.system_category := 'POWERTRAIN';
        ELSIF prefix = 'C' THEN NEW.system_category := 'CHASSIS';
        ELSIF prefix = 'B' THEN NEW.system_category := 'BODY';
        ELSIF prefix = 'U' THEN NEW.system_category := 'NETWORK';
        ELSE NEW.system_category := 'POWERTRAIN';
        END IF;
    END IF;

    -- Tra cứu từ điển obd_dtc_dictionary nếu description_vi còn trống
    SELECT * INTO dict_record FROM public.obd_dtc_dictionary WHERE code = UPPER(NEW.dtc_code) LIMIT 1;
    IF FOUND THEN
        IF NEW.description_vi IS NULL OR NEW.description_vi = '' THEN
            NEW.description_vi := dict_record.description_vi;
        END IF;
        IF NEW.description_en IS NULL OR NEW.description_en = '' THEN
            NEW.description_en := dict_record.description_en;
        END IF;
        IF NEW.severity IS NULL OR NEW.severity = '' OR NEW.severity = 'MEDIUM' THEN
            NEW.severity := dict_record.severity;
        END IF;
        IF dict_record.category IS NOT NULL THEN
            NEW.system_category := dict_record.category;
        END IF;
    ELSE
        IF NEW.description_vi IS NULL OR NEW.description_vi = '' THEN
            NEW.description_vi := 'Mã lỗi OBD: ' || UPPER(NEW.dtc_code);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enrich_vehicle_dtc_log ON public.vehicle_dtc_logs;
CREATE TRIGGER trg_enrich_vehicle_dtc_log
BEFORE INSERT OR UPDATE ON public.vehicle_dtc_logs
FOR EACH ROW
EXECUTE FUNCTION public.enrich_vehicle_dtc_log();

-- 5. RLS Policies
ALTER TABLE public.obd_dtc_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_diagnostic_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_dtc_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on obd_dtc_dictionary"
    ON public.obd_dtc_dictionary FOR SELECT USING (true);

CREATE POLICY "Allow authenticated & anon all on vehicle_diagnostic_scans"
    ON public.vehicle_diagnostic_scans FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated & anon all on vehicle_dtc_logs"
    ON public.vehicle_dtc_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Nạp dữ liệu mẫu từ điển các mã lỗi OBD-II phổ biến
INSERT INTO public.obd_dtc_dictionary (code, category, title_vi, description_vi, description_en, symptoms_vi, possible_causes_vi, severity)
VALUES
('P0300', 'POWERTRAIN', 'Bỏ lửa động cơ ngẫu nhiên / nhiều xy lanh', 'Phát hiện hiện tượng bỏ lửa ngẫu nhiên hoặc xảy ra trên nhiều xy lanh động cơ', 'Random/Multiple Cylinder Misfire Detected', 'Động cơ rung giật khi tăng tốc hoặc chạy không tải, hao xăng, đèn Check Engine nhấp nháy', ARRAY['Hỏng bugi hoặc bô-bin đánh lửa', 'Tắc kim phun nhiên liệu', 'Áp suất nhiên liệu thấp', 'Lọt khí đường nạp'], 'CRITICAL'),
('P0301', 'POWERTRAIN', 'Bỏ lửa xy lanh số 1', 'Xy lanh số 1 phát hiện hiện tượng bỏ đánh lửa hoặc đốt không hết', 'Cylinder 1 Misfire Detected', 'Rung giật động cơ, giảm công suất', ARRAY['Bugi hoặc bô-bin xy lanh 1 hỏng', 'Kim phun xy lanh 1 tắc', 'Mất áp suất buồng đốt xy lanh 1'], 'CRITICAL'),
('P0302', 'POWERTRAIN', 'Bỏ lửa xy lanh số 2', 'Xy lanh số 2 phát hiện hiện tượng bỏ đánh lửa hoặc đốt không hết', 'Cylinder 2 Misfire Detected', 'Rung giật động cơ, giảm công suất', ARRAY['Bugi hoặc bô-bin xy lanh 2 hỏng', 'Kim phun xy lanh 2 tắc', 'Mất áp suất buồng đốt xy lanh 2'], 'CRITICAL'),
('P0303', 'POWERTRAIN', 'Bỏ lửa xy lanh số 3', 'Xy lanh số 3 phát hiện hiện tượng bỏ đánh lửa hoặc đốt không hết', 'Cylinder 3 Misfire Detected', 'Rung giật động cơ, giảm công suất', ARRAY['Bugi hoặc bô-bin xy lanh 3 hỏng', 'Kim phun xy lanh 3 tắc', 'Mất áp suất buồng đốt xy lanh 3'], 'CRITICAL'),
('P0304', 'POWERTRAIN', 'Bỏ lửa xy lanh số 4', 'Xy lanh số 4 phát hiện hiện tượng bỏ đánh lửa hoặc đốt không hết', 'Cylinder 4 Misfire Detected', 'Rung giật động cơ, giảm công suất', ARRAY['Bugi hoặc bô-bin xy lanh 4 hỏng', 'Kim phun xy lanh 4 tắc', 'Mất áp suất buồng đốt xy lanh 4'], 'CRITICAL'),
('P0171', 'POWERTRAIN', 'Hỗn hợp nhiên liệu quá nghèo (Dãy 1)', 'Tỷ lệ hòa khí quá nhiều không khí hoặc thiếu nhiên liệu ở Bank 1', 'System Too Lean (Bank 1)', 'Xe yếu khi tăng tốc, chạy cầm chừng không đều, hao xăng', ARRAY['Hở đường ống nạp hoặc lọt khí chân không', 'Cảm biến lưu lượng khí nạp (MAF) bẩn/hỏng', 'Áp suất bơm xăng yếu', 'Bẩn lọc xăng'], 'MEDIUM'),
('P0172', 'POWERTRAIN', 'Hỗn hợp nhiên liệu quá giàu (Dãy 1)', 'Tỷ lệ hòa khí quá nhiều nhiên liệu hoặc thiếu không khí ở Bank 1', 'System Too Rich (Bank 1)', 'Có mùi xăng sống ở ống xả, khói đen, hao xăng bất thường', ARRAY['Cảm biến MAF báo sai', 'Kim phun bị rò rỉ xăng', 'Kẹt van điều áp nhiên liệu', 'Tắc lọc gió động cơ'], 'MEDIUM'),
('P0420', 'POWERTRAIN', 'Hiệu suất bầu xúc tác khí xả dưới ngưỡng (Dãy 1)', 'Bầu xúc tác xử lý khí thải (Catalytic Converter) hoạt động kém hiệu quả', 'Catalyst System Efficiency Below Threshold (Bank 1)', 'Thường không có triệu chứng lái rõ rệt, khí thải có mùi khét, không đạt đăng kiểm', ARRAY['Bầu xúc tác bị già hóa hoặc hỏng', 'Cảm biến Oxy (O2 Sensor) sau bầu xúc tác báo sai', 'Hở cổ pô khí xả'], 'LOW'),
('P0135', 'POWERTRAIN', 'Lỗi mạch sấy cảm biến Oxy (Dãy 1, Cảm biến 1)', 'Mạch điện sấy nóng cảm biến Oxy trước bầu xúc tác gặp sự cố', 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)', 'Xe khởi động nguội tốn xăng hơn, sáng đèn Check Engine', ARRAY['Cháy dây sấy trong cảm biến Oxy', 'Đứt dây hoặc lỏng giắc cắm', 'Cháy cầu chì mạch sấy'], 'LOW'),
('P0101', 'POWERTRAIN', 'Lỗi tín hiệu cảm biến lưu lượng khí nạp (MAF)', 'Cảm biến MAF gửi tín hiệu không đúng dải hoạt động tiêu chuẩn', 'Mass Air Flow Circuit Range/Performance', 'Khó nổ máy, ga bị giật cục, ga không mượt', ARRAY['Cảm biến MAF bị bám bụi bẩn', 'Rách đường ống gió sau MAF', 'Hỏng cảm biến MAF'], 'MEDIUM'),
('P0113', 'POWERTRAIN', 'Nhiệt độ khí nạp báo cao bất thường', 'Tín hiệu cảm biến nhiệt độ khí nạp (IAT) vượt ngưỡng điện áp quy định', 'Intake Air Temperature Circuit High Input', 'Xe chạy tốn xăng khi thời tiết lạnh, sáng đèn Check Engine', ARRAY['Giắc cắm cảm biến IAT lỏng hoặc đứt dây', 'Hỏng cảm biến IAT'], 'LOW'),
('P0128', 'POWERTRAIN', 'Nhiệt độ nước làm mát dưới mức tiêu chuẩn', 'Động cơ mất quá nhiều thời gian để đạt nhiệt độ vận hành tối ưu', 'Coolant Thermostat (Coolant Temp Below Regulating Temp)', 'Đồng hồ nhiệt độ nước làm mát thấp, máy nguội lâu, điều hòa sưởi kém', ARRAY['Kẹt van hằng nhiệt ở trạng thái mở', 'Hỏng cảm biến nhiệt độ nước làm mát (ECT)'], 'LOW'),
('P0442', 'POWERTRAIN', 'Rò rỉ nhỏ hệ thống thu hồi hơi xăng (EVAP)', 'Phát hiện rò rỉ áp suất nhỏ trong bình xăng hoặc hệ thống EVAP', 'Evaporative Emission System Leak Detected (small leak)', 'Có thể có mùi xăng nhẹ xung quanh nắp bình xăng', ARRAY['Nắp bình xăng vặn chưa chặt hoặc mòn gioăng', 'Nứt ống dẫn hơi xăng', 'Hỏng van thông hơi EVAP'], 'LOW'),
('P0500', 'POWERTRAIN', 'Lỗi cảm biến tốc độ xe (VSS)', 'Không nhận được tín hiệu tốc độ xe từ cảm biến VSS', 'Vehicle Speed Sensor Malfunction', 'Kim đồng hồ tốc độ không nhảy, chuyển số bị giật, ABS báo lỗi', ARRAY['Hỏng cảm biến tốc độ VSS', 'Đứt dây tín hiệu VSS', 'Hỏng bánh răng đo tốc độ trong hộp số'], 'CRITICAL'),
('U0100', 'NETWORK', 'Mất giao tiếp với Hộp điều khiển Động cơ (ECM/PCM)', 'Mạng CAN bus không thể liên lạc với hộp ECU động cơ', 'Lost Communication With ECM/PCM', 'Xe không thể nổ máy, nhiều đèn cảnh báo trên táp-lô sáng cùng lúc', ARRAY['Đứt dây mạng CAN bus', 'Lỏng giắc cắm ECU', 'Nguồn cấp hoặc mass ECU bị mất', 'Hỏng hộp ECU'], 'CRITICAL'),
('C0035', 'CHASSIS', 'Lỗi cảm biến tốc độ bánh xe trước bên trái (ABS)', 'Hệ thống phanh ABS không nhận được xung tốc độ từ bánh trước trái', 'Left Front Wheel Speed Sensor Circuit', 'Sáng đèn cảnh báo ABS và cân bằng điện tử ESC', ARRAY['Cảm biến ABS bánh trước trái bẩn hoặc hỏng', 'Đứt dây cảm biến ABS', 'Mòn vành răng từ ABS'], 'MEDIUM'),
('B1000', 'BODY', 'Lỗi vi mạch điều khiển túi khí (SRS ECU)', 'Hộp điều khiển túi khí phát hiện lỗi phần cứng nội bộ', 'ECU Malfunction (Airbag SRS)', 'Đèn báo túi khí SRS sáng liên tục, túi khí có thể không nổ khi va chạm', ARRAY['Hỏng hộp điều khiển túi khí', 'Nguồn điện cấp hộp SRS không ổn định'], 'CRITICAL')
ON CONFLICT (code) DO NOTHING;

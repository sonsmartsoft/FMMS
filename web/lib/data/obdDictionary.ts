export interface LocalDtcEntry {
  code: string;
  category: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';
  title_vi: string;
  description_vi: string;
  description_en?: string;
  symptoms_vi?: string;
  possible_causes_vi?: string[];
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
}

export const LOCAL_OBD_DICTIONARY: Record<string, LocalDtcEntry> = {
  // ── Mazda Real-World & Specific Codes ──
  'P007E': {
    code: 'P007E',
    category: 'POWERTRAIN',
    title_vi: 'Tín hiệu cảm biến nhiệt độ khí nạp (IAT / CAC) chập chờn',
    description_vi: 'Mạch tín hiệu cảm biến nhiệt độ khí nạp (Intake Air Temperature / Charge Air Cooler) nhận tín hiệu gián đoạn hoặc không ổn định.',
    description_en: 'Charge Air Cooler Temperature Sensor Circuit Intermittent/Erratic (Bank 1)',
    symptoms_vi: 'Không ảnh hưởng lớn đến cảm giác lái, có thể sáng đèn Check Engine hoặc hao xăng nhẹ khi nhiệt độ môi trường thay đổi đột ngột.',
    possible_causes_vi: [
      'Giắc cắm cụm cảm biến đo gió MAF/IAT ở cổ hút bị lỏng hoặc bám bụi',
      'Sụt áp ắc quy tạm thời lúc đề nổ buổi sáng',
      'Dây tín hiệu cảm biến IAT chập chờn do chuột cắn hoặc rung lắc',
      'Cảm biến IAT bị lão hóa sau thời gian dài sử dụng'
    ],
    severity: 'LOW',
  },
  'B1024': {
    code: 'B1024',
    category: 'BODY',
    title_vi: 'Lỗi mạch nút bấm khởi động Start/Stop hoặc nhận diện chìa khóa',
    description_vi: 'Hộp điều khiển thân xe BCM/SmartKey phát hiện tín hiệu bất thường từ công tắc nút bấm Start/Stop hoặc ăng-ten nhận diện chìa khóa thông minh.',
    description_en: 'Start/Stop Push Button Circuit Fault / Smart Keyless Antenna Signal',
    symptoms_vi: 'Xe có thể cần bấm nút Start/Stop dứt khoát hơn, bảng đồng hồ nhấp nháy đèn chìa khóa (Key symbol) hoặc báo chìa khóa ngoài xe.',
    possible_causes_vi: [
      'Pin chìa khóa thông minh (SmartKey CR2025/CR2032) bị yếu',
      'Bấm nút Start/Stop khi chưa đạp hết hành trình chân phanh',
      'Xung điện từ phụ kiện lắp thêm (màn hình Android, camera hành trình) cắm trích cầu chì ACC/IGN',
      'Tiếp xúc giắc cắm nút Start/Stop bị ẩm hoặc bẩn'
    ],
    severity: 'LOW',
  },
  'B0024': {
    code: 'B0024',
    category: 'BODY',
    title_vi: 'Lỗi mạch kích nổ túi khí rèm / túi khí ghế phía lái (SRS)',
    description_vi: 'Điện trở mạch ngòi nổ túi khí phía bên lái (Left Curtain/Side Airbag Deployment Control) vượt ngoài ngưỡng tiêu chuẩn an toàn.',
    description_en: 'Left Curtain Deployment Control 2 / Driver Side Airbag Resistance',
    symptoms_vi: 'Đèn cảnh báo túi khí (Airbag SRS màu đỏ/vàng) trên bảng táp-lô nhấp nháy hoặc sáng liên tục.',
    possible_causes_vi: [
      'Giắc cắm túi khí màu vàng dưới gầm ghế lái bị lỏng hoặc bị xô lệch khi trượt ghế / bọc ghế da / lắp thảm sàn',
      'Dây điện túi khí dưới ghế lái bị chèn ép',
      'Tiếp xúc chân giắc ngòi nổ túi khí kém do ẩm',
      'Cáp xoắn túi khí vô lăng hoặc hộp điều khiển SRS'
    ],
    severity: 'MEDIUM',
  },

  // ── Misfire / Đánh lửa ──
  'P0300': {
    code: 'P0300',
    category: 'POWERTRAIN',
    title_vi: 'Bỏ lửa động cơ ngẫu nhiên / nhiều xy lanh',
    description_vi: 'ECU phát hiện hiện tượng bỏ đánh lửa ngẫu nhiên hoặc xảy ra trên nhiều xy lanh động cơ.',
    description_en: 'Random/Multiple Cylinder Misfire Detected',
    symptoms_vi: 'Động cơ rung giật khi tăng tốc hoặc chạy không tải, xe bị ì, hao xăng, đèn Check Engine nhấp nháy liên tục.',
    possible_causes_vi: [
      'Hỏng bugi hoặc bô-bin đánh lửa (Ignition Coil)',
      'Tắc kim phun nhiên liệu hoặc áp suất xăng không đủ',
      'Lọt khí đường ống nạp (Vacuum leak)',
      'Xăng bẩn hoặc có lẫn nước'
    ],
    severity: 'CRITICAL',
  },
  'P0301': {
    code: 'P0301',
    category: 'POWERTRAIN',
    title_vi: 'Bỏ lửa xy lanh số 1',
    description_vi: 'Xy lanh số 1 phát hiện hiện tượng bỏ đánh lửa hoặc đốt nhiên liệu không hết.',
    description_en: 'Cylinder 1 Misfire Detected',
    symptoms_vi: 'Máy rung giật khi ga lên, giảm công suất máy, đèn Check Engine sáng.',
    possible_causes_vi: ['Bugi hoặc bô-bin xy lanh 1 hỏng', 'Kim phun xy lanh 1 bị kẹt/tắc', 'Mất áp suất buồng đốt xy lanh 1'],
    severity: 'CRITICAL',
  },
  'P0302': {
    code: 'P0302',
    category: 'POWERTRAIN',
    title_vi: 'Bỏ lửa xy lanh số 2',
    description_vi: 'Xy lanh số 2 phát hiện hiện tượng bỏ đánh lửa hoặc đốt nhiên liệu không hết.',
    description_en: 'Cylinder 2 Misfire Detected',
    symptoms_vi: 'Máy rung giật khi ga lên, giảm công suất máy, đèn Check Engine sáng.',
    possible_causes_vi: ['Bugi hoặc bô-bin xy lanh 2 hỏng', 'Kim phun xy lanh 2 bị kẹt/tắc', 'Mất áp suất buồng đốt xy lanh 2'],
    severity: 'CRITICAL',
  },
  'P0303': {
    code: 'P0303',
    category: 'POWERTRAIN',
    title_vi: 'Bỏ lửa xy lanh số 3',
    description_vi: 'Xy lanh số 3 phát hiện hiện tượng bỏ đánh lửa hoặc đốt nhiên liệu không hết.',
    description_en: 'Cylinder 3 Misfire Detected',
    symptoms_vi: 'Máy rung giật khi ga lên, giảm công suất máy, đèn Check Engine sáng.',
    possible_causes_vi: ['Bugi hoặc bô-bin xy lanh 3 hỏng', 'Kim phun xy lanh 3 bị kẹt/tắc', 'Mất áp suất buồng đốt xy lanh 3'],
    severity: 'CRITICAL',
  },
  'P0304': {
    code: 'P0304',
    category: 'POWERTRAIN',
    title_vi: 'Bỏ lửa xy lanh số 4',
    description_vi: 'Xy lanh số 4 phát hiện hiện tượng bỏ đánh lửa hoặc đốt nhiên liệu không hết.',
    description_en: 'Cylinder 4 Misfire Detected',
    symptoms_vi: 'Máy rung giật khi ga lên, giảm công suất máy, đèn Check Engine sáng.',
    possible_causes_vi: ['Bugi hoặc bô-bin xy lanh 4 hỏng', 'Kim phun xy lanh 4 bị kẹt/tắc', 'Mất áp suất buồng đốt xy lanh 4'],
    severity: 'CRITICAL',
  },

  // ── Nhiên liệu & Khí nạp (Fuel & Air Trim) ──
  'P0171': {
    code: 'P0171',
    category: 'POWERTRAIN',
    title_vi: 'Hỗn hợp nhiên liệu quá nghèo (Dãy 1 / Bank 1)',
    description_vi: 'Tỷ lệ hòa khí quá nhiều không khí hoặc thiếu nhiên liệu so với chuẩn lý thuyết ở Bank 1.',
    description_en: 'System Too Lean (Bank 1)',
    symptoms_vi: 'Xe yếu khi thốc ga, chạy cầm chừng (garanti) không đều hoặc rung, hao xăng.',
    possible_causes_vi: [
      'Hở đường ống nạp hoặc lọt khí chân không',
      'Cảm biến lưu lượng khí nạp (MAF) bị bụi bẩn',
      'Áp suất bơm xăng yếu hoặc tắc lọc xăng',
      'Kim phun nhiên liệu bị bẩn'
    ],
    severity: 'MEDIUM',
  },
  'P0172': {
    code: 'P0172',
    category: 'POWERTRAIN',
    title_vi: 'Hỗn hợp nhiên liệu quá giàu (Dãy 1 / Bank 1)',
    description_vi: 'Tỷ lệ hòa khí quá nhiều nhiên liệu hoặc thiếu không khí ở Bank 1.',
    description_en: 'System Too Rich (Bank 1)',
    symptoms_vi: 'Có mùi xăng sống ở ống xả, khói đen khi tăng ga, tốn nhiên liệu bất thường.',
    possible_causes_vi: [
      'Cảm biến lưu lượng khí nạp (MAF) báo sai lưu lượng',
      'Kim phun bị rò rỉ hoặc kẹt mở',
      'Kẹt van điều áp nhiên liệu',
      'Lọc gió động cơ quá bẩn làm nghẹt khí'
    ],
    severity: 'MEDIUM',
  },
  'P0420': {
    code: 'P0420',
    category: 'POWERTRAIN',
    title_vi: 'Hiệu suất bầu xúc tác khí xả dưới ngưỡng (Bank 1)',
    description_vi: 'Bầu xúc tác xử lý khí thải (Catalytic Converter) hoạt động kém hiệu quả trong việc lọc khí ô nhiễm.',
    description_en: 'Catalyst System Efficiency Below Threshold (Bank 1)',
    symptoms_vi: 'Thường không ảnh hưởng trực tiếp đến cảm giác lái, khí xả có mùi nồng, không đạt tiêu chuẩn đăng kiểm khí thải.',
    possible_causes_vi: [
      'Bầu xúc tác khí xả bị già hóa hoặc đóng muội than',
      'Cảm biến Oxy sau bầu xúc tác (O2 Sensor Bank 1 Sensor 2) báo sai',
      'Hở cổ pô xả trước cảm biến Oxy'
    ],
    severity: 'LOW',
  },
  'P0135': {
    code: 'P0135',
    category: 'POWERTRAIN',
    title_vi: 'Lỗi mạch sấy cảm biến Oxy (Bank 1 Sensor 1)',
    description_vi: 'Mạch điện sấy nóng cảm biến Oxy trước bầu xúc tác gặp sự cố khiến cảm biến lâu đạt nhiệt độ hoạt động.',
    description_en: 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)',
    symptoms_vi: 'Xe khởi động nguội tốn xăng hơn, sáng đèn Check Engine.',
    possible_causes_vi: ['Cháy dây sấy bên trong cảm biến Oxy', 'Đứt dây hoặc lỏng giắc cắm', 'Cháy cầu chì mạch sấy O2'],
    severity: 'LOW',
  },
  'P0101': {
    code: 'P0101',
    category: 'POWERTRAIN',
    title_vi: 'Lỗi tín hiệu cảm biến lưu lượng khí nạp (MAF)',
    description_vi: 'Cảm biến MAF gửi tín hiệu không đúng dải hoạt động tiêu chuẩn so với góc bướm ga và vòng tua máy.',
    description_en: 'Mass Air Flow Circuit Range/Performance',
    symptoms_vi: 'Khó nổ máy, ga bị giật cục, xe chạy không mượt mà.',
    possible_causes_vi: ['Cảm biến MAF bị bám bụi bẩn lâu ngày', 'Rách ống cao su cổ hút sau MAF', 'Hỏng cảm biến MAF'],
    severity: 'MEDIUM',
  },
  'P0113': {
    code: 'P0113',
    category: 'POWERTRAIN',
    title_vi: 'Nhiệt độ khí nạp báo cao bất thường (IAT Circuit High)',
    description_vi: 'Tín hiệu cảm biến nhiệt độ khí nạp (IAT) vượt ngưỡng điện áp quy định (hở mạch).',
    description_en: 'Intake Air Temperature Circuit High Input',
    symptoms_vi: 'Xe chạy tốn xăng khi thời tiết lạnh, sáng đèn Check Engine.',
    possible_causes_vi: ['Giắc cắm cảm biến IAT lỏng hoặc đứt dây', 'Hỏng cảm biến IAT'],
    severity: 'LOW',
  },
  'P0128': {
    code: 'P0128',
    category: 'POWERTRAIN',
    title_vi: 'Nhiệt độ nước làm mát dưới mức tiêu chuẩn',
    description_vi: 'Động cơ mất quá nhiều thời gian để đạt nhiệt độ vận hành tối ưu (80-95°C).',
    description_en: 'Coolant Thermostat (Coolant Temp Below Regulating Temp)',
    symptoms_vi: 'Đồng hồ nhiệt độ nước làm mát thấp, máy nguội lâu, điều hòa sưởi kém, xe chạy hao xăng.',
    possible_causes_vi: ['Kẹt van hằng nhiệt (Thermostat) ở trạng thái luôn mở', 'Hỏng cảm biến nhiệt độ nước làm mát (ECT)'],
    severity: 'LOW',
  },
  'P0442': {
    code: 'P0442',
    category: 'POWERTRAIN',
    title_vi: 'Rò rỉ nhỏ hệ thống thu hồi hơi xăng (EVAP)',
    description_vi: 'Phát hiện rò rỉ áp suất nhỏ trong bình xăng hoặc hệ thống thu hồi hơi xăng EVAP.',
    description_en: 'Evaporative Emission System Leak Detected (small leak)',
    symptoms_vi: 'Có thể có mùi xăng thoang thoảng xung quanh khu vực nắp bình xăng.',
    possible_causes_vi: ['Nắp bình xăng vặn chưa chặt hoặc mòn gioăng cao su', 'Nứt ống dẫn hơi xăng', 'Hỏng van thông hơi EVAP'],
    severity: 'LOW',
  },
  'P0455': {
    code: 'P0455',
    category: 'POWERTRAIN',
    title_vi: 'Rò rỉ lớn hệ thống thu hồi hơi xăng (EVAP Gross Leak)',
    description_vi: 'Hệ thống EVAP mất hoàn toàn áp suất chân không kiểm tra.',
    description_en: 'Evaporative Emission System Leak Detected (gross leak)',
    symptoms_vi: 'Có mùi xăng gần bình xăng, sáng đèn Check Engine.',
    possible_causes_vi: ['Quên đóng hoặc nắp bình xăng bị lỏng/hỏng hoàn toàn', 'Tuột ống hút hơi xăng EVAP'],
    severity: 'LOW',
  },
  'P0500': {
    code: 'P0500',
    category: 'POWERTRAIN',
    title_vi: 'Lỗi cảm biến tốc độ xe (VSS)',
    description_vi: 'ECU không nhận được tín hiệu tốc độ xe từ cảm biến tốc độ VSS.',
    description_en: 'Vehicle Speed Sensor Malfunction',
    symptoms_vi: 'Kim đồng hồ tốc độ (Speedometer) không nhảy, chuyển số bị giật, phanh ABS báo lỗi.',
    possible_causes_vi: ['Hỏng cảm biến tốc độ VSS', 'Đứt dây tín hiệu VSS', 'Hỏng bánh răng đo tốc độ trong hộp số'],
    severity: 'CRITICAL',
  },
  'P0505': {
    code: 'P0505',
    category: 'POWERTRAIN',
    title_vi: 'Lỗi hệ thống điều khiển không tải (IAC / Throttle Body)',
    description_vi: 'Hệ thống không thể duy trì tốc độ vòng tua cầm chừng (garanti) mục tiêu.',
    description_en: 'Idle Air Control System Malfunction',
    symptoms_vi: 'Vòng tua máy lúc dừng đèn đỏ quá cao hoặc quá thấp dễ chết máy.',
    possible_causes_vi: ['Họng hút / Bướm ga điện tử bị bẩn đóng muội đen', 'Van không tải IAC bị kẹt', 'Lọt gió chân không'],
    severity: 'MEDIUM',
  },

  // ── Network / Giao tiếp CAN Bus ──
  'U0100': {
    code: 'U0100',
    category: 'NETWORK',
    title_vi: 'Mất giao tiếp với Hộp điều khiển Động cơ (ECM/PCM)',
    description_vi: 'Mạng CAN bus không thể thiết lập liên lạc với hộp ECU động cơ.',
    description_en: 'Lost Communication With ECM/PCM',
    symptoms_vi: 'Xe không thể nổ máy hoặc đề dai, nhiều đèn cảnh báo trên bảng táp-lô sáng cùng lúc.',
    possible_causes_vi: ['Đứt hoặc chập dây mạng CAN bus (CAN-H, CAN-L)', 'Lỏng giắc cắm hộp ECU', 'Mất nguồn cấp hoặc dây mass ECU', 'Hỏng hộp ECU'],
    severity: 'CRITICAL',
  },
  'U0121': {
    code: 'U0121',
    category: 'NETWORK',
    title_vi: 'Mất giao tiếp với Hộp điều khiển Phanh ABS/ESP',
    description_vi: 'Mạng CAN bus không thể giao tiếp với hộp điều khiển chống bó cứng phanh ABS.',
    description_en: 'Lost Communication With Anti-Lock Brake System (ABS) Control Module',
    symptoms_vi: 'Sáng đèn phanh ABS, cân bằng điện tử ESP, vô lăng có thể bị nặng nhẹ bất thường.',
    possible_causes_vi: ['Lỏng giắc cắm hộp ABS', 'Đứt dây CAN bus đến ABS', 'Hỏng hộp ABS pump'],
    severity: 'CRITICAL',
  },
  'U0155': {
    code: 'U0155',
    category: 'NETWORK',
    title_vi: 'Mất giao tiếp với Bảng đồng hồ táp-lô (Instrument Cluster)',
    description_vi: 'Mạng CAN bus không nhận được phản hồi từ cụm đồng hồ táp-lô hiển thị trung tâm.',
    description_en: 'Lost Communication With Instrument Panel Cluster (IPC)',
    symptoms_vi: 'Các kim đồng hồ bị đứng yên, màn hình táp-lô không cập nhật thông tin.',
    possible_causes_vi: ['Sụt áp nguồn cấp đồng hồ táp-lô', 'Giắc cắm bảng táp-lô bị lỏng', 'Lỗi mạng CAN'],
    severity: 'MEDIUM',
  },

  // ── Chassis & Body ──
  'C0035': {
    code: 'C0035',
    category: 'CHASSIS',
    title_vi: 'Lỗi cảm biến tốc độ bánh xe trước bên trái (ABS Left Front)',
    description_vi: 'Hệ thống phanh ABS không nhận được xung tín hiệu tốc độ từ bánh trước bên trái.',
    description_en: 'Left Front Wheel Speed Sensor Circuit',
    symptoms_vi: 'Sáng đèn cảnh báo ABS và cân bằng điện tử ESC khi xe lăn bánh.',
    possible_causes_vi: ['Cảm biến ABS bánh trước trái bẩn hoặc hỏng', 'Đứt dây cảm biến ABS do đá văng / chạm gầm', 'Mòn vành từ ABS moay-ơ'],
    severity: 'MEDIUM',
  },
  'B1000': {
    code: 'B1000',
    category: 'BODY',
    title_vi: 'Lỗi vi mạch điều khiển túi khí (SRS ECU Hardware)',
    description_vi: 'Hộp điều khiển túi khí phát hiện lỗi phần cứng nội bộ bên trong bo mạch.',
    description_en: 'ECU Malfunction (Airbag SRS)',
    symptoms_vi: 'Đèn báo túi khí SRS sáng liên tục, túi khí có thể không kích nổ khi va chạm.',
    possible_causes_vi: ['Hỏng hộp điều khiển túi khí SRS', 'Nguồn điện cấp hộp SRS không ổn định', 'Từng bị ngập nước'],
    severity: 'CRITICAL',
  },
};

export function parseObdCodeDynamically(rawCode: string): LocalDtcEntry | null {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length < 4 || code.length > 7) return null;

  const prefix = code.charAt(0);
  let category: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK' = 'POWERTRAIN';
  let categoryVi = 'Động cơ & Hệ truyền động (Powertrain)';

  if (prefix === 'P') {
    category = 'POWERTRAIN';
    categoryVi = 'Hệ thống Động cơ & Hộp số (Powertrain)';
  } else if (prefix === 'C') {
    category = 'CHASSIS';
    categoryVi = 'Hệ thống Khung gầm & Phanh ABS/ESP (Chassis)';
  } else if (prefix === 'B') {
    category = 'BODY';
    categoryVi = 'Hệ thống Thân xe, Túi khí & Điều hòa (Body)';
  } else if (prefix === 'U') {
    category = 'NETWORK';
    categoryVi = 'Hệ thống Mạng giao tiếp CAN Bus & Điện tử (Network)';
  } else {
    return null;
  }

  const secondChar = code.charAt(1);
  const isGeneric = secondChar === '0' || secondChar === '2';
  const typeText = isGeneric ? 'Mã lỗi chuẩn quốc tế SAE/ISO' : 'Mã lỗi riêng của nhà sản xuất (OEM Specific)';

  let subsystemVi = 'Cụm điều khiển điện tử';
  const thirdChar = code.charAt(2);
  if (prefix === 'P') {
    switch (thirdChar) {
      case '0': subsystemVi = 'Hệ thống đo gió & định lượng nhiên liệu phụ trợ'; break;
      case '1': subsystemVi = 'Hệ thống đo gió & cung cấp nhiên liệu (Fuel/Air Metering)'; break;
      case '2': subsystemVi = 'Mạch điều khiển kim phun & cung cấp nhiên liệu'; break;
      case '3': subsystemVi = 'Hệ thống đánh lửa hoặc phát hiện bỏ lửa (Ignition/Misfire)'; break;
      case '4': subsystemVi = 'Hệ thống kiểm soát khí thải phụ trợ (EVAP / Catalytic / EGR)'; break;
      case '5': subsystemVi = 'Hệ thống điều khiển tốc độ xe & ga cầm chừng (Speed & Idle Control)'; break;
      case '6': subsystemVi = 'Hệ thống vi mạch ECU / Bộ nhớ máy tính'; break;
      case '7':
      case '8':
      case '9': subsystemVi = 'Hệ thống Hộp số & Bộ truyền động tự động (Transmission)'; break;
    }
  }

  return {
    code,
    category,
    title_vi: `${categoryVi} - ${typeText}`,
    description_vi: `Mã lỗi ${code} thuộc ${categoryVi}, phân hệ: ${subsystemVi}.`,
    description_en: `OBD-II Diagnostic Trouble Code ${code} (${categoryVi} - Subsystem: ${subsystemVi})`,
    symptoms_vi: 'Xe có thể sáng đèn cảnh báo trên táp-lô, ảnh hưởng đến hiệu suất vận hành hoặc lưu mã chờ trong ECU.',
    possible_causes_vi: [
      'Cảm biến hoặc cơ cấu chấp hành thuộc phân hệ bị lỗi hoặc sai lệch tín hiệu',
      'Giắc cắm, dây điện bị lỏng, đứt hoặc tiếp xúc kém',
      'Điện áp ắc quy không ổn định tại thời điểm nổ máy',
      'Sử dụng công cụ quét chẩn đoán chuyên sâu hoặc hỏi AI Gemini để kiểm tra chi tiết'
    ],
    severity: prefix === 'P' && (thirdChar === '3' || thirdChar === '0') ? 'CRITICAL' : 'MEDIUM',
  };
}

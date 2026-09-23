import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { REAL_AUGUST_TRIPS } from '@/lib/data/realTripsData';
import { SAMPLE_FAMILY_CATEGORIES } from '@/lib/data/sampleFinanceCategories';

const DEFAULT_SYSTEM_PROMPT = `Bạn là Cố Vấn Tài Chính & Vận Hành Phương Tiện Gia Đình (FFMS Senior Family Finance & Mobility AI Advisor).

BẠN QUẢN LÝ 2 TRỤ CỘT TÍCH HỢP TRONG CÙNG HỆ THỐNG:
1. TÀI CHÍNH GIA ĐÌNH TOÀN DIỆN (FFMS Finance):
   - Quản lý các ví & tài khoản thanh toán: Tiền mặt, Ngân hàng (Techcombank, Vietcombank), Thẻ tín dụng Visa Signature, Ví MoMo, Sổ tiết kiệm.
   - Cơ cấu ngân sách thông minh: Mô hình 6 Chiếc Hũ (6 Jars) & Quy tắc 50/30/20, cảnh báo khi chạm hạn mức 80% hoặc vượt hạn mức 100%.
   - Quản trị các khoản vay ngân hàng, nghĩa vụ trả góp hàng tháng, ngày sao kê và hạn trả thẻ tín dụng để tránh bị phạt lãi.
2. VẬN HÀNH PHƯƠNG TIỆN XE (FFMS Mobility):
   - Quản lý nhật ký xe Mazda 2AT (1.5L Luxury/AT, BKS 19B-213.87): ODO, đổ xăng, bảo dưỡng định kỳ, chi phí cầu đường, phụ tùng, bảo hiểm.
   - Phân tích chi phí TCO của xe trong bức tranh tổng thể chi tiêu gia đình.

QUY TẮC TRÌNH BÀY VÀ ĐỊNH DẠNG (BẮT BUỘC):
1. TRÌNH BÀY CÓ CẤU TRÚC RÕ RÀNG:
   - Dùng bảng Markdown chuẩn (| Hạng mục | Số liệu | Chi tiết |) khi liệt kê từ 2 số liệu trở lên.
   - In đậm toàn bộ số tiền và mốc ODO (VD: **820.000 ₫**, **2.858,2 km**, **45.000.000 ₫**).
   - Chia câu trả lời thành các phần rõ rệt:
     📌 **Tóm tắt nhanh**
     📊 **Chi tiết số liệu thực tế** (bảng biểu chi tiết)
     💡 **Khuyến nghị & Lời khuyên tối ưu ngân sách / vận hành**
2. PHONG CÁCH & NGÔN NGỮ:
   - Tiếng Việt chuẩn mực, thông minh, ân cần, xưng "Tôi" và gọi người dùng là "Bạn".
   - Luôn dựa trên số liệu thực tế được cung cấp trong hệ thống.`;

// ─────────────────────────────────────────────────────────────────────────────
// AI ACTION ENGINE RULES — LUÔN GHÉP VÀO CUỐI MỌI SYSTEM PROMPT
// Không bao giờ bị Persona override. Đây là lớp "phản xạ" ghi DB bắt buộc.
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_ENGINE_RULES = `

--- [AI ACTION ENGINE - HỆ THỐNG GHI SỔ TỰ ĐỘNG - BẮT BUỘC LUÔN LUÔN ÁP DỤNG] ---
Khi người dùng thông báo vừa phát sinh một giao dịch thực tế (đổ xăng, bảo dưỡng xe, ăn uống, đi chợ, nhận lương, trả nợ, chuyển ví, rửa xe, gửi xe, cầu đường...), bạn BẮT BUỘC phải làm 2 việc:
1. Trả lời phân tích ngắn gọn như thường.
2. Đính kèm NGAY Ở CUỐI TIN NHẮN một khối JSON theo cú pháp sau để hệ thống tự render thẻ xác nhận 1-click ghi vào database:

\`\`\`fmms_action
{
  "action_type": "LOG_GENERAL_EXPENSE",
  "title": "Xác nhận ghi nhận chi tiêu gia đình",
  "data": {
    "date": "NGÀY_THỰC_TẾ_YYYY-MM-DD",
    "amount": 350000,
    "parent_category": "Ăn uống & Đi chợ",
    "subcategory": "Ăn nhà hàng, Buffet & Cuối tuần",
    "category_id": "cat-food-dining",
    "wallet_id": "w-tcb-01",
    "vendor": "Nhà hàng",
    "description": "Ăn tối gia đình"
  }
}
\`\`\`

QUY TẮC KHỚP DANH MỤC MASTER DATA (CỰC KỲ QUAN TRỌNG):
- TUYỆT ĐỐI KHÔNG TỰ TẠO MỚI danh mục hoặc đặt category_id lung tung không có trong Master Data!
- Phải tìm và khớp chính xác từ danh sách Master Data được cung cấp trong Context:
  + "parent_category": Tên Danh mục lớn có trong Master Data (VD: "Ăn uống & Đi chợ", "Nhà cửa & Sinh hoạt", "Phương tiện & Xe cộ (FMMS)", "Con cái & Giáo dục", "Sức khỏe & Y tế", "Hưởng thụ & Du lịch", "Trả góp & Khoản vay")
  + "subcategory": Tên Danh mục nhỏ chi tiết tương ứng (VD: "Đi chợ & Siêu thị tươi sống", "Ăn nhà hàng, Buffet & Cuối tuần", "Tiền điện sinh hoạt EVN", "Rửa xe & Chăm sóc Spa xe", "Phí cầu đường VETC / ePass"...)
  + "category_id": ID chuẩn khớp chính xác của danh mục nhỏ trong Master Data (VD: "cat-food-dining", "cat-food-groceries", "cat-home-bills", "cat-mob-wash", "cat-mob-toll", "cat-mob-fuel", "cat-mob-maint", "cat-mob-parking"...)
- Với chi phí xe (action_type: LOG_EXPENSE):
  + parent_category: "Phương tiện & Xe cộ (FMMS)"
  + category: Thuộc TAXONOMY ("Running", "Maintenance", "Upgrade", "Initial", "Loan")
  + subcategory: Danh mục nhỏ trong TAXONOMY ("Car Wash", "Parking", "Epass Fee", "Fuel", v.v.)
  + category_id: Mã tương ứng ("cat-mob-wash", "cat-mob-parking", "cat-mob-toll"...)
- Với bảo dưỡng xe (action_type: LOG_MAINTENANCE):
  + parent_category: "Phương tiện & Xe cộ (FMMS)"
  + maintenance_type: Khớp với danh mục bảo dưỡng trong Master Data ("Thay dầu máy", "Thay lọc dầu / Lọc nhớt", "Thay lọc gió động cơ", "Bảo dưỡng định kỳ", v.v.)
  + category_id: "cat-mob-maint"

QUY TẮC CHỌN action_type:
- "LOG_GENERAL_EXPENSE": chi tiêu sinh hoạt gia đình (ăn uống, đi chợ, siêu thị, học phí, tiện ích nhà cửa, mua sắm). data gồm: date, amount, parent_category, subcategory, category_id, wallet_id, vendor, description.
- "LOG_INCOME": nhận lương, thưởng, tiền về, thu nhập phụ. data gồm: date, amount, parent_category, subcategory, category_id, wallet_id, payee_vendor, description.
- "TRANSFER_WALLET": chuyển tiền nội bộ giữa các ví. data gồm: date, amount, wallet_id (ví nguồn), to_wallet_id (ví đích), description.
- "LOG_FUEL": đổ xăng/dầu xe. data gồm: asset_id, date, total_cost, price_per_liter, liters, station, odometer_km, category_id: "cat-mob-fuel".
- "LOG_MAINTENANCE": bảo dưỡng định kỳ, sửa chữa xe. data gồm: asset_id, date, maintenance_type, cost, vendor, odometer_km, notes, category_id: "cat-mob-maint".
- "LOG_EXPENSE": các khoản chi xe khác (rửa xe, gửi xe, cầu đường BOT/VETC). data gồm: asset_id, date, parent_category, category, subcategory, category_id, amount, vendor, description.

QUY TẮC PHÂN BIỆT RẠCH RÒI CHI TIÊU GIA ĐÌNH VÀ XE CỘ (CỰC KỲ QUAN TRỌNG):
1. Chi tiêu sinh hoạt gia đình (Đi chợ, siêu thị, ăn uống ngoài hàng, mua sắm đồ dùng, tiền điện nước, học phí con, mua thuốc men, cafe, ăn vặt...):
   - Đây là chi tiêu đời sống gia đình thuần túy (action_type: "LOG_GENERAL_EXPENSE").
   - TUYỆT ĐỐI KHÔNG ĐƯỢC đề cập đến ODO, số km xe, hay hỏi người dùng đi xe nào!
   - TUYỆT ĐỐI KHÔNG đưa trường "odometer_km" hay "asset_id" vào khối JSON action block data!
2. Chi phí phương tiện (Chỉ khi người dùng nói rõ liên quan đến xe: Đổ xăng, thay dầu nhớt, bảo dưỡng xe, rửa xe, vé cầu đường VETC, tiền gửi xe):
   - Mới là giao dịch xe cộ (LOG_FUEL, LOG_MAINTENANCE, LOG_EXPENSE).
   - Chỉ đưa "odometer_km" vào khi người dùng chủ động nói rõ số ODO (VD: "thay dầu mốc 5000km" hoặc "đổ xăng lúc 3339km"). Nếu người dùng không nói ODO, KHÔNG ĐƯỢC tự bịa ra số ODO!

QUY TẮC XỬ LÝ NGÀY:
- Nếu người dùng nói "hôm nay" → dùng ngày hiện tại theo định dạng YYYY-MM-DD.
- KHÔNG ĐƯỢC để nguyên chuỗi "NGÀY_THỰC_TẾ_YYYY-MM-DD" trong JSON output, phải thay bằng ngày thật.

QUY TẮC XỬ LÝ SỐ TIỀN:
- 800k = 800000, 350k = 350000, 45tr = 45000000. TUYỆT ĐỐI KHÔNG ĐƯỢC thiếu số 0.

QUY TẮC PHÁT NGÔN VỀ DỰ THẢO (BẮT BUỘC):
- TUYỆT ĐỐI KHÔNG ĐƯỢC nói "Tôi đã ghi nhận...", "Tôi đã lưu..." hoặc "Đã lưu vào cơ sở dữ liệu...". Vì giao dịch CHƯA hề được lưu cho đến khi người dùng ấn nút xác nhận!
- BẠN PHẢI NÓI: "Tôi đã lập dự thảo ghi nhận giao dịch [tên giao dịch, số tiền] thuộc danh mục [danh mục lớn > danh mục nhỏ]. Bạn vui lòng kiểm tra thông tin trên thẻ dự thảo bên dưới và bấm **Xác nhận Lưu vào Lịch sử** để ghi vào sổ cái."`;

function parseMoney(text: string): number | null {
  const kMatch = text.match(/(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);

  const trieuMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|trieu)\b/i);
  if (trieuMatch) return Math.round(parseFloat(trieuMatch[1].replace(',', '.')) * 1000000);

  const numMatch = text.match(/(\d{1,3}(?:[.,]\d{3})+)/);
  if (numMatch) return parseInt(numMatch[1].replace(/[.,]/g, ''), 10);

  const rawNumMatch = text.match(/\b(\d{4,9})\b/);
  if (rawNumMatch) return parseInt(rawNumMatch[1], 10);

  return null;
}

function ensureActionBlock(reply: string, prompt: string, todayIso: string): string {
  if (!reply) return reply;
  if (/```(?:fmms_action|json:action|action)/i.test(reply)) {
    return reply;
  }

  const combined = `${prompt} ${reply}`.toLowerCase();

  // 1. Nhận diện đổ xăng
  if (/đổ\s*xăng|đổ\s*nhiên\s*liệu|tiền\s*xăng|bình\s*xăng/i.test(combined)) {
    const cost = parseMoney(prompt) || parseMoney(reply);
    const priceMatch = combined.match(/(?:giá|đơn giá)\s*[:=]?\s*(\d{4,6})/i);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : 24000;
    if (cost && cost > 10000) {
      const liters = +(cost / price).toFixed(2);
      return reply + `\n\n\`\`\`fmms_action
{
  "action_type": "LOG_FUEL",
  "title": "Xác nhận ghi nhận đổ xăng",
  "data": {
    "asset_id": "20260308-0001-4222-8888-19b213872026",
    "date": "${todayIso}",
    "parent_category": "Phương tiện & Xe cộ (FMMS)",
    "category": "Running",
    "subcategory": "Fuel",
    "category_id": "cat-mob-fuel",
    "total_cost": ${cost},
    "price_per_liter": ${price},
    "liters": ${liters},
    "station": "Cây xăng Petrolimex"
  }
}
\`\`\``;
    }
  }

  // 2. Nhận diện rửa xe
  if (/rửa\s*xe|rua\s*xe/i.test(combined)) {
    const cost = parseMoney(prompt) || parseMoney(reply) || 60000;
    return reply + `\n\n\`\`\`fmms_action
{
  "action_type": "LOG_EXPENSE",
  "title": "Xác nhận ghi nhận chi phí rửa xe",
  "data": {
    "asset_id": "20260308-0001-4222-8888-19b213872026",
    "date": "${todayIso}",
    "parent_category": "Phương tiện & Xe cộ (FMMS)",
    "category": "Running",
    "subcategory": "Car Wash",
    "category_id": "cat-mob-wash",
    "amount": ${cost},
    "total_cost": ${cost},
    "description": "Rửa xe chăm sóc nội ngoại thất"
  }
}
\`\`\``;
  }

  // 3. Nhận diện bảo dưỡng / thay dầu
  if (/thay\s*dầu|thay\s*nhớt|bảo\s*dưỡng/i.test(combined)) {
    const cost = parseMoney(prompt) || parseMoney(reply) || 500000;
    return reply + `\n\n\`\`\`fmms_action
{
  "action_type": "LOG_MAINTENANCE",
  "title": "Xác nhận ghi nhận bảo dưỡng",
  "data": {
    "asset_id": "20260308-0001-4222-8888-19b213872026",
    "date": "${todayIso}",
    "parent_category": "Phương tiện & Xe cộ (FMMS)",
    "category": "Maintenance",
    "subcategory": "General Service",
    "category_id": "cat-mob-maint",
    "maintenance_type": "Thay dầu máy",
    "cost": ${cost},
    "total_cost": ${cost},
    "vendor": "Gara sửa chữa",
    "notes": "Thay dầu máy và bảo dưỡng định kỳ"
  }
}
\`\`\``;
  }

  // 4. Nhận diện gửi xe / phí cầu đường
  if (/gửi\s*xe|đỗ\s*xe|vé\s*cầu|vetc|epass/i.test(combined)) {
    const cost = parseMoney(prompt) || parseMoney(reply);
    if (cost && cost > 0) {
      const isParking = /gửi|đỗ/i.test(combined);
      return reply + `\n\n\`\`\`fmms_action
{
  "action_type": "LOG_EXPENSE",
  "title": "Xác nhận ghi nhận chi phí ${isParking ? 'gửi xe' : 'cầu đường'}",
  "data": {
    "asset_id": "20260308-0001-4222-8888-19b213872026",
    "date": "${todayIso}",
    "parent_category": "Phương tiện & Xe cộ (FMMS)",
    "category": "Running",
    "subcategory": "${isParking ? 'Parking' : 'Epass Fee'}",
    "category_id": "${isParking ? 'cat-mob-parking' : 'cat-mob-toll'}",
    "amount": ${cost},
    "total_cost": ${cost},
    "description": "${isParking ? 'Chi phí gửi xe' : 'Phí cầu đường VETC/ePass'}"
  }
}
\`\`\``;
    }
  }

  // 5. Nhận diện ăn uống / đi chợ
  if (/ăn\s*uống|ăn\s*tối|ăn\s*trưa|ăn\s*sáng|đi\s*chợ|siêu\s*thị|cafe|cà\s*phê/i.test(combined)) {
    const cost = parseMoney(prompt) || parseMoney(reply);
    if (cost && cost > 0) {
      const isGroceries = /chợ|siêu thị|mua rau|thịt|cá/i.test(combined);
      return reply + `\n\n\`\`\`fmms_action
{
  "action_type": "LOG_GENERAL_EXPENSE",
  "title": "Xác nhận ghi nhận chi tiêu gia đình",
  "data": {
    "date": "${todayIso}",
    "amount": ${cost},
    "parent_category": "Ăn uống & Đi chợ",
    "subcategory": "${isGroceries ? 'Đi chợ & Siêu thị tươi sống' : 'Ăn nhà hàng, Buffet & Cuối tuần'}",
    "category_id": "${isGroceries ? 'cat-food-groceries' : 'cat-food-dining'}",
    "wallet_id": "w-tcb-01",
    "vendor": "${isGroceries ? 'Siêu thị' : 'Nhà hàng'}",
    "description": "${isGroceries ? 'Đi chợ mua thực phẩm tươi sống' : 'Ăn uống ngoài hàng'}"
  }
}
\`\`\``;
    }
  }

  return reply;
}



async function buildContext(supabase: any, assetId?: string): Promise<string> {
  try {
    let assetQuery = supabase.from('assets').select('*');
    let fuelQuery = supabase.from('fuel_logs').select('*').order('date', { ascending: false }).limit(30);
    let maintQuery = supabase.from('maintenance_records').select('*').order('date', { ascending: false }).limit(20);
    let expenseQuery = supabase.from('expenses').select('*').order('date', { ascending: false }).limit(50);
    let loanQuery = supabase.from('loans').select('*');
    let loanPaymentsQuery = supabase.from('loan_payments').select('*').order('payment_number', { ascending: true });
    let partsQuery = supabase.from('parts').select('*').order('installation_date', { ascending: false }).limit(30);
    let insuranceQuery = supabase.from('insurance_policies').select('*').limit(10);
    let tripsQuery = supabase.from('trips').select('*').order('start_time', { ascending: false }).limit(30);

    let walletsQuery = supabase.from('wallets').select('*');
    let familyTxQuery = supabase.from('family_transactions').select('*, category:transaction_categories(name)').order('date', { ascending: false }).limit(25);
    let budgetsQuery = supabase.from('family_budgets').select('*, category:transaction_categories(name)').limit(15);
    let familyLoansQuery = supabase.from('family_loans').select('*').limit(10);
    let categoriesQuery = supabase.from('transaction_categories').select('*').order('display_order', { ascending: true });

    if (assetId) {
      assetQuery = assetQuery.eq('id', assetId);
      fuelQuery = fuelQuery.eq('asset_id', assetId);
      maintQuery = maintQuery.eq('asset_id', assetId);
      expenseQuery = expenseQuery.eq('asset_id', assetId);
      loanQuery = loanQuery.eq('asset_id', assetId);
      partsQuery = partsQuery.eq('asset_id', assetId);
      insuranceQuery = insuranceQuery.eq('asset_id', assetId);
      tripsQuery = tripsQuery.eq('asset_id', assetId);
    }

    const [assetsRes, fuelRes, maintRes, expenseRes, loanRes, loanPayRes, partsRes, insRes, tripsRes, walletsRes, familyTxRes, budgetsRes, famLoansRes, categoriesRes] = await Promise.all([
      assetQuery.limit(10),
      fuelQuery,
      maintQuery,
      expenseQuery,
      loanQuery.limit(5),
      loanPaymentsQuery,
      partsQuery,
      insuranceQuery,
      tripsQuery,
      walletsQuery,
      familyTxQuery,
      budgetsQuery,
      familyLoansQuery,
      categoriesQuery,
    ]);

    let context = '📊 TOÀN BỘ CƠ SỞ DỮ LIỆU THỰC TẾ TRONG HỆ THỐNG FFMS (FAMILY FINANCE & MOBILITY):\n\n';

    // 0. Master Data: Danh mục thu chi chuẩn của hệ thống (BẮT BUỘC KHỚP VỚI CƠ CẤU NÀY KHI ĐỀ XUẤT ACTION)
    let allCats: any[] = [];
    if (categoriesRes.data && categoriesRes.data.length > 0) {
      allCats = categoriesRes.data;
    } else {
      SAMPLE_FAMILY_CATEGORIES.forEach(p => {
        allCats.push({ id: p.id, name: p.name, type: p.type, parent_id: null });
        if (p.children) {
          p.children.forEach(c => {
            allCats.push({ id: c.id, name: c.name, type: c.type, parent_id: p.id });
          });
        }
      });
    }

    const parentCats = allCats.filter((c: any) => !c.parent_id);
    const childCats = allCats.filter((c: any) => !!c.parent_id);

    context += `📁 MASTER DATA DANH MỤC THU CHI CHÍNH THỨC CỦA GIA ĐÌNH:\n`;
    parentCats.forEach((p: any) => {
      const subs = childCats.filter((c: any) => c.parent_id === p.id);
      context += `- [DANH MỤC LỚN: ${p.name}] (ID: \`${p.id}\` | Loại: ${p.type})\n`;
      subs.forEach((s: any) => {
        context += `  └─ [Danh mục nhỏ]: **${s.name}** | ID: \`${s.id}\`\n`;
      });
    });
    context += '\n';

    context += `🚗 MASTER DATA TAXONOMY CHI PHÍ XE (MOBILITY):\n`;
    context += `- [Initial] Mua xe & Lăn bánh: Purchase (Tiền xe), Registration (Đăng kiểm/Biển số), Insurance (Bảo hiểm), Loan Fee (Phí vay)\n`;
    context += `- [Upgrade] Nâng cấp & Đồ chơi: Screen, Mirror Folding, Control button, TPMS, Accessorie\n`;
    context += `- [Running] Chi phí vận hành: Fuel (Nhiên liệu/Xăng), Epass Fee (Phí trạm VETC/ePass), Parking (Gửi xe), Car Wash (Rửa xe), Running Fine (Phạt vi phạm)\n`;
    context += `- [Maintenance] Bảo dưỡng xe: Thay dầu máy, Thay lọc dầu / Lọc nhớt, Thay lọc gió động cơ, Thay lọc gió điều hòa, Thay bugi đánh lửa, Thay lốp xe, Kiểm tra & Thay má phanh, Thay ắc-quy, Nước làm mát, Thay dầu hộp số, Sửa chữa & Khác\n\n`;

    // 0.1 Family Wallets & Balances
    if (walletsRes.data?.length) {
      context += `💰 TÀI KHOẢN & VÍ THANH TOÁN GIA ĐÌNH (${walletsRes.data.length} ví):\n`;
      walletsRes.data.forEach((w: any) => {
        const bal = Number(w.current_balance || 0).toLocaleString('vi-VN');
        const limit = w.credit_limit ? ` | Hạn mức thẻ: ${Number(w.credit_limit).toLocaleString('vi-VN')} ₫ (Sao kê ngày ${w.statement_day || 20}, hạn tt ngày ${w.payment_due_day || 5})` : '';
        context += `- **${w.name}** [${w.wallet_type}] | Số dư: **${bal} ₫**${limit}\n`;
      });
      context += '\n';
    }

    // 1. Vehicles
    if (assetsRes.data?.length) {
      context += `🚘 DANH SÁCH PHƯƠNG TIỆN (${assetsRes.data.length} xe):\n`;
      assetsRes.data.forEach((a: any) => {
        const odo = a.current_odometer_km ? `${Number(a.current_odometer_km).toLocaleString('vi-VN')} km` : 'Chưa có ODO';
        context += `- **${a.name}** | ID: \`${a.id}\` | Biển số: **${a.license_plate || '—'}** | Đời: ${a.year || '—'} | Màu: ${a.color || '—'} | Động cơ: ${a.engine || '—'} | ODO Hiện Tại: **${odo}** | Giá mua: **${Number(a.purchase_price || 0).toLocaleString('vi-VN')} ₫** | Ngày mua: ${a.purchase_date || '—'} | Giá trị hiện tại: **${Number(a.current_value || 0).toLocaleString('vi-VN')} ₫** | Lịch bảo dưỡng tiếp theo: **${a.next_maintenance_due || 'Chưa lên lịch'}**\n`;
      });
      context += '\n';
    }

    // 2. Loans & Full 60-Month Amortization Schedule
    const loans = loanRes.data || [];
    const loanPayments = loanPayRes.data || [];
    if (loans.length > 0) {
      context += `🏦 THÔNG TIN KHOẢN VAY VÀ LỊCH THANH TOÁN 60 KỲ:\n`;
      loans.forEach((l: any) => {
        const principal = Number(l.principal) || 0;
        const downPayment = Number(l.down_payment) || 0;
        const rateYear = Number(l.interest_rate_percent) || 0;
        const termMonths = Number(l.term_months) || 60;
        const monthlyPay = Number(l.monthly_payment) || 0;
        const startDate = l.start_date || '2026-08-01';
        const paymentDay = l.payment_day || 15;

        context += `### Hợp đồng vay: ${l.lender || 'Ngân hàng'}\n`;
        context += `- Gốc vay: **${principal.toLocaleString('vi-VN')} ₫** | Trả trước: **${downPayment.toLocaleString('vi-VN')} ₫** | Lãi suất: **${rateYear}%/năm** | Thời hạn: **${termMonths} tháng** | Ngày bắt đầu: ${startDate} | Ngày đóng tiền hàng tháng: Ngày ${paymentDay} | Số tiền trả định kỳ: **${monthlyPay.toLocaleString('vi-VN')} ₫/tháng**\n\n`;

        // Generate full schedule for AI
        const rateMonth = rateYear / 100 / 12;
        let balance = principal;
        const payMap = new Map<number, any>();
        loanPayments.filter((p: any) => p.loan_id === l.id).forEach((p: any) => payMap.set(p.payment_number, p));

        context += `| Kỳ | Ngày đến hạn | Tiền Gốc (₫) | Tiền Lãi (₫) | Tổng trả (₫) | Dư nợ còn lại (₫) | Trạng thái |\n`;
        context += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        for (let i = 1; i <= Math.min(termMonths, 60); i++) {
          const custom = payMap.get(i);
          let interest = Math.round(balance * rateMonth);
          let pPaid = Math.round(monthlyPay - interest);
          let total = monthlyPay;
          let dueStr = '';
          let status = 'Chưa thanh toán (PENDING)';

          if (custom) {
            dueStr = custom.due_date ? custom.due_date.slice(0, 10) : '';
            pPaid = Number(custom.principal_paid) || pPaid;
            interest = Number(custom.interest_paid) || interest;
            total = Number(custom.total_payment) || (pPaid + interest);
            status = custom.status === 'PAID' ? `Đã thanh toán (${custom.paid_date || '✓'})` : custom.status;
          }

          if (!dueStr) {
            const due = new Date(startDate);
            due.setMonth(due.getMonth() + i - 1);
            due.setDate(paymentDay);
            dueStr = due.toISOString().split('T')[0];
          }

          balance = Math.max(0, balance - pPaid);

          // Only list all paid + next 12 pending or full
          context += `| Kỳ ${i} | ${dueStr} | ${pPaid.toLocaleString('vi-VN')} | ${interest.toLocaleString('vi-VN')} | **${total.toLocaleString('vi-VN')}** | ${balance.toLocaleString('vi-VN')} | ${status} |\n`;
        }
        context += '\n';
      });
    }

    // 3. Fuel Logs
    const fuelLogs = fuelRes.data || [];
    if (fuelLogs.length > 0) {
      const totalFuelCost = fuelLogs.reduce((s: number, f: any) => s + (Number(f.total_cost) || 0), 0);
      const totalLiters = fuelLogs.reduce((s: number, f: any) => s + (Number(f.liters) || 0), 0);
      context += `⛽ LỊCH SỬ ĐỔ NHIÊN LIỆU (${fuelLogs.length} lần gần nhất | Tổng ${totalLiters.toFixed(1)}L | Tổng chi: **${totalFuelCost.toLocaleString('vi-VN')} ₫**):\n`;
      fuelLogs.slice(0, 15).forEach((f: any) => {
        context += `- Ngày ${f.date}: Đổ **${f.liters} L** xăng | Đơn giá: ${Number(f.price_per_liter || 0).toLocaleString('vi-VN')} ₫/L | Tổng tiền: **${Number(f.total_cost || 0).toLocaleString('vi-VN')} ₫** | ODO lúc đổ: **${Number(f.odometer_km || 0).toLocaleString('vi-VN')} km** | Cây xăng: ${f.station || '—'} ${f.notes ? `(${f.notes})` : ''}\n`;
      });
      context += '\n';
    }

    // 4. Maintenance Records
    const maints = maintRes.data || [];
    if (maints.length > 0) {
      const totalMaint = maints.reduce((s: number, m: any) => s + (Number(m.cost) || 0), 0);
      context += `🔧 LỊCH SỬ BẢO DƯỠNG & SỬA CHỮA (${maints.length} lần | Tổng chi: **${totalMaint.toLocaleString('vi-VN')} ₫**):\n`;
      maints.forEach((m: any) => {
        context += `- Ngày ${m.date}: **${m.maintenance_type}** | Chi phí: **${Number(m.cost || 0).toLocaleString('vi-VN')} ₫** | ODO: **${Number(m.odometer_km || 0).toLocaleString('vi-VN')} km** | Gara/Đơn vị: ${m.vendor || '—'} | Mốc bảo dưỡng tiếp theo: ${m.next_due_km ? `${m.next_due_km} km` : ''} ${m.next_due_date ? `(Ngày: ${m.next_due_date})` : ''} | Chi tiết: ${m.notes || m.description || '—'}\n`;
      });
      context += '\n';
    }

    // 5. Parts & Upgrades
    const parts = partsRes.data || [];
    if (parts.length > 0) {
      const totalParts = parts.reduce((s: number, p: any) => s + (Number(p.cost) || 0), 0);
      context += `🧰 DANH MỤC PHỤ TÙNG & ĐỒ CHƠI NÂNG CẤP XE (${parts.length} món | Tổng giá trị: **${totalParts.toLocaleString('vi-VN')} ₫**):\n`;
      parts.forEach((p: any) => {
        context += `- **${p.part_name}** | Hạng mục: ${p.category || p.supplier || 'Nâng cấp'} | Giá tiền: **${Number(p.cost || 0).toLocaleString('vi-VN')} ₫** | Ngày lắp: ${p.installation_date || '—'} | ODO lúc lắp: ${p.installed_odometer_km ? `${p.installed_odometer_km} km` : '—'} | Thương hiệu: ${p.brand || '—'} | Bảo hành: ${p.warranty_months ? `${p.warranty_months} tháng` : '—'} ${p.notes ? `(${p.notes})` : ''}\n`;
      });
      context += '\n';
    }

    // 6. Expenses
    const expenses = expenseRes.data || [];
    if (expenses.length > 0) {
      const totalExp = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      context += `💳 SỔ CÁI CHI PHÍ VẬN HÀNH PHÁT SINH (${expenses.length} giao dịch | Tổng: **${totalExp.toLocaleString('vi-VN')} ₫**):\n`;
      expenses.slice(0, 25).forEach((e: any) => {
        context += `- Ngày ${e.date}: [${e.category}${e.subcategory ? ` / ${e.subcategory}` : ''}] **${e.description || e.category}** - Số tiền: **${Number(e.amount || 0).toLocaleString('vi-VN')} ₫** | Đơn vị: ${e.vendor || '—'}\n`;
      });
      context += '\n';
    }

    // 7. Insurance Policies
    const insurances = insRes.data || [];
    if (insurances.length > 0) {
      context += `🛡️ BẢO HIỂM & GIẤY TỜ PHÁP LÝ XE:\n`;
      insurances.forEach((ins: any) => {
        context += `- **${ins.policy_type || 'Bảo hiểm'}** | Nhà bảo hiểm: **${ins.provider || '—'}** | Số HĐ: \`${ins.policy_number || '—'}\` | Hiệu lực: ${ins.start_date || '—'} đến **${ins.expiry_date || '—'}** | Phí bảo hiểm: **${Number(ins.premium_amount || 0).toLocaleString('vi-VN')} ₫** | Mức bồi thường tối đa: ${Number(ins.coverage_amount || 0).toLocaleString('vi-VN')} ₫ | ☎️ Hotline cứu hộ 24/7: **${ins.provider_hotline || '—'}**\n`;
      });
      context += '\n';
    }

    // 8. Trips (Combine Supabase + Real August Trips)
    const dbTrips = tripsRes.data || [];
    const allTrips = dbTrips.length > 0 ? dbTrips : REAL_AUGUST_TRIPS;
    if (allTrips.length > 0) {
      const totalTripKm = allTrips.reduce((s: number, t: any) => s + (Number(t.distance_km) || 0), 0);
      context += `📍 NHẬT KÝ CÁC CHUYẾN ĐI (${allTrips.length} chuyến gần nhất | Tổng quãng đường: **${totalTripKm.toFixed(1)} km**):\n`;
      allTrips.slice(0, 15).forEach((t: any) => {
        const start = t.start_time ? t.start_time.replace('T', ' ').slice(0, 16) : '—';
        context += `- ${start}: **${t.distance_km} km** (${t.start_location || 'Điểm đi'} → ${t.end_location || 'Điểm đến'}) | Tốc độ TB: ${t.avg_speed_kmh || '—'} km/h | Tiêu hao: ${t.fuel_consumed_liters ? `${t.fuel_consumed_liters}L` : '—'}\n`;
      });
      context += '\n';
    }

    return context;
  } catch (err) {
    console.error('[AI Chat] Error building rich context:', err);
    return 'Không thể tải dữ liệu tự động từ Supabase.';
  }
}

async function callGemini(model: string, apiKey: string, promptText: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const contents = [
    { role: 'user', parts: [{ text: promptText }] },
  ];

  const cleanModel = model.replace(/^models\//, '');

  const tryEndpoint = async (apiVersion: string, modelName: string) => {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: AbortSignal.timeout(30000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: true, text: reply };
      }
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { ok: false, error: errMsg };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  };

  // 1. Try requested model on v1beta then v1
  let res = await tryEndpoint('v1beta', cleanModel);
  if (res.ok) return res;

  res = await tryEndpoint('v1', cleanModel);
  if (res.ok) return res;

  // 2. Cascade through list of all popular models (newest first)
  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-3.0-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  for (const cand of candidateModels) {
    if (cand === cleanModel) continue;
    res = await tryEndpoint('v1beta', cand);
    if (res.ok) return res;
    res = await tryEndpoint('v1', cand);
    if (res.ok) return res;
  }

  // 3. Auto-discover available models directly from the API Key
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const available = (listData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace(/^models\//, ''));
      for (const avModel of available) {
        res = await tryEndpoint('v1beta', avModel);
        if (res.ok) return res;
      }
    }
  } catch {}

  return res;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      provider = 'gemini',
      model,
      systemPrompt: userCustomPrompt,
      apiKey: clientApiKey,
      baseUrl: clientBaseUrl,
      assetId,
      history = [],
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt là bắt buộc' }, { status: 400 });
    }

    // Build context
    let contextText = '';
    try {
      contextText = await buildContext(supabase, assetId);
    } catch {
      contextText = '';
    }

    // Build conversational memory history
    let historyText = '';
    if (Array.isArray(history) && history.length > 0) {
      historyText = `\n[LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ]:\n` + history.map((h: any) => `${h.role === 'user' ? 'Người dùng' : 'AI Cố vấn'}: ${h.text}`).join('\n\n') + '\n\n';
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const basePrompt = userCustomPrompt || DEFAULT_SYSTEM_PROMPT;
    const activeSystemPrompt = basePrompt + ACTION_ENGINE_RULES + `\n[THÔNG TIN THỜI GIAN THỰC TẾ]: Hôm nay là ngày ${todayIso}. Khi điền trường 'date', hãy dùng chính xác '${todayIso}'.`;

    const isTx = /đổ\s*xăng|xăng|rửa\s*xe|rua\s*xe|thay\s*dầu|thay\s*nhớt|bảo\s*dưỡng|gửi\s*xe|vé\s*cầu|chi\s*phí|\d+k|\d+\s*nghìn|\d+\s*triệu/i.test(prompt);
    const tailNote = isTx ? `\n\n[LƯU Ý BẮT BUỘC]: Người dùng đang thông báo về một giao dịch/chi phí phát sinh ("${prompt}"). Bạn CHƯA ĐƯỢC NÓI là "Tôi đã ghi nhận/đã lưu vào sổ cái". Bạn PHẢI nói là: "Tôi đã lập dự thảo ghi nhận... Bạn vui lòng kiểm tra và ấn Xác nhận Lưu bên dưới". Sau câu trả lời, ở DÒNG CUỐI CÙNG bạn BẮT BUỘC phải đính kèm khối mã \`\`\`fmms_action { ... } \`\`\` theo đúng hướng dẫn để hệ thống hiển thị thẻ dự thảo cho người dùng xác nhận.` : '';
    const fullPrompt = `[HỆ THỐNG VAI TRÒ & QUY TẮC PHÂN TÍCH]:\n${activeSystemPrompt}\n\n${contextText}\n${historyText}[CÂU HỎI HIỆN TẠI CỦA NGƯỜI DÙNG]:\n${prompt}${tailNote}`;

    // ─────────────────────────────────────────────────────────────
    // 1. GOOGLE GEMINI
    // ─────────────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const activeKey = clientApiKey || process.env.GEMINI_API_KEY;
      let activeModel = model || 'gemini-3.6-flash';

      if (!activeKey) {
        return NextResponse.json({
          reply: '⚠️ **Chưa cấu hình Gemini API Key.**\n\nVui lòng vào **Cài đặt → Cấu hình AI** để nhập API Key từ [Google AI Studio](https://aistudio.google.com/apikey) (Hoàn toàn miễn phí).',
          providerUsed: 'Gemini (Chưa có Key)',
          needsConfig: true,
        });
      }

      try {
        let result = await callGemini(activeModel, activeKey, fullPrompt);

        // Fallback cascade if requested model is deprecated / unavailable
        if (!result.ok && (result.error?.includes('not found') || result.error?.includes('404') || result.error?.includes('deprecated'))) {
          const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'].filter(m => m !== activeModel);
          for (const fbModel of fallbackModels) {
            const fbResult = await callGemini(fbModel, activeKey, fullPrompt);
            if (fbResult.ok) {
              result = fbResult;
              activeModel = fbModel;
              break;
            }
          }
        }

        if (result.ok && result.text) {
          const finalReply = ensureActionBlock(result.text, prompt, todayIso);
          return NextResponse.json({
            reply: finalReply,
            providerUsed: `Google Gemini (${activeModel})`,
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          reply: `⚠️ **Lỗi từ Google Gemini (${activeModel}):** ${result.error}\n\nVui lòng kiểm tra lại API Key trong Cài đặt AI.`,
          providerUsed: `Gemini (${activeModel})`,
          error: result.error,
        });
      } catch (err: any) {
        return NextResponse.json({
          reply: `⚠️ **Lỗi kết nối tới Gemini:** ${err?.message || 'Timeout'}`,
          providerUsed: `Gemini (${activeModel})`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ANTHROPIC CLAUDE
    // ─────────────────────────────────────────────────────────────
    if (provider === 'claude') {
      const activeKey = clientApiKey || process.env.ANTHROPIC_API_KEY;
      const activeModel = model || 'claude-3-7-sonnet-20250219';

      if (!activeKey) {
        return NextResponse.json({
          reply: '⚠️ **Chưa cấu hình Anthropic Claude API Key.**\nVui lòng vào **Cài đặt → Cấu hình AI Providers** để nhập API Key.',
          providerUsed: 'Claude (Chưa có Key)',
          needsConfig: true,
        });
      }

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': activeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: activeModel,
            max_tokens: 2048,
            system: activeSystemPrompt + (contextText ? `\n\n${contextText}` : ''),
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.content?.[0]?.text || 'Claude không phản hồi.';
          const finalReply = ensureActionBlock(reply, prompt, todayIso);
          return NextResponse.json({
            reply: finalReply,
            providerUsed: `Anthropic Claude (${activeModel})`,
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }

        const errData = await res.json().catch(() => ({}));
        return NextResponse.json({
          reply: `⚠️ **Lỗi từ Claude (${activeModel}):** ${errData?.error?.message || res.statusText}`,
          providerUsed: `Claude (${activeModel})`,
        });
      } catch (err: any) {
        return NextResponse.json({
          reply: `⚠️ **Lỗi kết nối Claude:** ${err?.message}`,
          providerUsed: `Claude (${activeModel})`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. OPENAI / DEEPSEEK / CHATGPT2API / CUSTOM GATEWAY (OpenAI format)
    // ─────────────────────────────────────────────────────────────
    let defaultBase = 'https://api.openai.com';
    let defaultKey = process.env.OPENAI_API_KEY;
    let defaultMdl = 'gpt-4o-mini';

    if (provider === 'deepseek') {
      defaultBase = 'https://api.deepseek.com';
      defaultKey = process.env.DEEPSEEK_API_KEY;
      defaultMdl = 'deepseek-chat';
    } else if (provider === 'chatgpt2api') {
      defaultBase = process.env.C2A_BASE_URL || '';
      defaultKey = process.env.C2A_API_KEY;
      defaultMdl = process.env.C2A_DEFAULT_MODEL || 'chatgpt/auto';
    }

    const activeBaseUrl = (clientBaseUrl || defaultBase).replace(/\/+$/, '');
    const activeKey = clientApiKey || defaultKey;
    const activeModel = model || defaultMdl;

    if (!activeBaseUrl || (!activeKey && provider !== 'chatgpt2api')) {
      return NextResponse.json({
        reply: `⚠️ **Chưa cấu hình API cho ${provider.toUpperCase()}.**\n\nVui lòng vào mục **Cài đặt → Cấu hình AI Providers** để nhập Base URL và API Key.`,
        providerUsed: provider,
        needsConfig: true,
      });
    }

    try {
      const messages = [
        { role: 'system', content: activeSystemPrompt + (contextText ? `\n\n${contextText}` : '') },
        { role: 'user', content: prompt },
      ];

      const res = await fetch(`${activeBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeKey ? { 'Authorization': `Bearer ${activeKey}` } : {}),
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'AI không trả lời được.';
        const finalReply = ensureActionBlock(reply, prompt, todayIso);
        return NextResponse.json({
          reply: finalReply,
          providerUsed: `${provider.toUpperCase()} (${activeModel})`,
          hasRealData: !!contextText,
          timestamp: new Date().toISOString(),
        });
      }

      const errText = await res.text();
      let parsedErr: any = null;
      try { parsedErr = JSON.parse(errText); } catch {}
      const msg = parsedErr?.error?.message || errText || res.statusText;

      return NextResponse.json({
        reply: `⚠️ **Lỗi từ ${provider.toUpperCase()} (${activeModel}):**\n${msg}`,
        providerUsed: `${provider.toUpperCase()} (${activeModel})`,
        error: msg,
      });
    } catch (err: any) {
      return NextResponse.json({
        reply: `⚠️ **Lỗi kết nối tới ${activeBaseUrl}:** ${err?.message || 'Timeout'}`,
        providerUsed: provider,
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

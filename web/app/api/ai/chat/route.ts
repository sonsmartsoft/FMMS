import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, provider = 'Gemini', assetId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Mock Context Building & Tool Execution Engine
    let replyText = '';
    let toolCallInfo: { name: string; status: 'EXECUTED' | 'CONFIRMED'; result?: string } | undefined = undefined;

    const lower = prompt.toLowerCase();

    if (lower.includes('xăng') || lower.includes('nhiên liệu') || lower.includes('l/100km')) {
      toolCallInfo = {
        name: 'get_fuel_analytics',
        status: 'EXECUTED',
        result: 'Đã tổng hợp fuel_logs tháng 8/2026',
      };
      replyText = `Dựa trên dữ liệu nhiên liệu trong Supabase DB:
- Xe **Mazda2 Base 2026**: Tháng 8/2026 đã tiêu thụ **35.0 Liters** xăng (chi phí 808,500 ₫). Mức tiêu thụ trung bình đạt **6.9 L/100km**, phạm vi còn lại ước tính **365 km** (Mức xăng 54%).
- Xe mô tô **BMW S1000RR**: Mức tiêu thụ 6.2 L/100km với phạm vi hoạt động 210 km.`;
    } else if (lower.includes('bảo dưỡng') || lower.includes('nhớt') || lower.includes('thay')) {
      toolCallInfo = {
        name: 'get_maintenance_summary',
        status: 'EXECUTED',
        result: 'Đã đọc maintenance_records & component distances',
      };
      replyText = `Lịch bảo dưỡng & tình trạng linh kiện hiện tại:
1. **Mazda2 Base 2026**: Bảo dưỡng định kỳ tiếp theo ở mốc **15,000 km** (còn khoảng 2,154 km).
2. **Road Bike Specialized**: Xích Shimano Dura-Ace mới thay đã chạy **180 km** (kiểm tra tra dầu xích sau mỗi 100km).
3. **VinFast Feliz S E-Scooter**: Bảo dưỡng mốc **3,000 km**.`;
    } else if (lower.includes('chi phí') || lower.includes('tổng tiền') || lower.includes('nợ') || lower.includes('khoản vay')) {
      toolCallInfo = {
        name: 'get_financial_summary',
        status: 'EXECUTED',
        result: 'Đã tính TCO & dư nợ khoản vay BIDV',
      };
      replyText = `Tổng quan tài chính gia đình:
- **Dư nợ khoản vay BIDV (Mazda2)**: 210,000,000 ₫ (gốc trả hàng tháng 7,800,000 ₫).
- **Chi phí vận hành tháng 8**: 2,178,500 ₫ (xăng xe + ETC phí giao thông + phụ tùng).
- **Chi phí trung bình/km (Mazda2)**: 2,558 ₫/km.`;
    } else {
      replyText = `FMMS AI Assistant (sử dụng provider **${provider}**):
Tôi đã ghi nhận câu hỏi: "${prompt}". 
Hệ thống hiện đang kết nối trực tiếp với Supabase DB (Ref: opslebsdmwsnsyfmbynf) để quản lý 4 phương tiện gia đình (Mazda2 Base 2026, Road Bike, VinFast Feliz S, BMW S1000RR). Bạn có thể yêu cầu tôi truy vấn chi phí, quãng đường, bảo dưỡng hoặc tạo báo cáo!`;
    }

    return NextResponse.json({
      reply: replyText,
      toolCall: toolCallInfo,
      providerUsed: provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

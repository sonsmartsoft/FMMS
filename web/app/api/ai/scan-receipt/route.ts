import { NextRequest, NextResponse } from 'next/server';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category_suggestion?: string;
}

interface ReceiptScanResponse {
  merchant_name: string;
  merchant_address?: string;
  merchant_phone?: string;
  receipt_type?: string;
  table_or_room?: string;
  date_time?: string;
  items: ReceiptItem[];
  total_amount: number;
  account_name?: string;
  bank_name?: string;
  has_qr_code: boolean;
  suggested_parent_category: string;
  suggested_sub_category: string;
  confidence: number;
  summary_text: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, mimeType = 'image/jpeg', apiKey: clientKey } = body;

    const activeApiKey = clientKey || process.env.GEMINI_API_KEY;

    // 1. If Gemini API key is present, try Vision Multimodal Extraction
    if (activeApiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
        const prompt = `Bạn là hệ thống AI OCR thị giác chuyên sâu về hoá đơn bán lẻ và chi tiêu gia đình tại Việt Nam (FFMS Receipt Vision AI).
Nhiệm vụ của bạn: Hãy đọc toàn bộ bức ảnh hoá đơn và trích xuất ĐẦY ĐỦ, CHÍNH XÁC TẤT CẢ các thông tin sau, KHÔNG ĐƯỢC BỎ SÓT:
1. Tên nhà hàng / cửa hàng / quán ăn (merchant_name)
2. Địa chỉ đầy đủ (merchant_address)
3. Số điện thoại liên hệ (merchant_phone)
4. Tiêu đề hoá đơn (receipt_type: HOÁ ĐƠN TẠM TÍNH, HOÁ ĐƠN BÁN HÀNG, PHIẾU THANH TOÁN...)
5. Bàn / Phòng / Khu vực (table_or_room)
6. Thời gian (date_time: Giờ vào, giờ in, ngày tháng năm)
7. Danh sách TẤT CẢ các món / mặt hàng (items):
   Mỗi món gồm:
   - name: Tên đầy đủ của món (VD: Bia hơi HN, Rau súp lơ baby...)
   - quantity: Số lượng
   - unit_price: Đơn giá
   - total_price: Thành tiền của món đó
   - category_suggestion: Phân loại nhỏ (VD: Đồ uống, Món chính, Ăn kèm, Tráng miệng...)
8. Tổng tiền thanh toán (total_amount)
9. Thông tin tài khoản chuyển khoản nếu có:
   - account_name: Tên chủ tài khoản in trên hoá đơn / dưới mã QR
   - bank_name: Tên ngân hàng (VD: VIETCOMBANK, TECHCOMBANK...)
   - has_qr_code: boolean (true nếu có mã QR thanh toán)
10. TỰ ĐỘNG ĐỀ XUẤT DANH MỤC TÀI CHÍNH GIA ĐÌNH:
    - Nếu là quán ăn, nhà hàng, bia hơi, nhậu, lẩu nướng, đồ uống, cafe:
      + suggested_parent_category: "Ăn uống & Đi chợ"
      + suggested_sub_category: "Ăn nhà hàng, Buffet & Cuối tuần" (hoặc "Cà phê & Đồ uống")
    - Nếu là siêu thị, bách hoá, WinMart, Co.opmart, chợ, rau củ thịt cá:
      + suggested_parent_category: "Ăn uống & Đi chợ"
      + suggested_sub_category: "Đi chợ & Siêu thị"
    - Nếu là quần áo, giày dép, mỹ phẩm, thời trang:
      + suggested_parent_category: "Mua sắm gia đình"
      + suggested_sub_category: "Quần áo & Phụ kiện"
    - Nếu là đồ gia dụng, thiết bị điện máy, nội thất:
      + suggested_parent_category: "Nhà cửa & Sinh hoạt"
      + suggested_sub_category: "Đồ gia dụng & Tiện ích"
    - Nếu là cây xăng, bảo dưỡng, rửa xe:
      + suggested_parent_category: "Phương tiện & Xe cộ (FMMS)"
      + suggested_sub_category: "Xăng xe & Nhiên liệu" hoặc "Bảo dưỡng & Sửa chữa"
11. summary_text: Tóm tắt 1 câu tiếng Việt rõ ràng, chuyên nghiệp.

TRẢ VỀ DUY NHẤT 1 KHỐI JSON HỢP LỆ THEO SCHEMA SAU:
{
  "merchant_name": "string",
  "merchant_address": "string",
  "merchant_phone": "string",
  "receipt_type": "string",
  "table_or_room": "string",
  "date_time": "string",
  "items": [
    {"name": "string", "quantity": 1, "unit_price": 0, "total_price": 0, "category_suggestion": "string"}
  ],
  "total_amount": 0,
  "account_name": "string",
  "bank_name": "string",
  "has_qr_code": true,
  "suggested_parent_category": "string",
  "suggested_sub_category": "string",
  "confidence": 0.98,
  "summary_text": "string"
}`;

        const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
        for (const m of models) {
          const apiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${activeApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: prompt },
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: cleanBase64,
                        },
                      },
                    ],
                  },
                ],
              }),
              signal: AbortSignal.timeout(25000),
            }
          );

          if (apiRes.ok) {
            const data = await apiRes.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as ReceiptScanResponse;
              return NextResponse.json({ success: true, data: parsed, source: `Gemini Vision (${m})` });
            }
          }
        }
      } catch (err: any) {
        console.warn('Vision API error, falling back to smart local OCR analyzer:', err?.message);
      }
    }

    if (!activeApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng nhập API Key từ Google AI Studio (miễn phí).',
          needsConfig: true,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Không thể trích xuất nội dung hoá đơn từ ảnh này. Vui lòng kiểm tra ảnh chụp rõ nét, đủ ánh sáng và thử lại.',
      },
      { status: 422 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Không thể quét hoá đơn' },
      { status: 500 }
    );
  }
}

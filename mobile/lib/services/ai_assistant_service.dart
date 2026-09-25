import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/ai_action_model.dart';
import '../models/receipt_model.dart';
import 'auth_service.dart';

class AIAssistantService {
  final AuthService _authService = AuthService();
  static const String _defaultApiUrl = 'https://fmms.vercel.app/api/ai/chat';
  static const String _receiptApiUrl = 'https://fmms.vercel.app/api/ai/scan-receipt';

  Future<String?> getGeminiApiKey() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('gemini_api_key')?.trim();
  }

  Future<void> saveGeminiApiKey(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('gemini_api_key', key.trim());
  }

  /// Direct Gemini Vision multimodal OCR extraction
  Future<ReceiptAnalysisResult?> _scanWithGeminiVision(
    Uint8List imageBytes,
    String apiKey,
    String mimeType,
  ) async {
    final cleanKey = apiKey.trim();
    if (cleanKey.isEmpty) return null;

    final base64Str = base64Encode(imageBytes);
    const prompt = '''Bạn là hệ thống AI OCR thị giác chuyên sâu về hoá đơn bán lẻ và chi tiêu gia đình tại Việt Nam (FFMS Receipt Vision AI).
Nhiệm vụ của bạn: Hãy đọc toàn bộ bức ảnh hoá đơn này và trích xuất ĐẦY ĐỦ, CHÍNH XÁC TẤT CẢ các thông tin sau từ ảnh thật, KHÔNG ĐƯỢC BỊA ĐẶT DỮ LIỆU:
1. Tên nhà hàng / cửa hàng / quán ăn (merchant_name)
2. Địa chỉ đầy đủ nếu có (merchant_address)
3. Số điện thoại liên hệ (merchant_phone)
4. Tiêu đề hoá đơn (receipt_type: HOÁ ĐƠN TẠM TÍNH, HOÁ ĐƠN BÁN HÀNG, PHIẾU THANH TOÁN...)
5. Bàn / Phòng / Khu vực (table_or_room)
6. Thời gian (date_time: DD/MM/YYYY HH:mm)
7. Danh sách TẤT CẢ các món / mặt hàng (items):
   Mỗi món gồm:
   - name: Tên chính xác in trên hoá đơn
   - quantity: Số lượng (số nguyên)
   - unit_price: Đơn giá
   - total_price: Thành tiền
   - category_suggestion: Phân loại nhỏ (VD: Đồ uống, Món chính, Ăn kèm...)
8. Tổng tiền thanh toán thực tế in trên hoá đơn (total_amount)
9. Thông tin tài khoản nếu có: account_name, bank_name, has_qr_code (true/false)
10. Tự động đề xuất phân loại:
    - Nếu là ăn uống ngoài hàng: suggested_parent_category: "Ăn uống & Đi chợ", suggested_sub_category: "Ăn nhà hàng, Buffet & Cuối tuần"
    - Nếu là cafe, trà sữa, sinh tố: suggested_parent_category: "Ăn uống & Đi chợ", suggested_sub_category: "Cà phê & Đồ uống"
    - Nếu là siêu thị, đi chợ: suggested_parent_category: "Ăn uống & Đi chợ", suggested_sub_category: "Đi chợ & Siêu thị"
    - Nếu là mua sắm đồ dùng, quần áo: suggested_parent_category: "Mua sắm gia đình", suggested_sub_category: "Quần áo & Phụ kiện"
    - Nếu là đổ xăng: suggested_parent_category: "Phương tiện & Xe cộ (FMMS)", suggested_sub_category: "Xăng xe & Nhiên liệu"
11. summary_text: Tóm tắt 1 câu ngắn gọn gồm tên quán, số món và tổng tiền thực tế.

TRẢ VỀ DUY NHẤT 1 KHỐI JSON HỢP LỆ THEO SCHEMA:
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
  "has_qr_code": false,
  "suggested_parent_category": "string",
  "suggested_sub_category": "string",
  "confidence": 0.98,
  "summary_text": "string"
}''';

    // Try available vision models in cascade
    final candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
    ];

    for (final model in candidateModels) {
      try {
        final url = Uri.parse(
          'https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$cleanKey',
        );
        final res = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'contents': [
              {
                'role': 'user',
                'parts': [
                  {'text': prompt},
                  {
                    'inline_data': {
                      'mime_type': mimeType,
                      'data': base64Str,
                    }
                  }
                ]
              }
            ]
          }),
        ).timeout(const Duration(seconds: 30));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final text = data['candidates']?[0]?['content']?['parts']?[0]?['text'] ?? '';
          final match = RegExp(r'\{[\s\S]*\}').firstMatch(text);
          if (match != null) {
            final parsedJson = jsonDecode(match.group(0)!);
            debugPrint('[Gemini Vision] Successfully extracted receipt via model: $model');
            return ReceiptAnalysisResult.fromJson(parsedJson);
          }
        } else {
          debugPrint('[Gemini Vision $model] HTTP ${res.statusCode}: ${res.body}');
        }
      } catch (e) {
        debugPrint('[Gemini Vision $model] Error: $e');
      }
    }
    return null;
  }

  /// Scans a receipt image with Gemini Vision / OCR and extracts full merchant info and items
  Future<ReceiptAnalysisResult> scanReceipt({
    required Uint8List imageBytes,
    String mimeType = 'image/jpeg',
  }) async {
    final localKey = await getGeminiApiKey();

    // 1. Prioritize Direct Google Gemini Vision API (Instant & Private)
    if (localKey != null && localKey.isNotEmpty) {
      final directResult = await _scanWithGeminiVision(imageBytes, localKey, mimeType);
      if (directResult != null) {
        return directResult;
      }
    }

    // 2. Try FMMS Vision OCR API (Forwarding local API key if present)
    try {
      final base64Str = base64Encode(imageBytes);
      final bodyMap = <String, dynamic>{
        'imageBase64': base64Str,
        'mimeType': mimeType,
      };
      if (localKey != null && localKey.isNotEmpty) {
        bodyMap['apiKey'] = localKey;
      }

      final res = await http.post(
        Uri.parse(_receiptApiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(bodyMap),
      ).timeout(const Duration(seconds: 25));

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] != null) {
          return ReceiptAnalysisResult.fromJson(json['data']);
        }
      }
    } catch (_) {}

    // 3. If no key was configured, notify UI to prompt for Gemini API Key
    if (localKey == null || localKey.isEmpty) {
      throw Exception('MISSING_GEMINI_API_KEY');
    }

    throw Exception('FAILED_TO_ANALYZE_RECEIPT');
  }

  /// Converts a detailed ReceiptAnalysisResult into an AIActionDraft ready to confirm into DB
  AIActionDraft convertReceiptToDraft(
    ReceiptAnalysisResult receipt, {
    String? walletName,
    String? memberName,
  }) {
    final activeMember = _authService.getCurrentMember();
    final itemsSummary = receipt.items.map((i) => '${i.name} (x${i.quantity})').join(', ');
    final today = DateTime.now().toIso8601String().split('T').first;

    // Extract date if present e.g. "16/09/2026"
    String txDate = today;
    if (receipt.dateTime != null) {
      final dateMatch = RegExp(r'(\d{1,2})/(\d{1,2})/(\d{4})').firstMatch(receipt.dateTime!);
      if (dateMatch != null) {
        final d = dateMatch.group(1)!.padLeft(2, '0');
        final m = dateMatch.group(2)!.padLeft(2, '0');
        final y = dateMatch.group(3)!;
        txDate = '$y-$m-$d';
      }
    }

    return AIActionDraft(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      actionType: 'EXPENSE',
      amount: receipt.totalAmount,
      categoryName: receipt.suggestedParentCategory,
      subCategoryName: receipt.suggestedSubCategory,
      walletName: walletName ?? 'Techcombank Chi tiêu',
      memberName: memberName ?? activeMember.name,
      payeeVendor: receipt.merchantName,
      description: '${receipt.merchantName} - ${receipt.items.length} món ($itemsSummary)',
      date: txDate,
      confidence: receipt.confidence,
      originalPrompt: 'Quét hóa đơn ${receipt.merchantName} - Tổng ${receipt.totalAmount}đ',
    );
  }


  /// Parses natural Vietnamese speech or text into a structured AIActionDraft with Subcategories
  Future<AIActionDraft> parseNaturalInput(
    String text, {
    double? fallbackAmount,
    String? fallbackCategory,
    String? fallbackSubCategory,
  }) async {
    final currentMember = _authService.getCurrentMember();
    final today = DateTime.now().toIso8601String().split('T').first;

    // 1. Try calling the online FMMS AI Chat API
    try {
      final res = await http.post(
        Uri.parse(_defaultApiUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'messages': [
            {'role': 'user', 'content': text}
          ],
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final actions = data['actions'] as List?;
        if (actions != null && actions.isNotEmpty) {
          final first = actions.first;
          final payload = first['payload'] ?? {};
          final parsedCategory = extractCategories(text);

          final onlineAmount = (payload['amount'] as num?)?.toDouble() ?? extractAmount(text);

          return AIActionDraft(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            actionType: first['type'] ?? 'EXPENSE',
            amount: onlineAmount > 0 ? onlineAmount : (fallbackAmount ?? 50000),
            categoryId: payload['category_id'],
            categoryName: payload['category_name'] ?? (parsedCategory.parent.isNotEmpty ? parsedCategory.parent : (fallbackCategory ?? 'Ăn uống & Đi chợ')),
            subCategoryName: payload['sub_category_name'] ?? parsedCategory.sub ?? fallbackSubCategory,
            walletId: payload['wallet_id'],
            walletName: payload['wallet_name'] ?? 'Tiền mặt gia đình',
            memberId: payload['member_id'] ?? currentMember.id,
            memberName: payload['member_name'] ?? extractMember(text, currentMember.name),
            payeeVendor: payload['payee_vendor'] ?? payload['notes'],
            description: payload['notes'] ?? text,
            date: payload['date'] ?? today,
            originalPrompt: text,
          );
        }
      }
    } catch (_) {
      // Fallback to local intelligent rule-based parser (instant & works offline!)
    }

    // 2. Intelligent Local Rule Parser
    return _parseLocally(
      text,
      currentMember.name,
      today,
      fallbackAmount: fallbackAmount,
      fallbackCategory: fallbackCategory,
      fallbackSubCategory: fallbackSubCategory,
    );
  }

  AIActionDraft _parseLocally(
    String text,
    String defaultMemberName,
    String today, {
    double? fallbackAmount,
    String? fallbackCategory,
    String? fallbackSubCategory,
  }) {
    final parsedAmount = extractAmount(text);
    final amount = parsedAmount > 0 ? parsedAmount : (fallbackAmount ?? 50000);
    final catResult = extractCategories(text);
    final parentCat = (catResult.parent != 'Ăn uống & Đi chợ' || text.toLowerCase().contains('chợ') || text.toLowerCase().contains('ăn'))
        ? catResult.parent
        : (fallbackCategory ?? catResult.parent);
    final subCat = catResult.sub ?? fallbackSubCategory;
    final memberName = extractMember(text, defaultMemberName);
    final walletName = extractWallet(text);

    return AIActionDraft(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      actionType: 'EXPENSE',
      amount: amount,
      categoryName: parentCat,
      subCategoryName: subCat,
      walletName: walletName,
      memberName: memberName,
      description: text.trim(),
      date: today,
      originalPrompt: text,
      confidence: 0.96,
    );
  }

  double extractAmount(String input) {
    final lower = input.toLowerCase();

    // Regex for: 1tr2, 1.5tr, 1,2tr, 2tr
    final trMatch = RegExp(r'(\d+([\.,]\d+)?)\s*(tr|triệu)').firstMatch(lower);
    if (trMatch != null) {
      final numStr = trMatch.group(1)!.replaceAll(',', '.');
      final val = double.tryParse(numStr);
      if (val != null) return val * 1000000;
    }

    // Regex for: 250k, 50k, 100k, 500k
    final kMatch = RegExp(r'(\d+)\s*(k|ngàn|nghìn)').firstMatch(lower);
    if (kMatch != null) {
      final val = double.tryParse(kMatch.group(1)!);
      if (val != null) return val * 1000;
    }

    // Regex for: 250.000 or 250000
    final numMatch = RegExp(r'(\d{1,3}([\.,]\d{3})+|\d{4,9})').firstMatch(lower);
    if (numMatch != null) {
      final clean = numMatch.group(1)!.replaceAll('.', '').replaceAll(',', '');
      final val = double.tryParse(clean);
      if (val != null) return val;
    }

    return 0.0;
  }

  ({String parent, String? sub}) extractCategories(String input) {
    final lower = input.toLowerCase();

    // Xe cộ & Đi lại
    if (lower.contains('xăng') || lower.contains('dầu') || lower.contains('nhiên liệu')) {
      return (parent: 'Phương tiện & Đi lại (Xe)', sub: 'Xăng xe & Nhiên liệu');
    }
    if (lower.contains('rửa xe') || lower.contains('chăm sóc xe') || lower.contains('bóng lốp')) {
      return (parent: 'Phương tiện & Đi lại (Xe)', sub: 'Rửa xe & Chăm sóc xe');
    }
    if (lower.contains('vetc') || lower.contains('epass') || lower.contains('gửi xe') || lower.contains('vé xe') || lower.contains('cầu đường') || lower.contains('bến bãi')) {
      return (parent: 'Phương tiện & Đi lại (Xe)', sub: 'Phí VETC & Gửi xe');
    }
    if (lower.contains('bảo dưỡng') || lower.contains('sửa xe') || lower.contains('thay dầu') || lower.contains('thay nhớt') || lower.contains('gara') || lower.contains('bảo trì')) {
      return (parent: 'Phương tiện & Đi lại (Xe)', sub: 'Bảo dưỡng & Sửa xe');
    }
    if (lower.contains('grab') || lower.contains('taxi') || lower.contains('xe buýt') || lower.contains('tàu')) {
      return (parent: 'Phương tiện & Đi lại (Xe)', sub: null);
    }

    // Ăn uống
    if (lower.contains('chợ') || lower.contains('siêu thị') || lower.contains('thịt') || lower.contains('cá') || lower.contains('rau') || lower.contains('hoa quả') || lower.contains('vinmart') || lower.contains('winmart') || lower.contains('bachhoaxanh') || lower.contains('coop')) {
      return (parent: 'Ăn uống & Đi chợ', sub: 'Đi chợ & Siêu thị');
    }
    if (lower.contains('nhà hàng') || lower.contains('quán') || lower.contains('bia') || lower.contains('nhậu') || lower.contains('lẩu') || lower.contains('nướng') || lower.contains('buffet') || lower.contains('tiệc')) {
      return (parent: 'Ăn uống & Đi chợ', sub: 'Ăn nhà hàng, Buffet & Cuối tuần');
    }
    if (lower.contains('cafe') || lower.contains('cà phê') || lower.contains('trà sữa') || lower.contains('highland') || lower.contains('phúc long')) {
      return (parent: 'Ăn uống & Đi chợ', sub: 'Cà phê & Đồ uống');
    }
    if (lower.contains('ăn sáng') || lower.contains('ăn trưa') || lower.contains('ăn tối') || lower.contains('phở') || lower.contains('bún') || lower.contains('cơm') || lower.contains('bánh mì')) {
      return (parent: 'Ăn uống & Đi chợ', sub: 'Ăn ngoài & Tiệm bình dân');
    }

    // Nhà cửa & Tiện ích
    if (lower.contains('điện') || lower.contains('nước') || lower.contains('mạng') || lower.contains('internet') || lower.contains('rác') || lower.contains('dịch vụ chung cư')) {
      return (parent: 'Nhà cửa & Tiện ích', sub: 'Điện, Nước, Internet');
    }
    if (lower.contains('đồ gia dụng') || lower.contains('sửa nhà') || lower.contains('sơn') || lower.contains('bàn ghế') || lower.contains('bếp') || lower.contains('điện máy xanh')) {
      return (parent: 'Nhà cửa & Tiện ích', sub: 'Đồ gia dụng & Tiện ích');
    }

    // Con cái & Giáo dục
    if (lower.contains('học phí') || lower.contains('tiền học') || lower.contains('học thêm') || lower.contains('sách vở') || lower.contains('gia sư')) {
      return (parent: 'Con cái & Giáo dục', sub: 'Học phí trường & Học thêm');
    }
    if (lower.contains('sữa') || lower.contains('bỉm') || lower.contains('đồ chơi') || lower.contains('tiêm chủng')) {
      return (parent: 'Con cái & Giáo dục', sub: 'Sữa, Bỉm & Đồ chơi');
    }

    // Mua sắm & Du lịch
    if (lower.contains('du lịch') || lower.contains('khách sạn') || lower.contains('vé máy bay') || lower.contains('resort') || lower.contains('nghỉ dưỡng')) {
      return (parent: 'Hưởng thụ & Du lịch', sub: 'Nghỉ dưỡng & Du lịch');
    }
    if (lower.contains('shopee') || lower.contains('lazada') || lower.contains('tiki') || lower.contains('quần áo') || lower.contains('váy') || lower.contains('giày') || lower.contains('son') || lower.contains('mỹ phẩm') || lower.contains('uniqlo') || lower.contains('zara')) {
      return (parent: 'Mua sắm gia đình', sub: 'Quần áo & Phụ kiện');
    }

    // Sức khỏe
    if (lower.contains('thuốc') || lower.contains('khám') || lower.contains('bệnh viện') || lower.contains('nha khoa') || lower.contains('bác sĩ') || lower.contains('pharmacity') || lower.contains('long châu')) {
      return (parent: 'Sức khỏe & Y tế', sub: 'Thuốc men & Khám chữa bệnh');
    }

    // Trả nợ
    if (lower.contains('trả nợ') || lower.contains('trả góp') || lower.contains('lãi ngân hàng') || lower.contains('gốc vay')) {
      return (parent: 'Trả góp & Khoản vay', sub: null);
    }

    return (parent: 'Ăn uống & Đi chợ', sub: null);
  }

  String extractMember(String input, String defaultMember) {
    final lower = input.toLowerCase();
    if (lower.contains('tuấn') || lower.contains('anh tuấn')) {
      return 'Nguyễn Tuấn';
    }
    if (lower.contains('thúy') || lower.contains('thuý') || lower.contains('chị thúy') || lower.contains('vợ') || lower.contains('bà xã')) {
      return 'Nguyễn Thuý';
    }
    if (lower.contains('sơn') || lower.contains('trung sơn') || lower.contains('tôi') || lower.contains('mình')) {
      return 'Nguyễn Trung Sơn (SmartSoft)';
    }
    return defaultMember;
  }

  String extractWallet(String input) {
    final lower = input.toLowerCase();
    if (lower.contains('tcb') || lower.contains('techcombank') || lower.contains('techcom')) {
      return 'Techcombank Chi tiêu';
    }
    if (lower.contains('vcb') || lower.contains('vietcombank')) {
      return 'Vietcombank Lương & Dự phòng';
    }
    if (lower.contains('momo')) {
      return 'Ví MoMo';
    }
    if (lower.contains('visa') || lower.contains('tín dụng') || lower.contains('credit')) {
      return 'Techcombank Visa Signature';
    }
    return 'Tiền mặt gia đình';
  }
}

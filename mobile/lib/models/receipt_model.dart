class ReceiptItemModel {
  final String name;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? categorySuggestion;

  ReceiptItemModel({
    required this.name,
    this.quantity = 1,
    required this.unitPrice,
    required this.totalPrice,
    this.categorySuggestion,
  });

  factory ReceiptItemModel.fromJson(Map<String, dynamic> json) {
    return ReceiptItemModel(
      name: json['name']?.toString() ?? 'Món / Mặt hàng',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0.0,
      totalPrice: (json['total_price'] as num?)?.toDouble() ?? 0.0,
      categorySuggestion: json['category_suggestion']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'quantity': quantity,
    'unit_price': unitPrice,
    'total_price': totalPrice,
    'category_suggestion': categorySuggestion,
  };
}

class ReceiptAnalysisResult {
  final String merchantName;
  final String? merchantAddress;
  final String? merchantPhone;
  final String? receiptType;
  final String? tableOrRoom;
  final String? dateTime;
  final List<ReceiptItemModel> items;
  final double totalAmount;
  final String? accountName;
  final String? bankName;
  final bool hasQrCode;
  final String suggestedParentCategory;
  final String suggestedSubCategory;
  final double confidence;
  final String summaryText;

  ReceiptAnalysisResult({
    required this.merchantName,
    this.merchantAddress,
    this.merchantPhone,
    this.receiptType,
    this.tableOrRoom,
    this.dateTime,
    required this.items,
    required this.totalAmount,
    this.accountName,
    this.bankName,
    this.hasQrCode = false,
    required this.suggestedParentCategory,
    required this.suggestedSubCategory,
    this.confidence = 0.95,
    required this.summaryText,
  });

  factory ReceiptAnalysisResult.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    final itemsList = rawItems.map((e) => ReceiptItemModel.fromJson(e)).toList();

    return ReceiptAnalysisResult(
      merchantName: json['merchant_name']?.toString() ?? 'Cửa hàng / Nhà hàng',
      merchantAddress: json['merchant_address']?.toString(),
      merchantPhone: json['merchant_phone']?.toString(),
      receiptType: json['receipt_type']?.toString(),
      tableOrRoom: json['table_or_room']?.toString(),
      dateTime: json['date_time']?.toString(),
      items: itemsList,
      totalAmount: (json['total_amount'] as num?)?.toDouble() ?? 0.0,
      accountName: json['account_name']?.toString(),
      bankName: json['bank_name']?.toString(),
      hasQrCode: json['has_qr_code'] ?? false,
      suggestedParentCategory: json['suggested_parent_category']?.toString() ?? 'Ăn uống & Đi chợ',
      suggestedSubCategory: json['suggested_sub_category']?.toString() ?? 'Ăn nhà hàng, Buffet & Cuối tuần',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.95,
      summaryText: json['summary_text']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'merchant_name': merchantName,
    'merchant_address': merchantAddress,
    'merchant_phone': merchantPhone,
    'receipt_type': receiptType,
    'table_or_room': tableOrRoom,
    'date_time': dateTime,
    'items': items.map((e) => e.toJson()).toList(),
    'total_amount': totalAmount,
    'account_name': accountName,
    'bank_name': bankName,
    'has_qr_code': hasQrCode,
    'suggested_parent_category': suggestedParentCategory,
    'suggested_sub_category': suggestedSubCategory,
    'confidence': confidence,
    'summary_text': summaryText,
  };
}

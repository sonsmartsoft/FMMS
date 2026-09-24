// Model for AI Draft Action Cards (Gợi ý thu chi từ AI)

class AIActionDraft {
  final String id;
  final String actionType; // 'EXPENSE', 'INCOME', 'TRANSFER'
  final double amount;
  final String? categoryId;
  final String? categoryName;
  final String? subCategoryId;
  final String? subCategoryName;
  final String? walletId;
  final String? walletName;
  final String? memberId;
  final String? memberName;
  final String? payeeVendor;
  final String? description;
  final String date;
  final bool isEssential;
  final double confidence;
  final String? originalPrompt;

  AIActionDraft({
    required this.id,
    this.actionType = 'EXPENSE',
    required this.amount,
    this.categoryId,
    this.categoryName,
    this.subCategoryId,
    this.subCategoryName,
    this.walletId,
    this.walletName,
    this.memberId,
    this.memberName,
    this.payeeVendor,
    this.description,
    required this.date,
    this.isEssential = true,
    this.confidence = 0.95,
    this.originalPrompt,
  });

  AIActionDraft copyWith({
    String? id,
    String? actionType,
    double? amount,
    String? categoryId,
    String? categoryName,
    String? subCategoryId,
    String? subCategoryName,
    String? walletId,
    String? walletName,
    String? memberId,
    String? memberName,
    String? payeeVendor,
    String? description,
    String? date,
    bool? isEssential,
    double? confidence,
    String? originalPrompt,
  }) {
    return AIActionDraft(
      id: id ?? this.id,
      actionType: actionType ?? this.actionType,
      amount: amount ?? this.amount,
      categoryId: categoryId ?? this.categoryId,
      categoryName: categoryName ?? this.categoryName,
      subCategoryId: subCategoryId ?? this.subCategoryId,
      subCategoryName: subCategoryName ?? this.subCategoryName,
      walletId: walletId ?? this.walletId,
      walletName: walletName ?? this.walletName,
      memberId: memberId ?? this.memberId,
      memberName: memberName ?? this.memberName,
      payeeVendor: payeeVendor ?? this.payeeVendor,
      description: description ?? this.description,
      date: date ?? this.date,
      isEssential: isEssential ?? this.isEssential,
      confidence: confidence ?? this.confidence,
      originalPrompt: originalPrompt ?? this.originalPrompt,
    );
  }
}

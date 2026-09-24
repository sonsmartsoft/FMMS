// Model for Family Loans, Debts & Installments

enum LoanType {
  BORROW, // Đi vay / Nợ người khác / Trả góp
  LEND,   // Cho vay / Người khác nợ mình
}

enum LoanCategory {
  CAR_LOAN,            // Vay mua ô tô / phương tiện
  BANK_MORTGAGE,       // Vay mua nhà / Bất động sản
  CREDIT_INSTALLMENT,  // Mua sắm trả góp (thẻ tín dụng, điện máy)
  BANK_CONSUMER,       // Vay tiêu dùng ngân hàng
  PERSONAL,            // Vay mượn cá nhân / người thân
  OTHER,               // Khác
}

class FamilyLoanModel {
  final String id;
  final String title;
  final LoanType loanType;
  final LoanCategory category;
  final String lenderBorrowerName;
  final double principalAmount;     // Số tiền gốc ban đầu
  final double remainingBalance;    // Dư nợ còn lại
  final double interestRatePercent; // Lãi suất %/năm (0% nếu trả góp 0%)
  final int? termMonths;            // Kỳ hạn (số tháng)
  final String startDate;
  final String? endDate;
  final int paymentDay;             // Ngày thanh toán hàng tháng (vd ngày 15 hay 28)
  final double monthlyPayment;      // Số tiền trả mỗi kỳ
  final String? linkedWalletId;     // Ví nguồn trích nợ
  final String? linkedAssetId;      // Tài sản bảo đảm / liên kết (xe, nhà)
  final String status;              // 'ACTIVE', 'PAID_OFF', 'DEFAULTED'
  final String? notes;
  final String? createdAt;

  FamilyLoanModel({
    required this.id,
    required this.title,
    required this.loanType,
    required this.category,
    required this.lenderBorrowerName,
    required this.principalAmount,
    required this.remainingBalance,
    this.interestRatePercent = 0.0,
    this.termMonths,
    required this.startDate,
    this.endDate,
    required this.paymentDay,
    required this.monthlyPayment,
    this.linkedWalletId,
    this.linkedAssetId,
    this.status = 'ACTIVE',
    this.notes,
    this.createdAt,
  });

  // Helpers
  double get paidAmount => (principalAmount - remainingBalance).clamp(0.0, principalAmount);
  double get progressPercent => principalAmount > 0 ? (paidAmount / principalAmount) * 100 : 0.0;
  bool get isPaidOff => remainingBalance <= 0 || status == 'PAID_OFF';

  int get remainingInstallments {
    if (monthlyPayment <= 0 || isPaidOff) return 0;
    return (remainingBalance / monthlyPayment).ceil();
  }

  /// Calculates next payment due date from today
  DateTime getNextDueDate([DateTime? refDate]) {
    final now = refDate ?? DateTime.now();
    int year = now.year;
    int month = now.month;

    // Days in current target month
    int day = paymentDay;
    int maxDays = DateTime(year, month + 1, 0).day;
    if (day > maxDays) day = maxDays;

    DateTime targetDate = DateTime(year, month, day);
    if (targetDate.isBefore(DateTime(now.year, now.month, now.day))) {
      // Due date this month has passed, roll to next month
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      maxDays = DateTime(year, month + 1, 0).day;
      if (day > maxDays) day = maxDays;
      targetDate = DateTime(year, month, day);
    }
    return targetDate;
  }

  int getDaysUntilDue([DateTime? refDate]) {
    final now = refDate ?? DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final next = getNextDueDate(now);
    return next.difference(today).inDays;
  }

  factory FamilyLoanModel.fromJson(Map<String, dynamic> json) {
    LoanType parseType(dynamic val) {
      if (val == 'LEND') return LoanType.LEND;
      return LoanType.BORROW;
    }

    LoanCategory parseCategory(dynamic val) {
      switch (val?.toString().toUpperCase()) {
        case 'CAR_LOAN':
          return LoanCategory.CAR_LOAN;
        case 'BANK_MORTGAGE':
          return LoanCategory.BANK_MORTGAGE;
        case 'CREDIT_INSTALLMENT':
          return LoanCategory.CREDIT_INSTALLMENT;
        case 'BANK_CONSUMER':
          return LoanCategory.BANK_CONSUMER;
        case 'PERSONAL':
          return LoanCategory.PERSONAL;
        default:
          return LoanCategory.OTHER;
      }
    }

    return FamilyLoanModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Khoản vay',
      loanType: parseType(json['loan_type']),
      category: parseCategory(json['category']),
      lenderBorrowerName: json['lender_borrower_name']?.toString() ?? json['lender']?.toString() ?? 'Ngân hàng',
      principalAmount: (json['principal_amount'] as num?)?.toDouble() ?? (json['principal'] as num?)?.toDouble() ?? 0.0,
      remainingBalance: (json['remaining_balance'] as num?)?.toDouble() ?? (json['current_balance'] as num?)?.toDouble() ?? 0.0,
      interestRatePercent: (json['interest_rate_percent'] as num?)?.toDouble() ?? 0.0,
      termMonths: (json['term_months'] as num?)?.toInt(),
      startDate: json['start_date']?.toString() ?? DateTime.now().toIso8601String().split('T').first,
      endDate: json['end_date']?.toString(),
      paymentDay: (json['payment_day'] as num?)?.toInt() ?? 15,
      monthlyPayment: (json['monthly_payment'] as num?)?.toDouble() ?? 0.0,
      linkedWalletId: json['linked_wallet_id']?.toString(),
      linkedAssetId: json['linked_asset_id']?.toString() ?? json['asset_id']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      notes: json['notes']?.toString(),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'loan_type': loanType == LoanType.LEND ? 'LEND' : 'BORROW',
    'category': category.name,
    'lender_borrower_name': lenderBorrowerName,
    'principal_amount': principalAmount,
    'remaining_balance': remainingBalance,
    'interest_rate_percent': interestRatePercent,
    'term_months': termMonths,
    'start_date': startDate,
    'end_date': endDate,
    'payment_day': paymentDay,
    'monthly_payment': monthlyPayment,
    'linked_wallet_id': linkedWalletId,
    'linked_asset_id': linkedAssetId,
    'status': status,
    'notes': notes,
    'created_at': createdAt,
  };

  FamilyLoanModel copyWith({
    String? id,
    String? title,
    LoanType? loanType,
    LoanCategory? category,
    String? lenderBorrowerName,
    double? principalAmount,
    double? remainingBalance,
    double? interestRatePercent,
    int? termMonths,
    String? startDate,
    String? endDate,
    int? paymentDay,
    double? monthlyPayment,
    String? linkedWalletId,
    String? linkedAssetId,
    String? status,
    String? notes,
  }) {
    return FamilyLoanModel(
      id: id ?? this.id,
      title: title ?? this.title,
      loanType: loanType ?? this.loanType,
      category: category ?? this.category,
      lenderBorrowerName: lenderBorrowerName ?? this.lenderBorrowerName,
      principalAmount: principalAmount ?? this.principalAmount,
      remainingBalance: remainingBalance ?? this.remainingBalance,
      interestRatePercent: interestRatePercent ?? this.interestRatePercent,
      termMonths: termMonths ?? this.termMonths,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      paymentDay: paymentDay ?? this.paymentDay,
      monthlyPayment: monthlyPayment ?? this.monthlyPayment,
      linkedWalletId: linkedWalletId ?? this.linkedWalletId,
      linkedAssetId: linkedAssetId ?? this.linkedAssetId,
      status: status ?? this.status,
      notes: notes ?? this.notes,
      createdAt: createdAt,
    );
  }
}

// Model for Bank Savings Book / Term Deposit (Sổ tiết kiệm ngân hàng)

class SavingDepositModel {
  final String id;
  final String title;                 // VD: Sổ tiết kiệm VCB - Quỹ dự phòng
  final String bankName;              // Vietcombank, BIDV, Techcombank, VPBank, MBBank...
  final String? accountNumber;         // Số sổ / số tài khoản tiết kiệm
  final double depositAmount;          // Tiền gốc gửi
  final double interestRatePercent;    // Lãi suất %/năm (vd: 5.5)
  final int termMonths;                // Kỳ hạn: 1, 3, 6, 12, 24 tháng (0 nếu không kỳ hạn)
  final String startDate;              // Ngày gửi (yyyy-MM-dd)
  final String maturityDate;           // Ngày đáo hạn (yyyy-MM-dd)
  final String interestPaymentType;    // 'END_OF_TERM' (Cuối kỳ), 'MONTHLY' (Hàng tháng), 'PREPAID' (Đầu kỳ)
  final String? linkedWalletId;        // Ví nguồn / Ví nhận khi tất toán
  final String status;                 // 'ACTIVE' (Đang gửi), 'SETTLED' (Đã tất toán), 'ROLLOVER' (Tự tái tục)
  final String? notes;

  SavingDepositModel({
    required this.id,
    required this.title,
    required this.bankName,
    this.accountNumber,
    required this.depositAmount,
    required this.interestRatePercent,
    required this.termMonths,
    required this.startDate,
    required this.maturityDate,
    this.interestPaymentType = 'END_OF_TERM',
    this.linkedWalletId,
    this.status = 'ACTIVE',
    this.notes,
  });

  // Expected interest calculated by term
  double get expectedInterest {
    if (termMonths <= 0 || interestRatePercent <= 0) return 0.0;
    return depositAmount * (interestRatePercent / 100.0) * (termMonths / 12.0);
  }

  // Total payout on maturity
  double get totalAtMaturity => depositAmount + expectedInterest;

  // Days until maturity
  int get daysUntilMaturity {
    try {
      final mature = DateTime.parse(maturityDate);
      final today = DateTime.now();
      final diff = mature.difference(DateTime(today.year, today.month, today.day)).inDays;
      return diff;
    } catch (_) {
      return 0;
    }
  }

  // Progress of deposit term
  double get termProgressPercent {
    try {
      final start = DateTime.parse(startDate);
      final end = DateTime.parse(maturityDate);
      final today = DateTime.now();
      final totalDays = end.difference(start).inDays;
      if (totalDays <= 0) return 100.0;
      final elapsed = today.difference(start).inDays;
      return (elapsed / totalDays * 100.0).clamp(0.0, 100.0);
    } catch (_) {
      return 0.0;
    }
  }

  bool get isMatured => daysUntilMaturity <= 0;

  factory SavingDepositModel.fromJson(Map<String, dynamic> json) {
    return SavingDepositModel(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? 'Sổ tiết kiệm',
      bankName: json['bank_name']?.toString() ?? 'Ngân hàng',
      accountNumber: json['account_number']?.toString(),
      depositAmount: (json['deposit_amount'] as num?)?.toDouble() ?? 0.0,
      interestRatePercent: (json['interest_rate_percent'] as num?)?.toDouble() ?? 0.0,
      termMonths: (json['term_months'] as num?)?.toInt() ?? 6,
      startDate: json['start_date']?.toString() ?? DateTime.now().toIso8601String().split('T').first,
      maturityDate: json['maturity_date']?.toString() ?? DateTime.now().add(const Duration(days: 180)).toIso8601String().split('T').first,
      interestPaymentType: json['interest_payment_type']?.toString() ?? 'END_OF_TERM',
      linkedWalletId: json['linked_wallet_id']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'bank_name': bankName,
    'account_number': accountNumber,
    'deposit_amount': depositAmount,
    'interest_rate_percent': interestRatePercent,
    'term_months': termMonths,
    'start_date': startDate,
    'maturity_date': maturityDate,
    'interest_payment_type': interestPaymentType,
    'linked_wallet_id': linkedWalletId,
    'status': status,
    'notes': notes,
  };
}

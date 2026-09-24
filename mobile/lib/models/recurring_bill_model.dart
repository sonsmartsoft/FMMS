// Model for Recurring Bills & Invoices (Hóa đơn & Khoản chi định kỳ kiểu MISA MoneyKeeper)

class RecurringBillModel {
  final String id;
  final String name;             // VD: Tiền điện EVN, Internet VNPT, Trả góp xe Mazda...
  final String categoryName;     // Điện nước, Viễn thông, Trả góp, Nhà cửa...
  final double amount;           // Số tiền định kỳ
  final String frequency;        // 'MONTHLY', 'WEEKLY', 'YEARLY'
  final int dueDay;              // Ngày đến hạn trong tháng (1 - 31)
  final String? nextDueDate;     // Ngày đến hạn tiếp theo (yyyy-MM-dd)
  final String? lastPaidDate;    // Ngày thanh toán gần nhất (yyyy-MM-dd)
  final String? linkedWalletId;  // Ví thanh toán mặc định
  final String? linkedWalletName;
  final String status;           // 'PENDING' (Chưa trả), 'PAID' (Đã trả), 'OVERDUE' (Quá hạn)
  final String icon;             // bolt, wifi, home, directions_car, school, water_drop...
  final String? notes;

  RecurringBillModel({
    required this.id,
    required this.name,
    required this.categoryName,
    required this.amount,
    this.frequency = 'MONTHLY',
    required this.dueDay,
    this.nextDueDate,
    this.lastPaidDate,
    this.linkedWalletId,
    this.linkedWalletName,
    this.status = 'PENDING',
    this.icon = 'receipt_long',
    this.notes,
  });

  // Calculate days until next due date
  int get daysUntilDue {
    final now = DateTime.now();
    DateTime target;
    if (nextDueDate != null) {
      try {
        target = DateTime.parse(nextDueDate!);
      } catch (_) {
        target = DateTime(now.year, now.month, dueDay.clamp(1, 28));
      }
    } else {
      target = DateTime(now.year, now.month, dueDay.clamp(1, 28));
      if (target.isBefore(DateTime(now.year, now.month, now.day))) {
        target = DateTime(now.year, now.month + 1, dueDay.clamp(1, 28));
      }
    }
    return target.difference(DateTime(now.year, now.month, now.day)).inDays;
  }

  bool get isOverdue => daysUntilDue < 0 && status != 'PAID';
  bool get isDueToday => daysUntilDue == 0 && status != 'PAID';

  factory RecurringBillModel.fromJson(Map<String, dynamic> json) {
    return RecurringBillModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      categoryName: json['category_name']?.toString() ?? 'Khác',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      frequency: json['frequency']?.toString() ?? 'MONTHLY',
      dueDay: (json['due_day'] as num?)?.toInt() ?? 1,
      nextDueDate: json['next_due_date']?.toString(),
      lastPaidDate: json['last_paid_date']?.toString(),
      linkedWalletId: json['linked_wallet_id']?.toString(),
      linkedWalletName: json['linked_wallet_name']?.toString(),
      status: json['status']?.toString() ?? 'PENDING',
      icon: json['icon']?.toString() ?? 'receipt_long',
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category_name': categoryName,
      'amount': amount,
      'frequency': frequency,
      'due_day': dueDay,
      'next_due_date': nextDueDate,
      'last_paid_date': lastPaidDate,
      'linked_wallet_id': linkedWalletId,
      'linked_wallet_name': linkedWalletName,
      'status': status,
      'icon': icon,
      'notes': notes,
    };
  }
}

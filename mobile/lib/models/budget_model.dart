// Model for Family Budgets (Hạn mức & Ngân sách)

class BudgetModel {
  final String id;
  final String categoryId;
  final String categoryName;
  final double limitAmount;
  final double spentAmount;
  final String month; // '2026-03'
  final String? icon;
  final String? color;

  BudgetModel({
    required this.id,
    required this.categoryId,
    required this.categoryName,
    required this.limitAmount,
    required this.spentAmount,
    required this.month,
    this.icon,
    this.color,
  });

  double get percentage => limitAmount > 0 ? (spentAmount / limitAmount) * 100 : 0;
  bool get isExceeded => spentAmount > limitAmount;
  bool get isWarning => spentAmount >= (limitAmount * 0.8) && !isExceeded;
  double get remaining => (limitAmount - spentAmount) > 0 ? (limitAmount - spentAmount) : 0;

  factory BudgetModel.fromJson(Map<String, dynamic> json) {
    return BudgetModel(
      id: json['id'] ?? '',
      categoryId: json['category_id'] ?? '',
      categoryName: json['category_name'] ?? (json['category'] != null ? json['category']['name'] : 'Khác'),
      limitAmount: (json['limit_amount'] as num?)?.toDouble() ?? 0.0,
      spentAmount: (json['spent_amount'] as num?)?.toDouble() ?? 0.0,
      month: json['month'] ?? '',
      icon: json['icon'],
      color: json['color'],
    );
  }
}

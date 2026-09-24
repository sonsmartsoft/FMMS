// Model for Events & Trips (Quản lý Chi tiêu Sự kiện & Chuyến đi du lịch/lễ tết)

class EventTripModel {
  final String id;
  final String name;                 // VD: Du lịch Đà Nẵng 4N3Đ, Tết Bính Ngọ 2026, Đám cưới em gái
  final String startDate;            // yyyy-MM-dd
  final String? endDate;             // yyyy-MM-dd
  final double budget;               // Ngân sách dự kiến (vd: 15.000.000đ)
  final double totalSpent;           // Tổng số tiền đã chi
  final String icon;                 // 'flight', 'beach_access', 'celebration', 'home_repair_service'
  final String status;               // 'ACTIVE' (Đang diễn ra), 'COMPLETED' (Đã kết thúc)
  final String? linkedVehicleName;   // Xe dùng cho chuyến đi (nếu có, vd: Mazda 2 AT)
  final String? notes;

  EventTripModel({
    required this.id,
    required this.name,
    required this.startDate,
    this.endDate,
    required this.budget,
    this.totalSpent = 0.0,
    this.icon = 'beach_access',
    this.status = 'ACTIVE',
    this.linkedVehicleName,
    this.notes,
  });

  double get remainingBudget => (budget - totalSpent).clamp(0.0, double.infinity);
  double get budgetProgressPercent => budget > 0 ? (totalSpent / budget * 100.0) : 0.0;
  bool get isOverBudget => totalSpent > budget;

  factory EventTripModel.fromJson(Map<String, dynamic> json) {
    return EventTripModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Chuyến đi',
      startDate: json['start_date']?.toString() ?? DateTime.now().toIso8601String().split('T').first,
      endDate: json['end_date']?.toString(),
      budget: (json['budget'] as num?)?.toDouble() ?? 0.0,
      totalSpent: (json['total_spent'] as num?)?.toDouble() ?? 0.0,
      icon: json['icon']?.toString() ?? 'beach_access',
      status: json['status']?.toString() ?? 'ACTIVE',
      linkedVehicleName: json['linked_vehicle_name']?.toString(),
      notes: json['notes']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'start_date': startDate,
    'end_date': endDate,
    'budget': budget,
    'total_spent': totalSpent,
    'icon': icon,
    'status': status,
    'linked_vehicle_name': linkedVehicleName,
    'notes': notes,
  };
}

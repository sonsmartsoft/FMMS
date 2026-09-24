// Model for Family Members & Logged-in User Context

class FamilyMemberModel {
  final String id;
  final String name;
  final String role; // 'ADMIN' (Chủ hộ / Quản trị), 'MEMBER' (Thành viên), 'VIEWER' (Chỉ xem)
  final String? relationship; // 'Bố', 'Mẹ', 'Vợ', 'Chồng', 'Con trai', 'Con gái', 'Khác'
  final String? email;
  final String? phone;
  final String? status; // 'ACTIVE' or 'INACTIVE'
  final String? avatarUrl;
  final double monthlyBudgetLimit; // 0 = Không giới hạn
  final String colorHex; // '#0284C7', '#10B981', '#F59E0B', etc.
  final bool canRecordExpense;
  final bool canViewReports;
  final bool canManageWallets;
  final List<String> assignedAssetIds;
  final String? createdAt;

  const FamilyMemberModel({
    required this.id,
    required this.name,
    required this.role,
    this.relationship,
    this.email,
    this.phone,
    this.status = 'ACTIVE',
    this.avatarUrl,
    this.monthlyBudgetLimit = 0.0,
    this.colorHex = '#0284C7',
    this.canRecordExpense = true,
    this.canViewReports = true,
    this.canManageWallets = false,
    this.assignedAssetIds = const [],
    this.createdAt,
  });

  factory FamilyMemberModel.fromJson(Map<String, dynamic> json) {
    List<String> parseAssets(dynamic val) {
      if (val is List) {
        return val.map((e) => e.toString()).toList();
      }
      return const [];
    }

    return FamilyMemberModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      role: json['role']?.toString() ?? 'MEMBER',
      relationship: json['relationship']?.toString(),
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      avatarUrl: json['avatar_url']?.toString(),
      monthlyBudgetLimit: (json['monthly_budget_limit'] as num?)?.toDouble() ?? 0.0,
      colorHex: json['color_hex']?.toString() ?? '#0284C7',
      canRecordExpense: json['can_record_expense'] ?? true,
      canViewReports: json['can_view_reports'] ?? true,
      canManageWallets: json['can_manage_wallets'] ?? (json['role'] == 'ADMIN'),
      assignedAssetIds: parseAssets(json['assigned_asset_ids']),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'role': role,
    'relationship': relationship,
    'email': email,
    'phone': phone,
    'status': status,
    'avatar_url': avatarUrl,
    'monthly_budget_limit': monthlyBudgetLimit,
    'color_hex': colorHex,
    'can_record_expense': canRecordExpense,
    'can_view_reports': canViewReports,
    'can_manage_wallets': canManageWallets,
    'assigned_asset_ids': assignedAssetIds,
    'created_at': createdAt,
  };

  FamilyMemberModel copyWith({
    String? id,
    String? name,
    String? role,
    String? relationship,
    String? email,
    String? phone,
    String? status,
    String? avatarUrl,
    double? monthlyBudgetLimit,
    String? colorHex,
    bool? canRecordExpense,
    bool? canViewReports,
    bool? canManageWallets,
    List<String>? assignedAssetIds,
    String? createdAt,
  }) {
    return FamilyMemberModel(
      id: id ?? this.id,
      name: name ?? this.name,
      role: role ?? this.role,
      relationship: relationship ?? this.relationship,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      status: status ?? this.status,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      monthlyBudgetLimit: monthlyBudgetLimit ?? this.monthlyBudgetLimit,
      colorHex: colorHex ?? this.colorHex,
      canRecordExpense: canRecordExpense ?? this.canRecordExpense,
      canViewReports: canViewReports ?? this.canViewReports,
      canManageWallets: canManageWallets ?? this.canManageWallets,
      assignedAssetIds: assignedAssetIds ?? this.assignedAssetIds,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  static const List<FamilyMemberModel> defaultMembers = [
    FamilyMemberModel(
      id: 'usr-smartsoft',
      name: 'Nguyễn Trung Sơn (Chủ hộ)',
      role: 'ADMIN',
      relationship: 'Bố / Trụ cột',
      email: 'son.smartsoft@gmail.com',
      phone: '0901234567',
      monthlyBudgetLimit: 0,
      colorHex: '#0284C7',
      canRecordExpense: true,
      canViewReports: true,
      canManageWallets: true,
    ),
    FamilyMemberModel(
      id: 'usr-thuy',
      name: 'Nguyễn Thuý (Mẹ)',
      role: 'ADMIN',
      relationship: 'Mẹ / Tay hòm chìa khóa',
      email: 'trungquanpin@gmail.com',
      phone: '0866618988',
      monthlyBudgetLimit: 25000000,
      colorHex: '#EC4899',
      canRecordExpense: true,
      canViewReports: true,
      canManageWallets: true,
    ),
    FamilyMemberModel(
      id: 'usr-tuan',
      name: 'Nguyễn Tuấn',
      role: 'MEMBER',
      relationship: 'Con trai',
      email: 'tuandtk14@gmail.com',
      phone: '0385058898',
      monthlyBudgetLimit: 5000000,
      colorHex: '#10B981',
      canRecordExpense: true,
      canViewReports: true,
      canManageWallets: false,
    ),
    FamilyMemberModel(
      id: 'usr-guest',
      name: 'Khách / Trợ lý gia đình',
      role: 'VIEWER',
      relationship: 'Người phụ trách',
      email: 'assistant@fmms.local',
      phone: '0984978788',
      monthlyBudgetLimit: 2000000,
      colorHex: '#F59E0B',
      canRecordExpense: false,
      canViewReports: true,
      canManageWallets: false,
    ),
  ];
}

// Model for Family Members & Logged-in User Context

class FamilyMemberModel {
  final String id;
  final String name;
  final String role; // 'ADMIN' or 'MEMBER'
  final String? email;
  final String? phone;
  final String? status; // 'ACTIVE' or 'INACTIVE'
  final String? avatarUrl;
  final List<String> assignedAssetIds;
  final String? createdAt;

  const FamilyMemberModel({
    required this.id,
    required this.name,
    required this.role,
    this.email,
    this.phone,
    this.status,
    this.avatarUrl,
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
      email: json['email']?.toString(),
      phone: json['phone']?.toString(),
      status: json['status']?.toString() ?? 'ACTIVE',
      avatarUrl: json['avatar_url']?.toString(),
      assignedAssetIds: parseAssets(json['assigned_asset_ids']),
      createdAt: json['created_at']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'role': role,
    'email': email,
    'phone': phone,
    'status': status,
    'avatar_url': avatarUrl,
    'assigned_asset_ids': assignedAssetIds,
    'created_at': createdAt,
  };

  static const List<FamilyMemberModel> defaultMembers = [
    FamilyMemberModel(
      id: 'usr-smartsoft',
      name: 'Nguyễn Trung Sơn (SmartSoft)',
      role: 'ADMIN',
      email: 'son.smartsoft@gmail.com',
      phone: '0901234567',
    ),
    FamilyMemberModel(
      id: 'usr-2',
      name: 'Trung Sơn',
      role: 'ADMIN',
      email: 'sondtk5@gmail.com',
      phone: '0984978788',
    ),
    FamilyMemberModel(
      id: 'usr-1',
      name: 'Nguyễn Tuấn',
      role: 'MEMBER',
      email: 'tuandtk14@gmail.com',
      phone: '0385058898',
    ),
    FamilyMemberModel(
      id: 'usr-1788496707036',
      name: 'Nguyễn Thuý',
      role: 'MEMBER',
      email: 'trungquanpin@gmail.com',
      phone: '0866618988',
    ),
  ];
}

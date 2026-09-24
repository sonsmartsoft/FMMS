// FFMS - Mobile Data Models

enum WalletType { CASH, BANK, CREDIT_CARD, E_WALLET, SAVINGS, INVESTMENT }
enum TransactionType { EXPENSE, INCOME, TRANSFER, DEBT_LOAN }
enum BudgetBucket { NECESSITY, SAVINGS, EDUCATION, PLAY, INVESTMENT, GIVE }

class WalletModel {
  final String id;
  final String name;
  final WalletType walletType;
  final String? bankName;
  final String? accountNumber;
  final double currentBalance;
  final double? creditLimit;
  final int? statementDay;
  final int? paymentDueDay;
  final String? color;
  final String? icon;

  WalletModel({
    required this.id,
    required this.name,
    required this.walletType,
    this.bankName,
    this.accountNumber,
    required this.currentBalance,
    this.creditLimit,
    this.statementDay,
    this.paymentDueDay,
    this.color,
    this.icon,
  });

  factory WalletModel.fromJson(Map<String, dynamic> json) {
    WalletType parseType(String? val) {
      switch (val) {
        case 'BANK': return WalletType.BANK;
        case 'CREDIT_CARD': return WalletType.CREDIT_CARD;
        case 'E_WALLET': return WalletType.E_WALLET;
        case 'SAVINGS': return WalletType.SAVINGS;
        case 'INVESTMENT': return WalletType.INVESTMENT;
        default: return WalletType.CASH;
      }
    }

    return WalletModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      walletType: parseType(json['wallet_type']),
      bankName: json['bank_name']?.toString(),
      accountNumber: json['account_number']?.toString(),
      currentBalance: (json['current_balance'] as num?)?.toDouble() ?? 0.0,
      creditLimit: (json['credit_limit'] as num?)?.toDouble(),
      statementDay: json['statement_day'] as int?,
      paymentDueDay: json['payment_due_day'] as int?,
      color: json['color']?.toString(),
      icon: json['icon']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'wallet_type': walletType.name,
    'bank_name': bankName,
    'account_number': accountNumber,
    'current_balance': currentBalance,
    'credit_limit': creditLimit,
    'statement_day': statementDay,
    'payment_due_day': paymentDueDay,
    'color': color,
  };

  WalletModel copyWith({
    String? id,
    String? name,
    WalletType? walletType,
    String? bankName,
    String? accountNumber,
    double? currentBalance,
    double? creditLimit,
    int? statementDay,
    int? paymentDueDay,
    String? color,
    String? icon,
  }) {
    return WalletModel(
      id: id ?? this.id,
      name: name ?? this.name,
      walletType: walletType ?? this.walletType,
      bankName: bankName ?? this.bankName,
      accountNumber: accountNumber ?? this.accountNumber,
      currentBalance: currentBalance ?? this.currentBalance,
      creditLimit: creditLimit ?? this.creditLimit,
      statementDay: statementDay ?? this.statementDay,
      paymentDueDay: paymentDueDay ?? this.paymentDueDay,
      color: color ?? this.color,
      icon: icon ?? this.icon,
    );
  }
}

class TransactionCategoryModel {
  final String id;
  final String name;
  final TransactionType type;
  final String? parentId; // ID of parent category (null if top-level parent)
  final String? color;
  final String? icon;
  final BudgetBucket? budgetBucket;
  final bool isEssential;
  final int displayOrder;

  TransactionCategoryModel({
    required this.id,
    required this.name,
    required this.type,
    this.parentId,
    this.color,
    this.icon,
    this.budgetBucket,
    this.isEssential = true,
    this.displayOrder = 0,
  });

  bool get isParent => parentId == null || parentId!.isEmpty;

  factory TransactionCategoryModel.fromJson(Map<String, dynamic> json) {
    TransactionType parseType(String? val) {
      if (val == 'INCOME') return TransactionType.INCOME;
      if (val == 'TRANSFER') return TransactionType.TRANSFER;
      return TransactionType.EXPENSE;
    }

    BudgetBucket? parseBucket(String? val) {
      switch (val) {
        case 'NECESSITY': return BudgetBucket.NECESSITY;
        case 'SAVINGS': return BudgetBucket.SAVINGS;
        case 'EDUCATION': return BudgetBucket.EDUCATION;
        case 'PLAY': return BudgetBucket.PLAY;
        case 'INVESTMENT': return BudgetBucket.INVESTMENT;
        case 'GIVE': return BudgetBucket.GIVE;
        default: return null;
      }
    }

    return TransactionCategoryModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: parseType(json['type']),
      parentId: json['parent_id']?.toString(),
      color: json['color']?.toString(),
      icon: json['icon']?.toString(),
      budgetBucket: parseBucket(json['budget_bucket']),
      isEssential: json['is_essential'] ?? true,
      displayOrder: (json['display_order'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'type': type.name,
    'parent_id': parentId,
    'color': color,
    'icon': icon,
    'display_order': displayOrder,
  };

  TransactionCategoryModel copyWith({
    String? id,
    String? name,
    TransactionType? type,
    String? parentId,
    String? color,
    String? icon,
    BudgetBucket? budgetBucket,
    bool? isEssential,
    int? displayOrder,
  }) {
    return TransactionCategoryModel(
      id: id ?? this.id,
      name: name ?? this.name,
      type: type ?? this.type,
      parentId: parentId ?? this.parentId,
      color: color ?? this.color,
      icon: icon ?? this.icon,
      budgetBucket: budgetBucket ?? this.budgetBucket,
      isEssential: isEssential ?? this.isEssential,
      displayOrder: displayOrder ?? this.displayOrder,
    );
  }
}

class FamilyTransactionModel {
  final String id;
  final String walletId;
  final String? toWalletId;
  final String? categoryId;
  final String? subCategoryId;
  final String? assetId;
  final TransactionType transactionType;
  final double amount;
  final String date;
  final String? payeeVendor;
  final String? description;
  final String? notes;
  final bool isEssential;
  final String? walletName;
  final String? categoryName;
  final String? subCategoryName;
  final String? eventTripId;
  final String? eventTripName;
  final String? forMemberName;
  final String? paidByMember;
  final bool isExcludedFromReport;
  final String? location;
  final String? imageUrl;
  final double? transferFee;

  FamilyTransactionModel({
    required this.id,
    required this.walletId,
    this.toWalletId,
    this.categoryId,
    this.subCategoryId,
    this.assetId,
    required this.transactionType,
    required this.amount,
    required this.date,
    this.payeeVendor,
    this.description,
    this.notes,
    this.isEssential = true,
    this.walletName,
    this.categoryName,
    this.subCategoryName,
    this.eventTripId,
    this.eventTripName,
    this.forMemberName,
    this.paidByMember,
    this.isExcludedFromReport = false,
    this.location,
    this.imageUrl,
    this.transferFee,
  });

  factory FamilyTransactionModel.fromJson(Map<String, dynamic> json) {
    TransactionType parseType(String? val) {
      if (val == 'INCOME') return TransactionType.INCOME;
      if (val == 'TRANSFER') return TransactionType.TRANSFER;
      if (val == 'DEBT_LOAN') return TransactionType.DEBT_LOAN;
      return TransactionType.EXPENSE;
    }

    return FamilyTransactionModel(
      id: json['id']?.toString() ?? '',
      walletId: json['wallet_id']?.toString() ?? '',
      toWalletId: json['to_wallet_id']?.toString(),
      categoryId: json['category_id']?.toString(),
      subCategoryId: json['sub_category_id']?.toString(),
      assetId: json['asset_id']?.toString(),
      transactionType: parseType(json['transaction_type']),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: json['date']?.toString() ?? '',
      payeeVendor: json['payee_vendor']?.toString(),
      description: json['description']?.toString(),
      notes: json['notes']?.toString(),
      isEssential: json['is_essential'] ?? true,
      walletName: json['wallet'] != null ? json['wallet']['name'] : null,
      categoryName: json['category'] != null ? json['category']['name'] : null,
      subCategoryName: json['sub_category_name']?.toString(),
      eventTripId: json['event_trip_id']?.toString(),
      eventTripName: json['event_trip_name']?.toString(),
      forMemberName: json['for_member_name']?.toString(),
      paidByMember: json['paid_by_member']?.toString(),
      isExcludedFromReport: json['is_excluded_from_report'] == true,
      location: json['location']?.toString(),
      imageUrl: json['image_url']?.toString(),
      transferFee: (json['transfer_fee'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id.isNotEmpty ? id : null,
    'wallet_id': walletId,
    'to_wallet_id': toWalletId,
    'category_id': categoryId,
    'sub_category_id': subCategoryId,
    'asset_id': assetId,
    'transaction_type': transactionType.name,
    'amount': amount,
    'date': date,
    'payee_vendor': payeeVendor,
    'description': description,
    'notes': notes,
    'is_essential': isEssential,
    'event_trip_id': eventTripId,
    'event_trip_name': eventTripName,
    'for_member_name': forMemberName,
    'paid_by_member': paidByMember,
    'is_excluded_from_report': isExcludedFromReport,
    'location': location,
    'image_url': imageUrl,
    'transfer_fee': transferFee,
  };

  FamilyTransactionModel copyWith({
    String? id,
    String? walletId,
    String? toWalletId,
    String? categoryId,
    String? subCategoryId,
    String? assetId,
    TransactionType? transactionType,
    double? amount,
    String? date,
    String? payeeVendor,
    String? description,
    String? notes,
    bool? isEssential,
    String? walletName,
    String? categoryName,
    String? subCategoryName,
    String? eventTripId,
    String? eventTripName,
    String? forMemberName,
    String? paidByMember,
    bool? isExcludedFromReport,
    String? location,
    String? imageUrl,
    double? transferFee,
  }) {
    return FamilyTransactionModel(
      id: id ?? this.id,
      walletId: walletId ?? this.walletId,
      toWalletId: toWalletId ?? this.toWalletId,
      categoryId: categoryId ?? this.categoryId,
      subCategoryId: subCategoryId ?? this.subCategoryId,
      assetId: assetId ?? this.assetId,
      transactionType: transactionType ?? this.transactionType,
      amount: amount ?? this.amount,
      date: date ?? this.date,
      payeeVendor: payeeVendor ?? this.payeeVendor,
      description: description ?? this.description,
      notes: notes ?? this.notes,
      isEssential: isEssential ?? this.isEssential,
      walletName: walletName ?? this.walletName,
      categoryName: categoryName ?? this.categoryName,
      subCategoryName: subCategoryName ?? this.subCategoryName,
      eventTripId: eventTripId ?? this.eventTripId,
      eventTripName: eventTripName ?? this.eventTripName,
      forMemberName: forMemberName ?? this.forMemberName,
      paidByMember: paidByMember ?? this.paidByMember,
      isExcludedFromReport: isExcludedFromReport ?? this.isExcludedFromReport,
      location: location ?? this.location,
      imageUrl: imageUrl ?? this.imageUrl,
      transferFee: transferFee ?? this.transferFee,
    );
  }
}


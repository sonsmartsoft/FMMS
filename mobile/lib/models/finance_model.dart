// FFMS - Mobile Data Models

enum WalletType { CASH, BANK, CREDIT_CARD, E_WALLET, SAVINGS, INVESTMENT }
enum TransactionType { EXPENSE, INCOME, TRANSFER }
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
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      walletType: parseType(json['wallet_type']),
      bankName: json['bank_name'],
      accountNumber: json['account_number'],
      currentBalance: (json['current_balance'] as num?)?.toDouble() ?? 0.0,
      creditLimit: (json['credit_limit'] as num?)?.toDouble(),
      statementDay: json['statement_day'],
      paymentDueDay: json['payment_due_day'],
      color: json['color'],
      icon: json['icon'],
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
}

class TransactionCategoryModel {
  final String id;
  final String name;
  final TransactionType type;
  final String? color;
  final String? icon;
  final BudgetBucket? budgetBucket;
  final bool isEssential;

  TransactionCategoryModel({
    required this.id,
    required this.name,
    required this.type,
    this.color,
    this.icon,
    this.budgetBucket,
    this.isEssential = true,
  });

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
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: parseType(json['type']),
      color: json['color'],
      icon: json['icon'],
      budgetBucket: parseBucket(json['budget_bucket']),
      isEssential: json['is_essential'] ?? true,
    );
  }
}

class FamilyTransactionModel {
  final String id;
  final String walletId;
  final String? toWalletId;
  final String? categoryId;
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

  FamilyTransactionModel({
    required this.id,
    required this.walletId,
    this.toWalletId,
    this.categoryId,
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
  });

  factory FamilyTransactionModel.fromJson(Map<String, dynamic> json) {
    TransactionType parseType(String? val) {
      if (val == 'INCOME') return TransactionType.INCOME;
      if (val == 'TRANSFER') return TransactionType.TRANSFER;
      return TransactionType.EXPENSE;
    }

    return FamilyTransactionModel(
      id: json['id'] ?? '',
      walletId: json['wallet_id'] ?? '',
      toWalletId: json['to_wallet_id'],
      categoryId: json['category_id'],
      assetId: json['asset_id'],
      transactionType: parseType(json['transaction_type']),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      date: json['date'] ?? '',
      payeeVendor: json['payee_vendor'],
      description: json['description'],
      notes: json['notes'],
      isEssential: json['is_essential'] ?? true,
      walletName: json['wallet'] != null ? json['wallet']['name'] : null,
      categoryName: json['category'] != null ? json['category']['name'] : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'wallet_id': walletId,
    'to_wallet_id': toWalletId,
    'category_id': categoryId,
    'asset_id': assetId,
    'transaction_type': transactionType.name,
    'amount': amount,
    'date': date,
    'payee_vendor': payeeVendor,
    'description': description,
    'notes': notes,
    'is_essential': isEssential,
  };
}

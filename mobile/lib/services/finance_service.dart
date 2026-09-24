import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/finance_model.dart';
import '../models/budget_model.dart';
import 'auth_service.dart';

class FinanceService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final AuthService _authService = AuthService();

  static const String _kOfflineQueueKey = 'offline_tx_queue';
  static const String _kWalletsStorageKey = 'local_wallets_storage';
  static const String _kTransactionsStorageKey = 'local_transactions_storage';
  static const String _kCategoriesStorageKey = 'local_categories_storage';

  // ==========================================
  // 1. WALLETS (TÀI KHOẢN / VÍ)
  // ==========================================
  Future<List<WalletModel>> getWallets() async {
    try {
      final res = await _supabase
          .from('wallets')
          .select()
          .order('created_at', ascending: true);

      final list = (res as List).map((e) => WalletModel.fromJson(e)).toList();
      if (list.isNotEmpty) {
        await _saveLocalWallets(list);
        return list;
      }
    } catch (_) {}

    return _loadLocalWallets();
  }

  Future<bool> saveWallet(WalletModel wallet) async {
    final list = await _loadLocalWallets();
    final idx = list.indexWhere((w) => w.id == wallet.id);

    try {
      final payload = wallet.toJson();
      if (payload['id'] == null || payload['id'].toString().isEmpty || payload['id'].toString().startsWith('w-local-')) {
        payload.remove('id');
      }
      await _supabase.from('wallets').upsert(payload);
    } catch (_) {}

    if (idx != -1) {
      list[idx] = wallet;
    } else {
      list.add(wallet);
    }
    await _saveLocalWallets(list);
    return true;
  }

  Future<bool> deleteWallet(String id) async {
    try {
      await _supabase.from('wallets').delete().eq('id', id);
    } catch (_) {}

    final list = await _loadLocalWallets();
    list.removeWhere((w) => w.id == id);
    await _saveLocalWallets(list);
    return true;
  }

  Future<List<WalletModel>> _loadLocalWallets() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kWalletsStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => WalletModel.fromJson(e)).toList();
      } catch (_) {}
    }
    final defaults = _getLocalWalletsFallback();
    await _saveLocalWallets(defaults);
    return defaults;
  }

  Future<void> _saveLocalWallets(List<WalletModel> wallets) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(wallets.map((w) => w.toJson()).toList());
    await prefs.setString(_kWalletsStorageKey, encoded);
  }

  // Adjust Wallet Balance (Điều chỉnh số dư ví với giao dịch đối ứng kiểu MISA)
  Future<bool> adjustWalletBalance({
    required String walletId,
    required double newBalance,
    String? note,
  }) async {
    final wallets = await getWallets();
    final idx = wallets.indexWhere((w) => w.id == walletId);
    if (idx == -1) return false;

    final targetWallet = wallets[idx];
    final diff = newBalance - targetWallet.currentBalance;

    // Update wallet balance
    wallets[idx] = targetWallet.copyWith(currentBalance: newBalance);
    await _saveLocalWallets(wallets);

    try {
      await _supabase.from('wallets').update({'current_balance': newBalance}).eq('id', walletId);
    } catch (_) {}

    // If there is a difference, record an automatic adjustment transaction
    if (diff.abs() > 0.01) {
      final isIncrease = diff > 0;
      final adjTx = FamilyTransactionModel(
        id: 'tx-adj-${DateTime.now().millisecondsSinceEpoch}',
        walletId: walletId,
        walletName: targetWallet.name,
        transactionType: isIncrease ? TransactionType.INCOME : TransactionType.EXPENSE,
        amount: diff.abs(),
        date: DateTime.now().toIso8601String().split('T').first,
        payeeVendor: 'Điều chỉnh số dư',
        description: note ?? (isIncrease ? 'Điều chỉnh tăng số dư ví' : 'Điều chỉnh giảm số dư ví'),
        notes: note ?? 'Cân đối lại số dư thực tế khớp với thực tế',
        isEssential: true,
      );

      final txList = await _loadLocalTransactions();
      txList.insert(0, adjTx);
      await _saveLocalTransactions(txList);

      try {
        await _supabase.from('family_transactions').insert(adjTx.toJson());
      } catch (_) {}
    }

    return true;
  }

  // ==========================================
  // 2. CATEGORIES (HẠNG MỤC THU / CHI)
  // ==========================================
  Future<List<TransactionCategoryModel>> getCategories() async {
    try {
      final res = await _supabase
          .from('transaction_categories')
          .select()
          .order('display_order', ascending: true);

      final list = (res as List).map((e) => TransactionCategoryModel.fromJson(e)).toList();
      if (list.isNotEmpty) {
        await _saveLocalCategories(list);
        return list;
      }
    } catch (_) {}

    return _loadLocalCategories();
  }

  Future<bool> saveCategory(TransactionCategoryModel category) async {
    final list = await _loadLocalCategories();
    final idx = list.indexWhere((c) => c.id == category.id);

    try {
      final payload = category.toJson();
      if (payload['id'] == null || payload['id'].toString().startsWith('cat-local-')) {
        payload.remove('id');
      }
      await _supabase.from('transaction_categories').upsert(payload);
    } catch (_) {}

    if (idx != -1) {
      list[idx] = category;
    } else {
      list.add(category);
    }
    await _saveLocalCategories(list);
    return true;
  }

  Future<bool> deleteCategory(String id) async {
    try {
      await _supabase.from('transaction_categories').delete().eq('id', id);
    } catch (_) {}

    final list = await _loadLocalCategories();
    list.removeWhere((c) => c.id == id || c.parentId == id);
    await _saveLocalCategories(list);
    return true;
  }

  Future<List<TransactionCategoryModel>> _loadLocalCategories() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kCategoriesStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => TransactionCategoryModel.fromJson(e)).toList();
      } catch (_) {}
    }
    final defaults = _getLocalCategoriesFallback();
    await _saveLocalCategories(defaults);
    return defaults;
  }

  Future<void> _saveLocalCategories(List<TransactionCategoryModel> categories) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(categories.map((c) => c.toJson()).toList());
    await prefs.setString(_kCategoriesStorageKey, encoded);
  }

  // ==========================================
  // 3. TRANSACTIONS (SỔ THU CHI & GIAO DỊCH)
  // ==========================================
  Future<List<FamilyTransactionModel>> getTransactions({int limit = 100}) async {
    try {
      final res = await _supabase
          .from('family_transactions')
          .select('*, wallet:wallets!wallet_id(name), category:transaction_categories!category_id(name)')
          .order('date', ascending: false)
          .limit(limit);

      final list = (res as List).map((e) => FamilyTransactionModel.fromJson(e)).toList();
      if (list.isNotEmpty) {
        await _saveLocalTransactions(list);
        return list;
      }
    } catch (_) {}

    return _loadLocalTransactions();
  }

  // Create Transaction (Cập nhật số dư ví tự động)
  Future<bool> createTransaction(FamilyTransactionModel tx, {String? memberName, String? memberId}) async {
    final activeMember = _authService.getCurrentMember();
    final effectiveName = memberName ?? activeMember.name;
    final effectiveId = memberId ?? activeMember.id;

    String notesWithMember = tx.notes ?? '';
    if (!notesWithMember.contains('[Người chi:')) {
      notesWithMember = '[Người chi: $effectiveName] $notesWithMember'.trim();
    }

    if (tx.subCategoryName != null && tx.subCategoryName!.isNotEmpty) {
      if (!notesWithMember.contains('[Chi tiết:')) {
        notesWithMember = '$notesWithMember [Chi tiết: ${tx.subCategoryName}]'.trim();
      }
    }

    final txId = (tx.id.isNotEmpty && !tx.id.startsWith('tx-'))
        ? tx.id
        : 'tx-local-${DateTime.now().millisecondsSinceEpoch}';

    final finalTx = tx.copyWith(
      id: txId,
      notes: notesWithMember,
    );

    // 1. Apply wallet balance effects
    await _applyBalanceDelta(finalTx, isAdding: true);

    // 2. Save locally
    final localList = await _loadLocalTransactions();
    localList.insert(0, finalTx);
    await _saveLocalTransactions(localList);

    // 3. Sync to Supabase
    try {
      final payload = finalTx.toJson();
      payload['created_by'] = effectiveId;
      await _supabase.from('family_transactions').insert(payload);
      return true;
    } catch (e) {
      await _enqueueOffline(finalTx, memberName: memberName);
      return false;
    }
  }

  // Update Transaction (Cập nhật & Cân đối lại số dư ví)
  Future<bool> updateTransaction(FamilyTransactionModel oldTx, FamilyTransactionModel newTx) async {
    // 1. Revert old transaction effect on wallets
    await _applyBalanceDelta(oldTx, isAdding: false);

    // 2. Apply new transaction effect on wallets
    await _applyBalanceDelta(newTx, isAdding: true);

    // 3. Update local transactions list
    final list = await _loadLocalTransactions();
    final idx = list.indexWhere((t) => t.id == oldTx.id);
    if (idx != -1) {
      list[idx] = newTx;
    } else {
      list.insert(0, newTx);
    }
    await _saveLocalTransactions(list);

    // 4. Update Supabase
    try {
      final payload = newTx.toJson();
      await _supabase.from('family_transactions').update(payload).eq('id', newTx.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Delete Transaction (Hoàn lại tiền vào ví)
  Future<bool> deleteTransaction(FamilyTransactionModel tx) async {
    // 1. Revert transaction effect on wallets
    await _applyBalanceDelta(tx, isAdding: false);

    // 2. Remove from local storage
    final list = await _loadLocalTransactions();
    list.removeWhere((t) => t.id == tx.id);
    await _saveLocalTransactions(list);

    // 3. Delete from Supabase
    try {
      await _supabase.from('family_transactions').delete().eq('id', tx.id);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Helper: Apply Balance Delta to Wallets
  Future<void> _applyBalanceDelta(FamilyTransactionModel tx, {required bool isAdding}) async {
    final wallets = await getWallets();
    final factor = isAdding ? 1.0 : -1.0;

    if (tx.transactionType == TransactionType.EXPENSE) {
      final idx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (idx != -1) {
        final totalDeducted = tx.amount + (tx.transferFee ?? 0.0);
        final newBal = wallets[idx].currentBalance - (factor * totalDeducted);
        wallets[idx] = wallets[idx].copyWith(currentBalance: newBal);
      }
    } else if (tx.transactionType == TransactionType.INCOME) {
      final idx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (idx != -1) {
        final newBal = wallets[idx].currentBalance + (factor * tx.amount);
        wallets[idx] = wallets[idx].copyWith(currentBalance: newBal);
      }
    } else if (tx.transactionType == TransactionType.TRANSFER) {
      final fromIdx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (fromIdx != -1) {
        final totalFrom = tx.amount + (tx.transferFee ?? 0.0);
        final newFromBal = wallets[fromIdx].currentBalance - (factor * totalFrom);
        wallets[fromIdx] = wallets[fromIdx].copyWith(currentBalance: newFromBal);
      }
      if (tx.toWalletId != null) {
        final toIdx = wallets.indexWhere((w) => w.id == tx.toWalletId);
        if (toIdx != -1) {
          final newToBal = wallets[toIdx].currentBalance + (factor * tx.amount);
          wallets[toIdx] = wallets[toIdx].copyWith(currentBalance: newToBal);
        }
      }
    }

    await _saveLocalWallets(wallets);
  }

  // Transfer Money between Wallets (with optional transfer fee)
  Future<bool> transferMoney({
    required String fromWalletId,
    required String toWalletId,
    required double amount,
    required String date,
    double? transferFee,
    String? note,
  }) async {
    final wallets = await getWallets();
    final fromWallet = wallets.where((w) => w.id == fromWalletId).firstOrNull;
    final toWallet = wallets.where((w) => w.id == toWalletId).firstOrNull;

    final tx = FamilyTransactionModel(
      id: 'tx-trans-${DateTime.now().millisecondsSinceEpoch}',
      walletId: fromWalletId,
      toWalletId: toWalletId,
      walletName: fromWallet?.name,
      transactionType: TransactionType.TRANSFER,
      amount: amount,
      transferFee: transferFee,
      date: date,
      payeeVendor: 'Chuyển tiền: ${fromWallet?.name ?? "Ví nguồn"} ➔ ${toWallet?.name ?? "Ví đích"}',
      description: note ?? 'Chuyển tiền nội bộ',
      notes: note,
      isEssential: true,
    );

    return createTransaction(tx);
  }

  // Local Transactions Cache Management
  Future<List<FamilyTransactionModel>> _loadLocalTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTransactionsStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => FamilyTransactionModel.fromJson(e)).toList();
      } catch (_) {}
    }
    final defaults = _getInitialDefaultTransactions();
    await _saveLocalTransactions(defaults);
    return defaults;
  }

  Future<void> _saveLocalTransactions(List<FamilyTransactionModel> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(list.map((t) => t.toJson()).toList());
    await prefs.setString(_kTransactionsStorageKey, encoded);
  }

  // ==========================================
  // 4. BUDGETS
  // ==========================================
  Future<List<BudgetModel>> getBudgets() async {
    try {
      final now = DateTime.now();
      final currentMonth = '${now.year}-${now.month.toString().padLeft(2, '0')}';

      final res = await _supabase
          .from('family_budgets')
          .select('*, category:transaction_categories!category_id(name, icon, color)')
          .eq('month', currentMonth);

      if ((res as List).isNotEmpty) {
        return res.map((e) => BudgetModel.fromJson(e)).toList();
      }
      return _getMockBudgets();
    } catch (_) {
      return _getMockBudgets();
    }
  }

  // Offline Queue handling
  Future<void> _enqueueOffline(FamilyTransactionModel tx, {String? memberName}) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_kOfflineQueueKey) ?? [];
    final payload = tx.toJson();
    if (memberName != null && memberName.isNotEmpty) {
      payload['notes'] = '[Người chi: $memberName] ${payload['notes'] ?? ''}'.trim();
    }
    list.add(jsonEncode(payload));
    await prefs.setStringList(_kOfflineQueueKey, list);
  }

  Future<int> syncOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_kOfflineQueueKey) ?? [];
    if (list.isEmpty) return 0;

    int synced = 0;
    final remaining = <String>[];

    for (final item in list) {
      try {
        final data = jsonDecode(item);
        await _supabase.from('family_transactions').insert(data);
        synced++;
      } catch (_) {
        remaining.add(item);
      }
    }

    await prefs.setStringList(_kOfflineQueueKey, remaining);
    return synced;
  }

  // ==========================================
  // FALLBACK DEFAULTS
  // ==========================================
  List<WalletModel> _getLocalWalletsFallback() {
    return [
      WalletModel(id: 'w-cash-01', name: 'Tiền mặt gia đình', walletType: WalletType.CASH, currentBalance: 15400000, color: '#10B981', icon: 'Banknote'),
      WalletModel(id: 'w-tcb-01', name: 'Techcombank Chi tiêu', walletType: WalletType.BANK, bankName: 'Techcombank', currentBalance: 38500000, color: '#EF4444', icon: 'Building2'),
      WalletModel(id: 'w-vcb-01', name: 'Vietcombank Lương & Dự phòng', walletType: WalletType.BANK, bankName: 'Vietcombank', currentBalance: 85200000, color: '#059669', icon: 'CreditCard'),
      WalletModel(id: 'w-tcb-credit', name: 'Techcombank Visa Signature', walletType: WalletType.CREDIT_CARD, bankName: 'Techcombank', currentBalance: -4850000, creditLimit: 100000000, statementDay: 20, paymentDueDay: 5, color: '#6366F1', icon: 'CreditCard'),
      WalletModel(id: 'w-momo', name: 'Ví MoMo', walletType: WalletType.E_WALLET, currentBalance: 1250000, color: '#EC4899', icon: 'Smartphone'),
    ];
  }

  List<TransactionCategoryModel> _getLocalCategoriesFallback() {
    return [
      // 1. Ăn uống & Đi chợ
      TransactionCategoryModel(id: 'cat-food', name: 'Ăn uống & Đi chợ', type: TransactionType.EXPENSE, icon: 'utensils', color: '#F59E0B', displayOrder: 1),
      TransactionCategoryModel(id: 'cat-food-groceries', name: 'Đi chợ & Siêu thị', parentId: 'cat-food', type: TransactionType.EXPENSE, icon: 'shopping-bag', color: '#F59E0B', displayOrder: 2),
      TransactionCategoryModel(id: 'cat-food-dining', name: 'Ăn ngoài & Cafe', parentId: 'cat-food', type: TransactionType.EXPENSE, icon: 'coffee', color: '#FBBF24', displayOrder: 3),

      // 2. Phương tiện & Xe cộ
      TransactionCategoryModel(id: 'cat-mobility', name: 'Phương tiện & Đi lại (Xe)', type: TransactionType.EXPENSE, icon: 'car', color: '#06B6D4', displayOrder: 4),
      TransactionCategoryModel(id: 'cat-mob-fuel', name: 'Xăng xe & Nhiên liệu', parentId: 'cat-mobility', type: TransactionType.EXPENSE, icon: 'fuel', color: '#06B6D4', displayOrder: 5),
      TransactionCategoryModel(id: 'cat-mob-maint', name: 'Bảo dưỡng & Sửa xe', parentId: 'cat-mobility', type: TransactionType.EXPENSE, icon: 'wrench', color: '#0EA5E9', displayOrder: 6),
      TransactionCategoryModel(id: 'cat-mob-toll', name: 'Phí VETC & Gửi xe', parentId: 'cat-mobility', type: TransactionType.EXPENSE, icon: 'credit-card', color: '#38BDF8', displayOrder: 7),
      TransactionCategoryModel(id: 'cat-mob-wash', name: 'Rửa xe & Chăm sóc xe', parentId: 'cat-mobility', type: TransactionType.EXPENSE, icon: 'sparkles', color: '#A5F3FC', displayOrder: 8),

      // 3. Nhà cửa & Tiện ích
      TransactionCategoryModel(id: 'cat-home', name: 'Nhà cửa & Tiện ích', type: TransactionType.EXPENSE, icon: 'home', color: '#3B82F6', displayOrder: 9),
      TransactionCategoryModel(id: 'cat-home-bills', name: 'Điện, Nước, Internet', parentId: 'cat-home', type: TransactionType.EXPENSE, icon: 'zap', color: '#38BDF8', displayOrder: 10),
      TransactionCategoryModel(id: 'cat-home-furnishing', name: 'Đồ gia dụng & Nhà', parentId: 'cat-home', type: TransactionType.EXPENSE, icon: 'hammer', color: '#60A5FA', displayOrder: 11),

      // 4. Con cái & Giáo dục
      TransactionCategoryModel(id: 'cat-education', name: 'Con cái & Giáo dục', type: TransactionType.EXPENSE, icon: 'graduation-cap', color: '#8B5CF6', displayOrder: 12),
      TransactionCategoryModel(id: 'cat-edu-tuition', name: 'Học phí trường & Học thêm', parentId: 'cat-education', type: TransactionType.EXPENSE, icon: 'book-open', color: '#A78BFA', displayOrder: 13),
      TransactionCategoryModel(id: 'cat-edu-kids', name: 'Sữa, Bỉm & Đồ chơi', parentId: 'cat-education', type: TransactionType.EXPENSE, icon: 'baby', color: '#C4B5FD', displayOrder: 14),

      // 5. Mua sắm & Hưởng thụ
      TransactionCategoryModel(id: 'cat-play', name: 'Hưởng thụ & Du lịch', type: TransactionType.EXPENSE, icon: 'plane', color: '#EC4899', displayOrder: 15),
      TransactionCategoryModel(id: 'cat-play-travel', name: 'Nghỉ dưỡng & Du lịch', parentId: 'cat-play', type: TransactionType.EXPENSE, icon: 'palmtree', color: '#F472B6', displayOrder: 16),
      TransactionCategoryModel(id: 'cat-play-shopping', name: 'Mua sắm & Quần áo', parentId: 'cat-play', type: TransactionType.EXPENSE, icon: 'shopping-bag', color: '#FB7185', displayOrder: 17),

      // 6. Y tế & Sức khỏe
      TransactionCategoryModel(id: 'cat-health', name: 'Y tế & Sức khỏe', type: TransactionType.EXPENSE, icon: 'heart', color: '#10B981', displayOrder: 18),

      // 7. Trả góp & Nợ
      TransactionCategoryModel(id: 'cat-debt', name: 'Trả góp & Trả nợ', type: TransactionType.EXPENSE, icon: 'badge-percent', color: '#E11D48', displayOrder: 19),

      // 8. Thu nhập
      TransactionCategoryModel(id: 'cat-salary', name: 'Lương & Thưởng', type: TransactionType.INCOME, icon: 'briefcase', color: '#059669', displayOrder: 20),
      TransactionCategoryModel(id: 'cat-inc-bonus', name: 'Thưởng & Thu nhập thêm', parentId: 'cat-salary', type: TransactionType.INCOME, icon: 'gift', color: '#10B981', displayOrder: 21),
      TransactionCategoryModel(id: 'cat-inc-invest', name: 'Lãi đầu tư & Cổ tức', parentId: 'cat-salary', type: TransactionType.INCOME, icon: 'trending-up', color: '#059669', displayOrder: 22),
    ];
  }

  List<FamilyTransactionModel> _getInitialDefaultTransactions() {
    final now = DateTime.now();
    final d = (int day) => '${now.year}-${now.month.toString().padLeft(2, '0')}-${day.toString().padLeft(2, '0')}';

    return [
      FamilyTransactionModel(
        id: 'tx-def-01',
        walletId: 'w-tcb-01',
        walletName: 'Techcombank Chi tiêu',
        categoryId: 'cat-mob-fuel',
        categoryName: 'Xăng xe & Nhiên liệu',
        subCategoryName: 'Xăng xe & Nhiên liệu',
        transactionType: TransactionType.EXPENSE,
        amount: 600000,
        date: d(now.day > 1 ? now.day - 1 : now.day),
        payeeVendor: 'Petrolimex Cây Xăng Số 3',
        description: 'Đổ xăng RON 95-V xe Mazda 2 AT',
        notes: '[Người chi: Anh Tú] Đầy bình 35L',
        forMemberName: 'Cả gia đình',
      ),
      FamilyTransactionModel(
        id: 'tx-def-02',
        walletId: 'w-cash-01',
        walletName: 'Tiền mặt gia đình',
        categoryId: 'cat-food-groceries',
        categoryName: 'Ăn uống & Đi chợ',
        subCategoryName: 'Đi chợ & Siêu thị',
        transactionType: TransactionType.EXPENSE,
        amount: 380000,
        date: d(now.day),
        payeeVendor: 'Siêu thị WinMart',
        description: 'Mua thịt bò, rau củ quả cuối tuần',
        notes: '[Người chi: Chị Mai]',
        forMemberName: 'Cả gia đình',
      ),
      FamilyTransactionModel(
        id: 'tx-def-03',
        walletId: 'w-vcb-01',
        walletName: 'Vietcombank Lương & Dự phòng',
        categoryId: 'cat-salary',
        categoryName: 'Lương & Thưởng',
        transactionType: TransactionType.INCOME,
        amount: 32000000,
        date: d(5),
        payeeVendor: 'Công ty Cổ phần Công nghệ',
        description: 'Nhận lương tháng',
        notes: '[Người chi: Anh Tú] Lương định kỳ qua Vietcombank',
        forMemberName: 'Cả gia đình',
      ),
      FamilyTransactionModel(
        id: 'tx-def-04',
        walletId: 'w-tcb-01',
        walletName: 'Techcombank Chi tiêu',
        categoryId: 'cat-home-bills',
        categoryName: 'Nhà cửa & Tiện ích',
        subCategoryName: 'Điện, Nước, Internet',
        transactionType: TransactionType.EXPENSE,
        amount: 1450000,
        date: d(12),
        payeeVendor: 'Điện Lực EVN TP.HCM',
        description: 'Thanh toán tiền điện sinh hoạt tháng',
        notes: '[Người chi: Anh Tú]',
        forMemberName: 'Cả gia đình',
      ),
      FamilyTransactionModel(
        id: 'tx-def-05',
        walletId: 'w-tcb-01',
        walletName: 'Techcombank Chi tiêu',
        categoryId: 'cat-mob-toll',
        categoryName: 'Phương tiện & Đi lại (Xe)',
        subCategoryName: 'Phí VETC & Gửi xe',
        transactionType: TransactionType.EXPENSE,
        amount: 300000,
        date: d(15),
        payeeVendor: 'VETC Thu Phí Tự Động',
        description: 'Nạp tài khoản thu phí VETC',
        notes: '[Người chi: Anh Tú]',
        forMemberName: 'Cả gia đình',
      ),
      FamilyTransactionModel(
        id: 'tx-def-06',
        walletId: 'w-tcb-credit',
        walletName: 'Techcombank Visa Signature',
        categoryId: 'cat-play-dining',
        categoryName: 'Ăn uống & Đi chợ',
        subCategoryName: 'Ăn ngoài & Cafe',
        transactionType: TransactionType.EXPENSE,
        amount: 850000,
        date: d(18),
        payeeVendor: 'Nhà hàng Pizza 4P\'s',
        description: 'Ăn tối gia đình cuối tuần',
        notes: '[Người chi: Anh Tú] Quẹt thẻ Visa tích điểm hoàn tiền',
        forMemberName: 'Cả gia đình',
      ),
    ];
  }

  List<BudgetModel> _getMockBudgets() {
    return [
      BudgetModel(id: 'b-1', categoryId: 'cat-food', categoryName: 'Ăn uống & Đi chợ', limitAmount: 12000000, spentAmount: 8450000, month: '2026-03'),
      BudgetModel(id: 'b-2', categoryId: 'cat-home', categoryName: 'Nhà cửa & Tiện ích', limitAmount: 6000000, spentAmount: 4200000, month: '2026-03'),
      BudgetModel(id: 'b-3', categoryId: 'cat-play', categoryName: 'Hưởng thụ & Du lịch', limitAmount: 5000000, spentAmount: 4900000, month: '2026-03'),
      BudgetModel(id: 'b-4', categoryId: 'cat-mobility', categoryName: 'Phương tiện & Đi lại (Xe)', limitAmount: 4000000, spentAmount: 1200000, month: '2026-03'),
    ];
  }
}

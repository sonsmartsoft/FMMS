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

  // 1. Wallets
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

    // Fallback to locally stored wallets or initial defaults
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

  // 2. Categories with Hierarchical Subcategories
  Future<List<TransactionCategoryModel>> getCategories() async {
    try {
      final res = await _supabase
          .from('transaction_categories')
          .select()
          .order('display_order', ascending: true);

      final list = (res as List).map((e) => TransactionCategoryModel.fromJson(e)).toList();
      if (list.isNotEmpty) return list;
      return _getLocalCategoriesFallback();
    } catch (e) {
      return _getLocalCategoriesFallback();
    }
  }

  // 3. Transactions (with Member attribution parsing)
  Future<List<FamilyTransactionModel>> getTransactions({int limit = 50}) async {
    try {
      final res = await _supabase
          .from('family_transactions')
          .select('*, wallet:wallets!wallet_id(name), category:transaction_categories!category_id(name)')
          .order('date', ascending: false)
          .limit(limit);

      return (res as List).map((e) => FamilyTransactionModel.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  // 4. Create Transaction (Auto-attaching Member Note & Subcategory)
  Future<bool> createTransaction(FamilyTransactionModel tx, {String? memberName, String? memberId}) async {
    try {
      final activeMember = _authService.getCurrentMember();
      final effectiveName = memberName ?? activeMember.name;
      final effectiveId = memberId ?? activeMember.id;

      String notesWithMember = tx.notes ?? '';
      if (!notesWithMember.contains('[Người chi:')) {
        notesWithMember = '[Người chi: $effectiveName] $notesWithMember'.trim();
      }

      // If subcategory is selected, append to notes for cloud visibility
      if (tx.subCategoryName != null && tx.subCategoryName!.isNotEmpty) {
        if (!notesWithMember.contains('[Chi tiết:')) {
          notesWithMember = '$notesWithMember [Chi tiết: ${tx.subCategoryName}]'.trim();
        }
      }

      final payload = tx.toJson();
      payload['notes'] = notesWithMember;
      payload['created_by'] = effectiveId;

      await _supabase.from('family_transactions').insert(payload);
      return true;
    } catch (e) {
      // Save to offline queue if network fails
      await _enqueueOffline(tx, memberName: memberName);
      return false;
    }
  }

  // 5. Inter-wallet Transfer
  Future<bool> transferMoney({
    required String fromWalletId,
    required String toWalletId,
    required double amount,
    required String date,
    String? note,
  }) async {
    try {
      final activeMember = _authService.getCurrentMember();
      final payload = {
        'wallet_id': fromWalletId,
        'to_wallet_id': toWalletId,
        'transaction_type': 'TRANSFER',
        'amount': amount,
        'date': date,
        'notes': '[Người chi: ${activeMember.name}] ${note ?? 'Chuyển tiền nội bộ giữa các ví'}',
        'created_by': activeMember.id,
      };
      await _supabase.from('family_transactions').insert(payload);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 6. Budgets
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
    } catch (e) {
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

  // Fallback / Initial Data
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

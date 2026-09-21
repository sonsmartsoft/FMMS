import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/finance_model.dart';

class FinanceService {
  final SupabaseClient _supabase = Supabase.instance.client;
  static const String _kOfflineQueueKey = 'offline_tx_queue';

  // 1. Wallets
  Future<List<WalletModel>> getWallets() async {
    try {
      final res = await _supabase
          .from('wallets')
          .select()
          .order('created_at', ascending: true);

      return (res as List).map((e) => WalletModel.fromJson(e)).toList();
    } catch (e) {
      return _getLocalWalletsFallback();
    }
  }

  // 2. Categories
  Future<List<TransactionCategoryModel>> getCategories() async {
    try {
      final res = await _supabase
          .from('transaction_categories')
          .select()
          .order('display_order', ascending: true);

      return (res as List).map((e) => TransactionCategoryModel.fromJson(e)).toList();
    } catch (e) {
      return _getLocalCategoriesFallback();
    }
  }

  // 3. Transactions
  Future<List<FamilyTransactionModel>> getTransactions() async {
    try {
      final res = await _supabase
          .from('family_transactions')
          .select('*, wallet:wallets!wallet_id(name), category:transaction_categories!category_id(name)')
          .order('date', ascending: false)
          .limit(30);

      return (res as List).map((e) => FamilyTransactionModel.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  // 4. Quick Add Transaction (with offline queue)
  Future<bool> createTransaction(FamilyTransactionModel tx) async {
    try {
      await _supabase.from('family_transactions').insert(tx.toJson());
      return true;
    } catch (e) {
      // Save to offline queue if network fails
      await _enqueueOffline(tx);
      return false;
    }
  }

  Future<void> _enqueueOffline(FamilyTransactionModel tx) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_kOfflineQueueKey) ?? [];
    list.add(jsonEncode(tx.toJson()));
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

  // Fallbacks
  List<WalletModel> _getLocalWalletsFallback() {
    return [
      WalletModel(id: 'w-cash-01', name: 'Tiền mặt gia đình', walletType: WalletType.CASH, currentBalance: 15000000),
      WalletModel(id: 'w-tcb-01', name: 'Techcombank Chi tiêu', walletType: WalletType.BANK, bankName: 'Techcombank', currentBalance: 38500000),
      WalletModel(id: 'w-vcb-01', name: 'Vietcombank Lương & Dự phòng', walletType: WalletType.BANK, bankName: 'Vietcombank', currentBalance: 85000000),
      WalletModel(id: 'w-tcb-credit', name: 'Techcombank Visa Signature', walletType: WalletType.CREDIT_CARD, bankName: 'Techcombank', currentBalance: 0, creditLimit: 100000000, statementDay: 20, paymentDueDay: 5),
      WalletModel(id: 'w-momo-01', name: 'Ví MoMo', walletType: WalletType.E_WALLET, currentBalance: 2500000),
    ];
  }

  List<TransactionCategoryModel> _getLocalCategoriesFallback() {
    return [
      TransactionCategoryModel(id: 'cat-food', name: 'Ăn uống & Đi chợ', type: TransactionType.EXPENSE, color: '#f59e0b', icon: 'utensils'),
      TransactionCategoryModel(id: 'cat-home', name: 'Nhà cửa & Tiện ích', type: TransactionType.EXPENSE, color: '#3b82f6', icon: 'home'),
      TransactionCategoryModel(id: 'cat-mobility', name: 'Phương tiện & Đi lại (Xe)', type: TransactionType.EXPENSE, color: '#06b6d4', icon: 'car'),
      TransactionCategoryModel(id: 'cat-education', name: 'Con cái & Giáo dục', type: TransactionType.EXPENSE, color: '#8b5cf6', icon: 'graduation-cap'),
      TransactionCategoryModel(id: 'cat-health', name: 'Sức khỏe & Y tế', type: TransactionType.EXPENSE, color: '#10b981', icon: 'heart-pulse'),
      TransactionCategoryModel(id: 'cat-play', name: 'Hưởng thụ & Du lịch', type: TransactionType.EXPENSE, color: '#ec4899', icon: 'plane'),
      TransactionCategoryModel(id: 'cat-inc-salary', name: 'Lương cố định', type: TransactionType.INCOME, color: '#10b981', icon: 'coins'),
    ];
  }
}

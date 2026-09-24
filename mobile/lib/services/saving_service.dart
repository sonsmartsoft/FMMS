// Service for managing Bank Savings Books / Term Deposits
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/finance_model.dart';
import '../models/saving_model.dart';
import 'finance_service.dart';

class SavingService {
  static final SavingService _instance = SavingService._internal();
  factory SavingService() => _instance;
  SavingService._internal();

  final SupabaseClient _client = Supabase.instance.client;
  final FinanceService _financeService = FinanceService();
  static const String _cacheKey = 'fmms_family_savings_cache';

  // In-memory cache
  List<SavingDepositModel> _cache = [];

  List<SavingDepositModel> get defaultMockSavings => [
    SavingDepositModel(
      id: 'sav-1',
      title: 'Sổ tiết kiệm VCB - Quỹ dự phòng gia đình',
      bankName: 'Vietcombank',
      accountNumber: 'STK-001928374',
      depositAmount: 120000000.0,
      interestRatePercent: 5.5,
      termMonths: 12,
      startDate: '2026-01-15',
      maturityDate: '2027-01-15',
      interestPaymentType: 'END_OF_TERM',
      status: 'ACTIVE',
      notes: 'Gửi online kỳ hạn 1 năm hưởng lãi suất ưu đãi',
    ),
    SavingDepositModel(
      id: 'sav-2',
      title: 'Sổ tích lũy Techcombank - Mua sắm cuối năm',
      bankName: 'Techcombank',
      accountNumber: 'STK-882736152',
      depositAmount: 50000000.0,
      interestRatePercent: 4.8,
      termMonths: 6,
      startDate: '2026-05-10',
      maturityDate: '2026-11-10',
      interestPaymentType: 'END_OF_TERM',
      status: 'ACTIVE',
      notes: 'Tích lũy định kỳ 6 tháng',
    ),
  ];

  Future<List<SavingDepositModel>> getSavings({bool forceRefresh = false}) async {
    if (!forceRefresh && _cache.isNotEmpty) {
      return _cache;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null) {
        final List<dynamic> list = jsonDecode(cachedJson);
        _cache = list.map((item) => SavingDepositModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('Error reading local savings cache: $e');
    }

    // Try fetching from Supabase
    try {
      final response = await _client
          .from('family_savings')
          .select()
          .order('maturity_date', ascending: true);

      final items = (response as List).map((x) => SavingDepositModel.fromJson(x)).toList();
      if (items.isNotEmpty) {
        _cache = items;
        _saveCacheLocally();
        return _cache;
      }
    } catch (e) {
      debugPrint('Supabase fetch family_savings skipped/failed: $e');
    }

    if (_cache.isEmpty) {
      _cache = defaultMockSavings;
      _saveCacheLocally();
    }

    return _cache;
  }

  Future<bool> createSaving(SavingDepositModel saving, {bool deductFromWallet = false}) async {
    _cache.insert(0, saving);
    await _saveCacheLocally();

    // Deduct from wallet if requested
    if (deductFromWallet && saving.linkedWalletId != null) {
      final tx = FamilyTransactionModel(
        id: '',
        walletId: saving.linkedWalletId!,
        transactionType: TransactionType.EXPENSE,
        amount: saving.depositAmount,
        date: saving.startDate,
        payeeVendor: saving.bankName,
        description: 'Mở sổ tiết kiệm: ${saving.title}',
        isEssential: true,
      );
      await _financeService.createTransaction(tx);
    }

    try {
      await _client.from('family_savings').insert(saving.toJson());
    } catch (e) {
      debugPrint('Supabase insert saving error: $e');
    }
    return true;
  }

  // Settle saving (Tất toán sổ tiết kiệm)
  Future<bool> settleSaving({
    required String savingId,
    required String targetWalletId,
    required String targetWalletName,
  }) async {
    final idx = _cache.indexWhere((s) => s.id == savingId);
    if (idx == -1) return false;

    final saving = _cache[idx];
    final totalPayout = saving.totalAtMaturity;

    final updated = SavingDepositModel(
      id: saving.id,
      title: saving.title,
      bankName: saving.bankName,
      accountNumber: saving.accountNumber,
      depositAmount: saving.depositAmount,
      interestRatePercent: saving.interestRatePercent,
      termMonths: saving.termMonths,
      startDate: saving.startDate,
      maturityDate: saving.maturityDate,
      interestPaymentType: saving.interestPaymentType,
      linkedWalletId: targetWalletId,
      status: 'SETTLED',
      notes: '${saving.notes ?? ""} (Đã tất toán về $targetWalletName ngày ${DateTime.now().toIso8601String().split("T").first})',
    );

    _cache[idx] = updated;
    await _saveCacheLocally();

    // Create Income transaction into target wallet
    final tx = FamilyTransactionModel(
      id: '',
      walletId: targetWalletId,
      transactionType: TransactionType.INCOME,
      amount: totalPayout,
      date: DateTime.now().toIso8601String().split('T').first,
      payeeVendor: saving.bankName,
      description: 'Tất toán sổ tiết kiệm: ${saving.title} (Gốc + Lãi)',
      isEssential: false,
    );
    await _financeService.createTransaction(tx);

    try {
      await _client.from('family_savings').update({'status': 'SETTLED'}).eq('id', savingId);
    } catch (e) {
      debugPrint('Supabase settle saving error: $e');
    }

    return true;
  }

  Future<void> _saveCacheLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(_cache.map((s) => s.toJson()).toList());
      await prefs.setString(_cacheKey, jsonStr);
    } catch (e) {
      debugPrint('Error saving savings locally: $e');
    }
  }
}

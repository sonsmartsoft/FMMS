import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/finance_model.dart';
import '../models/recurring_bill_model.dart';
import 'finance_service.dart';

class RecurringBillService {
  static final RecurringBillService _instance = RecurringBillService._internal();
  factory RecurringBillService() => _instance;
  RecurringBillService._internal();

  final SupabaseClient _client = Supabase.instance.client;
  final FinanceService _financeService = FinanceService();
  static const String _cacheKey = 'fmms_recurring_bills_cache';

  List<RecurringBillModel> _cache = [];

  List<RecurringBillModel> get defaultMockBills => [
    RecurringBillModel(
      id: 'bill-1',
      name: 'Tiền điện EVN sinh hoạt',
      categoryName: 'Điện nước & Sinh hoạt',
      amount: 1450000.0,
      frequency: 'MONTHLY',
      dueDay: 15,
      nextDueDate: '2026-10-15',
      status: 'PENDING',
      icon: 'bolt',
      notes: 'Mã khách hàng: PD08001234567, thanh toán tự động qua VCB',
    ),
    RecurringBillModel(
      id: 'bill-2',
      name: 'Internet VNPT Cáp quang 300Mbps',
      categoryName: 'Internet & Viễn thông',
      amount: 250000.0,
      frequency: 'MONTHLY',
      dueDay: 28,
      nextDueDate: '2026-09-28',
      status: 'PENDING',
      icon: 'wifi',
      notes: 'Gói Home Net 2 kèm truyền hình MyTV',
    ),
    RecurringBillModel(
      id: 'bill-3',
      name: 'Trả góp xe Mazda 2 AT (Gốc + Lãi)',
      categoryName: 'Xe cộ & Vay nợ',
      amount: 6200000.0,
      frequency: 'MONTHLY',
      dueDay: 10,
      nextDueDate: '2026-10-10',
      status: 'PAID',
      lastPaidDate: '2026-09-10',
      icon: 'directions_car',
      notes: 'Khoản vay ngân hàng Shinhan Bank kỳ 24/48',
    ),
    RecurringBillModel(
      id: 'bill-4',
      name: 'Phí dịch vụ chung cư & Gửi xe',
      categoryName: 'Nhà cửa & Dịch vụ',
      amount: 1850000.0,
      frequency: 'MONTHLY',
      dueDay: 5,
      nextDueDate: '2026-10-05',
      status: 'PENDING',
      icon: 'apartment',
      notes: 'Gồm 1 ô tô Mazda và 2 xe máy',
    ),
    RecurringBillModel(
      id: 'bill-5',
      name: 'Học phí mầm non bé Bo',
      categoryName: 'Giáo dục & Con cái',
      amount: 4500000.0,
      frequency: 'MONTHLY',
      dueDay: 5,
      nextDueDate: '2026-10-05',
      status: 'PENDING',
      icon: 'school',
      notes: 'Tiền học và tiền ăn bán trú',
    ),
  ];

  Future<List<RecurringBillModel>> getBills({bool forceRefresh = false}) async {
    if (!forceRefresh && _cache.isNotEmpty) {
      return _cache;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null) {
        final List<dynamic> list = jsonDecode(cachedJson);
        _cache = list.map((item) => RecurringBillModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('Error reading local recurring bills cache: $e');
    }

    try {
      final response = await _client
          .from('family_recurring_bills')
          .select()
          .order('due_day', ascending: true);

      final items = (response as List).map((x) => RecurringBillModel.fromJson(x)).toList();
      if (items.isNotEmpty) {
        _cache = items;
        _saveCacheLocally();
        return _cache;
      }
    } catch (e) {
      debugPrint('Supabase fetch family_recurring_bills skipped: $e');
    }

    if (_cache.isEmpty) {
      _cache = defaultMockBills;
      _saveCacheLocally();
    }

    return _cache;
  }

  Future<bool> createBill(RecurringBillModel bill) async {
    _cache.add(bill);
    await _saveCacheLocally();

    try {
      await _client.from('family_recurring_bills').insert(bill.toJson());
    } catch (e) {
      debugPrint('Supabase insert recurring bill error: $e');
    }
    return true;
  }

  // Pay bill (Thanh toán hóa đơn định kỳ)
  Future<bool> payBill({
    required String billId,
    required String walletId,
    required String walletName,
  }) async {
    final idx = _cache.indexWhere((b) => b.id == billId);
    if (idx == -1) return false;

    final bill = _cache[idx];
    final todayStr = DateTime.now().toIso8601String().split('T').first;

    // Next due date = 1 month later
    final now = DateTime.now();
    final nextMonthDate = DateTime(now.year, now.month + 1, bill.dueDay.clamp(1, 28));
    final nextDueDateStr = nextMonthDate.toIso8601String().split('T').first;

    final updated = RecurringBillModel(
      id: bill.id,
      name: bill.name,
      categoryName: bill.categoryName,
      amount: bill.amount,
      frequency: bill.frequency,
      dueDay: bill.dueDay,
      nextDueDate: nextDueDateStr,
      lastPaidDate: todayStr,
      linkedWalletId: walletId,
      linkedWalletName: walletName,
      status: 'PAID',
      icon: bill.icon,
      notes: bill.notes,
    );

    _cache[idx] = updated;
    await _saveCacheLocally();

    // Deduct money from wallet and record expense transaction
    final tx = FamilyTransactionModel(
      id: '',
      walletId: walletId,
      transactionType: TransactionType.EXPENSE,
      amount: bill.amount,
      date: todayStr,
      payeeVendor: bill.name,
      description: 'Thanh toán hóa đơn: ${bill.name}',
      isEssential: true,
    );
    await _financeService.createTransaction(tx);

    try {
      await _client.from('family_recurring_bills').update({
        'status': 'PAID',
        'last_paid_date': todayStr,
        'next_due_date': nextDueDateStr,
        'linked_wallet_id': walletId,
        'linked_wallet_name': walletName,
      }).eq('id', billId);
    } catch (e) {
      debugPrint('Supabase update recurring bill error: $e');
    }

    return true;
  }

  Future<void> _saveCacheLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(_cache.map((b) => b.toJson()).toList());
      await prefs.setString(_cacheKey, jsonStr);
    } catch (e) {
      debugPrint('Error saving recurring bills cache locally: $e');
    }
  }
}

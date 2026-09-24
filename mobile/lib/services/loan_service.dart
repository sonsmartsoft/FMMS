import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/finance_model.dart';
import '../models/loan_model.dart';
import 'finance_service.dart';

class LoanService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final FinanceService _financeService = FinanceService();

  static const String _localLoansKey = 'fmms_local_loans_cache_v1';

  /// Default seed loans matching family portfolio (Mazda 2, Installment, etc.)
  static List<FamilyLoanModel> get _defaultLoans => [
    FamilyLoanModel(
      id: 'loan-mazda-01',
      title: 'Vay mua xe Mazda 2AT (19B-213.87)',
      loanType: LoanType.BORROW,
      category: LoanCategory.CAR_LOAN,
      lenderBorrowerName: 'Ngân hàng TPBank',
      principalAmount: 295000000,
      remainingBalance: 270918368,
      interestRatePercent: 8.0,
      termMonths: 60,
      startDate: '2026-04-07',
      paymentDay: 28,
      monthlyPayment: 7378216,
      linkedWalletId: 'w-tcb-01',
      linkedAssetId: '20260308-0001-4222-8888-19b213872026',
      status: 'ACTIVE',
      notes: 'Hợp đồng vay mua xe Mazda 2AT thời hạn 60 tháng, trả gốc + lãi ngày 28 hàng tháng.',
    ),
    FamilyLoanModel(
      id: 'loan-installment-iphone',
      title: 'Trả góp iPhone 15 Pro Max 256GB',
      loanType: LoanType.BORROW,
      category: LoanCategory.CREDIT_INSTALLMENT,
      lenderBorrowerName: 'Thẻ tín dụng Techcombank (0%)',
      principalAmount: 24000000,
      remainingBalance: 12000000,
      interestRatePercent: 0.0,
      termMonths: 12,
      startDate: '2026-03-15',
      paymentDay: 15,
      monthlyPayment: 2000000,
      linkedWalletId: 'w-tcb-01',
      status: 'ACTIVE',
      notes: 'Chương trình trả góp 0% qua thẻ tín dụng Techcombank, đã trả 6/12 kỳ.',
    ),
    FamilyLoanModel(
      id: 'loan-lend-friend',
      title: 'Cho anh Tuấn mượn vốn kinh doanh',
      loanType: LoanType.LEND,
      category: LoanCategory.PERSONAL,
      lenderBorrowerName: 'Nguyễn Anh Tuấn (Bạn)',
      principalAmount: 15000000,
      remainingBalance: 10000000,
      interestRatePercent: 0.0,
      termMonths: 6,
      startDate: '2026-07-01',
      paymentDay: 30,
      monthlyPayment: 2500000,
      linkedWalletId: 'w-vcb-01',
      status: 'ACTIVE',
      notes: 'Cho mượn tiền, cam kết hoàn trả 2.5tr vào ngày 30 hàng tháng.',
    ),
  ];

  /// Get list of all family loans and installments
  Future<List<FamilyLoanModel>> getLoans() async {
    // 1. Try Supabase family_loans table
    try {
      final res = await _supabase
          .from('family_loans')
          .select('*')
          .order('created_at', ascending: false);

      if (res.isNotEmpty) {
        final list = (res as List).map((e) => FamilyLoanModel.fromJson(e)).toList();
        await _saveLocalCache(list);
        return list;
      }
    } catch (e) {
      debugPrint('LoanService Supabase error: $e');
    }

    // 2. Try Supabase loans (vehicle loans) table
    try {
      final res = await _supabase
          .from('loans')
          .select('*, assets:asset_id(*)')
          .order('created_at', ascending: false);

      if (res.isNotEmpty) {
        final list = (res as List).map((l) {
          final carName = l['assets']?['name'] ?? 'Mazda 2AT 2026';
          final carPlate = l['assets']?['license_plate'] ?? '19B-213.87';
          return FamilyLoanModel(
            id: l['id'].toString(),
            title: 'Khoản vay mua xe $carName ($carPlate)',
            loanType: LoanType.BORROW,
            category: LoanCategory.CAR_LOAN,
            lenderBorrowerName: l['lender']?.toString() ?? 'TPBank',
            principalAmount: (l['principal'] as num?)?.toDouble() ?? 295000000,
            remainingBalance: (l['current_balance'] as num?)?.toDouble() ?? 270918368,
            interestRatePercent: (l['interest_rate_percent'] as num?)?.toDouble() ?? 8.0,
            termMonths: (l['term_months'] as num?)?.toInt() ?? 60,
            startDate: l['start_date']?.toString() ?? '2026-04-07',
            paymentDay: (l['payment_day'] as num?)?.toInt() ?? 28,
            monthlyPayment: (l['monthly_payment'] as num?)?.toDouble() ?? 7378216,
            linkedAssetId: l['asset_id']?.toString(),
            status: l['status']?.toString() ?? 'ACTIVE',
            notes: l['notes']?.toString(),
          );
        }).toList();

        // Merge with local installment if not present
        final cached = await _loadLocalCache();
        for (final item in cached) {
          if (!list.any((x) => x.id == item.id)) {
            list.add(item);
          }
        }
        await _saveLocalCache(list);
        return list;
      }
    } catch (_) {}

    // 3. Fallback to local cache or defaults
    final cached = await _loadLocalCache();
    if (cached.isNotEmpty) return cached;

    await _saveLocalCache(_defaultLoans);
    return _defaultLoans;
  }

  /// Create new loan or installment
  Future<bool> createLoan(FamilyLoanModel loan) async {
    try {
      await _supabase.from('family_loans').insert(loan.toJson());
    } catch (_) {}

    final list = await getLoans();
    list.insert(0, loan);
    await _saveLocalCache(list);
    return true;
  }

  /// Update an existing loan
  Future<bool> updateLoan(FamilyLoanModel loan) async {
    try {
      await _supabase.from('family_loans').update(loan.toJson()).eq('id', loan.id);
    } catch (_) {}

    final list = await getLoans();
    final index = list.indexWhere((e) => e.id == loan.id);
    if (index >= 0) {
      list[index] = loan;
      await _saveLocalCache(list);
    }
    return true;
  }

  /// Delete loan
  Future<bool> deleteLoan(String id) async {
    try {
      await _supabase.from('family_loans').delete().eq('id', id);
    } catch (_) {}

    final list = await getLoans();
    list.removeWhere((e) => e.id == id);
    await _saveLocalCache(list);
    return true;
  }

  /// Pay an installment or debt period
  Future<bool> payInstallment({
    required String loanId,
    required double paymentAmount,
    required String walletId,
    String? note,
  }) async {
    final list = await getLoans();
    final index = list.indexWhere((e) => e.id == loanId);
    if (index < 0) return false;

    final loan = list[index];
    final newRemaining = (loan.remainingBalance - paymentAmount).clamp(0.0, loan.principalAmount);
    final newStatus = newRemaining <= 0 ? 'PAID_OFF' : 'ACTIVE';

    final updatedLoan = loan.copyWith(
      remainingBalance: newRemaining,
      status: newStatus,
    );

    // 1. Update loan record
    await updateLoan(updatedLoan);

    // 2. Automatically record transaction into family transactions
    final isLend = loan.loanType == LoanType.LEND;
    final txType = isLend ? TransactionType.INCOME : TransactionType.EXPENSE;
    final txTitle = isLend
        ? 'Thu hồi nợ: ${loan.title}'
        : (loan.category == LoanCategory.CREDIT_INSTALLMENT
            ? 'Trả góp: ${loan.title}'
            : 'Trả nợ vay: ${loan.title}');

    await _financeService.createTransaction(
      FamilyTransactionModel(
        id: 'tx-loan-${DateTime.now().millisecondsSinceEpoch}',
        description: txTitle,
        amount: paymentAmount,
        transactionType: txType,
        categoryName: 'Tài chính & Đầu tư',
        subCategoryName: loan.category == LoanCategory.CREDIT_INSTALLMENT
            ? 'Mua sắm trả góp'
            : 'Trả nợ vay ngân hàng',
        walletId: walletId,
        date: DateTime.now().toIso8601String().split('T').first,
        notes: note ?? 'Thanh toán định kỳ ${loan.lenderBorrowerName}',
        payeeVendor: loan.lenderBorrowerName,
      ),
    );

    return true;
  }

  // --- Local Cache Helpers ---
  Future<void> _saveLocalCache(List<FamilyLoanModel> loans) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = jsonEncode(loans.map((e) => e.toJson()).toList());
      await prefs.setString(_localLoansKey, str);
    } catch (_) {}
  }

  Future<List<FamilyLoanModel>> _loadLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_localLoansKey);
      if (str != null && str.isNotEmpty) {
        final decoded = jsonDecode(str) as List;
        return decoded.map((e) => FamilyLoanModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }
}

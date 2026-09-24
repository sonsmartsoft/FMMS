import 'dart:math';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import 'finance_service.dart';

enum PeriodType {
  DAY,
  WEEK,
  MONTH,
  YEAR,
}

class PeriodStats {
  final PeriodType periodType;
  final String periodTitle;
  final String periodSubtitle;
  final double totalIncome;
  final double totalExpense;
  final double netSavings;
  final double savingsRate;
  final double avgDailyExpense;
  final String busiestDayText;
  final double busiestDayAmount;
  final int totalTransactions;
  final double incomeChangePercent;
  final double expenseChangePercent;
  final double prevTotalExpense;
  final double prevTotalIncome;

  // Expense breakdowns
  final Map<String, double> categoryBreakdown;
  final Map<String, int> categoryCounts;
  final Map<String, Map<String, double>> categorySubBreakdown;
  final Map<String, Map<String, double>> categoryMemberBreakdown;
  final Map<String, List<FamilyTransactionModel>> categoryTransactions;
  final Map<String, double> memberBreakdown;
  final Map<String, List<FamilyTransactionModel>> memberTransactions;
  final Map<String, double> eventTripBreakdown;
  final Map<String, List<FamilyTransactionModel>> eventTripTransactions;

  // Income breakdowns (MISA Style)
  final Map<String, double> incomeCategoryBreakdown;
  final Map<String, int> incomeCategoryCounts;
  final Map<String, List<FamilyTransactionModel>> incomeCategoryTransactions;
  final Map<String, double> incomeMemberBreakdown;
  final Map<String, List<FamilyTransactionModel>> incomeMemberTransactions;

  // Cashflow timeline (Dual bar: Income & Expense)
  final Map<int, double> dailyExpenses;
  final List<String> chartLabels;
  final List<double> chartValues; // Expense values
  final List<double> incomeChartValues; // Income values

  // Net Worth (Tài chính hiện có) & Loan/Debt
  final double totalAssets;
  final double totalDebts;
  final double netWorth;
  final double totalLent; // Cho vay
  final double totalBorrowed; // Đi vay
  final List<FamilyTransactionModel> debtTransactions;

  final List<FamilyTransactionModel> recentTransactions;

  PeriodStats({
    required this.periodType,
    required this.periodTitle,
    required this.periodSubtitle,
    required this.totalIncome,
    required this.totalExpense,
    required this.netSavings,
    required this.savingsRate,
    required this.avgDailyExpense,
    required this.busiestDayText,
    required this.busiestDayAmount,
    required this.totalTransactions,
    this.incomeChangePercent = 0.0,
    this.expenseChangePercent = 0.0,
    this.prevTotalExpense = 0.0,
    this.prevTotalIncome = 0.0,
    required this.categoryBreakdown,
    required this.categoryCounts,
    required this.categorySubBreakdown,
    required this.categoryMemberBreakdown,
    required this.categoryTransactions,
    required this.memberBreakdown,
    required this.memberTransactions,
    required this.eventTripBreakdown,
    required this.eventTripTransactions,
    required this.incomeCategoryBreakdown,
    required this.incomeCategoryCounts,
    required this.incomeCategoryTransactions,
    required this.incomeMemberBreakdown,
    required this.incomeMemberTransactions,
    required this.dailyExpenses,
    required this.chartLabels,
    required this.chartValues,
    required this.incomeChartValues,
    required this.totalAssets,
    required this.totalDebts,
    required this.netWorth,
    required this.totalLent,
    required this.totalBorrowed,
    required this.debtTransactions,
    required this.recentTransactions,
  });
}

// Backwards-compatibility typedef
typedef MonthlyStats = PeriodStats;

class AnalyticsService {
  final FinanceService _financeService = FinanceService();

  /// Backwards-compatible monthly analytics
  Future<MonthlyStats> getMonthlyAnalytics({
    int? month,
    int? year,
    String? walletId,
  }) async {
    final now = DateTime.now();
    final targetMonth = month ?? now.month;
    final targetYear = year ?? now.year;
    final anchor = DateTime(targetYear, targetMonth, 1);
    return getPeriodAnalytics(
      periodType: PeriodType.MONTH,
      anchorDate: anchor,
      walletId: walletId,
    );
  }

  /// Full Multi-dimensional analytics: Day, Week, Month, Year
  Future<PeriodStats> getPeriodAnalytics({
    required PeriodType periodType,
    DateTime? anchorDate,
    String? walletId,
  }) async {
    final anchor = anchorDate ?? DateTime.now();
    final allTx = await _financeService.getTransactions(limit: 1000);
    final wallets = await _financeService.getWallets();

    // 1. Calculate Net Worth from Wallets
    double totalAssets = 0.0;
    double totalDebts = 0.0;
    for (final w in wallets) {
      if (w.currentBalance >= 0) {
        totalAssets += w.currentBalance;
      } else {
        totalDebts += w.currentBalance.abs();
      }
    }
    final netWorth = totalAssets - totalDebts;

    // 2. Compute range start & end based on periodType
    DateTime start;
    DateTime end;
    DateTime prevStart;
    DateTime prevEnd;
    String title;
    String subtitle;
    List<String> chartLabels = [];

    switch (periodType) {
      case PeriodType.DAY:
        start = DateTime(anchor.year, anchor.month, anchor.day);
        end = DateTime(anchor.year, anchor.month, anchor.day, 23, 59, 59);
        prevStart = start.subtract(const Duration(days: 1));
        prevEnd = DateTime(prevStart.year, prevStart.month, prevStart.day, 23, 59, 59);

        final isToday = anchor.year == DateTime.now().year &&
            anchor.month == DateTime.now().month &&
            anchor.day == DateTime.now().day;
        title = isToday ? 'Hôm nay' : DateFormat('dd/MM/yyyy').format(anchor);
        subtitle = DateFormat('EEEE, dd MMMM yyyy', 'vi_VN').format(anchor);
        chartLabels = ['Sáng', 'Trưa', 'Chiều', 'Tối'];
        break;

      case PeriodType.WEEK:
        final weekday = anchor.weekday; // 1 = Monday, 7 = Sunday
        start = DateTime(anchor.year, anchor.month, anchor.day - (weekday - 1));
        end = DateTime(start.year, start.month, start.day + 6, 23, 59, 59);
        prevStart = start.subtract(const Duration(days: 7));
        prevEnd = DateTime(prevStart.year, prevStart.month, prevStart.day + 6, 23, 59, 59);

        final fStart = DateFormat('dd/MM').format(start);
        final fEnd = DateFormat('dd/MM/yyyy').format(end);
        title = 'Tuần $fStart - $fEnd';
        subtitle = '7 ngày trong tuần';
        chartLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        break;

      case PeriodType.MONTH:
        start = DateTime(anchor.year, anchor.month, 1);
        final lastDay = DateTime(anchor.year, anchor.month + 1, 0).day;
        end = DateTime(anchor.year, anchor.month, lastDay, 23, 59, 59);

        prevStart = DateTime(anchor.year, anchor.month - 1, 1);
        final prevLastDay = DateTime(prevStart.year, prevStart.month + 1, 0).day;
        prevEnd = DateTime(prevStart.year, prevStart.month, prevLastDay, 23, 59, 59);

        title = 'Tháng ${DateFormat('MM/yyyy').format(anchor)}';
        subtitle = 'Các tuần trong tháng';
        chartLabels = ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4+'];
        break;

      case PeriodType.YEAR:
        start = DateTime(anchor.year, 1, 1);
        end = DateTime(anchor.year, 12, 31, 23, 59, 59);
        prevStart = DateTime(anchor.year - 1, 1, 1);
        prevEnd = DateTime(anchor.year - 1, 12, 31, 23, 59, 59);

        title = 'Năm ${anchor.year}';
        subtitle = '12 tháng trong năm';
        chartLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
        break;
    }

    // 3. Filter current period transactions (EXCLUDE tx with isExcludedFromReport == true)
    final filteredTx = allTx.where((tx) {
      if (tx.isExcludedFromReport) return false;
      try {
        final d = DateTime.parse(tx.date);
        final inRange = !d.isBefore(start) && !d.isAfter(end);
        if (!inRange) return false;
        if (walletId != null && walletId.isNotEmpty && walletId != 'ALL') {
          return tx.walletId == walletId;
        }
        return true;
      } catch (_) {
        return false;
      }
    }).toList();

    // 4. Filter previous period transactions for delta comparison
    double prevExpense = 0.0;
    double prevIncome = 0.0;
    for (final tx in allTx) {
      if (tx.isExcludedFromReport) continue;
      try {
        final d = DateTime.parse(tx.date);
        if (!d.isBefore(prevStart) && !d.isAfter(prevEnd)) {
          if (walletId != null && walletId.isNotEmpty && walletId != 'ALL' && tx.walletId != walletId) {
            continue;
          }
          if (tx.transactionType == TransactionType.EXPENSE) {
            prevExpense += tx.amount;
          } else if (tx.transactionType == TransactionType.INCOME) {
            prevIncome += tx.amount;
          }
        }
      } catch (_) {}
    }

    double income = 0;
    double expense = 0;
    double totalLent = 0;
    double totalBorrowed = 0;

    // Expense maps
    final Map<String, double> catMap = {};
    final Map<String, int> catCounts = {};
    final Map<String, Map<String, double>> catSubMap = {};
    final Map<String, Map<String, double>> catMemberMap = {};
    final Map<String, List<FamilyTransactionModel>> catTxMap = {};
    final Map<String, double> memberExpenseMap = {};
    final Map<String, List<FamilyTransactionModel>> memberExpenseTxMap = {};
    final Map<String, double> tripMap = {};
    final Map<String, List<FamilyTransactionModel>> tripTxMap = {};
    final Map<int, double> dailyExp = {};

    // Income maps
    final Map<String, double> incomeCatMap = {};
    final Map<String, int> incomeCatCounts = {};
    final Map<String, List<FamilyTransactionModel>> incomeCatTxMap = {};
    final Map<String, double> incomeMemberMap = {};
    final Map<String, List<FamilyTransactionModel>> incomeMemberTxMap = {};

    // Loans/Debt
    final List<FamilyTransactionModel> debtTxList = [];

    // Dual-bar chart values
    List<double> expenseChartValues = List.filled(chartLabels.length, 0.0);
    List<double> incomeChartValues = List.filled(chartLabels.length, 0.0);

    for (final tx in filteredTx) {
      final dt = DateTime.tryParse(tx.date) ?? anchor;

      // Handle Loans / Debt
      if (tx.transactionType == TransactionType.DEBT_LOAN) {
        debtTxList.add(tx);
        final notes = (tx.notes ?? '').toLowerCase();
        final desc = (tx.description ?? '').toLowerCase();
        if (notes.contains('cho vay') || desc.contains('cho vay') || tx.categoryName == 'Cho vay') {
          totalLent += tx.amount;
        } else {
          totalBorrowed += tx.amount;
        }
      }

      // Handle Income
      if (tx.transactionType == TransactionType.INCOME) {
        income += tx.amount;

        // Income chart bucket
        int bIdx = 0;
        if (periodType == PeriodType.WEEK) {
          bIdx = (dt.weekday - 1).clamp(0, 6);
        } else if (periodType == PeriodType.MONTH) {
          bIdx = ((dt.day - 1) ~/ 7).clamp(0, 3);
        } else if (periodType == PeriodType.YEAR) {
          bIdx = (dt.month - 1).clamp(0, 11);
        } else if (periodType == PeriodType.DAY) {
          final h = dt.hour;
          bIdx = h < 11 ? 0 : (h < 14 ? 1 : (h < 18 ? 2 : 3));
        }
        incomeChartValues[bIdx] += tx.amount;

        // Income category grouping
        final cat = tx.categoryName ?? 'Thu nhập khác';
        incomeCatMap[cat] = (incomeCatMap[cat] ?? 0.0) + tx.amount;
        incomeCatCounts[cat] = (incomeCatCounts[cat] ?? 0) + 1;
        incomeCatTxMap.putIfAbsent(cat, () => []);
        incomeCatTxMap[cat]!.add(tx);

        // Income member grouping
        final mem = tx.paidByMember ?? 'Nguyễn Trung Sơn (Chủ hộ)';
        incomeMemberMap[mem] = (incomeMemberMap[mem] ?? 0.0) + tx.amount;
        incomeMemberTxMap.putIfAbsent(mem, () => []);
        incomeMemberTxMap[mem]!.add(tx);
      }

      // Handle Expense
      else if (tx.transactionType == TransactionType.EXPENSE) {
        expense += tx.amount;
        dailyExp[dt.day] = (dailyExp[dt.day] ?? 0.0) + tx.amount;

        // Expense chart bucket
        int bIdx = 0;
        if (periodType == PeriodType.WEEK) {
          bIdx = (dt.weekday - 1).clamp(0, 6);
        } else if (periodType == PeriodType.MONTH) {
          bIdx = ((dt.day - 1) ~/ 7).clamp(0, 3);
        } else if (periodType == PeriodType.YEAR) {
          bIdx = (dt.month - 1).clamp(0, 11);
        } else if (periodType == PeriodType.DAY) {
          final h = dt.hour;
          bIdx = h < 11 ? 0 : (h < 14 ? 1 : (h < 18 ? 2 : 3));
        }
        expenseChartValues[bIdx] += tx.amount;

        // Category grouping
        final catName = tx.categoryName ?? 'Khác';
        catMap[catName] = (catMap[catName] ?? 0.0) + tx.amount;
        catCounts[catName] = (catCounts[catName] ?? 0) + 1;

        // Subcategory grouping
        final subName = tx.subCategoryName ?? (tx.payeeVendor ?? 'Khoản mục chi tiết');
        catSubMap.putIfAbsent(catName, () => {});
        catSubMap[catName]![subName] = (catSubMap[catName]![subName] ?? 0.0) + tx.amount;

        // Member grouping
        final memberName = tx.forMemberName ?? tx.paidByMember ?? 'Gia đình chung';
        memberExpenseMap[memberName] = (memberExpenseMap[memberName] ?? 0.0) + tx.amount;
        memberExpenseTxMap.putIfAbsent(memberName, () => []);
        memberExpenseTxMap[memberName]!.add(tx);

        catMemberMap.putIfAbsent(catName, () => {});
        catMemberMap[catName]![memberName] = (catMemberMap[catName]![memberName] ?? 0.0) + tx.amount;

        catTxMap.putIfAbsent(catName, () => []);
        catTxMap[catName]!.add(tx);

        // Trip / Event grouping
        if (tx.eventTripName != null && tx.eventTripName!.isNotEmpty) {
          final tripName = tx.eventTripName!;
          tripMap[tripName] = (tripMap[tripName] ?? 0.0) + tx.amount;
          tripTxMap.putIfAbsent(tripName, () => []);
          tripTxMap[tripName]!.add(tx);
        }
      }
    }

    final durationDays = max(1, end.difference(start).inDays + 1);
    final avgDailyExpense = expense / durationDays;

    String busiestDayText = 'Không có';
    double maxDayExpense = 0;
    dailyExp.forEach((day, amount) {
      if (amount > maxDayExpense) {
        maxDayExpense = amount;
        busiestDayText = 'Ngày $day';
      }
    });

    final savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0.0;

    // Percent changes
    final expChange = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : 0.0;
    final incChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : 0.0;

    return PeriodStats(
      periodType: periodType,
      periodTitle: title,
      periodSubtitle: subtitle,
      totalIncome: income,
      totalExpense: expense,
      netSavings: income - expense,
      savingsRate: savingsRate,
      avgDailyExpense: avgDailyExpense,
      busiestDayText: busiestDayText,
      busiestDayAmount: maxDayExpense,
      totalTransactions: filteredTx.length,
      incomeChangePercent: incChange,
      expenseChangePercent: expChange,
      prevTotalExpense: prevExpense,
      prevTotalIncome: prevIncome,
      categoryBreakdown: catMap,
      categoryCounts: catCounts,
      categorySubBreakdown: catSubMap,
      categoryMemberBreakdown: catMemberMap,
      categoryTransactions: catTxMap,
      memberBreakdown: memberExpenseMap,
      memberTransactions: memberExpenseTxMap,
      eventTripBreakdown: tripMap,
      eventTripTransactions: tripTxMap,
      incomeCategoryBreakdown: incomeCatMap,
      incomeCategoryCounts: incomeCatCounts,
      incomeCategoryTransactions: incomeCatTxMap,
      incomeMemberBreakdown: incomeMemberMap,
      incomeMemberTransactions: incomeMemberTxMap,
      dailyExpenses: dailyExp,
      chartLabels: chartLabels,
      chartValues: expenseChartValues,
      incomeChartValues: incomeChartValues,
      totalAssets: totalAssets,
      totalDebts: totalDebts,
      netWorth: netWorth,
      totalLent: totalLent,
      totalBorrowed: totalBorrowed,
      debtTransactions: debtTxList,
      recentTransactions: filteredTx,
    );
  }
}

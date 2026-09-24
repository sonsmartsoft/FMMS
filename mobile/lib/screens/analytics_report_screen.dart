import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/analytics_service.dart';
import '../services/finance_service.dart';
import '../widgets/category_donut_chart.dart';
import '../widgets/fintech_card.dart';
import '../widgets/member_spending_bar.dart';

class AnalyticsReportScreen extends StatefulWidget {
  const AnalyticsReportScreen({super.key});

  @override
  State<AnalyticsReportScreen> createState() => _AnalyticsReportScreenState();
}

class _AnalyticsReportScreenState extends State<AnalyticsReportScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  MonthlyStats? _stats;
  List<WalletModel> _wallets = [];
  String _selectedWalletId = 'ALL';
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _loadWalletsAndReport();
  }

  Future<void> _loadWalletsAndReport() async {
    final wallets = await _financeService.getWallets();
    if (mounted) {
      setState(() {
        _wallets = wallets;
      });
    }
    await _loadReport();
  }

  Future<void> _loadReport() async {
    setState(() => _isLoading = true);
    final stats = await _analyticsService.getMonthlyAnalytics(
      month: _selectedMonth,
      year: _selectedYear,
      walletId: _selectedWalletId == 'ALL' ? null : _selectedWalletId,
    );
    if (mounted) {
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
    }
  }

  void _showCategoryDrillDown(String categoryName) {
    if (_stats == null) return;
    final stats = _stats!;
    final totalCat = stats.categoryBreakdown[categoryName] ?? 0.0;
    final catCount = stats.categoryCounts[categoryName] ?? 1;
    final percent = stats.totalExpense > 0 ? (totalCat / stats.totalExpense) * 100 : 0.0;
    final subMap = stats.categorySubBreakdown[categoryName] ?? {};
    final memberMap = stats.categoryMemberBreakdown[categoryName] ?? {};
    final txList = stats.categoryTransactions[categoryName] ?? [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;

        return DraggableScrollableSheet(
          initialChildSize: 0.75,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          builder: (_, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.category_outlined, color: Color(0xFF0284C7), size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                categoryName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                              ),
                              Text(
                                '${percent.toStringAsFixed(1)}% tổng chi tiêu tháng',
                                style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          _currencyFmt.format(totalCat),
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFFEF4444)),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Body
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        // Quick KPI Grid
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('TB mỗi lần chi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                    const SizedBox(height: 4),
                                    Text(
                                      _currencyFmt.format(totalCat / max(1, catCount)),
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Số lần giao dịch', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                    const SizedBox(height: 4),
                                    Text(
                                      '$catCount lần',
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),

                        // Subcategories Breakdown
                        if (subMap.isNotEmpty) ...[
                          const Text(
                            'CHI TIẾT DANH MỤC CON / KHOẢN MỤC',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          ...subMap.entries.map((sub) {
                            final subPercent = totalCat > 0 ? (sub.value / totalCat) : 0.0;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(sub.key, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                      Text(_currencyFmt.format(sub.value), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  const SizedBox(height: 5),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: subPercent.clamp(0.0, 1.0),
                                      backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
                                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF0284C7)),
                                      minHeight: 6,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 20),
                        ],

                        // Member Spending in this Category
                        if (memberMap.isNotEmpty) ...[
                          const Text(
                            'PHÂN BỔ THEO THÀNH VIÊN',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          ...memberMap.entries.map((mem) {
                            final memPercent = totalCat > 0 ? (mem.value / totalCat) * 100 : 0.0;
                            return Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.person_outline, size: 16, color: Color(0xFF10B981)),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(mem.key, style: const TextStyle(fontSize: 13))),
                                  Text(_currencyFmt.format(mem.value), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  const SizedBox(width: 8),
                                  Text('(${memPercent.toStringAsFixed(0)}%)', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 20),
                        ],

                        // Recent Transactions List
                        if (txList.isNotEmpty) ...[
                          const Text(
                            'LỊCH SỬ GIAO DỊCH TRONG THÁNG',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          ...txList.map((tx) {
                            return Container(
                              margin: const EdgeInsets.symmetric(vertical: 4),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          tx.subCategoryName ?? tx.description ?? tx.payeeVendor ?? 'Khoản chi',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                        ),
                                        Text(
                                          '${tx.date} • ${tx.walletName ?? 'Ví'}',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    '-${_currencyFmt.format(tx.amount)}',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final stats = _stats!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Báo Cáo Tài Chính', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadReport,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Period selector
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    setState(() {
                      if (_selectedMonth == 1) {
                        _selectedMonth = 12;
                        _selectedYear--;
                      } else {
                        _selectedMonth--;
                      }
                    });
                    _loadReport();
                  },
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'Tháng $_selectedMonth / $_selectedYear',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7), fontSize: 14),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    setState(() {
                      if (_selectedMonth == 12) {
                        _selectedMonth = 1;
                        _selectedYear++;
                      } else {
                        _selectedMonth++;
                      }
                    });
                    _loadReport();
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Spendee / MISA Wallet Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ChoiceChip(
                    label: const Text('Tất cả ví & tài khoản'),
                    selected: _selectedWalletId == 'ALL',
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedWalletId = 'ALL');
                        _loadReport();
                      }
                    },
                    selectedColor: const Color(0xFF0284C7),
                    labelStyle: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _selectedWalletId == 'ALL' ? Colors.white : (isDark ? Colors.grey[300] : Colors.grey[700]),
                    ),
                  ),
                  ..._wallets.map((w) {
                    final isSel = _selectedWalletId == w.id;
                    return Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: ChoiceChip(
                        avatar: Icon(
                          w.walletType == WalletType.CREDIT_CARD ? Icons.credit_card : Icons.account_balance_wallet,
                          size: 14,
                          color: isSel ? Colors.white : Colors.grey,
                        ),
                        label: Text(w.name),
                        selected: isSel,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _selectedWalletId = w.id);
                            _loadReport();
                          }
                        },
                        selectedColor: const Color(0xFF0284C7),
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isSel ? Colors.white : (isDark ? Colors.grey[300] : Colors.grey[700]),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Top KPI Cards: Thu, Chi, Tiết Kiệm
            Row(
              children: [
                Expanded(
                  child: FintechCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Tổng thu nhập', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(
                          _currencyFmt.format(stats.totalIncome),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FintechCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Tổng chi tiêu', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(
                          _currencyFmt.format(stats.totalExpense),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: FintechCard(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Dư tích luỹ', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(
                          _currencyFmt.format(stats.netSavings),
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Spendee Spending Velocity Strip (4 Badges)
            FintechCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'NHỊP ĐỘ CHI TIÊU & HIỆU SUẤT (SPENDEE)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                      ),
                      Icon(Icons.speed, size: 16, color: Color(0xFF0284C7)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      // Chi tieu TB / ngay
                      Expanded(
                        child: _buildVelocityBadge(
                          icon: Icons.calendar_today,
                          label: 'Chi TB / ngày',
                          value: '${_currencyFmt.format(stats.avgDailyExpense)}/ngày',
                          iconColor: const Color(0xFFF59E0B),
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Ngay chi nhieu nhat
                      Expanded(
                        child: _buildVelocityBadge(
                          icon: Icons.trending_up,
                          label: 'Ngày chi đỉnh',
                          value: stats.busiestDayText,
                          subValue: stats.busiestDayAmount > 0 ? _currencyFmt.format(stats.busiestDayAmount) : null,
                          iconColor: const Color(0xFFEF4444),
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Ty le tiet kiem
                      Expanded(
                        child: _buildVelocityBadge(
                          icon: Icons.savings_outlined,
                          label: 'Tỷ lệ tích luỹ',
                          value: '${stats.savingsRate.toStringAsFixed(1)}%',
                          iconColor: const Color(0xFF10B981),
                          isDark: isDark,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // So giao dich
                      Expanded(
                        child: _buildVelocityBadge(
                          icon: Icons.receipt_long_outlined,
                          label: 'Số giao dịch',
                          value: '${stats.totalTransactions} GD',
                          iconColor: const Color(0xFF6366F1),
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Spendee 31-Day Cashflow Bars
            if (stats.dailyExpenses.isNotEmpty) ...[
              FintechCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'XU HƯỚNG DÒNG TIỀN HÀNG NGÀY',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                        ),
                        Icon(Icons.bar_chart, size: 16, color: Colors.grey),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 80,
                      child: _buildDailyCashflowChart(stats.dailyExpenses, isDark),
                    ),
                    const SizedBox(height: 4),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Ngày 1', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        Text('Giữa tháng (15)', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        Text('Cuối tháng (31)', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Category Breakdown Donut Chart Card (Tap to Inspect)
            FintechCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CƠ CẤU CHI THEO DANH MỤC (CHẠM ĐỂ XEM)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                      ),
                      Icon(Icons.touch_app, size: 16, color: Color(0xFF0284C7)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  CategoryDonutChart(
                    categoryBreakdown: stats.categoryBreakdown,
                    categoryCounts: stats.categoryCounts,
                    currencyFmt: _currencyFmt,
                    onCategoryTap: _showCategoryDrillDown,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Member Spending Breakdown Card
            FintechCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CHI TIÊU THEO THÀNH VIÊN GIA ĐÌNH',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                      ),
                      Icon(Icons.people_outline, size: 16, color: Colors.grey),
                    ],
                  ),
                  const SizedBox(height: 16),
                  MemberSpendingBar(
                    memberBreakdown: stats.memberBreakdown,
                    currencyFmt: _currencyFmt,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildVelocityBadge({
    required IconData icon,
    required String label,
    required String value,
    String? subValue,
    required Color iconColor,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 14, color: iconColor),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey), maxLines: 1),
                Text(
                  value,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subValue != null)
                  Text(
                    subValue,
                    style: TextStyle(fontSize: 10, color: iconColor, fontWeight: FontWeight.w600),
                    maxLines: 1,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDailyCashflowChart(Map<int, double> dailyExpenses, bool isDark) {
    final maxAmount = dailyExpenses.values.fold(0.0, max);
    if (maxAmount == 0) return const SizedBox();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(31, (index) {
        final day = index + 1;
        final amount = dailyExpenses[day] ?? 0.0;
        final ratio = (amount / maxAmount).clamp(0.06, 1.0);
        final isPeak = amount == maxAmount && amount > 0;

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 1),
            child: Tooltip(
              message: 'Ngày $day: ${_currencyFmt.format(amount)}',
              child: Container(
                height: 70 * ratio,
                decoration: BoxDecoration(
                  color: isPeak
                      ? const Color(0xFFEF4444)
                      : (amount > 0
                          ? const Color(0xFF0284C7).withValues(alpha: 0.75)
                          : (isDark ? Colors.grey[800] : Colors.grey[200])),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }
}

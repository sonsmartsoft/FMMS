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
  PeriodStats? _stats;
  List<WalletModel> _wallets = [];
  String _selectedWalletId = 'ALL';

  PeriodType _selectedPeriod = PeriodType.MONTH;
  DateTime _anchorDate = DateTime.now();

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
    final stats = await _analyticsService.getPeriodAnalytics(
      periodType: _selectedPeriod,
      anchorDate: _anchorDate,
      walletId: _selectedWalletId == 'ALL' ? null : _selectedWalletId,
    );
    if (mounted) {
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
    }
  }

  void _shiftPeriod(int delta) {
    setState(() {
      switch (_selectedPeriod) {
        case PeriodType.DAY:
          _anchorDate = _anchorDate.add(Duration(days: delta));
          break;
        case PeriodType.WEEK:
          _anchorDate = _anchorDate.add(Duration(days: delta * 7));
          break;
        case PeriodType.MONTH:
          _anchorDate = DateTime(_anchorDate.year, _anchorDate.month + delta, 1);
          break;
        case PeriodType.YEAR:
          _anchorDate = DateTime(_anchorDate.year + delta, 1, 1);
          break;
      }
    });
    _loadReport();
  }

  void _resetToToday() {
    setState(() {
      _anchorDate = DateTime.now();
    });
    _loadReport();
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
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                categoryName,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${percent.toStringAsFixed(1)}% tổng chi tiêu trong ${stats.periodTitle.toLowerCase()}',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          _currencyFmt.format(totalCat),
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
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
                        // Quick Stats
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
                                  Text('(${memPercent.toStringAsFixed(0)}%)', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            );
                          }),
                          const SizedBox(height: 20),
                        ],

                        // Specific Transactions in this Category
                        if (txList.isNotEmpty) ...[
                          const Text(
                            'LỊCH SỬ GIAO DỊCH TRONG KỲ',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                          ),
                          const SizedBox(height: 10),
                          ...txList.map((tx) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 8),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.shopping_bag_outlined, size: 16, color: Color(0xFFEF4444)),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          tx.description ?? 'Giao dịch',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${tx.date} • ${tx.subCategoryName ?? tx.categoryName ?? ""}',
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final stats = _stats;
    if (stats == null) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        body: const Center(child: Text('Không thể tải báo cáo tài chính')),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Báo Cáo Tài Chính', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.today, color: Color(0xFF0284C7)),
            tooltip: 'Kỳ hiện tại',
            onPressed: _resetToToday,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Làm mới',
            onPressed: _loadReport,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadReport,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // 1. Period Selector Tabs (Ngày, Tuần, Tháng, Năm)
            _buildPeriodSelector(isDark),
            const SizedBox(height: 12),

            // 2. Date Navigation Bar (< Title >)
            _buildDateNavigator(stats, isDark),
            const SizedBox(height: 12),

            // 3. Wallet Filter Chips
            _buildWalletFilter(isDark),
            const SizedBox(height: 14),

            // 4. Top KPI Cards: Thu, Chi, Tiết Kiệm
            _buildKpiRow(stats),
            const SizedBox(height: 14),

            // 5. Spendee Velocity Strip (4 Badges)
            _buildVelocityStrip(stats, isDark),
            const SizedBox(height: 14),

            // 6. Dynamic Cashflow Bar Chart (Day / Week / Month / Year)
            FintechCard(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _getChartTitle(),
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                      ),
                      const Icon(Icons.bar_chart, size: 16, color: Color(0xFF0284C7)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    height: 90,
                    child: _buildDynamicCashflowChart(stats, isDark),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 7. Category Donut Chart
            FintechCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'CƠ CẤU CHI TIÊU THEO DANH MỤC',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                      ),
                      Text(
                        '${stats.categoryBreakdown.length} Danh mục',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
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

            // 8. Category Breakdown List
            FintechCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CHI TIẾT DANH MỤC (NHẤN ĐỂ XEM SÂU)',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                  ),
                  const SizedBox(height: 12),
                  ...stats.categoryBreakdown.entries.map((entry) {
                    final catName = entry.key;
                    final amount = entry.value;
                    final percent = stats.totalExpense > 0 ? (amount / stats.totalExpense) * 100 : 0.0;
                    final count = stats.categoryCounts[catName] ?? 1;

                    return InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => _showCategoryDrillDown(catName),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(color: Color(0xFF0284C7), shape: BoxShape.circle),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(catName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                  Text('$count giao dịch • ${percent.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            ),
                            Text(_currencyFmt.format(amount), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                            const SizedBox(width: 4),
                            const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 9. Member Spending Bar
            FintechCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'PHÂN BỔ CHI TIÊU THEO THÀNH VIÊN',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  MemberSpendingBar(
                    memberBreakdown: stats.memberBreakdown,
                    currencyFmt: _currencyFmt,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 10. Specific Day Transactions (when viewing DAY)
            if (_selectedPeriod == PeriodType.DAY && stats.recentTransactions.isNotEmpty) ...[
              FintechCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'GIAO DỊCH TRONG NGÀY (${stats.recentTransactions.length})',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                    ),
                    const SizedBox(height: 12),
                    ...stats.recentTransactions.map((tx) {
                      final isExp = tx.transactionType == TransactionType.EXPENSE;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: (isExp ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isExp ? Icons.arrow_upward : Icons.arrow_downward,
                                size: 16,
                                color: isExp ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(tx.description ?? 'Giao dịch', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                  Text('${tx.subCategoryName ?? tx.categoryName ?? ""} • ${tx.payeeVendor ?? "Gia đình"}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                ],
                              ),
                            ),
                            Text(
                              '${isExp ? "-" : "+"}${_currencyFmt.format(tx.amount)}',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isExp ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  // --- Sub-widgets ---
  Widget _buildPeriodSelector(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          _buildPeriodTab(PeriodType.DAY, 'Ngày'),
          _buildPeriodTab(PeriodType.WEEK, 'Tuần'),
          _buildPeriodTab(PeriodType.MONTH, 'Tháng'),
          _buildPeriodTab(PeriodType.YEAR, 'Năm'),
        ],
      ),
    );
  }

  Widget _buildPeriodTab(PeriodType type, String title) {
    final isSelected = _selectedPeriod == type;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          if (_selectedPeriod != type) {
            setState(() => _selectedPeriod = type);
            _loadReport();
          }
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0284C7) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    )
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            title,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? Colors.white : Colors.grey,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDateNavigator(PeriodStats stats, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        IconButton(
          icon: const Icon(Icons.chevron_left),
          onPressed: () => _shiftPeriod(-1),
        ),
        Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                stats.periodTitle,
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7), fontSize: 14),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              stats.periodSubtitle,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        IconButton(
          icon: const Icon(Icons.chevron_right),
          onPressed: () => _shiftPeriod(1),
        ),
      ],
    );
  }

  Widget _buildWalletFilter(bool isDark) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ChoiceChip(
            label: const Text('Tất cả ví & thẻ'),
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
    );
  }

  Widget _buildKpiRow(PeriodStats stats) {
    return Row(
      children: [
        Expanded(
          child: FintechCard(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Tổng thu', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(
                  _currencyFmt.format(stats.totalIncome),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
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
                const Text('Tổng chi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(
                  _currencyFmt.format(stats.totalExpense),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
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
                const Text('Tích luỹ', style: TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(
                  _currencyFmt.format(stats.netSavings),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVelocityStrip(PeriodStats stats, bool isDark) {
    return FintechCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'NHỊP ĐỘ CHI TIÊU & HIỆU SUẤT',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
              ),
              Icon(Icons.speed, size: 16, color: Color(0xFF0284C7)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildVelocityBadge(
                  icon: Icons.calendar_today,
                  label: _selectedPeriod == PeriodType.DAY ? 'Tổng chi ngày' : 'Chi TB / ngày',
                  value: _selectedPeriod == PeriodType.DAY
                      ? _currencyFmt.format(stats.totalExpense)
                      : '${_currencyFmt.format(stats.avgDailyExpense)}/ngày',
                  iconColor: const Color(0xFFF59E0B),
                  isDark: isDark,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildVelocityBadge(
                  icon: Icons.trending_up,
                  label: 'Kỳ chi đỉnh',
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

          // Comparison with previous period
          if (stats.expenseChangePercent != 0.0) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: (stats.expenseChangePercent < 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444)).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(
                    stats.expenseChangePercent < 0 ? Icons.trending_down : Icons.trending_up,
                    size: 16,
                    color: stats.expenseChangePercent < 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      stats.expenseChangePercent < 0
                          ? 'Chi tiêu giảm ${stats.expenseChangePercent.abs().toStringAsFixed(1)}% so với kỳ trước 🎉 Tiết kiệm tốt hơn!'
                          : 'Chi tiêu tăng +${stats.expenseChangePercent.toStringAsFixed(1)}% so với kỳ trước. Cần chú ý hạn mức!',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: stats.expenseChangePercent < 0 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
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

  String _getChartTitle() {
    switch (_selectedPeriod) {
      case PeriodType.DAY:
        return 'DÒNG TIỀN THEO BUỔI TRONG NGÀY';
      case PeriodType.WEEK:
        return 'CHI TIÊU 7 NGÀY TRONG TUẦN (SPENDEE)';
      case PeriodType.MONTH:
        return 'CHI TIÊU THEO CÁC TUẦN TRONG THÁNG';
      case PeriodType.YEAR:
        return 'XU HƯỚNG 12 THÁNG TRONG NĂM';
    }
  }

  Widget _buildDynamicCashflowChart(PeriodStats stats, bool isDark) {
    final labels = stats.chartLabels;
    final values = stats.chartValues;
    if (labels.isEmpty || values.isEmpty) return const SizedBox();

    final maxVal = values.reduce(max);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: List.generate(labels.length, (idx) {
        final val = values[idx];
        final heightRatio = maxVal > 0 ? (val / maxVal).clamp(0.08, 1.0) : 0.08;
        final isPeak = val > 0 && val == maxVal;

        String amountText = '';
        if (val >= 1000000) {
          amountText = '${(val / 1000000).toStringAsFixed(1)}tr';
        } else if (val > 0) {
          amountText = '${(val / 1000).toStringAsFixed(0)}k';
        }

        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (amountText.isNotEmpty)
                  Text(
                    amountText,
                    style: TextStyle(
                      fontSize: 8,
                      fontWeight: isPeak ? FontWeight.bold : FontWeight.normal,
                      color: isPeak ? const Color(0xFFEF4444) : Colors.grey,
                    ),
                  ),
                const SizedBox(height: 3),
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  height: 52 * heightRatio,
                  decoration: BoxDecoration(
                    color: isPeak
                        ? const Color(0xFFEF4444)
                        : (val > 0
                            ? const Color(0xFF0284C7)
                            : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  labels[idx],
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: isPeak ? FontWeight.bold : FontWeight.w500,
                    color: isDark ? Colors.grey[400] : Colors.grey[700],
                  ),
                ),
              ],
            ),
          ),
        );
      }),
    );
  }
}

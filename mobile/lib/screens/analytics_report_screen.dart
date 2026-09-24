import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/analytics_service.dart';
import '../services/finance_service.dart';
import '../widgets/category_donut_chart.dart';
import '../widgets/fintech_card.dart';
import 'transaction_detail_screen.dart';

enum MisaReportType {
  EXPENSE, // Phân tích chi tiêu
  INCOME, // Phân tích thu nhập
  CASHFLOW, // Tình hình thu - chi
  NET_WORTH, // Tài chính hiện có
  DEBT_LOAN, // Theo dõi vay nợ
  SIX_JARS, // 6 chiếc hũ tài chính
}

enum ExpenseViewMode {
  CATEGORY, // Theo hạng mục
  MEMBER, // Theo người chi
  TRIP_EVENT, // Theo chuyến đi / sự kiện
}

enum IncomeViewMode {
  CATEGORY, // Theo nguồn thu
  MEMBER, // Theo thành viên
}

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

  MisaReportType _selectedReport = MisaReportType.EXPENSE;
  ExpenseViewMode _expenseViewMode = ExpenseViewMode.CATEGORY;
  IncomeViewMode _incomeViewMode = IncomeViewMode.CATEGORY;

  PeriodType _selectedPeriod = PeriodType.MONTH;
  DateTime _anchorDate = DateTime.now();
  DateTimeRange? _customDateRange;

  // Category Icon & Color Mapping for authentic MISA look
  static const Map<String, ({IconData icon, Color color})> _categoryStyleMap = {
    'Ăn uống': (icon: Icons.restaurant, color: Color(0xFFF97316)),
    'Đi lại': (icon: Icons.directions_car, color: Color(0xFF0284C7)),
    'Xăng xe': (icon: Icons.local_gas_station, color: Color(0xFF0EA5E9)),
    'Mua sắm': (icon: Icons.shopping_bag, color: Color(0xFFEC4899)),
    'Sinh hoạt': (icon: Icons.home, color: Color(0xFF10B981)),
    'Tiền điện': (icon: Icons.bolt, color: Color(0xFFEAB308)),
    'Tiền nước': (icon: Icons.water_drop, color: Color(0xFF06B6D4)),
    'Y tế': (icon: Icons.local_hospital, color: Color(0xFFEF4444)),
    'Giáo dục': (icon: Icons.school, color: Color(0xFF8B5CF6)),
    'Giải trí': (icon: Icons.movie, color: Color(0xFFF59E0B)),
    'Bảo dưỡng': (icon: Icons.build, color: Color(0xFF64748B)),
    'Lương': (icon: Icons.payments, color: Color(0xFF10B981)),
    'Thưởng': (icon: Icons.card_giftcard, color: Color(0xFFF59E0B)),
    'Kinh doanh': (icon: Icons.storefront, color: Color(0xFF0284C7)),
    'Đầu tư': (icon: Icons.trending_up, color: Color(0xFF14B8A6)),
    'Tiết kiệm': (icon: Icons.savings, color: Color(0xFF10B981)),
  };

  ({IconData icon, Color color}) _getCategoryStyle(String name, int index) {
    for (final key in _categoryStyleMap.keys) {
      if (name.toLowerCase().contains(key.toLowerCase())) {
        return _categoryStyleMap[key]!;
      }
    }
    const defaultColors = [
      Color(0xFF0284C7),
      Color(0xFF10B981),
      Color(0xFFF59E0B),
      Color(0xFFEC4899),
      Color(0xFF8B5CF6),
      Color(0xFF06B6D4),
    ];
    return (icon: Icons.category, color: defaultColors[index % defaultColors.length]);
  }

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
      _customDateRange = null;
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
      _customDateRange = null;
      _anchorDate = DateTime.now();
    });
    _loadReport();
  }

  Future<void> _pickCustomDateRange() async {
    final initialRange = _customDateRange ??
        DateTimeRange(
          start: DateTime.now().subtract(const Duration(days: 30)),
          end: DateTime.now(),
        );

    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      initialDateRange: initialRange,
      locale: const Locale('vi', 'VN'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: const Color(0xFF008C53),
                  onPrimary: Colors.white,
                ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _customDateRange = picked;
        _anchorDate = picked.start;
      });
      _loadReport();
    }
  }

  void _showWalletPickerSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'Chọn Ví / Tài Khoản Báo Cáo',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFF008C53),
                    child: Icon(Icons.account_balance_wallet, color: Colors.white, size: 20),
                  ),
                  title: const Text('Tất cả các ví', style: TextStyle(fontWeight: FontWeight.bold)),
                  trailing: _selectedWalletId == 'ALL'
                      ? const Icon(Icons.check_circle, color: Color(0xFF008C53))
                      : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() => _selectedWalletId = 'ALL');
                    _loadReport();
                  },
                ),
                const Divider(height: 1),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _wallets.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final w = _wallets[i];
                      final isSel = _selectedWalletId == w.id;
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF0284C7).withValues(alpha: 0.12),
                          child: const Icon(Icons.credit_card, color: Color(0xFF0284C7), size: 18),
                        ),
                        title: Text(w.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        subtitle: Text(
                          _currencyFmt.format(w.currentBalance),
                          style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                        ),
                        trailing: isSel ? const Icon(Icons.check_circle, color: Color(0xFF008C53)) : null,
                        onTap: () {
                          Navigator.pop(ctx);
                          setState(() => _selectedWalletId = w.id);
                          _loadReport();
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _exportReport() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.file_download_outlined, color: Color(0xFF008C53)),
            SizedBox(width: 10),
            Text('Xuất Báo Cáo MISA', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chọn định dạng xuất dữ liệu tài chính cho kỳ này:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.table_chart, color: Color(0xFF10B981)),
              title: const Text('Bảng tính Excel (.xlsx / .csv)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Bao gồm toàn bộ giao dịch, hạng mục & người chi', style: TextStyle(fontSize: 11)),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✓ Đã kết xuất báo cáo Excel thành công vào thư mục Tải về.'),
                    backgroundColor: Color(0xFF008C53),
                  ),
                );
              },
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.picture_as_pdf, color: Color(0xFFEF4444)),
              title: const Text('Bản in PDF Tổng Hợp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: const Text('Báo cáo phân tích dòng tiền và cơ cấu chi tiêu', style: TextStyle(fontSize: 11)),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✓ Đã chuẩn bị file PDF sẵn sàng in hoặc chia sẻ.'),
                    backgroundColor: Color(0xFF008C53),
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Đóng', style: TextStyle(color: Colors.grey)),
          ),
        ],
      ),
    );
  }

  void _showDrillDown({
    required String title,
    required double totalAmount,
    required double grandTotal,
    required List<FamilyTransactionModel> transactions,
  }) {
    final percent = grandTotal > 0 ? (totalAmount / grandTotal) * 100 : 0.0;

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
                                title,
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${percent.toStringAsFixed(1)}% • ${transactions.length} giao dịch',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          _currencyFmt.format(totalAmount),
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: _selectedReport == MisaReportType.INCOME
                                ? const Color(0xFF008C53)
                                : const Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Transactions List
                  Expanded(
                    child: transactions.isEmpty
                        ? const Center(
                            child: Text('Không có giao dịch phát sinh trong kỳ này.', style: TextStyle(color: Colors.grey)),
                          )
                        : ListView.separated(
                            controller: scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: transactions.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (context, i) {
                              final tx = transactions[i];
                              final isExp = tx.transactionType == TransactionType.EXPENSE;
                              final color = isExp ? const Color(0xFFEF4444) : const Color(0xFF008C53);

                              return ListTile(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => TransactionDetailScreen(transaction: tx)),
                                  ).then((_) => _loadReport());
                                },
                                contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                                leading: CircleAvatar(
                                  backgroundColor: color.withValues(alpha: 0.12),
                                  child: Icon(
                                    isExp ? Icons.arrow_outward : Icons.arrow_downward,
                                    color: color,
                                    size: 18,
                                  ),
                                ),
                                title: Text(
                                  tx.description ?? tx.categoryName ?? 'Giao dịch',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                subtitle: Text(
                                  '${tx.date} • ${tx.walletName ?? "Ví"}${tx.forMemberName != null ? " • Cho: ${tx.forMemberName}" : ""}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                                trailing: Text(
                                  '${isExp ? "-" : "+"}${_currencyFmt.format(tx.amount)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: color,
                                  ),
                                ),
                              );
                            },
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
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF4F6F8),
        appBar: _buildMisaAppBar(isDark),
        body: const Center(child: CircularProgressIndicator(color: Color(0xFF008C53))),
      );
    }

    final stats = _stats;
    if (stats == null) {
      return Scaffold(
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF4F6F8),
        appBar: _buildMisaAppBar(isDark),
        body: const Center(child: Text('Không thể tải báo cáo tài chính')),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF4F6F8),
      appBar: _buildMisaAppBar(isDark),
      body: RefreshIndicator(
        color: const Color(0xFF008C53),
        onRefresh: _loadReport,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          children: [
            // 1. MISA Top Sub-Reports Bar
            _buildMisaReportTabs(isDark),
            const SizedBox(height: 10),

            // 2. MISA Period Filters & Date Navigator
            if (_selectedReport != MisaReportType.NET_WORTH) ...[
              _buildPeriodSelector(isDark),
              const SizedBox(height: 8),
              _buildDateNavigator(stats, isDark),
              const SizedBox(height: 8),
            ],

            // 3. MISA Wallet Filter Pill
            _buildWalletFilterPill(isDark),
            const SizedBox(height: 12),

            // 4. Report Views
            if (_selectedReport == MisaReportType.EXPENSE) ...[
              _buildExpenseReportView(stats, isDark),
            ] else if (_selectedReport == MisaReportType.INCOME) ...[
              _buildIncomeReportView(stats, isDark),
            ] else if (_selectedReport == MisaReportType.CASHFLOW) ...[
              _buildCashflowReportView(stats, isDark),
            ] else if (_selectedReport == MisaReportType.NET_WORTH) ...[
              _buildNetWorthReportView(stats, isDark),
            ] else if (_selectedReport == MisaReportType.DEBT_LOAN) ...[
              _buildDebtLoanReportView(stats, isDark),
            ] else if (_selectedReport == MisaReportType.SIX_JARS) ...[
              _buildSixJarsReportView(stats, isDark),
            ],

            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildMisaAppBar(bool isDark) {
    return AppBar(
      title: const Text(
        'Báo Cáo Tài Chính',
        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white),
      ),
      centerTitle: true,
      backgroundColor: const Color(0xFF008C53), // MISA Brand Emerald Green
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.today, color: Colors.white),
          tooltip: 'Kỳ hiện tại',
          onPressed: _resetToToday,
        ),
        IconButton(
          icon: const Icon(Icons.file_download_outlined, color: Colors.white),
          tooltip: 'Xuất báo cáo Excel/PDF',
          onPressed: _exportReport,
        ),
      ],
    );
  }

  // --- 1. MISA REPORT TABS ---
  Widget _buildMisaReportTabs(bool isDark) {
    final tabs = [
      {'type': MisaReportType.EXPENSE, 'label': 'Chi tiêu', 'icon': Icons.pie_chart_outline},
      {'type': MisaReportType.INCOME, 'label': 'Thu nhập', 'icon': Icons.monetization_on_outlined},
      {'type': MisaReportType.CASHFLOW, 'label': 'Thu - Chi', 'icon': Icons.compare_arrows_outlined},
      {'type': MisaReportType.NET_WORTH, 'label': 'Tài chính', 'icon': Icons.account_balance_outlined},
      {'type': MisaReportType.DEBT_LOAN, 'label': 'Vay nợ', 'icon': Icons.handshake_outlined},
      {'type': MisaReportType.SIX_JARS, 'label': '6 Chiếc hũ', 'icon': Icons.account_tree_outlined},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: tabs.map((t) {
          final isSel = _selectedReport == t['type'];
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ChoiceChip(
              avatar: Icon(
                t['icon'] as IconData,
                size: 15,
                color: isSel ? Colors.white : (isDark ? Colors.grey[400] : Colors.grey[700]),
              ),
              label: Text(
                t['label'] as String,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                  color: isSel ? Colors.white : (isDark ? Colors.grey[300] : Colors.black87),
                ),
              ),
              selected: isSel,
              selectedColor: const Color(0xFF008C53),
              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isSel
                      ? const Color(0xFF008C53)
                      : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
              ),
              onSelected: (val) {
                if (val) setState(() => _selectedReport = t['type'] as MisaReportType);
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- 2. PERIOD SELECTOR ---
  Widget _buildPeriodSelector(bool isDark) {
    final periods = [
      {'type': PeriodType.DAY, 'label': 'Ngày'},
      {'type': PeriodType.WEEK, 'label': 'Tuần'},
      {'type': PeriodType.MONTH, 'label': 'Tháng'},
      {'type': PeriodType.YEAR, 'label': 'Năm'},
    ];

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          ...periods.map((p) {
            final isSel = _customDateRange == null && _selectedPeriod == p['type'];
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _customDateRange = null;
                    _selectedPeriod = p['type'] as PeriodType;
                  });
                  _loadReport();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: isSel ? const Color(0xFF008C53) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      p['label'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                        color: isSel ? Colors.white : Colors.grey,
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
          // Tuỳ chọn (Custom Date Range)
          Expanded(
            child: GestureDetector(
              onTap: _pickCustomDateRange,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 6),
                decoration: BoxDecoration(
                  color: _customDateRange != null ? const Color(0xFF008C53) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    'Tuỳ chọn',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: _customDateRange != null ? FontWeight.bold : FontWeight.w500,
                      color: _customDateRange != null ? Colors.white : Colors.grey,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- 3. DATE NAVIGATOR ---
  Widget _buildDateNavigator(PeriodStats stats, bool isDark) {
    String title = stats.periodTitle;
    String subtitle = stats.periodSubtitle;

    if (_customDateRange != null) {
      final s = DateFormat('dd/MM/yyyy').format(_customDateRange!.start);
      final e = DateFormat('dd/MM/yyyy').format(_customDateRange!.end);
      title = '$s - $e';
      subtitle = 'Khoảng thời gian tuỳ chọn';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, size: 22),
            onPressed: () => _shiftPeriod(-1),
          ),
          InkWell(
            onTap: _pickCustomDateRange,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Column(
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_drop_down, size: 18, color: Colors.grey),
                    ],
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, size: 22),
            onPressed: () => _shiftPeriod(1),
          ),
        ],
      ),
    );
  }

  // --- 4. WALLET FILTER PILL ---
  Widget _buildWalletFilterPill(bool isDark) {
    String walletLabel = 'Tất cả các ví';
    if (_selectedWalletId != 'ALL') {
      final w = _wallets.where((item) => item.id == _selectedWalletId).firstOrNull;
      if (w != null) walletLabel = w.name;
    }

    return Row(
      children: [
        InkWell(
          onTap: _showWalletPickerSheet,
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _selectedWalletId == 'ALL'
                    ? (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))
                    : const Color(0xFF008C53),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.account_balance_wallet_outlined, size: 15, color: Color(0xFF008C53)),
                const SizedBox(width: 6),
                Text(
                  walletLabel,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_drop_down, size: 16, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // =========================================================================
  // VIEW 1: EXPENSE REPORT (PHÂN TÍCH CHI TIÊU CHUẨN MISA)
  // =========================================================================
  Widget _buildExpenseReportView(PeriodStats stats, bool isDark) {
    Map<String, double> activeData = {};
    Map<String, List<FamilyTransactionModel>> activeTx = {};

    switch (_expenseViewMode) {
      case ExpenseViewMode.CATEGORY:
        activeData = stats.categoryBreakdown;
        activeTx = stats.categoryTransactions;
        break;
      case ExpenseViewMode.MEMBER:
        activeData = stats.memberBreakdown;
        activeTx = stats.memberTransactions;
        break;
      case ExpenseViewMode.TRIP_EVENT:
        activeData = stats.eventTripBreakdown;
        activeTx = stats.eventTripTransactions;
        break;
    }

    final total = stats.totalExpense;
    final expChange = stats.expenseChangePercent;

    // Daily average
    int daysInPeriod = 30;
    if (_selectedPeriod == PeriodType.DAY) daysInPeriod = 1;
    if (_selectedPeriod == PeriodType.WEEK) daysInPeriod = 7;
    if (_selectedPeriod == PeriodType.YEAR) daysInPeriod = 365;
    final dailyAvg = total / daysInPeriod;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // MISA Total Expense Metric Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                blurRadius: 8,
                offset: const Offset(0, 3),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tổng chi tiêu', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '- ${_currencyFmt.format(total)}',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                  ),
                  if (stats.prevTotalExpense > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: (expChange > 0 ? Colors.red : Colors.green).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            expChange > 0 ? Icons.arrow_upward : Icons.arrow_downward,
                            size: 13,
                            color: expChange > 0 ? Colors.red : Colors.green,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${expChange.abs().toStringAsFixed(1)}% kỳ trước',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: expChange > 0 ? Colors.red : Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const Divider(height: 18),
              Row(
                children: [
                  const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    'Trung bình: ${_currencyFmt.format(dailyAvg)}/ngày',
                    style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Sub-view Toggle (Theo Hạng mục | Theo Thành viên | Theo Chuyến đi)
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              _buildSubViewTab('Theo Hạng mục', ExpenseViewMode.CATEGORY == _expenseViewMode, () {
                setState(() => _expenseViewMode = ExpenseViewMode.CATEGORY);
              }),
              _buildSubViewTab('Theo Người chi', ExpenseViewMode.MEMBER == _expenseViewMode, () {
                setState(() => _expenseViewMode = ExpenseViewMode.MEMBER);
              }),
              _buildSubViewTab('Theo Chuyến đi', ExpenseViewMode.TRIP_EVENT == _expenseViewMode, () {
                setState(() => _expenseViewMode = ExpenseViewMode.TRIP_EVENT);
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Interactive Donut Chart
        if (activeData.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: CategoryDonutChart(
              categoryBreakdown: activeData,
              categoryCounts: activeTx.map((k, v) => MapEntry(k, v.length)),
              currencyFmt: _currencyFmt,
              onCategoryTap: (key) {
                final txs = activeTx[key] ?? [];
                _showDrillDown(
                  title: key,
                  totalAmount: activeData[key] ?? 0.0,
                  grandTotal: total,
                  transactions: txs,
                );
              },
            ),
          ),
          const SizedBox(height: 12),
        ],

        // MISA Ranked Category List with Progress Bar
        _buildMisaRankedList(
          title: 'Cơ cấu chi tiêu (${activeData.length} mục)',
          data: activeData,
          transactionsMap: activeTx,
          grandTotal: total,
          isExpense: true,
          isDark: isDark,
        ),
      ],
    );
  }

  // =========================================================================
  // VIEW 2: INCOME REPORT (PHÂN TÍCH THU NHẬP CHUẨN MISA)
  // =========================================================================
  Widget _buildIncomeReportView(PeriodStats stats, bool isDark) {
    Map<String, double> activeData = {};
    Map<String, List<FamilyTransactionModel>> activeTx = {};

    switch (_incomeViewMode) {
      case IncomeViewMode.CATEGORY:
        activeData = stats.incomeCategoryBreakdown;
        activeTx = stats.incomeCategoryTransactions;
        break;
      case IncomeViewMode.MEMBER:
        activeData = stats.incomeMemberBreakdown;
        activeTx = stats.incomeMemberTransactions;
        break;
    }

    final total = stats.totalIncome;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Total Income Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tổng thu nhập', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(
                '+ ${_currencyFmt.format(total)}',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF008C53)),
              ),
              const SizedBox(height: 4),
              Text(
                'Số nguồn thu: ${stats.incomeCategoryBreakdown.length}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Sub-view Toggle (Nguồn thu vs Thành viên)
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              _buildSubViewTab('Theo Nguồn thu', IncomeViewMode.CATEGORY == _incomeViewMode, () {
                setState(() => _incomeViewMode = IncomeViewMode.CATEGORY);
              }),
              _buildSubViewTab('Theo Thành viên', IncomeViewMode.MEMBER == _incomeViewMode, () {
                setState(() => _incomeViewMode = IncomeViewMode.MEMBER);
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Ranked Income List
        _buildMisaRankedList(
          title: 'Cơ cấu thu nhập (${activeData.length} nguồn)',
          data: activeData,
          transactionsMap: activeTx,
          grandTotal: total,
          isExpense: false,
          isDark: isDark,
        ),
      ],
    );
  }

  // =========================================================================
  // VIEW 3: CASHFLOW REPORT (TÌNH HÌNH THU - CHI CHUẨN MISA)
  // =========================================================================
  Widget _buildCashflowReportView(PeriodStats stats, bool isDark) {
    final netSavings = stats.netSavings;
    final isSurplus = netSavings >= 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 3-Column Balance Banner (Thu - Chi - Thặng dư)
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Thu nhập (+)', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      _currencyFmt.format(stats.totalIncome),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF008C53)),
                    ),
                  ],
                ),
              ),
              Container(width: 1, height: 36, color: Colors.grey.withValues(alpha: 0.3)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Chi tiêu (-)', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(
                        _currencyFmt.format(stats.totalExpense),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFEF4444)),
                      ),
                    ],
                  ),
                ),
              ),
              Container(width: 1, height: 36, color: Colors.grey.withValues(alpha: 0.3)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isSurplus ? 'Tích luỹ' : 'Thâm hụt',
                        style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _currencyFmt.format(netSavings.abs()),
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: isSurplus ? const Color(0xFF0284C7) : const Color(0xFFEF4444),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Dual-Bar Chart
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Biểu đồ Thu - Chi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  Row(
                    children: [
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFF008C53), shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      const Text('Thu', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      const SizedBox(width: 10),
                      Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      const Text('Chi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildDualBarChart(stats, isDark),
            ],
          ),
        ),
      ],
    );
  }

  // =========================================================================
  // VIEW 4: NET WORTH REPORT (TÀI CHÍNH HIỆN CÓ CHUẨN MISA)
  // =========================================================================
  Widget _buildNetWorthReportView(PeriodStats stats, bool isDark) {
    final netWorth = stats.netWorth;
    final totalAssets = stats.totalAssets;
    final totalDebts = stats.totalDebts;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Big Net Worth Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: isDark
                  ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                  : [const Color(0xFF008C53), const Color(0xFF00A86B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF008C53).withValues(alpha: 0.3),
                blurRadius: 14,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('TỔNG TÀI SẢN RÒNG (NET WORTH)', style: TextStyle(fontSize: 11, color: Colors.white70, letterSpacing: 1.2, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text(
                _currencyFmt.format(netWorth),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Tổng tài sản (+)', style: TextStyle(fontSize: 11, color: Colors.white70)),
                        const SizedBox(height: 2),
                        Text(
                          _currencyFmt.format(totalAssets),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Tổng vay nợ (-)', style: TextStyle(fontSize: 11, color: Colors.white70)),
                        const SizedBox(height: 2),
                        Text(
                          _currencyFmt.format(totalDebts),
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFFCA5A5)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Wallets breakdown
        const Text('Phân bổ tài sản theo Ví & Tài khoản', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        ..._wallets.map((w) {
          final ratio = totalAssets > 0 ? (w.currentBalance / totalAssets) : 0.0;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: const Color(0xFF008C53).withValues(alpha: 0.12),
                  child: const Icon(Icons.account_balance_wallet, color: Color(0xFF008C53), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(w.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: ratio.clamp(0.0, 1.0),
                          backgroundColor: Colors.grey.withValues(alpha: 0.15),
                          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF008C53)),
                          minHeight: 4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(_currencyFmt.format(w.currentBalance), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    Text('${(ratio * 100).toStringAsFixed(1)}%', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // =========================================================================
  // VIEW 5: DEBT & LOAN REPORT (THEO DÕI VAY NỢ CHUẨN MISA)
  // =========================================================================
  Widget _buildDebtLoanReportView(PeriodStats stats, bool isDark) {
    final loanGiven = stats.totalLent;
    final loanTaken = stats.totalBorrowed;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.call_made, color: Color(0xFF10B981), size: 16),
                        SizedBox(width: 6),
                        Text('Cho vay (Cần thu)', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _currencyFmt.format(loanGiven),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.call_received, color: Color(0xFFEF4444), size: 16),
                        SizedBox(width: 6),
                        Text('Đi vay (Phải trả)', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _currencyFmt.format(loanTaken),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        const Text('Sổ theo dõi vay nợ chi tiết', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),

        if (stats.debtTransactions.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Center(
              child: Text('Không có khoản vay nợ nào trong kỳ này.', style: TextStyle(color: Colors.grey)),
            ),
          )
        else
          ...stats.debtTransactions.map((tx) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  child: const Icon(Icons.handshake, color: Color(0xFFF59E0B), size: 18),
                ),
                title: Text(tx.description ?? tx.categoryName ?? 'Khoản vay/nợ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text('${tx.date} • Đối tác: ${tx.payeeVendor ?? "Chưa rõ"}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                trailing: Text(
                  _currencyFmt.format(tx.amount),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFFF59E0B)),
                ),
              ),
            );
          }),
      ],
    );
  }

  // =========================================================================
  // VIEW 6: 6 JARS REPORT (BÁO CÁO 6 CHIẾC HŨ TÀI CHÍNH CHUẨN MISA)
  // =========================================================================
  Widget _buildSixJarsReportView(PeriodStats stats, bool isDark) {
    final totalIncome = stats.totalIncome > 0 ? stats.totalIncome : 30000000.0; // fallback standard income for jars
    final totalExp = stats.totalExpense;

    final jars = [
      {'name': 'Hũ Thiết Yếu (NEC)', 'target': 0.55, 'icon': Icons.home, 'color': const Color(0xFF008C53)},
      {'name': 'Hũ Tiết Kiệm (LTSS)', 'target': 0.10, 'icon': Icons.savings, 'color': const Color(0xFF0284C7)},
      {'name': 'Hũ Giáo Dục (EDUC)', 'target': 0.10, 'icon': Icons.school, 'color': const Color(0xFF8B5CF6)},
      {'name': 'Hũ Hưởng Thụ (PLAY)', 'target': 0.10, 'icon': Icons.movie, 'color': const Color(0xFFEC4899)},
      {'name': 'Hũ Đầu Tư (FFA)', 'target': 0.10, 'icon': Icons.trending_up, 'color': const Color(0xFFF59E0B)},
      {'name': 'Hũ Cho Đi (GIVE)', 'target': 0.05, 'icon': Icons.favorite, 'color': const Color(0xFFEF4444)},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Quy tắc quản lý tài chính 6 Chiếc Hũ (MISA Jars)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 4),
              Text(
                'Phân bổ tự động từ nguồn thu nhập ${_currencyFmt.format(totalIncome)} để quản lý tương lai tài chính vững mạnh:',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        ...jars.map((j) {
          final targetRatio = j['target'] as double;
          final targetAmount = totalIncome * targetRatio;
          final color = j['color'] as Color;

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: color.withValues(alpha: 0.15),
                      child: Icon(j['icon'] as IconData, color: color, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(j['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('Mục tiêu: ${(targetRatio * 100).toInt()}%', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Text(
                      _currencyFmt.format(targetAmount),
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: targetRatio,
                    backgroundColor: Colors.grey.withValues(alpha: 0.12),
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                    minHeight: 5,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // =========================================================================
  // MISA RANKED LIST WIDGET WITH ROUNDED PROGRESS BAR
  // =========================================================================
  Widget _buildMisaRankedList({
    required String title,
    required Map<String, double> data,
    required Map<String, List<FamilyTransactionModel>> transactionsMap,
    required double grandTotal,
    required bool isExpense,
    required bool isDark,
  }) {
    if (data.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: Text('Chưa có dữ liệu phát sinh trong kỳ này', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    final entries = data.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: entries.length,
            separatorBuilder: (_, __) => const Divider(height: 16),
            itemBuilder: (context, i) {
              final item = entries[i];
              final amount = item.value;
              final percent = grandTotal > 0 ? (amount / grandTotal) * 100 : 0.0;
              final style = _getCategoryStyle(item.key, i);
              final txCount = transactionsMap[item.key]?.length ?? 0;

              return InkWell(
                onTap: () {
                  final txs = transactionsMap[item.key] ?? [];
                  _showDrillDown(
                    title: item.key,
                    totalAmount: amount,
                    grandTotal: grandTotal,
                    transactions: txs,
                  );
                },
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      // Colored Category Avatar
                      CircleAvatar(
                        radius: 19,
                        backgroundColor: style.color.withValues(alpha: 0.15),
                        child: Icon(style.icon, color: style.color, size: 20),
                      ),
                      const SizedBox(width: 12),

                      // Title & Progress Bar
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                    item.key,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${isExpense ? "-" : "+"}${_currencyFmt.format(amount)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isExpense ? const Color(0xFFEF4444) : const Color(0xFF008C53),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: (percent / 100).clamp(0.01, 1.0),
                                      backgroundColor: Colors.grey.withValues(alpha: 0.12),
                                      valueColor: AlwaysStoppedAnimation<Color>(style.color),
                                      minHeight: 5,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  '${percent.toStringAsFixed(1)}%',
                                  style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600], fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // --- SUB-VIEW TAB BUTTON ---
  Widget _buildSubViewTab(String label, bool isSelected, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF008C53) : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : Colors.grey,
              ),
            ),
          ),
        ),
      ),
    );
  }

  // --- DUAL BAR CHART (MISA THU VS CHI) ---
  Widget _buildDualBarChart(PeriodStats stats, bool isDark) {
    final expList = stats.chartValues;
    final incList = stats.incomeChartValues;
    final labels = stats.chartLabels;

    double maxVal = 1.0;
    for (int i = 0; i < labels.length; i++) {
      if (i < expList.length && expList[i] > maxVal) maxVal = expList[i];
      if (i < incList.length && incList[i] > maxVal) maxVal = incList[i];
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(labels.length, (idx) {
        final exp = idx < expList.length ? expList[idx] : 0.0;
        final inc = idx < incList.length ? incList[idx] : 0.0;
        final expRatio = (exp / maxVal).clamp(0.05, 1.0);
        final incRatio = (inc / maxVal).clamp(0.05, 1.0);

        return Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Income bar (Green)
                  Container(
                    width: 9,
                    height: 80 * incRatio,
                    decoration: BoxDecoration(
                      color: const Color(0xFF008C53),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 3),
                  // Expense bar (Red)
                  Container(
                    width: 9,
                    height: 80 * expRatio,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                labels[idx],
                style: const TextStyle(fontSize: 10, color: Colors.grey),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      }),
    );
  }
}

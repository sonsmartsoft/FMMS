import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';
import 'cashbook_search_screen.dart';
import 'transaction_detail_screen.dart';

class CashbookScreen extends StatefulWidget {
  final VoidCallback onOpenQuickAdd;

  const CashbookScreen({super.key, required this.onOpenQuickAdd});

  @override
  State<CashbookScreen> createState() => _CashbookScreenState();
}

class _CashbookScreenState extends State<CashbookScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  DateTime _currentMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _selectedDay = DateTime.now();
  bool _isCalendarMode = true; // true: Lịch, false: Danh sách
  String _selectedWalletId = 'ALL';

  List<FamilyTransactionModel> _allTransactions = [];
  List<WalletModel> _wallets = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final txs = await _financeService.getTransactions();
    final wallets = await _financeService.getWallets();
    if (mounted) {
      setState(() {
        _allTransactions = txs;
        _wallets = wallets;
        _isLoading = false;
      });
    }
  }

  void _shiftMonth(int delta) {
    setState(() {
      _currentMonth = DateTime(_currentMonth.year, _currentMonth.month + delta, 1);
      _selectedDay = DateTime(_currentMonth.year, _currentMonth.month, 1);
    });
  }

  // Filter transactions for current selected month and wallet
  List<FamilyTransactionModel> get _monthTransactions {
    return _allTransactions.where((tx) {
      try {
        final raw = tx.date;
        final clean = raw.contains('T') ? raw.split('T').first : raw;
        final d = DateTime.tryParse(clean) ?? DateTime.tryParse(raw);
        if (d == null) return false;
        final matchesMonth = d.year == _currentMonth.year && d.month == _currentMonth.month;
        final matchesWallet = _selectedWalletId == 'ALL' || tx.walletId == _selectedWalletId;
        return matchesMonth && matchesWallet;
      } catch (_) {
        return false;
      }
    }).toList();
  }

  // Transactions on the specifically selected calendar day
  List<FamilyTransactionModel> get _selectedDayTransactions {
    final dayStr = DateFormat('yyyy-MM-dd').format(_selectedDay);
    return _monthTransactions.where((tx) {
      final raw = tx.date;
      final clean = raw.contains('T') ? raw.split('T').first : raw;
      return clean == dayStr;
    }).toList();
  }

  double get _totalMonthIncome {
    return _monthTransactions
        .where((t) => t.transactionType == TransactionType.INCOME)
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  double get _totalMonthExpense {
    return _monthTransactions
        .where((t) => t.transactionType == TransactionType.EXPENSE)
        .fold(0.0, (sum, t) => sum + t.amount);
  }

  double get _netMonthBalance => _totalMonthIncome - _totalMonthExpense;

  // Map of date string -> total expense for calendar badges
  Map<String, double> get _dailyExpenseMap {
    final map = <String, double>{};
    for (final tx in _monthTransactions) {
      if (tx.transactionType == TransactionType.EXPENSE) {
        map[tx.date] = (map[tx.date] ?? 0.0) + tx.amount;
      }
    }
    return map;
  }

  // Map of date string -> total income for calendar badges
  Map<String, double> get _dailyIncomeMap {
    final map = <String, double>{};
    for (final tx in _monthTransactions) {
      if (tx.transactionType == TransactionType.INCOME) {
        map[tx.date] = (map[tx.date] ?? 0.0) + tx.amount;
      }
    }
    return map;
  }

  void _showWalletFilterDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Lọc theo Ví / Tài khoản', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            ListTile(
              leading: const Icon(Icons.all_inclusive, color: Color(0xFF0284C7)),
              title: const Text('Tất cả tài khoản'),
              trailing: _selectedWalletId == 'ALL' ? const Icon(Icons.check, color: Color(0xFF0284C7)) : null,
              onTap: () {
                setState(() => _selectedWalletId = 'ALL');
                Navigator.pop(ctx);
              },
            ),
            ..._wallets.map((w) => ListTile(
              leading: const Icon(Icons.account_balance_wallet_outlined),
              title: Text(w.name),
              subtitle: Text(_currencyFmt.format(w.currentBalance)),
              trailing: _selectedWalletId == w.id ? const Icon(Icons.check, color: Color(0xFF0284C7)) : null,
              onTap: () {
                setState(() => _selectedWalletId = w.id);
                Navigator.pop(ctx);
              },
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sổ Thu Chi (Giao Dịch)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Color(0xFF0284C7)),
            tooltip: 'Tìm kiếm giao dịch',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const CashbookSearchScreen())).then((_) => _loadData());
            },
          ),
          IconButton(
            icon: Icon(_selectedWalletId == 'ALL' ? Icons.filter_alt_outlined : Icons.filter_alt, color: const Color(0xFF0284C7)),
            tooltip: 'Lọc theo tài khoản',
            onPressed: _showWalletFilterDialog,
          ),
          IconButton(
            icon: Icon(_isCalendarMode ? Icons.view_agenda_outlined : Icons.calendar_month, color: const Color(0xFF0284C7)),
            tooltip: _isCalendarMode ? 'Xem dạng Danh sách' : 'Xem dạng Lịch',
            onPressed: () => setState(() => _isCalendarMode = !_isCalendarMode),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: Column(
                children: [
                  // Period Selector Bar (< Tháng 9/2026 >)
                  _buildMonthSelectorHeader(isDark),

                  // 3 KPI Strip: Thu vào | Chi ra | Số dư ròng
                  _buildFinancialSummaryStrip(isDark),

                  // Main Content: Calendar view or Grouped List view
                  Expanded(
                    child: _isCalendarMode
                        ? _buildCalendarView(isDark)
                        : _buildGroupedListView(isDark),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildMonthSelectorHeader(bool isDark) {
    final monthName = 'Tháng ${_currentMonth.month}/${_currentMonth.year}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: isDark ? const Color(0xFF1E293B).withValues(alpha: 0.5) : const Color(0xFFF8FAFC),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, size: 28),
            onPressed: () => _shiftMonth(-1),
          ),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 16, color: Color(0xFF0284C7)),
              const SizedBox(width: 6),
              Text(
                monthName,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right, size: 28),
            onPressed: () => _shiftMonth(1),
          ),
        ],
      ),
    );
  }

  Widget _buildFinancialSummaryStrip(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('THU VÀO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 2),
                Text(
                  _currencyFmt.format(_totalMonthIncome),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Container(width: 1, height: 32, color: Colors.grey.withValues(alpha: 0.2)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('CHI RA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 2),
                Text(
                  _currencyFmt.format(_totalMonthExpense),
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Container(width: 1, height: 32, color: Colors.grey.withValues(alpha: 0.2)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('SỐ DƯ RÒNG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                const SizedBox(height: 2),
                Text(
                  _currencyFmt.format(_netMonthBalance),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _netMonthBalance >= 0 ? const Color(0xFF0284C7) : const Color(0xFFEF4444),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- CALENDAR VIEW (Lưới lịch kiểu MISA MoneyKeeper) ---
  Widget _buildCalendarView(bool isDark) {
    final daysInMonth = DateUtils.getDaysInMonth(_currentMonth.year, _currentMonth.month);
    final firstDayOfWeek = DateTime(_currentMonth.year, _currentMonth.month, 1).weekday; // 1 = Monday, 7 = Sunday
    final offset = firstDayOfWeek - 1; // 0 to 6

    final totalGridCells = ((offset + daysInMonth + 6) ~/ 7) * 7;
    final dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    final selectedDayStr = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(_selectedDay);
    final dayTxs = _selectedDayTransactions;
    final dayExpense = dayTxs.where((t) => t.transactionType == TransactionType.EXPENSE).fold(0.0, (s, t) => s + t.amount);
    final dayIncome = dayTxs.where((t) => t.transactionType == TransactionType.INCOME).fold(0.0, (s, t) => s + t.amount);

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        // Day of week headers
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: dayNames.map((name) {
              final isWeekend = name == 'T7' || name == 'CN';
              return Expanded(
                child: Center(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isWeekend ? const Color(0xFFEF4444) : Colors.grey,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),

        // Calendar Grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: totalGridCells,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 7,
              childAspectRatio: 0.95,
              crossAxisSpacing: 4,
              mainAxisSpacing: 4,
            ),
            itemBuilder: (ctx, index) {
              final dayNumber = index - offset + 1;
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return const SizedBox.shrink();
              }

              final cellDate = DateTime(_currentMonth.year, _currentMonth.month, dayNumber);
              final dateStr = DateFormat('yyyy-MM-dd').format(cellDate);
              final isSelected = cellDate.year == _selectedDay.year &&
                  cellDate.month == _selectedDay.month &&
                  cellDate.day == _selectedDay.day;
              final isToday = cellDate.year == DateTime.now().year &&
                  cellDate.month == DateTime.now().month &&
                  cellDate.day == DateTime.now().day;

              final expAmount = _dailyExpenseMap[dateStr] ?? 0.0;
              final incAmount = _dailyIncomeMap[dateStr] ?? 0.0;
              final hasExpense = expAmount > 0;
              final hasIncome = incAmount > 0;

              return InkWell(
                onTap: () => setState(() => _selectedDay = cellDate),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFF0284C7).withValues(alpha: 0.15)
                        : (isToday ? (isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)) : Colors.transparent),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF0284C7)
                          : (isToday ? const Color(0xFF0EA5E9) : Colors.transparent),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$dayNumber',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected || isToday ? FontWeight.bold : FontWeight.w500,
                          color: isSelected
                              ? const Color(0xFF0284C7)
                              : (cellDate.weekday >= 6 ? const Color(0xFFEF4444) : (isDark ? Colors.white : Colors.black87)),
                        ),
                      ),
                      const SizedBox(height: 2),
                      // Colored dots or badge for Income/Expense
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (hasExpense)
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.symmetric(horizontal: 1),
                              decoration: const BoxDecoration(
                                color: Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                          if (hasIncome)
                            Container(
                              width: 5,
                              height: 5,
                              margin: const EdgeInsets.symmetric(horizontal: 1),
                              decoration: const BoxDecoration(
                                color: Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 12),
        const Divider(height: 1),

        // Header for selected day transactions
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                selectedDayStr,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              Row(
                children: [
                  if (dayExpense > 0)
                    Text(
                      '-${_currencyFmt.format(dayExpense)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                    ),
                  if (dayExpense > 0 && dayIncome > 0) const SizedBox(width: 8),
                  if (dayIncome > 0)
                    Text(
                      '+${_currencyFmt.format(dayIncome)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                    ),
                ],
              ),
            ],
          ),
        ),

        // List of transactions on selected day
        if (dayTxs.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 36),
            alignment: Alignment.center,
            child: Column(
              children: [
                Icon(Icons.event_note, size: 40, color: Colors.grey.withValues(alpha: 0.3)),
                const SizedBox(height: 8),
                const Text('Không có giao dịch nào trong ngày này', style: TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
          )
        else
          ...dayTxs.map((t) => _buildTransactionTile(t, isDark)),

        const SizedBox(height: 60),
      ],
    );
  }

  // --- GROUPED LIST VIEW (Danh sách gom nhóm theo ngày) ---
  Widget _buildGroupedListView(bool isDark) {
    if (_monthTransactions.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 60),
        alignment: Alignment.center,
        child: Column(
          children: [
            Icon(Icons.receipt_long, size: 48, color: Colors.grey.withValues(alpha: 0.3)),
            const SizedBox(height: 12),
            const Text('Không có giao dịch nào trong tháng này', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    // Group transactions by date
    final grouped = <String, List<FamilyTransactionModel>>{};
    for (final tx in _monthTransactions) {
      grouped.putIfAbsent(tx.date, () => []).add(tx);
    }

    final sortedDates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return ListView.builder(
      padding: const EdgeInsets.only(bottom: 80),
      itemCount: sortedDates.length,
      itemBuilder: (ctx, index) {
        final dateStr = sortedDates[index];
        final txs = grouped[dateStr]!;
        DateTime d;
        try {
          d = DateTime.parse(dateStr);
        } catch (_) {
          d = DateTime.now();
        }
        final formattedDate = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(d);
        final dayExpense = txs.where((t) => t.transactionType == TransactionType.EXPENSE).fold(0.0, (s, t) => s + t.amount);
        final dayIncome = txs.where((t) => t.transactionType == TransactionType.INCOME).fold(0.0, (s, t) => s + t.amount);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Day Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    formattedDate,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  Row(
                    children: [
                      if (dayExpense > 0)
                        Text(
                          '-${_currencyFmt.format(dayExpense)}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                        ),
                      if (dayExpense > 0 && dayIncome > 0) const SizedBox(width: 8),
                      if (dayIncome > 0)
                        Text(
                          '+${_currencyFmt.format(dayIncome)}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            ...txs.map((t) => _buildTransactionTile(t, isDark)),
          ],
        );
      },
    );
  }

  Widget _buildTransactionTile(FamilyTransactionModel tx, bool isDark) {
    final isExpense = tx.transactionType == TransactionType.EXPENSE;
    final isTransfer = tx.transactionType == TransactionType.TRANSFER;

    Color amountColor;
    String prefix;
    if (isExpense) {
      amountColor = const Color(0xFFEF4444);
      prefix = '-';
    } else if (isTransfer) {
      amountColor = const Color(0xFF0284C7);
      prefix = '⇆ ';
    } else {
      amountColor = const Color(0xFF10B981);
      prefix = '+';
    }

    // Find wallet name
    final wallet = _wallets.where((w) => w.id == tx.walletId).firstOrNull;
    final walletName = wallet?.name ?? 'Ví tài khoản';

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            width: 1,
          ),
        ),
      ),
      child: ListTile(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => TransactionDetailScreen(
                transaction: tx,
                onUpdated: _loadData,
              ),
            ),
          );
        },
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: CircleAvatar(
          backgroundColor: isExpense
              ? const Color(0xFFEF4444).withValues(alpha: 0.12)
              : (isTransfer ? const Color(0xFF0284C7).withValues(alpha: 0.12) : const Color(0xFF10B981).withValues(alpha: 0.12)),
          child: Icon(
            isExpense
                ? Icons.arrow_downward
                : (isTransfer ? Icons.swap_horiz : Icons.arrow_upward),
            color: amountColor,
            size: 18,
          ),
        ),
        title: Text(
          tx.payeeVendor ?? tx.description ?? 'Giao dịch',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        subtitle: Row(
          children: [
            Text(walletName, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            if (tx.assetName != null && tx.assetName!.isNotEmpty) ...[
              const Text(' • ', style: TextStyle(color: Colors.grey)),
              const Icon(Icons.directions_car, size: 12, color: Color(0xFF06B6D4)),
              const SizedBox(width: 3),
              Text(tx.assetName!, style: const TextStyle(fontSize: 11, color: Color(0xFF06B6D4), fontWeight: FontWeight.w600)),
            ] else if (tx.notes?.contains('[Tự động đồng bộ từ xe]') == true) ...[
              const Text(' • ', style: TextStyle(color: Colors.grey)),
              const Icon(Icons.directions_car, size: 12, color: Color(0xFF06B6D4)),
              const SizedBox(width: 3),
              const Text('Hệ thống xe', style: TextStyle(fontSize: 11, color: Color(0xFF06B6D4), fontWeight: FontWeight.w600)),
            ],
            if (tx.forMemberName != null) ...[
              const Text(' • ', style: TextStyle(color: Colors.grey)),
              Text('Cho ${tx.forMemberName}', style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7))),
            ],
            if (tx.eventTripId != null) ...[
              const Text(' • ', style: TextStyle(color: Colors.grey)),
              const Icon(Icons.beach_access, size: 11, color: Color(0xFFF59E0B)),
            ],
          ],
        ),
        trailing: Text(
          '$prefix${_currencyFmt.format(tx.amount)}',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w900,
            color: amountColor,
          ),
        ),
      ),
    );
  }
}

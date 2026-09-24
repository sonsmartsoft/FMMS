import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';
import 'transaction_detail_screen.dart';

class CashbookSearchScreen extends StatefulWidget {
  const CashbookSearchScreen({super.key});

  @override
  State<CashbookSearchScreen> createState() => _CashbookSearchScreenState();
}

class _CashbookSearchScreenState extends State<CashbookSearchScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  final TextEditingController _searchController = TextEditingController();
  List<FamilyTransactionModel> _allTransactions = [];
  List<WalletModel> _wallets = [];
  bool _isLoading = true;

  // Filters
  String _keyword = '';
  TransactionType? _selectedType; // null = all
  String _selectedWalletId = 'ALL';
  String _selectedPeriod = 'ALL'; // ALL, THIS_MONTH, LAST_MONTH, THIS_YEAR

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final txs = await _financeService.getTransactions(limit: 800);
    final wallets = await _financeService.getWallets();
    if (mounted) {
      setState(() {
        _allTransactions = txs;
        _wallets = wallets;
        _isLoading = false;
      });
    }
  }

  List<FamilyTransactionModel> get _filteredTransactions {
    final now = DateTime.now();
    return _allTransactions.where((tx) {
      // 1. Keyword search (payee, description, notes, category)
      if (_keyword.isNotEmpty) {
        final q = _keyword.toLowerCase();
        final matchPayee = tx.payeeVendor?.toLowerCase().contains(q) ?? false;
        final matchDesc = tx.description?.toLowerCase().contains(q) ?? false;
        final matchNotes = tx.notes?.toLowerCase().contains(q) ?? false;
        final matchCat = tx.categoryName?.toLowerCase().contains(q) ?? false;
        final matchSubCat = tx.subCategoryName?.toLowerCase().contains(q) ?? false;
        final matchMember = tx.forMemberName?.toLowerCase().contains(q) ?? false;
        if (!matchPayee && !matchDesc && !matchNotes && !matchCat && !matchSubCat && !matchMember) {
          return false;
        }
      }

      // 2. Type filter
      if (_selectedType != null && tx.transactionType != _selectedType) {
        return false;
      }

      // 3. Wallet filter
      if (_selectedWalletId != 'ALL' && tx.walletId != _selectedWalletId && tx.toWalletId != _selectedWalletId) {
        return false;
      }

      // 4. Period filter
      if (_selectedPeriod != 'ALL') {
        try {
          final d = DateTime.parse(tx.date);
          if (_selectedPeriod == 'THIS_MONTH') {
            if (d.year != now.year || d.month != now.month) return false;
          } else if (_selectedPeriod == 'LAST_MONTH') {
            final prevMonth = now.month == 1 ? 12 : now.month - 1;
            final prevYear = now.month == 1 ? now.year - 1 : now.year;
            if (d.year != prevYear || d.month != prevMonth) return false;
          } else if (_selectedPeriod == 'THIS_YEAR') {
            if (d.year != now.year) return false;
          }
        } catch (_) {}
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final results = _filteredTransactions;

    final totalExpense = results
        .where((t) => t.transactionType == TransactionType.EXPENSE)
        .fold(0.0, (s, t) => s + t.amount);
    final totalIncome = results
        .where((t) => t.transactionType == TransactionType.INCOME)
        .fold(0.0, (s, t) => s + t.amount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tìm Kiếm Giao Dịch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 1. Search Text Field
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Tìm theo tên, cửa hàng, ghi chú, danh mục...',
                      prefixIcon: const Icon(Icons.search, color: Color(0xFF0284C7)),
                      suffixIcon: _keyword.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _keyword = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    onChanged: (val) => setState(() => _keyword = val.trim()),
                  ),
                ),

                // 2. Filter Chips Scroll
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    children: [
                      // Filter: Transaction Type
                      _buildFilterChip(
                        label: _selectedType == null
                            ? 'Loại: Tất cả'
                            : (_selectedType == TransactionType.EXPENSE ? 'Loại: Tiền chi' : 'Loại: Tiền thu'),
                        isSelected: _selectedType != null,
                        onTap: () {
                          setState(() {
                            if (_selectedType == null) {
                              _selectedType = TransactionType.EXPENSE;
                            } else if (_selectedType == TransactionType.EXPENSE) {
                              _selectedType = TransactionType.INCOME;
                            } else {
                              _selectedType = null;
                            }
                          });
                        },
                      ),
                      const SizedBox(width: 8),

                      // Filter: Period
                      _buildFilterChip(
                        label: _selectedPeriod == 'ALL'
                            ? 'Thời gian: Toàn bộ'
                            : (_selectedPeriod == 'THIS_MONTH'
                                ? 'Tháng này'
                                : (_selectedPeriod == 'LAST_MONTH' ? 'Tháng trước' : 'Năm nay')),
                        isSelected: _selectedPeriod != 'ALL',
                        onTap: () {
                          setState(() {
                            if (_selectedPeriod == 'ALL') {
                              _selectedPeriod = 'THIS_MONTH';
                            } else if (_selectedPeriod == 'THIS_MONTH') {
                              _selectedPeriod = 'LAST_MONTH';
                            } else if (_selectedPeriod == 'LAST_MONTH') {
                              _selectedPeriod = 'THIS_YEAR';
                            } else {
                              _selectedPeriod = 'ALL';
                            }
                          });
                        },
                      ),
                      const SizedBox(width: 8),

                      // Filter: Wallet
                      _buildFilterChip(
                        label: _selectedWalletId == 'ALL'
                            ? 'Ví: Tất cả'
                            : (_wallets.where((w) => w.id == _selectedWalletId).firstOrNull?.name ?? 'Ví'),
                        isSelected: _selectedWalletId != 'ALL',
                        onTap: () {
                          _showWalletSelectSheet();
                        },
                      ),
                    ],
                  ),
                ),

                // 3. Results Summary Strip
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${results.length} giao dịch tìm thấy',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      Row(
                        children: [
                          if (totalExpense > 0)
                            Text(
                              '-${_currencyFmt.format(totalExpense)}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                            ),
                          if (totalExpense > 0 && totalIncome > 0) const SizedBox(width: 8),
                          if (totalIncome > 0)
                            Text(
                              '+${_currencyFmt.format(totalIncome)}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                // 4. Results List
                Expanded(
                  child: results.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_off_rounded, size: 54, color: Colors.grey.withValues(alpha: 0.4)),
                              const SizedBox(height: 12),
                              const Text('Không tìm thấy giao dịch nào phù hợp', style: TextStyle(color: Colors.grey, fontSize: 14)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          itemCount: results.length,
                          itemBuilder: (ctx, i) {
                            final tx = results[i];
                            return _buildTransactionCard(tx, isDark);
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7).withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0284C7) : Colors.grey.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? const Color(0xFF0284C7) : null,
              ),
            ),
            const SizedBox(width: 4),
            Icon(Icons.arrow_drop_down, size: 16, color: isSelected ? const Color(0xFF0284C7) : Colors.grey),
          ],
        ),
      ),
    );
  }

  void _showWalletSelectSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Chọn ví lọc giao dịch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            ListTile(
              title: const Text('Tất cả các ví'),
              trailing: _selectedWalletId == 'ALL' ? const Icon(Icons.check, color: Color(0xFF0284C7)) : null,
              onTap: () {
                setState(() => _selectedWalletId = 'ALL');
                Navigator.pop(ctx);
              },
            ),
            ..._wallets.map((w) => ListTile(
              title: Text(w.name),
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

  Widget _buildTransactionCard(FamilyTransactionModel tx, bool isDark) {
    final isExpense = tx.transactionType == TransactionType.EXPENSE;
    final isTransfer = tx.transactionType == TransactionType.TRANSFER;

    Color color;
    String prefix;
    if (isExpense) {
      color = const Color(0xFFEF4444);
      prefix = '-';
    } else if (isTransfer) {
      color = const Color(0xFF0284C7);
      prefix = '⇆ ';
    } else {
      color = const Color(0xFF10B981);
      prefix = '+';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
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
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9)),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Icon(
                  isExpense ? Icons.arrow_downward : (isTransfer ? Icons.swap_horiz : Icons.arrow_upward),
                  color: color,
                  size: 16,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.payeeVendor ?? tx.description ?? 'Giao dịch',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(tx.date, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        const Text(' • ', style: TextStyle(color: Colors.grey)),
                        Text(tx.walletName ?? 'Ví', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
              Text(
                '$prefix${_currencyFmt.format(tx.amount)}',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13.5, color: color),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

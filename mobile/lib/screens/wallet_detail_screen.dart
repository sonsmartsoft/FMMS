import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';
import 'transaction_detail_screen.dart';

class WalletDetailScreen extends StatefulWidget {
  final WalletModel wallet;
  final VoidCallback onUpdated;

  const WalletDetailScreen({
    super.key,
    required this.wallet,
    required this.onUpdated,
  });

  @override
  State<WalletDetailScreen> createState() => _WalletDetailScreenState();
}

class _WalletDetailScreenState extends State<WalletDetailScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  late WalletModel _wallet;
  bool _isLoading = true;
  List<FamilyTransactionModel> _walletTransactions = [];
  List<WalletModel> _allWallets = [];

  @override
  void initState() {
    super.initState();
    _wallet = widget.wallet;
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final wallets = await _financeService.getWallets();
    final current = wallets.where((w) => w.id == _wallet.id).firstOrNull ?? _wallet;
    final allTxs = await _financeService.getTransactions(limit: 500);

    // Filter transactions belonging to this wallet
    final filtered = allTxs.where((t) => t.walletId == _wallet.id || t.toWalletId == _wallet.id).toList();

    if (mounted) {
      setState(() {
        _wallet = current;
        _allWallets = wallets;
        _walletTransactions = filtered;
        _isLoading = false;
      });
    }
  }

  void _showAdjustBalanceDialog() {
    final balanceController = TextEditingController(text: _wallet.currentBalance.toStringAsFixed(0));
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.tune, color: Color(0xFF0284C7)),
            SizedBox(width: 8),
            Text('Điều chỉnh số dư ví', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Số dư hiện tại trên app: ${_currencyFmt.format(_wallet.currentBalance)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            TextField(
              controller: balanceController,
              keyboardType: const TextInputType.numberWithOptions(signed: true, decimal: false),
              decoration: const InputDecoration(
                labelText: 'Số dư thực tế mới (₫) *',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.account_balance_wallet_outlined),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Lý do điều chỉnh (tuỳ chọn)',
                hintText: 'Kiểm kê tiền mặt, khớp sao kê ngân hàng...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '💡 Hệ thống sẽ tự động tạo một giao dịch điều chỉnh số dư tương ứng để sổ sách luôn chính xác.',
              style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.3),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
            onPressed: () async {
              final newBal = double.tryParse(balanceController.text.replaceAll('.', '').replaceAll(',', '')) ?? _wallet.currentBalance;
              await _financeService.adjustWalletBalance(
                walletId: _wallet.id,
                newBalance: newBal,
                note: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
              );

              if (!mounted) return;
              Navigator.pop(ctx);
              widget.onUpdated();
              _loadData();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF10B981),
                  content: Text('✓ Đã điều chỉnh số dư ví thành công!'),
                ),
              );
            },
            child: const Text('Lưu số dư mới', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showTransferDialog() {
    final otherWallets = _allWallets.where((w) => w.id != _wallet.id).toList();
    if (otherWallets.isEmpty) return;

    String toId = otherWallets.first.id;
    final amountController = TextEditingController();
    final feeController = TextEditingController(text: '0');
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Chuyển tiền từ ví này', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.outbox, color: Color(0xFF0284C7), size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Ví nguồn: ${_wallet.name}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: toId,
                  decoration: const InputDecoration(labelText: 'Đến ví nhận *', border: OutlineInputBorder()),
                  items: otherWallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name))).toList(),
                  onChanged: (v) => setModalState(() => toId = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Số tiền chuyển (₫) *', hintText: 'VD: 2000000', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: feeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Phí chuyển khoản (nếu có)', hintText: '0', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: noteController,
                  decoration: const InputDecoration(labelText: 'Ghi chú', hintText: 'Rút tiền, chuyển khoản...', border: OutlineInputBorder()),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
              onPressed: () async {
                final amt = double.tryParse(amountController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;
                final fee = double.tryParse(feeController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;
                if (amt <= 0) return;

                await _financeService.transferMoney(
                  fromWalletId: _wallet.id,
                  toWalletId: toId,
                  amount: amt,
                  date: DateTime.now().toIso8601String().split('T').first,
                  transferFee: fee > 0 ? fee : null,
                  note: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
                );

                if (!mounted) return;
                Navigator.pop(ctx);
                widget.onUpdated();
                _loadData();
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    backgroundColor: Color(0xFF10B981),
                    content: Text('✓ Đã thực hiện chuyển tiền thành công!'),
                  ),
                );
              },
              child: const Text('Xác nhận chuyển', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isCredit = _wallet.walletType == WalletType.CREDIT_CARD;

    double totalInflow = 0;
    double totalOutflow = 0;
    for (final tx in _walletTransactions) {
      if (tx.walletId == _wallet.id) {
        if (tx.transactionType == TransactionType.EXPENSE || tx.transactionType == TransactionType.TRANSFER) {
          totalOutflow += tx.amount + (tx.transferFee ?? 0);
        } else if (tx.transactionType == TransactionType.INCOME) {
          totalInflow += tx.amount;
        }
      } else if (tx.toWalletId == _wallet.id && tx.transactionType == TransactionType.TRANSFER) {
        totalInflow += tx.amount;
      }
    }

    // Group transactions by date
    final groupedTxs = <String, List<FamilyTransactionModel>>{};
    for (final tx in _walletTransactions) {
      groupedTxs.putIfAbsent(tx.date, () => []).add(tx);
    }
    final sortedDates = groupedTxs.keys.toList()..sort((a, b) => b.compareTo(a));

    return Scaffold(
      appBar: AppBar(
        title: Text(_wallet.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            tooltip: 'Điều chỉnh số dư',
            onPressed: _showAdjustBalanceDialog,
          ),
          IconButton(
            icon: const Icon(Icons.swap_horiz),
            tooltip: 'Chuyển tiền',
            onPressed: _showTransferDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                children: [
                  // 1. Hero Card (MISA Wallet Header)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isCredit
                            ? [const Color(0xFF1E1B4B), const Color(0xFF312E81)]
                            : [const Color(0xFF0369A1), const Color(0xFF0284C7)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: (isCredit ? const Color(0xFF312E81) : const Color(0xFF0284C7)).withValues(alpha: 0.35),
                          blurRadius: 14,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              isCredit ? '💳 THẺ TÍN DỤNG' : '🏦 SỐ DƯ HIỆN TẠI',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 0.8),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                _wallet.bankName ?? 'Tiền mặt',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _currencyFmt.format(_wallet.currentBalance),
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            color: isCredit && _wallet.currentBalance < 0 ? const Color(0xFFFCA5A5) : Colors.white,
                          ),
                        ),
                        if (isCredit) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Hạn mức: ${_currencyFmt.format(_wallet.creditLimit ?? 0)}',
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              Text(
                                'Khả dụng: ${_currencyFmt.format((_wallet.creditLimit ?? 0) + _wallet.currentBalance)}',
                                style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '📅 Sao kê ngày ${_wallet.statementDay ?? 20} • Hạn trả ngày ${_wallet.paymentDueDay ?? 5}',
                            style: const TextStyle(color: Colors.amberAccent, fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 2. Quick Action Buttons (Chuyển tiền, Điều chỉnh số dư)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            side: const BorderSide(color: Color(0xFF0284C7)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.swap_horiz, size: 18, color: Color(0xFF0284C7)),
                          label: const Text('Chuyển tiền', style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                          onPressed: _showTransferDialog,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0284C7),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.tune, size: 18),
                          label: const Text('Điều chỉnh', style: TextStyle(fontWeight: FontWeight.bold)),
                          onPressed: _showAdjustBalanceDialog,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 3. Inflow vs Outflow Mini Stats
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            const Text('TỔNG TIỀN VÀO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                            const SizedBox(height: 2),
                            Text(
                              '+${_currencyFmt.format(totalInflow)}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                            ),
                          ],
                        ),
                        Container(width: 1, height: 26, color: Colors.grey.withValues(alpha: 0.3)),
                        Column(
                          children: [
                            const Text('TỔNG TIỀN RA', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                            const SizedBox(height: 2),
                            Text(
                              '-${_currencyFmt.format(totalOutflow)}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 4. Sổ giao dịch tài khoản (Account Statement)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Lịch sử giao dịch tài khoản',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${_walletTransactions.length} giao dịch',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_walletTransactions.isEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(32),
                      alignment: Alignment.center,
                      child: Column(
                        children: [
                          Icon(Icons.receipt_long_outlined, size: 48, color: Colors.grey.withValues(alpha: 0.4)),
                          const SizedBox(height: 10),
                          const Text('Chưa có giao dịch nào qua ví này', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        ],
                      ),
                    ),
                  ] else ...[
                    ...sortedDates.map((dateStr) {
                      final dayTxs = groupedTxs[dateStr] ?? [];
                      String displayDate = dateStr;
                      try {
                        final parsed = DateTime.parse(dateStr);
                        displayDate = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(parsed);
                      } catch (_) {}

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 12, bottom: 6),
                            child: Text(
                              displayDate,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                          ),
                          ...dayTxs.map((t) => _buildTransactionCard(t, isDark)),
                        ],
                      );
                    }),
                  ],

                  const SizedBox(height: 60),
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
                onUpdated: () {
                  widget.onUpdated();
                  _loadData();
                },
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
                    Text(
                      tx.subCategoryName ?? tx.categoryName ?? 'Hạng mục',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
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

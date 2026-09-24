import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';
import 'quick_expense_sheet.dart';

class TransactionDetailScreen extends StatefulWidget {
  final FamilyTransactionModel transaction;
  final VoidCallback? onUpdated;

  const TransactionDetailScreen({
    super.key,
    required this.transaction,
    this.onUpdated,
  });

  @override
  State<TransactionDetailScreen> createState() => _TransactionDetailScreenState();
}

class _TransactionDetailScreenState extends State<TransactionDetailScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  late FamilyTransactionModel _currentTx;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _currentTx = widget.transaction;
  }

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444)),
            SizedBox(width: 8),
            Text('Xác nhận xóa giao dịch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bạn có chắc chắn muốn xóa giao dịch này không?',
              style: TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _currentTx.transactionType == TransactionType.EXPENSE
                    ? '💡 Số tiền ${_currencyFmt.format(_currentTx.amount)} sẽ được tự động hoàn lại vào số dư ví ${_currentTx.walletName ?? "thanh toán"}.'
                    : (_currentTx.transactionType == TransactionType.INCOME
                        ? '💡 Số tiền ${_currencyFmt.format(_currentTx.amount)} sẽ được trừ lại khỏi ví ${_currentTx.walletName ?? "nhận"}.'
                        : '💡 Giao dịch chuyển tiền sẽ được hoàn trả ngược lại giữa 2 ví.'),
                style: const TextStyle(fontSize: 12, color: Color(0xFFB91C1C), height: 1.35),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy bỏ'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(ctx);
              setState(() => _isDeleting = true);
              await _financeService.deleteTransaction(_currentTx);
              widget.onUpdated?.call();
              if (!mounted) return;
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF10B981),
                  content: Text('✓ Đã xóa giao dịch và cân đối lại ví thành công!'),
                ),
              );
            },
            child: const Text('Xác nhận xóa', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _openEditModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => QuickExpenseSheet(
        initialTransaction: _currentTx,
        onSaved: () async {
          final txs = await _financeService.getTransactions();
          final updated = txs.where((t) => t.id == _currentTx.id).firstOrNull;
          if (updated != null && mounted) {
            setState(() => _currentTx = updated);
          }
          widget.onUpdated?.call();
        },
      ),
    );
  }

  void _duplicateTransaction() {
    final duplicated = _currentTx.copyWith(
      id: '',
      date: DateTime.now().toIso8601String().split('T').first,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => QuickExpenseSheet(
        initialTransaction: duplicated,
        onSaved: () {
          widget.onUpdated?.call();
          Navigator.pop(context);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isExpense = _currentTx.transactionType == TransactionType.EXPENSE;
    final isIncome = _currentTx.transactionType == TransactionType.INCOME;
    final isTransfer = _currentTx.transactionType == TransactionType.TRANSFER;

    Color themeColor;
    String typeLabel;
    String amountPrefix;

    if (isExpense) {
      themeColor = const Color(0xFFEF4444);
      typeLabel = 'KHOẢN CHI TIÊU';
      amountPrefix = '-';
    } else if (isIncome) {
      themeColor = const Color(0xFF10B981);
      typeLabel = 'KHOẢN THU NHẬP';
      amountPrefix = '+';
    } else {
      themeColor = const Color(0xFF0284C7);
      typeLabel = 'CHUYỂN KHOẢN NỘI BỘ';
      amountPrefix = '⇆ ';
    }

    String formattedDate = _currentTx.date;
    try {
      final parsed = DateTime.parse(_currentTx.date);
      formattedDate = DateFormat('EEEE, dd/MM/yyyy', 'vi_VN').format(parsed);
    } catch (_) {}

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi Tiết Giao Dịch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_outlined),
            tooltip: 'Nhân bản giao dịch',
            onPressed: _duplicateTransaction,
          ),
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'Chỉnh sửa',
            onPressed: _openEditModal,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
            tooltip: 'Xóa giao dịch',
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: _isDeleting
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                // 1. Amount Header Banner (MISA MoneyKeeper Style)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: themeColor.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: themeColor.withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: themeColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          typeLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: themeColor,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        '$amountPrefix${_currencyFmt.format(_currentTx.amount)}',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          color: themeColor,
                        ),
                      ),
                      if (_currentTx.transferFee != null && _currentTx.transferFee! > 0) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Phí chuyển: ${_currencyFmt.format(_currentTx.transferFee!)}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ],
                      if (_currentTx.payeeVendor != null && _currentTx.payeeVendor!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          _currentTx.payeeVendor!,
                          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Exclude from report banner if active
                if (_currentTx.isExcludedFromReport) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.visibility_off_outlined, size: 18, color: Color(0xFFD97706)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Giao dịch này được đánh dấu "Không tính vào báo cáo thu chi".',
                            style: TextStyle(fontSize: 11.5, color: Color(0xFFB45309), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // 2. Information List Cards
                _buildInfoSection(
                  isDark: isDark,
                  children: [
                    _buildDetailRow(
                      icon: Icons.category_outlined,
                      iconColor: const Color(0xFF0284C7),
                      label: 'Hạng mục thu/chi',
                      value: _currentTx.subCategoryName != null && _currentTx.subCategoryName!.isNotEmpty
                          ? '${_currentTx.categoryName ?? "Hạng mục"} › ${_currentTx.subCategoryName}'
                          : (_currentTx.categoryName ?? 'Chưa phân loại'),
                    ),
                    const Divider(height: 1),
                    _buildDetailRow(
                      icon: Icons.account_balance_wallet_outlined,
                      iconColor: const Color(0xFF10B981),
                      label: isTransfer ? 'Từ tài khoản' : 'Tài khoản thanh toán',
                      value: _currentTx.walletName ?? 'Ví tài khoản',
                    ),
                    if (isTransfer && _currentTx.toWalletId != null) ...[
                      const Divider(height: 1),
                      _buildDetailRow(
                        icon: Icons.login,
                        iconColor: const Color(0xFF0284C7),
                        label: 'Đến tài khoản',
                        value: _currentTx.toWalletId!,
                      ),
                    ],
                    const Divider(height: 1),
                    _buildDetailRow(
                      icon: Icons.calendar_today_outlined,
                      iconColor: const Color(0xFF8B5CF6),
                      label: 'Ngày ghi nhận',
                      value: formattedDate,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 3. Attribution & Tags Section
                _buildInfoSection(
                  isDark: isDark,
                  children: [
                    _buildDetailRow(
                      icon: Icons.person_outline,
                      iconColor: const Color(0xFF0284C7),
                      label: 'Chi cho ai',
                      value: _currentTx.forMemberName ?? 'Cả gia đình',
                    ),
                    if (_currentTx.eventTripId != null) ...[
                      const Divider(height: 1),
                      _buildDetailRow(
                        icon: Icons.beach_access_outlined,
                        iconColor: const Color(0xFFF59E0B),
                        label: 'Chuyến đi / Sự kiện',
                        value: 'Gắn thẻ sự kiện đặc biệt',
                      ),
                    ],
                    if (_currentTx.location != null && _currentTx.location!.isNotEmpty) ...[
                      const Divider(height: 1),
                      _buildDetailRow(
                        icon: Icons.location_on_outlined,
                        iconColor: const Color(0xFFEF4444),
                        label: 'Địa điểm',
                        value: _currentTx.location!,
                      ),
                    ],
                    if (_currentTx.description != null && _currentTx.description!.isNotEmpty) ...[
                      const Divider(height: 1),
                      _buildDetailRow(
                        icon: Icons.notes_outlined,
                        iconColor: Colors.grey,
                        label: 'Diễn giải / Ghi chú',
                        value: _currentTx.description!,
                      ),
                    ],
                  ],
                ),

                // 4. Raw Notes if present
                if (_currentTx.notes != null && _currentTx.notes!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('GHI CHÚ HỆ THỐNG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                        const SizedBox(height: 4),
                        Text(_currentTx.notes!, style: const TextStyle(fontSize: 12, height: 1.4)),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 32),

                // 5. Action Buttons (MISA Bottom Action Row)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: const BorderSide(color: Color(0xFF0284C7)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.copy, size: 16, color: Color(0xFF0284C7)),
                        label: const Text('Nhân bản', style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                        onPressed: _duplicateTransaction,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.edit, size: 16),
                        label: const Text('Chỉnh sửa', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: _openEditModal,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
              ],
            ),
    );
  }

  Widget _buildInfoSection({required bool isDark, required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

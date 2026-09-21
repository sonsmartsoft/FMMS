import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';

class QuickExpenseScreen extends StatefulWidget {
  const QuickExpenseScreen({Key? key}) : super(key: key);

  @override
  State<QuickExpenseScreen> createState() => _QuickExpenseScreenState();
}

class _QuickExpenseScreenState extends State<QuickExpenseScreen> {
  final FinanceService _service = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  int _amount = 0;
  String _payee = '';
  String? _selectedWalletId;
  String? _selectedCategoryId;
  bool _linkMazda2 = false;
  bool _isEssential = true;

  List<WalletModel> _wallets = [];
  List<TransactionCategoryModel> _categories = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final wList = await _service.getWallets();
    final cList = await _service.getCategories();

    setState(() {
      _wallets = wList;
      _categories = cList.where((c) => c.type == TransactionType.EXPENSE).toList();
      if (_wallets.isNotEmpty) _selectedWalletId = _wallets.first.id;
      if (_categories.isNotEmpty) _selectedCategoryId = _categories.first.id;
      _isLoading = false;
    });
  }

  void _addAmount(int val) {
    setState(() {
      _amount += val;
    });
  }

  void _clearAmount() {
    setState(() {
      _amount = 0;
    });
  }

  Future<void> _saveExpense() async {
    if (_amount <= 0 || _selectedWalletId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập số tiền lớn hơn 0')),
      );
      return;
    }

    final tx = FamilyTransactionModel(
      id: '',
      walletId: _selectedWalletId!,
      categoryId: _selectedCategoryId,
      assetId: _linkMazda2 ? '20260308-0001-4222-8888-19b213872026' : null,
      transactionType: TransactionType.EXPENSE,
      amount: _amount.toDouble(),
      date: DateTime.now().toIso8601String().split('T').first,
      payeeVendor: _payee.trim().isNotEmpty ? _payee.trim() : null,
      isEssential: _isEssential,
    );

    final success = await _service.createTransaction(tx);
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: Colors.emerald,
        content: Text(success ? '✓ Đã ghi sổ thành công!' : 'Đã lưu offline, sẽ tự đồng bộ!'),
      ),
    );

    setState(() {
      _amount = 0;
      _payee = '';
      _linkMazda2 = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ghi chép nhanh (< 3s)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () async {
              final count = await _service.syncOfflineQueue();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Đã đồng bộ $count giao dịch offline!')),
              );
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Amount Display Card
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceVariant.withOpacity(0.5),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: theme.colorScheme.outlineVariant),
              ),
              child: Column(
                children: [
                  const Text('SỐ TIỀN CHI RA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.grey)),
                  const SizedBox(height: 8),
                  Text(
                    _currencyFmt.format(_amount),
                    style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.redAccent),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Quick Preset Chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                ActionChip(label: const Text('+50k'), onPressed: () => _addAmount(50000)),
                ActionChip(label: const Text('+100k'), onPressed: () => _addAmount(100000)),
                ActionChip(label: const Text('+200k'), onPressed: () => _addAmount(200000)),
                ActionChip(label: const Text('+500k'), onPressed: () => _addAmount(500000)),
                ActionChip(
                  label: const Text('Xóa', style: TextStyle(color: Colors.red)),
                  backgroundColor: Colors.red.withOpacity(0.1),
                  onPressed: _clearAmount,
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Wallets Selector
            const Text('Tài khoản / Ví thanh toán', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _wallets.map((w) {
                  final isSelected = _selectedWalletId == w.id;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${w.name} (${_currencyFmt.format(w.currentBalance)})'),
                      selected: isSelected,
                      onSelected: (val) {
                        if (val) setState(() => _selectedWalletId = w.id);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Categories Selector
            const Text('Hạng mục chi tiêu', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((c) {
                final isSelected = _selectedCategoryId == c.id;
                return FilterChip(
                  label: Text(c.name),
                  selected: isSelected,
                  onSelected: (val) {
                    if (val) setState(() => _selectedCategoryId = c.id);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Link to Mazda 2 vehicle
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: _linkMazda2 ? Colors.cyan.withOpacity(0.1) : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _linkMazda2 ? Colors.cyan : Colors.grey.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.directions_car, color: Colors.cyan),
                      SizedBox(width: 8),
                      Text('Gắn với Mazda 2 Deluxe', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ],
                  ),
                  Switch(
                    value: _linkMazda2,
                    onChanged: (val) => setState(() => _linkMazda2 = val),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Payee input
            TextField(
              decoration: InputDecoration(
                hintText: 'Cửa hàng / Người nhận (tùy chọn)',
                prefixIcon: const Icon(Icons.storefront),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              onChanged: (v) => _payee = v,
            ),
            const SizedBox(height: 24),

            // Big Save Button
            ElevatedButton(
              onPressed: _saveExpense,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
              ),
              child: const Text('LƯU CHI TIÊU NGAY', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

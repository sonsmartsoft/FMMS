import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../models/recurring_bill_model.dart';
import '../services/finance_service.dart';
import '../services/recurring_bill_service.dart';
import '../widgets/fintech_card.dart';

class RecurringBillsScreen extends StatefulWidget {
  const RecurringBillsScreen({super.key});

  @override
  State<RecurringBillsScreen> createState() => _RecurringBillsScreenState();
}

class _RecurringBillsScreenState extends State<RecurringBillsScreen> {
  final RecurringBillService _billService = RecurringBillService();
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<RecurringBillModel> _bills = [];
  List<WalletModel> _wallets = [];
  String _filter = 'ALL'; // 'ALL', 'PENDING', 'PAID'

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final bills = await _billService.getBills(forceRefresh: true);
    final wallets = await _financeService.getWallets();
    if (mounted) {
      setState(() {
        _bills = bills;
        _wallets = wallets;
        _isLoading = false;
      });
    }
  }

  List<RecurringBillModel> get _filteredBills {
    if (_filter == 'PENDING') {
      return _bills.where((b) => b.status != 'PAID').toList();
    } else if (_filter == 'PAID') {
      return _bills.where((b) => b.status == 'PAID').toList();
    }
    return _bills;
  }

  void _showPayBillDialog(RecurringBillModel bill) {
    if (_wallets.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chưa có ví tài khoản nào để thanh toán')),
      );
      return;
    }

    String selectedWalletId = bill.linkedWalletId ?? _wallets.first.id;
    if (!_wallets.any((w) => w.id == selectedWalletId)) {
      selectedWalletId = _wallets.first.id;
    }

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final wallet = _wallets.firstWhere((w) => w.id == selectedWalletId);
          final hasEnough = wallet.currentBalance >= bill.amount;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                const Icon(Icons.payment, color: Color(0xFF0284C7)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Thanh toán: ${bill.name}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Số tiền cần thanh toán: ${_currencyFmt.format(bill.amount)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFEF4444)),
                ),
                const SizedBox(height: 16),
                const Text('Chọn ví thanh toán:', style: TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: selectedWalletId,
                  decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                  items: _wallets.map((w) => DropdownMenuItem(
                    value: w.id,
                    child: Text('${w.name} (${_currencyFmt.format(w.currentBalance)})'),
                  )).toList(),
                  onChanged: (v) {
                    if (v != null) {
                      setDialogState(() => selectedWalletId = v);
                    }
                  },
                ),
                if (!hasEnough)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '⚠️ Cảnh báo: Số dư ví hiện tại không đủ (${_currencyFmt.format(wallet.currentBalance)})',
                      style: const TextStyle(color: Colors.orange, fontSize: 11),
                    ),
                  ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Hủy'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                onPressed: () async {
                  Navigator.pop(ctx);
                  final selectedWallet = _wallets.firstWhere((w) => w.id == selectedWalletId);
                  final success = await _billService.payBill(
                    billId: bill.id,
                    walletId: selectedWallet.id,
                    walletName: selectedWallet.name,
                  );

                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        backgroundColor: const Color(0xFF10B981),
                        content: Text(success ? '✓ Đã thanh toán hóa đơn ${bill.name}!' : 'Lỗi thanh toán'),
                      ),
                    );
                    _loadData();
                  }
                },
                child: const Text('Xác nhận thanh toán', style: TextStyle(color: Colors.white)),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showAddBillModal() {
    final nameCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final dayCtrl = TextEditingController(text: '15');
    final notesCtrl = TextEditingController();
    String selectedCategory = 'Điện nước & Sinh hoạt';
    String selectedIcon = 'bolt';

    final categories = [
      {'name': 'Điện nước & Sinh hoạt', 'icon': 'bolt'},
      {'name': 'Internet & Viễn thông', 'icon': 'wifi'},
      {'name': 'Trả góp & Vay nợ', 'icon': 'directions_car'},
      {'name': 'Nhà cửa & Dịch vụ', 'icon': 'apartment'},
      {'name': 'Giáo dục & Con cái', 'icon': 'school'},
      {'name': 'Bảo hiểm & Y tế', 'icon': 'health_and_safety'},
      {'name': 'Khác', 'icon': 'receipt_long'},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          decoration: BoxDecoration(
            color: Theme.of(ctx).brightness == Brightness.dark ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Thêm Hóa Đơn Định Kỳ Mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Tên hóa đơn *', hintText: 'VD: Tiền điện EVN, Internet VNPT...', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Số tiền định kỳ (₫) *', hintText: '1450000', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: selectedCategory,
                  decoration: const InputDecoration(labelText: 'Hạng mục chi phí', border: OutlineInputBorder()),
                  items: categories.map((c) => DropdownMenuItem(value: c['name'], child: Text(c['name']!))).toList(),
                  onChanged: (v) {
                    if (v != null) {
                      setModalState(() {
                        selectedCategory = v;
                        selectedIcon = categories.firstWhere((c) => c['name'] == v)['icon']!;
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: dayCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Ngày đến hạn hàng tháng (1-31)', hintText: '15', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: notesCtrl,
                  decoration: const InputDecoration(labelText: 'Ghi chú / Mã khách hàng', hintText: 'Mã HĐ: PD08..., liên hệ...', border: OutlineInputBorder()),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () async {
                      final name = nameCtrl.text.trim();
                      final amt = double.tryParse(amountCtrl.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;
                      final day = int.tryParse(dayCtrl.text) ?? 15;

                      if (name.isEmpty || amt <= 0) return;

                      final newBill = RecurringBillModel(
                        id: 'bill-${DateTime.now().millisecondsSinceEpoch}',
                        name: name,
                        categoryName: selectedCategory,
                        amount: amt,
                        dueDay: day.clamp(1, 31),
                        status: 'PENDING',
                        icon: selectedIcon,
                        notes: notesCtrl.text.isNotEmpty ? notesCtrl.text : null,
                      );

                      await _billService.createBill(newBill);
                      if (!mounted) return;
                      Navigator.pop(ctx);
                      _loadData();
                    },
                    child: const Text('Lưu Hóa Đơn Định Kỳ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'bolt': return Icons.bolt;
      case 'wifi': return Icons.wifi;
      case 'directions_car': return Icons.directions_car;
      case 'apartment': return Icons.apartment;
      case 'school': return Icons.school;
      case 'health_and_safety': return Icons.health_and_safety;
      default: return Icons.receipt_long;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final pendingBills = _bills.where((b) => b.status != 'PAID').toList();
    final totalPendingAmount = pendingBills.fold(0.0, (sum, b) => sum + b.amount);
    final paidBills = _bills.where((b) => b.status == 'PAID').toList();
    final totalPaidAmount = paidBills.fold(0.0, (sum, b) => sum + b.amount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hóa Đơn & Khoản Định Kỳ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0284C7)),
            tooltip: 'Thêm hóa đơn',
            onPressed: _showAddBillModal,
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
                  // KPI Overview
                  FintechCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.schedule, size: 14, color: Color(0xFFEF4444)),
                                  SizedBox(width: 4),
                                  Text('CẦN THANH TOÁN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _currencyFmt.format(totalPendingAmount),
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFFEF4444)),
                              ),
                              Text('${pendingBills.length} hóa đơn chưa trả', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 48, color: Colors.grey.withValues(alpha: 0.2)),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF10B981)),
                                  SizedBox(width: 4),
                                  Text('ĐÃ THANH TOÁN', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _currencyFmt.format(totalPaidAmount),
                                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                              ),
                              Text('${paidBills.length} hóa đơn kỳ này', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Filter selector
                  Row(
                    children: [
                      _buildFilterChip('Tất cả (${_bills.length})', 'ALL'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Chưa trả (${pendingBills.length})', 'PENDING'),
                      const SizedBox(width: 8),
                      _buildFilterChip('Đã trả (${paidBills.length})', 'PAID'),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (_filteredBills.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 40),
                      alignment: Alignment.center,
                      child: Column(
                        children: [
                          Icon(Icons.receipt_long, size: 48, color: Colors.grey.withValues(alpha: 0.4)),
                          const SizedBox(height: 10),
                          const Text('Không có hóa đơn nào', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    )
                  else
                    ..._filteredBills.map((b) => _buildBillCard(b, isDark)),
                ],
              ),
            ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0284C7) : Colors.grey.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            color: isSelected ? Colors.white : Colors.grey,
          ),
        ),
      ),
    );
  }

  Widget _buildBillCard(RecurringBillModel bill, bool isDark) {
    final isPaid = bill.status == 'PAID';
    final daysUntil = bill.daysUntilDue;

    Color badgeColor;
    String badgeText;
    if (isPaid) {
      badgeColor = const Color(0xFF10B981);
      badgeText = 'Đã thanh toán';
    } else if (daysUntil < 0) {
      badgeColor = const Color(0xFFEF4444);
      badgeText = 'Quá hạn ${daysUntil.abs()} ngày';
    } else if (daysUntil == 0) {
      badgeColor = const Color(0xFFF59E0B);
      badgeText = 'Đến hạn hôm nay';
    } else {
      badgeColor = const Color(0xFF0284C7);
      badgeText = 'Còn $daysUntil ngày (Hạn ngày ${bill.dueDay})';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isPaid ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFF0284C7).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    _getIconData(bill.icon),
                    color: isPaid ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(bill.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(bill.categoryName, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      if (bill.notes != null && bill.notes!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(bill.notes!, style: TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Colors.grey.withValues(alpha: 0.8))),
                      ],
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _currencyFmt.format(bill.amount),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: isPaid ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: badgeColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badgeText,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (!isPaid) ...[
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF10B981),
                      side: const BorderSide(color: Color(0xFF10B981)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Thanh toán 1-chạm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: () => _showPayBillDialog(bill),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

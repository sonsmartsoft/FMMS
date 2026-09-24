import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';
import '../widgets/fintech_card.dart';
import 'loans_screen.dart';

class WalletsScreen extends StatefulWidget {
  const WalletsScreen({super.key});

  @override
  State<WalletsScreen> createState() => _WalletsScreenState();
}

class _WalletsScreenState extends State<WalletsScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<WalletModel> _wallets = [];

  @override
  void initState() {
    super.initState();
    _loadWallets();
  }

  Future<void> _loadWallets() async {
    setState(() => _isLoading = true);
    final list = await _financeService.getWallets();
    setState(() {
      _wallets = list;
      _isLoading = false;
    });
  }

  void _showTransferDialog() {
    if (_wallets.length < 2) return;

    String fromId = _wallets[0].id;
    String toId = _wallets[1].id;
    final amountController = TextEditingController();
    final noteController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('Chuyển tiền giữa các ví', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                initialValue: fromId,
                decoration: const InputDecoration(labelText: 'Từ ví nguồn'),
                items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name))).toList(),
                onChanged: (v) => setDialogState(() => fromId = v!),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: toId,
                decoration: const InputDecoration(labelText: 'Đến ví đích'),
                items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name))).toList(),
                onChanged: (v) => setDialogState(() => toId = v!),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Số tiền chuyển (₫)', hintText: 'VD: 5000000'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: noteController,
                decoration: const InputDecoration(labelText: 'Ghi chú (tuỳ chọn)', hintText: 'Rút tiền ATM, chuyển khoản...'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Hủy'),
            ),
            ElevatedButton(
              onPressed: () async {
                final amt = double.tryParse(amountController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;
                if (amt <= 0 || fromId == toId) return;

                final success = await _financeService.transferMoney(
                  fromWalletId: fromId,
                  toWalletId: toId,
                  amount: amt,
                  date: DateTime.now().toIso8601String().split('T').first,
                  note: noteController.text.isNotEmpty ? noteController.text : null,
                );

                if (!mounted) return;
                Navigator.pop(ctx);
                _loadWallets();

                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: const Color(0xFF10B981),
                    content: Text(success ? '✓ Chuyển ví thành công!' : 'Đã lưu offline!'),
                  ),
                );
              },
              child: const Text('Xác nhận chuyển'),
            ),
          ],
        ),
      ),
    );
  }

  void _openWalletEditorModal([WalletModel? existing]) {
    final isEditing = existing != null;
    final nameController = TextEditingController(text: existing?.name ?? '');
    final bankController = TextEditingController(text: existing?.bankName ?? '');
    final accountController = TextEditingController(text: existing?.accountNumber ?? '');
    final balanceController = TextEditingController(text: existing != null ? existing.currentBalance.toStringAsFixed(0) : '0');
    final creditLimitController = TextEditingController(text: existing?.creditLimit != null ? existing!.creditLimit!.toStringAsFixed(0) : '50000000');
    final statementDayController = TextEditingController(text: (existing?.statementDay ?? 20).toString());
    final dueDayController = TextEditingController(text: (existing?.paymentDueDay ?? 5).toString());

    WalletType selectedType = existing?.walletType ?? WalletType.BANK;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isCredit = selectedType == WalletType.CREDIT_CARD;
          final stmtVal = int.tryParse(statementDayController.text) ?? 20;
          final dueVal = int.tryParse(dueDayController.text) ?? 5;
          final graceDays = dueVal <= stmtVal ? (30 - stmtVal + dueVal + 30) % 30 + 30 : (dueVal - stmtVal + 30);

          return Container(
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
                      Text(
                        isEditing ? 'Cấu hình Thẻ / Ví' : 'Thêm mới Thẻ / Ví',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Tên thẻ / Ví
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Tên thẻ / Ví *',
                      hintText: 'VD: Techcombank Visa, VCB Lương, Tiền mặt...',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Loại ví
                  DropdownButtonFormField<WalletType>(
                    initialValue: selectedType,
                    decoration: const InputDecoration(
                      labelText: 'Loại tài khoản / Thẻ',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: WalletType.CREDIT_CARD, child: Text('💳 Thẻ tín dụng (Credit Card)')),
                      DropdownMenuItem(value: WalletType.BANK, child: Text('🏦 Tài khoản Ngân hàng (Bank)')),
                      DropdownMenuItem(value: WalletType.CASH, child: Text('💵 Tiền mặt (Cash)')),
                      DropdownMenuItem(value: WalletType.E_WALLET, child: Text('📱 Ví điện tử (MoMo, ZaloPay)')),
                      DropdownMenuItem(value: WalletType.SAVINGS, child: Text('🐷 Sổ tiết kiệm (Savings)')),
                      DropdownMenuItem(value: WalletType.INVESTMENT, child: Text('📈 Danh mục đầu tư')),
                    ],
                    onChanged: (v) => setModalState(() => selectedType = v!),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: bankController,
                          decoration: const InputDecoration(
                            labelText: 'Tên Ngân hàng / Tổ chức',
                            hintText: 'Techcombank, VCB...',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: accountController,
                          decoration: const InputDecoration(
                            labelText: 'Số TK / 4 số cuối',
                            hintText: 'VD: 4222',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Số dư hiện tại
                  TextField(
                    controller: balanceController,
                    keyboardType: const TextInputType.numberWithOptions(signed: true),
                    decoration: InputDecoration(
                      labelText: isCredit ? 'Dư nợ hiện tại (₫) (Âm nếu đang nợ)' : 'Số dư hiện tại (₫)',
                      hintText: isCredit ? '-4850000' : '15000000',
                      border: const OutlineInputBorder(),
                    ),
                  ),

                  // CẤU HÌNH THẺ TÍN DỤNG
                  if (isCredit) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF6366F1).withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'CẤU HÌNH THẺ TÍN DỤNG',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF6366F1)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF6366F1).withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  'Miễn lãi ~$graceDays ngày',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF6366F1)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          TextField(
                            controller: creditLimitController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Hạn mức tín dụng được cấp (₫) *',
                              hintText: 'VD: 100000000',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),

                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    TextField(
                                      controller: statementDayController,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: '📅 Ngày sao kê (1-31)',
                                        hintText: 'VD: 20',
                                        border: OutlineInputBorder(),
                                      ),
                                      onChanged: (_) => setModalState(() {}),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Ngày chốt hóa đơn nợ hàng tháng',
                                      style: TextStyle(fontSize: 10, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    TextField(
                                      controller: dueDayController,
                                      keyboardType: TextInputType.number,
                                      decoration: const InputDecoration(
                                        labelText: '⏰ Ngày tất toán (1-31)',
                                        hintText: 'VD: 5',
                                        border: OutlineInputBorder(),
                                      ),
                                      onChanged: (_) => setModalState(() {}),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Hạn nộp tiền để miễn lãi 0%',
                                      style: TextStyle(fontSize: 10, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.info_outline, size: 14, color: Color(0xFF6366F1)),
                                    SizedBox(width: 6),
                                    Text('Giải thích chu kỳ thẻ:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF6366F1))),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '• Ngày sao kê: Ngày $stmtVal ngân hàng chốt toàn bộ chi tiêu trong tháng.\n• Ngày tất toán: Hạn chót ngày $dueVal bạn phải nộp tiền trả nợ để không bị tính lãi.',
                                  style: const TextStyle(fontSize: 11, height: 1.35, color: Colors.black87),
                                ),
                              ],
                            ),
                          )
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () async {
                        if (nameController.text.trim().isEmpty) return;

                        final bal = double.tryParse(balanceController.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;
                        final limit = double.tryParse(creditLimitController.text.replaceAll('.', '').replaceAll(',', ''));
                        final stmt = int.tryParse(statementDayController.text);
                        final due = int.tryParse(dueDayController.text);

                        final wallet = WalletModel(
                          id: existing?.id ?? 'w-local-${DateTime.now().millisecondsSinceEpoch}',
                          name: nameController.text.trim(),
                          walletType: selectedType,
                          bankName: bankController.text.trim().isNotEmpty ? bankController.text.trim() : null,
                          accountNumber: accountController.text.trim().isNotEmpty ? accountController.text.trim() : null,
                          currentBalance: bal,
                          creditLimit: selectedType == WalletType.CREDIT_CARD ? limit : null,
                          statementDay: selectedType == WalletType.CREDIT_CARD ? stmt : null,
                          paymentDueDay: selectedType == WalletType.CREDIT_CARD ? due : null,
                          color: selectedType == WalletType.CREDIT_CARD ? '#6366F1' : '#0284C7',
                        );

                        await _financeService.saveWallet(wallet);

                        if (!mounted) return;
                        Navigator.pop(ctx);
                        _loadWallets();

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            backgroundColor: Color(0xFF10B981),
                            content: Text('✓ Đã lưu cấu hình tài khoản / thẻ thành công!'),
                          ),
                        );
                      },
                      child: Text(isEditing ? 'Lưu thay đổi' : 'Tạo tài khoản / Thẻ mới', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalBalance = _wallets.fold(0.0, (sum, w) => sum + (w.walletType != WalletType.CREDIT_CARD ? w.currentBalance : 0));
    final creditWallets = _wallets.where((w) => w.walletType == WalletType.CREDIT_CARD).toList();
    final totalCreditDebt = creditWallets.fold(0.0, (sum, w) => sum + (w.currentBalance < 0 ? -w.currentBalance : 0));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ví & Thẻ Thanh Toán', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.handshake_outlined, color: Color(0xFF0284C7)),
            tooltip: 'Khoản vay & Trả góp',
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen()));
            },
          ),
          IconButton(
            icon: const Icon(Icons.swap_horiz, color: Color(0xFF0284C7)),
            tooltip: 'Chuyển tiền nội bộ',
            onPressed: _showTransferDialog,
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0284C7)),
            tooltip: 'Thêm ví / thẻ mới',
            onPressed: () => _openWalletEditorModal(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadWallets,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                children: [
                  // Total Balance Card
                  FintechCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('TỔNG TIỀN KHẢ DỤNG', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                                const SizedBox(height: 4),
                                Text(
                                  _currencyFmt.format(totalBalance),
                                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF10B981)),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: () => _openWalletEditorModal(),
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Thêm thẻ/ví'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0284C7),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ],
                        ),
                        if (totalCreditDebt > 0) ...[
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFEF4444)),
                                const SizedBox(width: 6),
                                Text(
                                  'Tổng dư nợ thẻ tín dụng: ${_currencyFmt.format(totalCreditDebt)}',
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Loan & Installment Quick Banner
                  InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen()));
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isDark
                              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                              : [const Color(0xFF0284C7).withValues(alpha: 0.08), const Color(0xFF0EA5E9).withValues(alpha: 0.14)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.handshake_outlined, color: Color(0xFF0284C7), size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Khoản Vay & Trả Góp Gia Đình',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Vay mua xe Mazda, trả góp 0%, theo dõi hạn trả nợ...',
                                  style: TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: Color(0xFF0284C7), size: 20),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  const Text('Danh sách ví tài chính & Thẻ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),

                  ..._wallets.map((wallet) {
                    final isCredit = wallet.walletType == WalletType.CREDIT_CARD;

                    if (isCredit) {
                      final limit = wallet.creditLimit ?? 0;
                      final balance = wallet.currentBalance;
                      final usedDebt = balance < 0 ? -balance : 0.0;
                      final available = limit - usedDebt;
                      final stmtDay = wallet.statementDay ?? 20;
                      final dueDay = wallet.paymentDueDay ?? 5;
                      final today = DateTime.now().day;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF312E81).withValues(alpha: 0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.credit_card, color: Colors.amberAccent, size: 20),
                                      const SizedBox(width: 8),
                                      Text(
                                        (wallet.bankName ?? 'CREDIT CARD').toUpperCase(),
                                        style: const TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                                      ),
                                    ],
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit, color: Colors.white70, size: 18),
                                    onPressed: () => _openWalletEditorModal(wallet),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                wallet.name,
                                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              if (wallet.accountNumber != null) ...[
                                Text(
                                  '•••• •••• •••• ${wallet.accountNumber}',
                                  style: const TextStyle(color: Colors.white60, fontSize: 12, fontFamily: 'monospace'),
                                ),
                              ],
                              const SizedBox(height: 12),

                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Khả dụng còn lại', style: TextStyle(color: Colors.white60, fontSize: 11)),
                                      Text(
                                        _currencyFmt.format(available),
                                        style: const TextStyle(color: Color(0xFF34D399), fontSize: 15, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      const Text('Hạn mức được cấp', style: TextStyle(color: Colors.white60, fontSize: 11)),
                                      Text(
                                        _currencyFmt.format(limit),
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                ],
                              ),

                              const SizedBox(height: 12),
                              // Statement and Due Date Clarification
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('📅 Sao kê: Ngày $stmtDay', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                        Text('⏰ Hạn tất toán: Ngày $dueDay', style: const TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(
                                          today <= stmtDay ? Icons.timer_outlined : Icons.warning_amber_rounded,
                                          size: 13,
                                          color: today <= stmtDay ? const Color(0xFF34D399) : Colors.amberAccent,
                                        ),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            today <= stmtDay
                                                ? 'Trong kỳ chi tiêu (còn ${stmtDay - today} ngày nữa chốt sao kê)'
                                                : 'Đã chốt sao kê! Còn ${dueDay >= today ? (dueDay - today) : (30 - today + dueDay)} ngày đến hạn tất toán',
                                            style: TextStyle(
                                              fontSize: 10.5,
                                              color: today <= stmtDay ? const Color(0xFF34D399) : Colors.amberAccent,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: FintechCard(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(
                                Icons.account_balance,
                                color: Color(0xFF0284C7),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    wallet.name,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    wallet.bankName ?? 'Tiền mặt',
                                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  _currencyFmt.format(wallet.currentBalance),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit, size: 16, color: Colors.grey),
                                  onPressed: () => _openWalletEditorModal(wallet),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 100),
                ],
              ),
            ),
    );
  }
}

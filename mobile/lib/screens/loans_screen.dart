import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../models/loan_model.dart';
import '../models/saving_model.dart';
import '../services/finance_service.dart';
import '../services/loan_service.dart';
import '../services/saving_service.dart';
import 'events_trips_screen.dart';

class LoansScreen extends StatefulWidget {
  const LoansScreen({super.key});

  @override
  State<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends State<LoansScreen> {
  final LoanService _loanService = LoanService();
  final SavingService _savingService = SavingService();
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<FamilyLoanModel> _loans = [];
  List<SavingDepositModel> _savings = [];
  List<WalletModel> _wallets = [];
  String _activeFilter = 'ALL'; // 'ALL', 'BORROW', 'LEND', 'SAVING'

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final results = await Future.wait([
      _loanService.getLoans(),
      _financeService.getWallets(),
      _savingService.getSavings(),
    ]);

    if (mounted) {
      setState(() {
        _loans = results[0] as List<FamilyLoanModel>;
        _wallets = results[1] as List<WalletModel>;
        _savings = results[2] as List<SavingDepositModel>;
        _isLoading = false;
      });
    }
  }

  List<FamilyLoanModel> get _filteredLoans {
    if (_activeFilter == 'BORROW') {
      return _loans.where((l) => l.loanType == LoanType.BORROW).toList();
    } else if (_activeFilter == 'LEND') {
      return _loans.where((l) => l.loanType == LoanType.LEND).toList();
    }
    return _loans;
  }

  double get _totalBorrowDebt {
    return _loans
        .where((l) => l.loanType == LoanType.BORROW && l.status == 'ACTIVE')
        .fold(0.0, (sum, l) => sum + l.remainingBalance);
  }

  double get _totalMonthlyObligation {
    return _loans
        .where((l) => l.loanType == LoanType.BORROW && l.status == 'ACTIVE')
        .fold(0.0, (sum, l) => sum + l.monthlyPayment);
  }

  double get _totalLendReceivable {
    return _loans
        .where((l) => l.loanType == LoanType.LEND && l.status == 'ACTIVE')
        .fold(0.0, (sum, l) => sum + l.remainingBalance);
  }

  double get _totalSavingPrincipal {
    return _savings
        .where((s) => s.status == 'ACTIVE')
        .fold(0.0, (sum, s) => sum + s.depositAmount);
  }

  double get _totalSavingExpectedInterest {
    return _savings
        .where((s) => s.status == 'ACTIVE')
        .fold(0.0, (sum, s) => sum + s.expectedInterest);
  }

  // --- Quick Pay Installment Modal ---
  void _showPayInstallmentDialog(FamilyLoanModel loan) {
    if (_wallets.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chưa có ví tiền khả dụng để thanh toán.')),
      );
      return;
    }

    String selectedWalletId = loan.linkedWalletId != null && _wallets.any((w) => w.id == loan.linkedWalletId)
        ? loan.linkedWalletId!
        : _wallets.first.id;

    final payAmountController = TextEditingController(
      text: loan.monthlyPayment > 0 ? loan.monthlyPayment.toStringAsFixed(0) : '0',
    );
    final noteController = TextEditingController(
      text: 'Thanh toán định kỳ ${loan.title}',
    );

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.payment, color: Color(0xFF0284C7), size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Trả nợ / Trả góp kỳ này',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: isDark ? Colors.white : Colors.black),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    loan.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  Text(
                    'Đơn vị: ${loan.lenderBorrowerName} • Dư nợ: ${_currencyFmt.format(loan.remainingBalance)}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),

                  // Amount
                  const Text('Số tiền thanh toán kỳ này (₫)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: payAmountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: 'Nhập số tiền...',
                      prefixIcon: const Icon(Icons.attach_money, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Wallet selector
                  const Text('Trừ từ ví / Tài khoản nguồn', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  DropdownButtonFormField<String>(
                    initialValue: selectedWalletId,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: _wallets.map((w) {
                      return DropdownMenuItem(
                        value: w.id,
                        child: Text('${w.name} (${_currencyFmt.format(w.currentBalance)})', style: const TextStyle(fontSize: 13)),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) setDialogState(() => selectedWalletId = v);
                    },
                  ),
                  const SizedBox(height: 14),

                  // Note
                  const Text('Ghi chú giao dịch', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: noteController,
                    decoration: InputDecoration(
                      hintText: 'VD: Đóng tiền kỳ tháng 9...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Hủy'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () async {
                  final amount = double.tryParse(payAmountController.text.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0.0;
                  if (amount <= 0) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Số tiền thanh toán phải lớn hơn 0.')),
                    );
                    return;
                  }

                  Navigator.pop(ctx);
                  final success = await _loanService.payInstallment(
                    loanId: loan.id,
                    paymentAmount: amount,
                    walletId: selectedWalletId,
                    note: noteController.text.trim(),
                  );

                  if (mounted && success) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Đã thanh toán ${_currencyFmt.format(amount)} cho ${loan.title}!')),
                    );
                    _loadData();
                  }
                },
                child: const Text('Xác nhận Thanh toán'),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Add / Create Loan Modal ---
  void _showAddLoanModal() {
    final titleController = TextEditingController();
    final lenderController = TextEditingController(text: 'TPBank');
    final principalController = TextEditingController();
    final balanceController = TextEditingController();
    final rateController = TextEditingController(text: '8.0');
    final termController = TextEditingController(text: '60');
    final monthlyPayController = TextEditingController();
    final dayController = TextEditingController(text: '28');
    final noteController = TextEditingController();

    LoanType selectedType = LoanType.BORROW;
    LoanCategory selectedCat = LoanCategory.CAR_LOAN;
    String? selectedWallet = _wallets.isNotEmpty ? _wallets.first.id : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return Container(
            height: MediaQuery.of(ctx).size.height * 0.88,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Thêm Khoản Vay / Trả Góp',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      // Type selector
                      Row(
                        children: [
                          Expanded(
                            child: ChoiceChip(
                              label: const Center(child: Text('Tôi đi vay / Trả góp')),
                              selected: selectedType == LoanType.BORROW,
                              onSelected: (val) {
                                if (val) setModalState(() => selectedType = LoanType.BORROW);
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: ChoiceChip(
                              label: const Center(child: Text('Cho người khác vay')),
                              selected: selectedType == LoanType.LEND,
                              onSelected: (val) {
                                if (val) setModalState(() => selectedType = LoanType.LEND);
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Category
                      const Text('Phân loại khoản nợ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<LoanCategory>(
                        initialValue: selectedCat,
                        decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                        items: const [
                          DropdownMenuItem(value: LoanCategory.CAR_LOAN, child: Text('🚗 Vay mua xe ô tô / phương tiện')),
                          DropdownMenuItem(value: LoanCategory.CREDIT_INSTALLMENT, child: Text('💳 Mua sắm trả góp (0% / Thẻ TD)')),
                          DropdownMenuItem(value: LoanCategory.BANK_MORTGAGE, child: Text('🏠 Vay mua nhà / Thế chấp BĐS')),
                          DropdownMenuItem(value: LoanCategory.BANK_CONSUMER, child: Text('🛍️ Vay tiêu dùng tín chấp')),
                          DropdownMenuItem(value: LoanCategory.PERSONAL, child: Text('🤝 Vay mượn cá nhân / bạn bè')),
                          DropdownMenuItem(value: LoanCategory.OTHER, child: Text('📁 Khoản nợ khác')),
                        ],
                        onChanged: (v) {
                          if (v != null) setModalState(() => selectedCat = v);
                        },
                      ),
                      const SizedBox(height: 14),

                      // Title
                      const Text('Tên khoản vay / Trả góp', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: titleController,
                        decoration: InputDecoration(
                          hintText: 'VD: Vay mua xe Mazda 2, Trả góp iPhone 15...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Lender
                      const Text('Đơn vị tài chính / Người vay', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: lenderController,
                        decoration: InputDecoration(
                          hintText: 'VD: TPBank, Techcombank, Anh Tuấn...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Principal & Remaining
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Số tiền gốc ban đầu (₫)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: principalController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '295.000.000',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  onChanged: (val) {
                                    if (balanceController.text.isEmpty) {
                                      balanceController.text = val;
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Dư nợ hiện tại (₫)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: balanceController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '270.918.000',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Interest & Term
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Lãi suất (%/năm)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: rateController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  decoration: InputDecoration(
                                    hintText: '8.0 (0 nếu trả góp 0%)',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kỳ hạn (Số tháng)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: termController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '60 (tháng)',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Monthly payment & Day
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Trả mỗi kỳ (₫)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: monthlyPayController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '7.378.000',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Ngày trả hàng tháng', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: dayController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: 'Ngày 28',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Linked Wallet
                      const Text('Ví nguồn thanh toán mặc định', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        initialValue: selectedWallet,
                        decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
                        items: _wallets.map((w) {
                          return DropdownMenuItem(value: w.id, child: Text(w.name));
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) setModalState(() => selectedWallet = v);
                        },
                      ),
                      const SizedBox(height: 14),

                      // Notes
                      const Text('Ghi chú hợp đồng', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: noteController,
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: 'Thông tin hợp đồng, điều khoản trả trước hạn...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Submit button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0284C7),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            final title = titleController.text.trim();
                            if (title.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Vui lòng nhập tên khoản vay / trả góp.')),
                              );
                              return;
                            }

                            final principal = double.tryParse(principalController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                            final balance = double.tryParse(balanceController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? principal;
                            final monthly = double.tryParse(monthlyPayController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                            final day = int.tryParse(dayController.text) ?? 15;
                            final rate = double.tryParse(rateController.text) ?? 0.0;
                            final term = int.tryParse(termController.text);

                            final newLoan = FamilyLoanModel(
                              id: 'loan-${DateTime.now().millisecondsSinceEpoch}',
                              title: title,
                              loanType: selectedType,
                              category: selectedCat,
                              lenderBorrowerName: lenderController.text.trim().isNotEmpty ? lenderController.text.trim() : 'Ngân hàng',
                              principalAmount: principal,
                              remainingBalance: balance,
                              interestRatePercent: rate,
                              termMonths: term,
                              startDate: DateTime.now().toIso8601String().split('T').first,
                              paymentDay: day,
                              monthlyPayment: monthly,
                              linkedWalletId: selectedWallet,
                              status: 'ACTIVE',
                              notes: noteController.text.trim(),
                            );

                            Navigator.pop(ctx);
                            await _loanService.createLoan(newLoan);
                            _loadData();
                          },
                          child: const Text('Lưu Khoản Vay / Trả Góp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // --- Sổ Tiết Kiệm Modal & Settlement Dialog ---
  void _showAddSavingModal() {
    final titleController = TextEditingController();
    final bankController = TextEditingController(text: 'Vietcombank');
    final accountController = TextEditingController();
    final amountController = TextEditingController();
    final rateController = TextEditingController(text: '5.5');
    final termController = TextEditingController(text: '12');
    final noteController = TextEditingController();
    String? selectedWallet = _wallets.isNotEmpty ? _wallets.first.id : null;
    bool deductWallet = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return Container(
            height: MediaQuery.of(ctx).size.height * 0.82,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(color: Colors.grey.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Mở Sổ Tiết Kiệm Mới',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      const Text('Tên sổ tiết kiệm', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: titleController,
                        decoration: InputDecoration(
                          hintText: 'VD: Sổ tiết kiệm VCB Quỹ dự phòng...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Ngân hàng gửi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: bankController,
                                  decoration: InputDecoration(
                                    hintText: 'VD: Vietcombank',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Số sổ / Tài khoản', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: accountController,
                                  decoration: InputDecoration(
                                    hintText: 'VD: STK-019283',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      const Text('Số tiền gửi gốc', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: amountController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: 'VD: 100000000',
                          suffixText: '₫',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Lãi suất (%/năm)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: rateController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '5.5',
                                    suffixText: '%',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Kỳ hạn (tháng)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 6),
                                TextField(
                                  controller: termController,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: '12',
                                    suffixText: 'tháng',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      if (_wallets.isNotEmpty) ...[
                        Row(
                          children: [
                            Checkbox(
                              value: deductWallet,
                              onChanged: (v) => setModalState(() => deductWallet = v ?? false),
                            ),
                            const Expanded(
                              child: Text('Trích tiền từ ví này', style: TextStyle(fontSize: 13)),
                            ),
                          ],
                        ),
                        if (deductWallet) ...[
                          DropdownButtonFormField<String>(
                            initialValue: selectedWallet,
                            decoration: const InputDecoration(labelText: 'Chọn ví trích tiền'),
                            items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name))).toList(),
                            onChanged: (v) => setModalState(() => selectedWallet = v),
                          ),
                          const SizedBox(height: 14),
                        ],
                      ],

                      const Text('Ghi chú', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: noteController,
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: 'Thông tin bổ sung...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 24),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            final title = titleController.text.trim();
                            if (title.isEmpty) return;
                            final amount = double.tryParse(amountController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                            final rate = double.tryParse(rateController.text) ?? 5.0;
                            final term = int.tryParse(termController.text) ?? 12;

                            final now = DateTime.now();
                            final maturity = now.add(Duration(days: term * 30));

                            final newSaving = SavingDepositModel(
                              id: 'sav-${DateTime.now().millisecondsSinceEpoch}',
                              title: title,
                              bankName: bankController.text.trim().isNotEmpty ? bankController.text.trim() : 'Ngân hàng',
                              accountNumber: accountController.text.trim().isNotEmpty ? accountController.text.trim() : null,
                              depositAmount: amount,
                              interestRatePercent: rate,
                              termMonths: term,
                              startDate: now.toIso8601String().split('T').first,
                              maturityDate: maturity.toIso8601String().split('T').first,
                              linkedWalletId: deductWallet ? selectedWallet : null,
                              notes: noteController.text.trim(),
                            );

                            Navigator.pop(ctx);
                            await _savingService.createSaving(newSaving, deductFromWallet: deductWallet);
                            _loadData();
                          },
                          child: const Text('Lưu Sổ Tiết Kiệm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSettleSavingDialog(SavingDepositModel saving) {
    if (_wallets.isEmpty) return;
    String targetWalletId = _wallets.first.id;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Text('Tất toán Sổ Tiết Kiệm', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sổ: ${saving.title} (${saving.bankName})', style: const TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Tiền gốc: ${_currencyFmt.format(saving.depositAmount)}'),
                Text('Lãi dự tính: ${_currencyFmt.format(saving.expectedInterest)} (${saving.interestRatePercent}%/năm)'),
                const Divider(),
                Text('Tổng thực nhận: ${_currencyFmt.format(saving.totalAtMaturity)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                const SizedBox(height: 14),
                const Text('Ví nhận tiền tất toán:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: targetWalletId,
                  decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                  items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name, style: const TextStyle(fontSize: 13)))).toList(),
                  onChanged: (v) {
                    if (v != null) setDialogState(() => targetWalletId = v);
                  },
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                onPressed: () async {
                  final targetWallet = _wallets.firstWhere((w) => w.id == targetWalletId);
                  Navigator.pop(ctx);
                  await _savingService.settleSaving(
                    savingId: saving.id,
                    targetWalletId: targetWalletId,
                    targetWalletName: targetWallet.name,
                  );
                  _loadData();
                },
                child: const Text('Xác nhận Tất toán'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          _activeFilter == 'SAVING' ? 'Sổ Tiết Kiệm Ngân Hàng' : 'Khoản Vay & Trả Góp',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.beach_access, color: Color(0xFF0284C7)),
            tooltip: 'Sự kiện & Chuyến đi',
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EventsTripsScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0284C7)),
            tooltip: _activeFilter == 'SAVING' ? 'Mở sổ tiết kiệm' : 'Thêm khoản nợ / trả góp',
            onPressed: _activeFilter == 'SAVING' ? _showAddSavingModal : _showAddLoanModal,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                children: [
                  // KPI Overview
                  _buildKpiSection(isDark),
                  const SizedBox(height: 16),

                  // Filter Segment
                  _buildFilterSegments(isDark),
                  const SizedBox(height: 16),

                  // Content List
                  if (_activeFilter == 'SAVING') ...[
                    if (_savings.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            Icon(Icons.savings_outlined, size: 54, color: Colors.grey.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            const Text('Chưa có sổ tiết kiệm nào', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            const Text('Bấm dấu (+) để thêm sổ tích lũy ngân hàng!', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      )
                    else
                      ..._savings.map((s) => _buildSavingCard(s, isDark)),
                  ] else ...[
                    if (_filteredLoans.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(32),
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline, size: 54, color: Colors.grey.withValues(alpha: 0.5)),
                            const SizedBox(height: 12),
                            const Text('Không có khoản vay hay trả góp nào', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            const Text('Gia đình bạn đang quản lý tài chính rất an toàn!', style: TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      )
                    else
                      ..._filteredLoans.map((l) => _buildLoanCard(l, isDark)),
                  ],

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  // --- KPI Section ---
  Widget _buildKpiSection(bool isDark) {
    if (_activeFilter == 'SAVING') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF065F46), Color(0xFF047857)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
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
                const Text(
                  'TỔNG TIỀN GỬI TIẾT KIỆM',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFA7F3D0), letterSpacing: 0.8),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('Tích lũy', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              _currencyFmt.format(_totalSavingPrincipal),
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -0.5),
            ),
            const SizedBox(height: 14),
            const Divider(color: Colors.white24, height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Lãi dự kiến nhận', style: TextStyle(fontSize: 11, color: Color(0xFFA7F3D0))),
                      const SizedBox(height: 4),
                      Text(
                        _currencyFmt.format(_totalSavingExpectedInterest),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFFDE68A)),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 30, color: Colors.white24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Sổ đang hoạt động', style: TextStyle(fontSize: 11, color: Color(0xFFA7F3D0))),
                      const SizedBox(height: 4),
                      Text(
                        '${_savings.where((s) => s.status == "ACTIVE").length} Sổ',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
              : [const Color(0xFF1E293B), const Color(0xFF334155)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
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
              const Text(
                'TỔNG DƯ NỢ CẦN TRẢ',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 0.8),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text('Phải trả', style: TextStyle(color: Color(0xFFF87171), fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            _currencyFmt.format(_totalBorrowDebt),
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: -0.5),
          ),
          const SizedBox(height: 14),
          const Divider(color: Color(0xFF334155), height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Phải trả tháng này', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    const SizedBox(height: 4),
                    Text(
                      _currencyFmt.format(_totalMonthlyObligation),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFFBBF24)),
                    ),
                  ],
                ),
              ),
              Container(width: 1, height: 30, color: const Color(0xFF334155)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Đang cho vay', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    const SizedBox(height: 4),
                    Text(
                      _currencyFmt.format(_totalLendReceivable),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Filter Segment Tabs ---
  Widget _buildFilterSegments(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(14),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildSegmentTab('ALL', 'Tất cả (${_loans.length})'),
            const SizedBox(width: 4),
            _buildSegmentTab('BORROW', 'Đi vay & Trả góp'),
            const SizedBox(width: 4),
            _buildSegmentTab('LEND', 'Cho vay'),
            const SizedBox(width: 4),
            _buildSegmentTab('SAVING', 'Sổ Tiết Kiệm (${_savings.length})'),
          ],
        ),
      ),
    );
  }

  Widget _buildSavingCard(SavingDepositModel saving, bool isDark) {
    final isSettled = saving.status == 'SETTLED';
    final progress = (saving.termProgressPercent / 100.0).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.withValues(alpha: 0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(Icons.savings_outlined, color: Color(0xFF10B981), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      saving.title,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${saving.bankName} ${saving.accountNumber != null ? "• ${saving.accountNumber}" : ""}',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isSettled ? Colors.grey.withValues(alpha: 0.15) : const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isSettled ? 'Đã tất toán' : 'Đang gửi',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSettled ? Colors.grey : const Color(0xFF10B981),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tiền gốc gửi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Text(
                    _currencyFmt.format(saving.depositAmount),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Lãi suất & Kỳ hạn', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Text(
                    '${saving.interestRatePercent}%/năm • ${saving.termMonths}T',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),

          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: Colors.grey.withValues(alpha: 0.15),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
            ),
          ),
          const SizedBox(height: 8),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Gửi: ${saving.startDate}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              Text(
                isSettled ? 'Đã kết thúc' : 'Đáo hạn: ${saving.maturityDate} (${saving.daysUntilMaturity} ngày)',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: saving.isMatured && !isSettled ? const Color(0xFFEF4444) : Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Tổng thực nhận (Gốc + Lãi)', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Text(
                    _currencyFmt.format(saving.totalAtMaturity),
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                  ),
                ],
              ),
              if (!isSettled)
                ElevatedButton.icon(
                  icon: const Icon(Icons.account_balance_wallet_outlined, size: 14),
                  label: const Text('Tất toán về ví', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _showSettleSavingDialog(saving),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentTab(String key, String title) {
    final isSelected = _activeFilter == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeFilter = key),
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

  // --- Loan Card Widget ---
  Widget _buildLoanCard(FamilyLoanModel loan, bool isDark) {
    final daysUntilDue = loan.getDaysUntilDue();
    final nextDueDate = loan.getNextDueDate();
    final isDueSoon = daysUntilDue <= 5 && daysUntilDue >= 0;
    final isLend = loan.loanType == LoanType.LEND;

    Color badgeColor;
    String badgeText;
    IconData badgeIcon;

    switch (loan.category) {
      case LoanCategory.CAR_LOAN:
        badgeColor = const Color(0xFF0284C7);
        badgeText = 'Vay mua ô tô';
        badgeIcon = Icons.directions_car;
        break;
      case LoanCategory.CREDIT_INSTALLMENT:
        badgeColor = const Color(0xFF8B5CF6);
        badgeText = 'Trả góp 0%';
        badgeIcon = Icons.credit_card;
        break;
      case LoanCategory.BANK_MORTGAGE:
        badgeColor = const Color(0xFFF59E0B);
        badgeText = 'Vay mua nhà';
        badgeIcon = Icons.home;
        break;
      case LoanCategory.BANK_CONSUMER:
        badgeColor = const Color(0xFFEC4899);
        badgeText = 'Vay tiêu dùng';
        badgeIcon = Icons.shopping_bag;
        break;
      case LoanCategory.PERSONAL:
        badgeColor = const Color(0xFF10B981);
        badgeText = isLend ? 'Cho vay' : 'Vay cá nhân';
        badgeIcon = Icons.people;
        break;
      default:
        badgeColor = Colors.grey;
        badgeText = 'Khoản vay';
        badgeIcon = Icons.receipt_long;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isDueSoon
              ? const Color(0xFFF59E0B)
              : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          width: isDueSoon ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Category badge & Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(badgeIcon, size: 14, color: badgeColor),
                    const SizedBox(width: 5),
                    Text(
                      badgeText,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: badgeColor),
                    ),
                  ],
                ),
              ),
              if (loan.isPaidOff)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Đã tất toán', style: TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                )
              else if (isDueSoon)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('Đến hạn sau $daysUntilDue ngày', style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Title & Lender
          Text(
            loan.title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            '${loan.lenderBorrowerName} • ${loan.interestRatePercent > 0 ? 'Lãi suất ${loan.interestRatePercent}%/năm' : 'Lãi suất 0%'}',
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
          const SizedBox(height: 14),

          // Progress bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Đã trả: ${_currencyFmt.format(loan.paidAmount)} (${loan.progressPercent.toStringAsFixed(1)}%)',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF10B981)),
                  ),
                  Text(
                    'Còn nợ: ${_currencyFmt.format(loan.remainingBalance)}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: (loan.progressPercent / 100).clamp(0.0, 1.0),
                  minHeight: 7,
                  backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  valueColor: AlwaysStoppedAnimation<Color>(
                    loan.isPaidOff ? const Color(0xFF10B981) : const Color(0xFF0284C7),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Period info row
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Kỳ hạn mỗi tháng', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      const SizedBox(height: 2),
                      Text(
                        _currencyFmt.format(loan.monthlyPayment),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Container(width: 1, height: 24, color: Colors.grey.withValues(alpha: 0.3)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Ngày thanh toán tiếp', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      const SizedBox(height: 2),
                      Text(
                        DateFormat('dd/MM/yyyy').format(nextDueDate),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDueSoon ? const Color(0xFFF59E0B) : (isDark ? Colors.white : Colors.black),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.info_outline, size: 16),
                  label: const Text('Chi tiết', style: TextStyle(fontSize: 12)),
                  onPressed: () {
                    _showLoanDetailsSheet(loan);
                  },
                ),
              ),
              const SizedBox(width: 10),
              if (!loan.isPaidOff)
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.check_circle_outline, size: 16),
                    label: Text(
                      isLend ? 'Ghi nhận thu nợ' : 'Trả nợ kỳ này',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () => _showPayInstallmentDialog(loan),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // --- Loan Details Sheet ---
  void _showLoanDetailsSheet(FamilyLoanModel loan) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        height: MediaQuery.of(ctx).size.height * 0.7,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(
              loan.title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            Text(
              'Tổ chức / Đối tác: ${loan.lenderBorrowerName}',
              style: const TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 18),
            const Divider(height: 1),
            const SizedBox(height: 16),
            _buildDetailRow('Số tiền gốc ban đầu', _currencyFmt.format(loan.principalAmount)),
            _buildDetailRow('Dư nợ còn lại', _currencyFmt.format(loan.remainingBalance)),
            _buildDetailRow('Đã trả tích lũy', '${_currencyFmt.format(loan.paidAmount)} (${loan.progressPercent.toStringAsFixed(1)}%)'),
            _buildDetailRow('Lãi suất', '${loan.interestRatePercent}% / năm'),
            _buildDetailRow('Kỳ hạn', '${loan.termMonths ?? "N/A"} tháng'),
            _buildDetailRow('Số tiền trả mỗi kỳ', _currencyFmt.format(loan.monthlyPayment)),
            _buildDetailRow('Ngày đóng hàng tháng', 'Ngày ${loan.paymentDay}'),
            _buildDetailRow('Ngày bắt đầu', loan.startDate),
            _buildDetailRow('Trạng thái', loan.isPaidOff ? 'Đã tất toán' : 'Đang thực hiện'),
            if (loan.notes != null && loan.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              _buildDetailRow('Ghi chú', loan.notes!),
            ],
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.delete_outline, size: 18),
                    label: const Text('Xóa khoản này'),
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await _loanService.deleteLoan(loan.id);
                      _loadData();
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Đóng'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

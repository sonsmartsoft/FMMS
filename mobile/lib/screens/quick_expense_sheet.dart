import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:image_picker/image_picker.dart';
import '../models/ai_action_model.dart';
import '../models/event_trip_model.dart';
import '../models/finance_model.dart';
import '../models/user_member_model.dart';
import '../services/ai_assistant_service.dart';
import '../services/auth_service.dart';
import '../services/event_trip_service.dart';
import '../services/finance_service.dart';
import '../widgets/ai_action_card_widget.dart';
import '../widgets/calculator_keypad_widget.dart';
import '../widgets/category_picker_modal.dart';

class QuickExpenseSheet extends StatefulWidget {
  final VoidCallback onSaved;
  final FamilyTransactionModel? initialTransaction;

  const QuickExpenseSheet({
    super.key,
    required this.onSaved,
    this.initialTransaction,
  });

  @override
  State<QuickExpenseSheet> createState() => _QuickExpenseSheetState();
}

class _QuickExpenseSheetState extends State<QuickExpenseSheet> {
  final FinanceService _financeService = FinanceService();
  final AuthService _authService = AuthService();
  final AIAssistantService _aiService = AIAssistantService();
  final EventTripService _eventTripService = EventTripService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  final TextEditingController _promptController = TextEditingController();
  final stt.SpeechToText _speech = stt.SpeechToText();
  final ImagePicker _picker = ImagePicker();

  bool _isListening = false;
  bool _isProcessingAI = false;
  bool _manualMode = true; // Default to MISA full manual 4-tab mode, with 1-tap AI toggle
  bool _showCalculator = false;
  AIActionDraft? _currentDraft;

  // 4 Top Tabs: 0 = Chi tiền, 1 = Thu tiền, 2 = Chuyển khoản, 3 = Vay / Nợ
  int _activeTab = 0;

  // Form Fields
  int _manualAmount = 0;
  DateTime _selectedDateTime = DateTime.now();
  String? _selectedWalletId;
  String? _toWalletId; // For transfer
  double _transferFee = 0;
  String? _selectedParentCategoryId;
  String? _selectedSubCategoryId;
  String? _selectedMemberName;
  String? _forMemberName;
  String? _selectedEventTripId;
  String _payee = '';
  String _description = '';
  String _location = '';
  bool _isExcludedFromReport = false;
  String? _debtSubType = 'CHO_VAY'; // CHO_VAY, DI_VAY, THU_NO, TRA_NO

  List<WalletModel> _wallets = [];
  List<TransactionCategoryModel> _allCategories = [];
  List<FamilyMemberModel> _members = [];
  List<EventTripModel> _eventTrips = [];

  TransactionType get _currentTxType {
    if (_activeTab == 1) return TransactionType.INCOME;
    if (_activeTab == 2) return TransactionType.TRANSFER;
    if (_activeTab == 3) {
      if (_debtSubType == 'DI_VAY' || _debtSubType == 'THU_NO') return TransactionType.INCOME;
      return TransactionType.EXPENSE;
    }
    return TransactionType.EXPENSE;
  }

  List<TransactionCategoryModel> get _parentCategories =>
      _allCategories.where((c) => c.isParent && c.type == _currentTxType).toList();

  List<TransactionCategoryModel> get _currentSubCategories {
    if (_selectedParentCategoryId == null) return [];
    return _allCategories.where((c) => c.parentId == _selectedParentCategoryId).toList();
  }

  String? get _selectedParentCategoryName {
    if (_selectedParentCategoryId == null) return null;
    return _allCategories.where((c) => c.id == _selectedParentCategoryId).firstOrNull?.name;
  }

  String? get _selectedSubCategoryName {
    if (_selectedSubCategoryId == null) return null;
    return _allCategories.where((c) => c.id == _selectedSubCategoryId).firstOrNull?.name;
  }

  @override
  void initState() {
    super.initState();
    _loadDependencies();
  }

  Future<void> _loadDependencies() async {
    final wList = await _financeService.getWallets();
    final cList = await _financeService.getCategories();
    final mList = await _authService.fetchMembers();
    final currentMember = _authService.getCurrentMember();
    final tList = await _eventTripService.getEventTrips();

    setState(() {
      _wallets = wList;
      _allCategories = cList;
      _members = mList;
      _eventTrips = tList;
      _selectedMemberName = currentMember.name;
      _forMemberName = 'Cả gia đình';

      if (widget.initialTransaction != null) {
        final init = widget.initialTransaction!;
        _manualAmount = init.amount.toInt();
        _selectedWalletId = init.walletId;
        _toWalletId = init.toWalletId;
        _transferFee = init.transferFee ?? 0;
        _selectedParentCategoryId = init.categoryId;
        _selectedSubCategoryId = init.subCategoryId;
        _payee = init.payeeVendor ?? '';
        _description = init.description ?? '';
        _location = init.location ?? '';
        _forMemberName = init.forMemberName ?? 'Cả gia đình';
        _selectedEventTripId = init.eventTripId;
        _isExcludedFromReport = init.isExcludedFromReport;
        try {
          _selectedDateTime = DateTime.parse(init.date);
        } catch (_) {}

        if (init.transactionType == TransactionType.INCOME) {
          _activeTab = 1;
        } else if (init.transactionType == TransactionType.TRANSFER) {
          _activeTab = 2;
        } else {
          _activeTab = 0;
        }
        _manualMode = true;
      } else {
        if (_wallets.isNotEmpty) {
          _selectedWalletId = _wallets.first.id;
          if (_wallets.length > 1) _toWalletId = _wallets[1].id;
        }
        if (_parentCategories.isNotEmpty) {
          _selectedParentCategoryId = _parentCategories.first.id;
        }
      }
    });
  }

  Future<void> _handleProcessPrompt(String text) async {
    if (text.trim().isEmpty) return;
    setState(() => _isProcessingAI = true);

    try {
      final draft = await _aiService.parseNaturalInput(text);
      setState(() {
        _currentDraft = draft;
        _isProcessingAI = false;
      });
    } catch (_) {
      setState(() => _isProcessingAI = false);
    }
  }

  Future<void> _toggleListening() async {
    if (!_isListening) {
      bool available = await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            setState(() => _isListening = false);
            if (_promptController.text.isNotEmpty) {
              _handleProcessPrompt(_promptController.text);
            }
          }
        },
        onError: (error) => setState(() => _isListening = false),
      );

      if (available) {
        setState(() => _isListening = true);
        _speech.listen(
          listenOptions: stt.SpeechListenOptions(
            listenMode: stt.ListenMode.dictation,
            partialResults: true,
            localeId: 'vi_VN',
          ),
          onResult: (result) {
            setState(() {
              _promptController.text = result.recognizedWords;
            });
          },
        );
      }
    } else {
      setState(() => _isListening = false);
      _speech.stop();
      if (_promptController.text.isNotEmpty) {
        _handleProcessPrompt(_promptController.text);
      }
    }
  }

  Future<void> _pickReceiptImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image == null) return;

    setState(() => _isProcessingAI = true);
    try {
      final bytes = await image.readAsBytes();
      final result = await _aiService.scanReceipt(imageBytes: bytes);
      final draft = _aiService.convertReceiptToDraft(result);
      setState(() {
        _currentDraft = draft;
        _isProcessingAI = false;
      });
    } catch (_) {
      setState(() => _isProcessingAI = false);
    }
  }

  Future<void> _confirmDraft(AIActionDraft draft) async {
    final txType = draft.actionType == 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
    final tx = FamilyTransactionModel(
      id: '',
      walletId: draft.walletId ?? (_wallets.isNotEmpty ? _wallets.first.id : 'w-cash-01'),
      categoryId: draft.categoryId,
      subCategoryId: draft.subCategoryId,
      transactionType: txType,
      amount: draft.amount,
      date: draft.date,
      payeeVendor: draft.payeeVendor,
      description: draft.description,
      isEssential: draft.isEssential,
      forMemberName: _forMemberName,
    );

    final success = await _financeService.createTransaction(tx, memberName: draft.memberName ?? _selectedMemberName);
    if (!mounted) return;
    Navigator.pop(context);
    widget.onSaved();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text(success ? '✓ Đã ghi sổ thông minh thành công!' : 'Đã lưu offline!'),
      ),
    );
  }

  Future<void> _selectDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _selectedDateTime,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (pickedDate != null) {
      if (!mounted) return;
      final pickedTime = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_selectedDateTime),
      );
      setState(() {
        _selectedDateTime = DateTime(
          pickedDate.year,
          pickedDate.month,
          pickedDate.day,
          pickedTime?.hour ?? _selectedDateTime.hour,
          pickedTime?.minute ?? _selectedDateTime.minute,
        );
      });
    }
  }

  Future<void> _saveTransaction() async {
    if (_manualAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập số tiền lớn hơn 0')),
      );
      return;
    }

    if (_selectedWalletId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn tài khoản / ví thanh toán')),
      );
      return;
    }

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDateTime);
    final isEditing = widget.initialTransaction != null && widget.initialTransaction!.id.isNotEmpty;

    // Handle Transfer
    if (_activeTab == 2) {
      if (_toWalletId == null || _toWalletId == _selectedWalletId) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ví nhận phải khác ví chuyển')),
        );
        return;
      }

      final fromW = _wallets.where((w) => w.id == _selectedWalletId).firstOrNull;
      final toW = _wallets.where((w) => w.id == _toWalletId).firstOrNull;

      final transferTx = FamilyTransactionModel(
        id: isEditing ? widget.initialTransaction!.id : '',
        walletId: _selectedWalletId!,
        toWalletId: _toWalletId,
        walletName: fromW?.name,
        transactionType: TransactionType.TRANSFER,
        amount: _manualAmount.toDouble(),
        transferFee: _transferFee > 0 ? _transferFee : null,
        date: dateStr,
        payeeVendor: 'Chuyển tiền: ${fromW?.name ?? "Ví nguồn"} ➔ ${toW?.name ?? "Ví đích"}',
        description: _description.isNotEmpty ? _description : 'Chuyển tiền nội bộ',
        notes: _description,
        isEssential: true,
      );

      if (isEditing) {
        await _financeService.updateTransaction(widget.initialTransaction!, transferTx);
      } else {
        await _financeService.createTransaction(transferTx, memberName: _selectedMemberName);
      }

      if (!mounted) return;
      Navigator.pop(context);
      widget.onSaved();
      return;
    }

    // Handle Expense / Income / Debt
    final parentCat = _parentCategories.where((c) => c.id == _selectedParentCategoryId).firstOrNull ??
        (_parentCategories.isNotEmpty ? _parentCategories.first : null);

    TransactionCategoryModel? subCat;
    if (_selectedSubCategoryId != null) {
      subCat = _allCategories.where((c) => c.id == _selectedSubCategoryId).firstOrNull;
    }

    final tx = FamilyTransactionModel(
      id: isEditing ? widget.initialTransaction!.id : '',
      walletId: _selectedWalletId!,
      walletName: _wallets.where((w) => w.id == _selectedWalletId).firstOrNull?.name,
      categoryId: parentCat?.id,
      categoryName: parentCat?.name,
      subCategoryId: subCat?.id,
      subCategoryName: subCat?.name,
      transactionType: _currentTxType,
      amount: _manualAmount.toDouble(),
      date: dateStr,
      payeeVendor: _payee.trim().isNotEmpty ? _payee.trim() : null,
      description: _description.trim().isNotEmpty ? _description.trim() : parentCat?.name,
      isEssential: true,
      eventTripId: _selectedEventTripId,
      forMemberName: _forMemberName,
      isExcludedFromReport: _isExcludedFromReport,
      location: _location.trim().isNotEmpty ? _location.trim() : null,
    );

    if (isEditing) {
      await _financeService.updateTransaction(widget.initialTransaction!, tx);
    } else {
      await _financeService.createTransaction(tx, memberName: _selectedMemberName);
    }

    if (_selectedEventTripId != null && _currentTxType == TransactionType.EXPENSE) {
      await _eventTripService.addExpenseToTrip(_selectedEventTripId!, _manualAmount.toDouble());
    }

    if (!mounted) return;
    Navigator.pop(context);
    widget.onSaved();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text(isEditing ? '✓ Đã cập nhật giao dịch thành công!' : '✓ Đã ghi sổ thành công!'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    Color tabColor;
    if (_activeTab == 0) {
      tabColor = const Color(0xFFEF4444); // Expense Red
    } else if (_activeTab == 1) {
      tabColor = const Color(0xFF10B981); // Income Green
    } else if (_activeTab == 2) {
      tabColor = const Color(0xFF0284C7); // Transfer Blue
    } else {
      tabColor = const Color(0xFFF59E0B); // Debt Amber
    }

    return Container(
      padding: EdgeInsets.only(
        left: 18,
        right: 18,
        top: 14,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Top Header: Title & AI / Manual Mode Switcher
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.initialTransaction != null ? 'Chỉnh Sửa Giao Dịch' : 'Ghi Chép Thu Chi',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: () => setState(() => _manualMode = !_manualMode),
                  icon: Icon(_manualMode ? Icons.auto_awesome : Icons.edit_note, size: 16, color: const Color(0xFF0284C7)),
                  label: Text(
                    _manualMode ? 'Dùng AI ✨' : 'Thủ công ⌨️',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0284C7)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // 4 Top Segmented Tabs (MISA MoneyKeeper Style)
            if (_manualMode) ...[
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    _buildTabButton('Tiền chi', 0, const Color(0xFFEF4444)),
                    _buildTabButton('Tiền thu', 1, const Color(0xFF10B981)),
                    _buildTabButton('Chuyển khoản', 2, const Color(0xFF0284C7)),
                    _buildTabButton('Vay / Nợ', 3, const Color(0xFFF59E0B)),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Debt sub-types pills if Tab == 3
              if (_activeTab == 3) ...[
                Wrap(
                  spacing: 6,
                  children: [
                    _buildDebtSubPill('Cho vay', 'CHO_VAY'),
                    _buildDebtSubPill('Đi vay', 'DI_VAY'),
                    _buildDebtSubPill('Thu nợ', 'THU_NO'),
                    _buildDebtSubPill('Trả nợ', 'TRA_NO'),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ],

            // ==========================================
            // MODE A: AI NATURAL INPUT
            // ==========================================
            if (!_manualMode) ...[
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: _isListening
                        ? const Color(0xFFEF4444)
                        : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                    width: _isListening ? 2 : 1,
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _promptController,
                        decoration: const InputDecoration(
                          hintText: 'Nói hoặc gõ: Đổ 500k xăng, chi tiêu siêu thị 350k...',
                          hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                          border: InputBorder.none,
                        ),
                        onSubmitted: _handleProcessPrompt,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.camera_alt_outlined, color: Color(0xFF64748B)),
                      onPressed: _pickReceiptImage,
                    ),
                    IconButton(
                      icon: Icon(
                        _isListening ? Icons.mic : Icons.mic_none,
                        color: _isListening ? const Color(0xFFEF4444) : const Color(0xFF0284C7),
                      ),
                      onPressed: _toggleListening,
                    ),
                    IconButton(
                      icon: const Icon(Icons.arrow_upward_rounded, color: Color(0xFF0284C7)),
                      onPressed: () => _handleProcessPrompt(_promptController.text),
                    ),
                  ],
                ),
              ),

              if (_isListening) ...[
                const SizedBox(height: 8),
                const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.record_voice_over, size: 14, color: Color(0xFFEF4444)),
                    SizedBox(width: 6),
                    Text('Đang lắng nghe tiếng Việt...', style: TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
                  ],
                ),
              ],

              if (_isProcessingAI) ...[
                const SizedBox(height: 20),
                const Center(
                  child: Column(
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 10),
                      Text('AI đang bóc tách giao dịch...', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
              ],

              if (_currentDraft != null && !_isProcessingAI) ...[
                const SizedBox(height: 14),
                AIActionCardWidget(
                  draft: _currentDraft!,
                  categories: _allCategories,
                  wallets: _wallets,
                  members: _members,
                  currencyFmt: _currencyFmt,
                  onConfirmed: _confirmDraft,
                  onChanged: (updated) => setState(() => _currentDraft = updated),
                  onDismiss: () => setState(() => _currentDraft = null),
                ),
              ],
            ]

            // ==========================================
            // MODE B: FULL MANUAL 4-TAB INPUT (MISA MoneyKeeper)
            // ==========================================
            else ...[
              // 1. Amount Display with Interactive Calculator Keypad
              GestureDetector(
                onTap: () => setState(() => _showCalculator = !_showCalculator),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: tabColor.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: _showCalculator ? tabColor : Colors.transparent,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _currencyFmt.format(_manualAmount),
                        style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: tabColor),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        _showCalculator ? Icons.keyboard_hide_outlined : Icons.calculate_outlined,
                        color: tabColor,
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),

              if (_showCalculator) ...[
                CalculatorKeypadWidget(
                  initialAmount: _manualAmount.toDouble(),
                  onAmountChanged: (val) => setState(() => _manualAmount = val.toInt()),
                  onDone: () => setState(() => _showCalculator = false),
                ),
                const SizedBox(height: 10),
              ] else ...[
                // Quick Amount Presets
                Wrap(
                  alignment: WrapAlignment.center,
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildPresetChip('+20k', 20000),
                    _buildPresetChip('+50k', 50000),
                    _buildPresetChip('+100k', 100000),
                    _buildPresetChip('+500k', 500000),
                    _buildPresetChip('+1Tr', 1000000),
                    ActionChip(label: const Text('Xoá'), onPressed: () => setState(() => _manualAmount = 0)),
                  ],
                ),
                const SizedBox(height: 12),
              ],

              // 2. Category Picker (Only for Expense, Income, Debt)
              if (_activeTab != 2) ...[
                InkWell(
                  onTap: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (ctx) => CategoryPickerModal(
                        initialType: _currentTxType,
                        selectedCategoryId: _selectedSubCategoryId ?? _selectedParentCategoryId,
                        onCategorySelected: (cat) {
                          setState(() {
                            if (cat.isParent) {
                              _selectedParentCategoryId = cat.id;
                              _selectedSubCategoryId = null;
                            } else {
                              _selectedParentCategoryId = cat.parentId;
                              _selectedSubCategoryId = cat.id;
                            }
                          });
                        },
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
                      ),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.grid_view, size: 22, color: tabColor),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('HẠNG MỤC THU / CHI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                              const SizedBox(height: 2),
                              Text(
                                _selectedSubCategoryName != null
                                    ? '${_selectedParentCategoryName ?? "Mục"} › $_selectedSubCategoryName'
                                    : (_selectedParentCategoryName ?? 'Chạm để chọn hạng mục'),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: tabColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text('Đổi mục', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: tabColor)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Subcategory Chips
                if (_currentSubCategories.isNotEmpty) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ChoiceChip(
                        showCheckmark: false,
                        label: const Text('Mục chung', style: TextStyle(fontSize: 11)),
                        selected: _selectedSubCategoryId == null,
                        onSelected: (selected) {
                          if (selected) setState(() => _selectedSubCategoryId = null);
                        },
                      ),
                      ..._currentSubCategories.map((sc) {
                        final isSelected = _selectedSubCategoryId == sc.id;
                        return ChoiceChip(
                          showCheckmark: false,
                          label: Text(sc.name, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                          selected: isSelected,
                          selectedColor: tabColor.withValues(alpha: 0.2),
                          onSelected: (selected) => setState(() => _selectedSubCategoryId = selected ? sc.id : null),
                        );
                      }),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
              ],

              // 3. Wallets Selection
              if (_activeTab == 2) ...[
                // Transfer Mode: Source & Destination Wallets
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedWalletId,
                        decoration: const InputDecoration(labelText: 'Từ ví nguồn *', border: OutlineInputBorder()),
                        items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (v) => setState(() => _selectedWalletId = v),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _toWalletId,
                        decoration: const InputDecoration(labelText: 'Đến ví đích *', border: OutlineInputBorder()),
                        items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (v) => setState(() => _toWalletId = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
              ] else ...[
                // Expense / Income: Single Wallet
                DropdownButtonFormField<String>(
                  initialValue: _selectedWalletId,
                  decoration: const InputDecoration(labelText: 'Tài khoản / Ví thanh toán *', border: OutlineInputBorder()),
                  items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name))).toList(),
                  onChanged: (v) => setState(() => _selectedWalletId = v),
                ),
                const SizedBox(height: 10),
              ],

              // 4. Date & Time Picker Bar
              InkWell(
                onTap: _selectDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time_filled, size: 18, color: Color(0xFF0284C7)),
                      const SizedBox(width: 10),
                      Text(
                        DateFormat('HH:mm - EEEE, dd/MM/yyyy', 'vi_VN').format(_selectedDateTime),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      const Spacer(),
                      const Text('Đổi ngày giờ', style: TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // 5. Beneficiary & Member Attribution
              if (_activeTab != 2) ...[
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _selectedMemberName,
                        decoration: const InputDecoration(labelText: 'Người thực hiện', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                        items: _members.map((m) => DropdownMenuItem(value: m.name, child: Text(m.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))).toList(),
                        onChanged: (v) => setState(() => _selectedMemberName = v),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _forMemberName ?? 'Cả gia đình',
                        decoration: const InputDecoration(labelText: 'Chi cho ai', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                        items: [
                          const DropdownMenuItem(value: 'Cả gia đình', child: Text('Cả gia đình', style: TextStyle(fontSize: 12))),
                          ..._members.map((m) => DropdownMenuItem(value: m.name, child: Text(m.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))),
                        ],
                        onChanged: (v) => setState(() => _forMemberName = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Event / Trip tag
                if (_eventTrips.isNotEmpty) ...[
                  DropdownButtonFormField<String?>(
                    initialValue: _selectedEventTripId,
                    decoration: const InputDecoration(
                      labelText: 'Gắn thẻ Chuyến đi / Sự kiện (tuỳ chọn)',
                      prefixIcon: Icon(Icons.beach_access_outlined, size: 20, color: Color(0xFFF59E0B)),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('(Không gắn sự kiện)', style: TextStyle(color: Colors.grey))),
                      ..._eventTrips.map((t) => DropdownMenuItem(value: t.id, child: Text('🏖️ ${t.name}'))),
                    ],
                    onChanged: (v) => setState(() => _selectedEventTripId = v),
                  ),
                  const SizedBox(height: 10),
                ],
              ],

              // 6. Payee / Description / Location
              TextField(
                controller: TextEditingController(text: _payee),
                decoration: InputDecoration(
                  labelText: _activeTab == 1 ? 'Thu từ ai / Đơn vị' : 'Cửa hàng / Người nhận',
                  hintText: 'VD: Petrolimex, VinMart, Công ty...',
                  prefixIcon: const Icon(Icons.storefront_outlined, size: 20),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                onChanged: (v) => _payee = v,
              ),
              const SizedBox(height: 10),

              TextField(
                controller: TextEditingController(text: _location),
                decoration: const InputDecoration(
                  labelText: 'Địa điểm (tuỳ chọn)',
                  hintText: 'VD: Quận 1, Trạm dừng chân, Siêu thị...',
                  prefixIcon: Icon(Icons.location_on_outlined, size: 20),
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                onChanged: (v) => _location = v,
              ),
              const SizedBox(height: 10),

              TextField(
                controller: TextEditingController(text: _description),
                decoration: const InputDecoration(
                  labelText: 'Diễn giải / Ghi chú chi tiết',
                  hintText: 'VD: Đổ xăng đi làm, mua quà sinh nhật...',
                  prefixIcon: Icon(Icons.edit_note, size: 20),
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                onChanged: (v) => _description = v,
              ),
              const SizedBox(height: 10),

              // 7. MISA Flag: "Không tính vào báo cáo"
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Không tính vào báo cáo', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                subtitle: const Text('Dành cho khoản chi hộ, tạm ứng hoặc vay mượn', style: TextStyle(fontSize: 11, color: Colors.grey)),
                value: _isExcludedFromReport,
                activeThumbColor: const Color(0xFFF59E0B),
                onChanged: (val) => setState(() => _isExcludedFromReport = val),
              ),
              const SizedBox(height: 16),

              // 8. Submit Button
              ElevatedButton.icon(
                onPressed: _saveTransaction,
                icon: const Icon(Icons.check, size: 18),
                style: ElevatedButton.styleFrom(
                  backgroundColor: tabColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                label: Text(
                  widget.initialTransaction != null ? 'Cập Nhật Giao Dịch' : 'Lưu Giao Dịch Này',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTabButton(String label, int index, Color color) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _activeTab = index;
            _selectedParentCategoryId = _parentCategories.isNotEmpty ? _parentCategories.first.id : null;
            _selectedSubCategoryId = null;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : Colors.grey,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDebtSubPill(String label, String code) {
    final isSelected = _debtSubType == code;
    return ChoiceChip(
      showCheckmark: false,
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: const Color(0xFFF59E0B).withValues(alpha: 0.25),
      onSelected: (selected) {
        if (selected) setState(() => _debtSubType = code);
      },
    );
  }

  Widget _buildPresetChip(String label, int val) {
    return ActionChip(
      label: Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
      onPressed: () => setState(() => _manualAmount += val),
    );
  }
}

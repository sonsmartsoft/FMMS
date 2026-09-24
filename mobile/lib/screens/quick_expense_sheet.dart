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

class QuickExpenseSheet extends StatefulWidget {
  final VoidCallback onSaved;

  const QuickExpenseSheet({super.key, required this.onSaved});

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
  bool _manualMode = false;
  bool _showCalculator = false;
  AIActionDraft? _currentDraft;

  // Manual inputs
  int _manualAmount = 0;
  String? _selectedWalletId;
  String? _selectedParentCategoryId;
  String? _selectedSubCategoryId;
  String? _selectedMemberName;
  String? _forMemberName;
  String? _selectedEventTripId;
  String _payee = '';

  List<WalletModel> _wallets = [];
  List<TransactionCategoryModel> _allCategories = [];
  List<FamilyMemberModel> _members = [];
  List<EventTripModel> _eventTrips = [];

  List<TransactionCategoryModel> get _parentCategories =>
      _allCategories.where((c) => c.isParent && c.type == TransactionType.EXPENSE).toList();

  List<TransactionCategoryModel> get _currentSubCategories {
    if (_selectedParentCategoryId == null) return [];
    return _allCategories.where((c) => c.parentId == _selectedParentCategoryId).toList();
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
      if (_wallets.isNotEmpty) _selectedWalletId = _wallets.first.id;
      if (_parentCategories.isNotEmpty) {
        _selectedParentCategoryId = _parentCategories.first.id;
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
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text(
                'QUÉT HOÁ ĐƠN BẰNG AI VISION',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.camera_alt, color: Color(0xFF0284C7)),
                ),
                title: const Text('Chụp ảnh hoá đơn mới', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Chụp từ camera quán ăn, siêu thị', style: TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () {
                  Navigator.pop(ctx);
                  _processReceiptSource(ImageSource.camera);
                },
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.photo_library, color: Color(0xFF10B981)),
                ),
                title: const Text('Chọn ảnh từ thư viện', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Tải ảnh hoá đơn đã có sẵn', style: TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () {
                  Navigator.pop(ctx);
                  _processReceiptSource(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Future<void> _processReceiptSource(ImageSource source) async {
    final XFile? image = await _picker.pickImage(source: source, imageQuality: 85);
    if (image != null) {
      setState(() => _isProcessingAI = true);
      try {
        final bytes = await image.readAsBytes();
        final receipt = await _aiService.scanReceipt(imageBytes: bytes);
        final draft = _aiService.convertReceiptToDraft(receipt);

        setState(() {
          _currentDraft = draft;
          _isProcessingAI = false;
        });
      } catch (_) {
        setState(() => _isProcessingAI = false);
      }
    }
  }

  Future<void> _confirmDraft(AIActionDraft draft) async {
    final wallet = _wallets.firstWhere(
      (w) => w.name == draft.walletName,
      orElse: () => _wallets.isNotEmpty ? _wallets.first : WalletModel(id: 'w-1', name: 'Tiền mặt gia đình', walletType: WalletType.CASH, currentBalance: 0),
    );

    // Find parent category
    final parentCat = _parentCategories.firstWhere(
      (c) => c.name == draft.categoryName,
      orElse: () => _parentCategories.isNotEmpty ? _parentCategories.first : TransactionCategoryModel(id: 'cat-food', name: 'Ăn uống & Đi chợ', type: TransactionType.EXPENSE),
    );

    // Find subcategory if specified
    TransactionCategoryModel? subCat;
    if (draft.subCategoryName != null) {
      final matches = _allCategories.where((c) => c.name == draft.subCategoryName);
      if (matches.isNotEmpty) subCat = matches.first;
    }

    final tx = FamilyTransactionModel(
      id: '',
      walletId: wallet.id,
      categoryId: parentCat.id,
      subCategoryId: subCat?.id,
      subCategoryName: subCat?.name ?? draft.subCategoryName,
      transactionType: TransactionType.EXPENSE,
      amount: draft.amount,
      date: draft.date,
      payeeVendor: draft.payeeVendor,
      description: draft.description,
      isEssential: draft.isEssential,
    );

    final success = await _financeService.createTransaction(tx, memberName: draft.memberName);

    if (!mounted) return;
    Navigator.pop(context);
    widget.onSaved();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text(success ? '✓ Đã ghi sổ cho ${draft.memberName} thành công!' : 'Đã lưu offline, sẽ tự đồng bộ!'),
      ),
    );
  }

  Future<void> _saveManualExpense() async {
    if (_manualAmount <= 0 || _selectedWalletId == null || _selectedParentCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập số tiền và chọn danh mục')),
      );
      return;
    }

    final parentCat = _allCategories.firstWhere((c) => c.id == _selectedParentCategoryId);
    TransactionCategoryModel? subCat;
    if (_selectedSubCategoryId != null) {
      final matches = _allCategories.where((c) => c.id == _selectedSubCategoryId);
      if (matches.isNotEmpty) subCat = matches.first;
    }

    final tx = FamilyTransactionModel(
      id: '',
      walletId: _selectedWalletId!,
      categoryId: parentCat.id,
      categoryName: parentCat.name,
      subCategoryId: subCat?.id,
      subCategoryName: subCat?.name,
      transactionType: TransactionType.EXPENSE,
      amount: _manualAmount.toDouble(),
      date: DateTime.now().toIso8601String().split('T').first,
      payeeVendor: _payee.trim().isNotEmpty ? _payee.trim() : null,
      description: _payee.trim().isNotEmpty ? _payee.trim() : parentCat.name,
      isEssential: true,
      eventTripId: _selectedEventTripId,
      forMemberName: _forMemberName,
    );

    final success = await _financeService.createTransaction(tx, memberName: _selectedMemberName);

    if (_selectedEventTripId != null) {
      await _eventTripService.addExpenseToTrip(_selectedEventTripId!, _manualAmount.toDouble());
    }

    if (!mounted) return;
    Navigator.pop(context);
    widget.onSaved();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        content: Text(success ? '✓ Đã lưu thành công cho $_selectedMemberName!' : 'Đã lưu offline!'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
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
            const SizedBox(height: 14),

            // Header Mode Switcher
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome, size: 18, color: Color(0xFF0284C7)),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _manualMode ? 'Bàn Phím Ghi Nhanh' : 'Nhờ AI Ghi Sổ Thông Minh',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => setState(() => _manualMode = !_manualMode),
                  child: Text(
                    _manualMode ? 'Dùng AI ✨' : 'Thủ công ⌨️',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // MODE A: AI ASSISTANT (Default)
            if (!_manualMode) ...[
              // Prompt Input with Voice & Camera shortcuts
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
                          hintText: 'Nói hoặc gõ: Đổ 500k xăng, đi chợ 250k...',
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
                    Text('Đang lắng nghe tiếng Việt... Hãy nói câu thu chi của bạn', style: TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
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
                      Text('AI đang bóc tách khoản chi & danh mục...', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
              ],

              // Show AI Action Draft Card if parsed
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

              // Suggestion Pills
              if (_currentDraft == null && !_isProcessingAI) ...[
                const SizedBox(height: 16),
                const Text('GỢI Ý MẪU', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.8)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildPromptChip('Đổ 500k xăng xe Mazda'),
                    _buildPromptChip('Đi chợ siêu thị 280k'),
                    _buildPromptChip('Nạp 300k VETC'),
                    _buildPromptChip('Uống cafe 45k'),
                    _buildPromptChip('Đóng tiền điện 1tr2'),
                  ],
                ),
              ],
            ]

            // MODE B: MANUAL INPUT (With Calculator & Subcategories)
            else ...[
              // Amount Display with Calculator Toggle
              GestureDetector(
                onTap: () => setState(() => _showCalculator = !_showCalculator),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  margin: const EdgeInsets.only(bottom: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _showCalculator ? const Color(0xFFEF4444) : Colors.transparent,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _currencyFmt.format(_manualAmount),
                        style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFFEF4444)),
                      ),
                      const SizedBox(width: 8),
                      Icon(
                        _showCalculator ? Icons.keyboard_hide_outlined : Icons.calculate_outlined,
                        color: const Color(0xFFEF4444),
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),

              // Interactive Calculator Keypad (MISA MoneyKeeper Style)
              if (_showCalculator) ...[
                CalculatorKeypadWidget(
                  initialAmount: _manualAmount.toDouble(),
                  onAmountChanged: (val) => setState(() => _manualAmount = val.toInt()),
                  onDone: () => setState(() => _showCalculator = false),
                ),
                const SizedBox(height: 10),
              ] else ...[
                // Presets & Calculator button
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
                    ActionChip(
                      avatar: const Icon(Icons.calculate, size: 16, color: Color(0xFF0284C7)),
                      label: const Text('Máy tính', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                      onPressed: () => setState(() => _showCalculator = true),
                    ),
                    ActionChip(label: const Text('Xoá'), onPressed: () => setState(() => _manualAmount = 0)),
                  ],
                ),
                const SizedBox(height: 14),
              ],

              // Row 1: Member & Beneficiary (Người chi & Chi cho ai)
              Row(
                children: [
                  // Người chi
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _selectedMemberName,
                      decoration: const InputDecoration(labelText: 'Người chi', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: _members.map((m) => DropdownMenuItem(value: m.name, child: Text(m.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: (v) => setState(() => _selectedMemberName = v),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Chi cho ai (Beneficiary)
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _forMemberName ?? 'Cả gia đình',
                      decoration: const InputDecoration(labelText: 'Chi cho ai', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: [
                        const DropdownMenuItem(value: 'Cả gia đình', child: Text('Cả gia đình', style: TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)),
                        ..._members.map((m) => DropdownMenuItem(value: m.name, child: Text(m.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))),
                      ],
                      onChanged: (v) => setState(() => _forMemberName = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Row 2: Wallet & Event / Trip Picker
              Row(
                children: [
                  // Wallet
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _selectedWalletId,
                      decoration: const InputDecoration(labelText: 'Ví thanh toán', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: _wallets.map((w) => DropdownMenuItem(value: w.id, child: Text(w.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))).toList(),
                      onChanged: (v) => setState(() => _selectedWalletId = v),
                    ),
                  ),
                  const SizedBox(width: 10),
                  // Chuyến đi / Sự kiện
                  Expanded(
                    child: DropdownButtonFormField<String?>(
                      initialValue: _selectedEventTripId,
                      decoration: const InputDecoration(labelText: 'Chuyến đi / Dịp', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Không gắn dịp', style: TextStyle(fontSize: 12, color: Colors.grey))),
                        ..._eventTrips.map((t) => DropdownMenuItem(value: t.id, child: Text(t.name, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis))),
                      ],
                      onChanged: (v) => setState(() => _selectedEventTripId = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // 1. Main Category Picker
              DropdownButtonFormField<String>(
                initialValue: _selectedParentCategoryId,
                decoration: const InputDecoration(
                  labelText: '1. Danh mục chính',
                  prefixIcon: Icon(Icons.category_outlined, size: 20),
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                items: _parentCategories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name, style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (v) {
                  setState(() {
                    _selectedParentCategoryId = v;
                    _selectedSubCategoryId = null; // reset subcategory on parent change
                  });
                },
              ),

              // 2. Subcategory (Tier 2 Chips)
              if (_currentSubCategories.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.subdirectory_arrow_right, size: 16, color: Color(0xFF0284C7)),
                    const SizedBox(width: 4),
                    const Text(
                      '2. Chọn danh mục con (chi tiết):',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    // All / General option
                    ChoiceChip(
                      label: const Text('Chung', style: TextStyle(fontSize: 11)),
                      selected: _selectedSubCategoryId == null,
                      onSelected: (selected) {
                        if (selected) setState(() => _selectedSubCategoryId = null);
                      },
                    ),
                    ..._currentSubCategories.map((sc) {
                      final isSelected = _selectedSubCategoryId == sc.id;
                      return ChoiceChip(
                        label: Text(sc.name, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                        selected: isSelected,
                        selectedColor: const Color(0xFF0284C7).withValues(alpha: 0.2),
                        onSelected: (selected) {
                          setState(() {
                            _selectedSubCategoryId = selected ? sc.id : null;
                          });
                        },
                      );
                    }),
                  ],
                ),
              ],

              const SizedBox(height: 12),

              TextField(
                decoration: const InputDecoration(
                  labelText: 'Nội dung chi / Cửa hàng',
                  hintText: 'VD: Cây xăng Petrolimex, Chợ Tân Bình...',
                  prefixIcon: Icon(Icons.edit_note, size: 20),
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                ),
                onChanged: (v) => _payee = v,
              ),
              const SizedBox(height: 16),

              ElevatedButton.icon(
                onPressed: _saveManualExpense,
                icon: const Icon(Icons.check, size: 18),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0284C7),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                label: const Text('Lưu Khoản Chi Này', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildPromptChip(String prompt) {
    return ActionChip(
      label: Text(prompt, style: const TextStyle(fontSize: 11)),
      onPressed: () {
        _promptController.text = prompt;
        _handleProcessPrompt(prompt);
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

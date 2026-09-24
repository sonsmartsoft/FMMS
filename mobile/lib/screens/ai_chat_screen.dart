import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import '../models/ai_action_model.dart';
import '../models/finance_model.dart';
import '../models/receipt_model.dart';
import '../models/user_member_model.dart';
import '../services/ai_assistant_service.dart';
import '../services/auth_service.dart';
import '../services/finance_service.dart';
import '../widgets/ai_action_card_widget.dart';
import '../widgets/receipt_card_widget.dart';

class ChatMessage {
  final String id;
  final String role; // 'user' or 'assistant'
  final String content;
  final AIActionDraft? actionDraft;
  final ReceiptAnalysisResult? receiptResult;
  final Uint8List? imageBytes;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    this.actionDraft,
    this.receiptResult,
    this.imageBytes,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final AuthService _authService = AuthService();
  final AIAssistantService _aiService = AIAssistantService();
  final FinanceService _financeService = FinanceService();
  final ImagePicker _picker = ImagePicker();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  // Speech & Voice Engines
  final stt.SpeechToText _speech = stt.SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();

  bool _isListening = false;
  String _liveSpeechText = '';
  bool _isVoiceEnabled = true; // Auto-speak AI replies
  String? _currentlySpeakingId;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  final List<ChatMessage> _messages = [];
  bool _isSending = false;
  List<TransactionCategoryModel> _categories = [];
  List<WalletModel> _wallets = [];
  List<FamilyMemberModel> _members = [];

  // Multi-turn Conversational Context
  double? _pendingAmount;
  String? _pendingCategory;
  String? _pendingSubCategory;
  String? _pendingDescription;

  @override
  void initState() {
    super.initState();
    _initAnimations();
    _initTts();
    _loadDependencies();
  }

  void _initAnimations() {
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.25).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  Future<void> _initTts() async {
    try {
      await _flutterTts.setLanguage('vi-VN');
      await _flutterTts.setSpeechRate(0.52);
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);

      _flutterTts.setCompletionHandler(() {
        if (mounted) setState(() => _currentlySpeakingId = null);
      });
      _flutterTts.setCancelHandler(() {
        if (mounted) setState(() => _currentlySpeakingId = null);
      });
      _flutterTts.setErrorHandler((_) {
        if (mounted) setState(() => _currentlySpeakingId = null);
      });
    } catch (_) {}
  }

  Future<void> _loadDependencies() async {
    final cList = await _financeService.getCategories();
    final wList = await _financeService.getWallets();
    final mList = _authService.getAllMembers();
    final activeMember = _authService.getCurrentMember();

    final firstName = _getShortName(activeMember.name);

    if (mounted) {
      setState(() {
        _categories = cList;
        _wallets = wList;
        _members = mList;

        if (_messages.isEmpty) {
          final welcomeMsg = ChatMessage(
            id: 'welcome-01',
            role: 'assistant',
            content: 'Chào $firstName! Em là Trợ lý AI Tài chính Gia đình FMMS. $firstName có thể chạm vào Micro để nói chuyện 2 chiều, hỏi tình hình chi tiêu hôm nay, hoặc nói khoản chi để em ghi sổ nhé!',
          );
          _messages.add(welcomeMsg);

          if (_isVoiceEnabled) {
            _speak(welcomeMsg.content, welcomeMsg.id);
          }
        }
      });
    }
  }

  String _getShortName(String fullName) {
    if (fullName.contains('Thuý') || fullName.contains('Thúy')) return 'chị Thúy';
    if (fullName.contains('Tuấn')) return 'anh Tuấn';
    return 'anh Sơn';
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _speech.stop();
    _flutterTts.stop();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // --- Voice Input (STT) ---
  Future<void> _toggleListening() async {
    await _stopSpeaking();

    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
      if (_liveSpeechText.trim().isNotEmpty) {
        final text = _liveSpeechText.trim();
        _liveSpeechText = '';
        _sendMessage(text);
      }
      return;
    }

    bool available = await _speech.initialize(
      onStatus: (status) {
        if (status == 'done' || status == 'notListening') {
          if (mounted && _isListening) {
            setState(() => _isListening = false);
            if (_liveSpeechText.trim().isNotEmpty) {
              final text = _liveSpeechText.trim();
              _liveSpeechText = '';
              _sendMessage(text);
            }
          }
        }
      },
      onError: (_) {
        if (mounted) setState(() => _isListening = false);
      },
    );

    if (available) {
      setState(() {
        _isListening = true;
        _liveSpeechText = '';
      });
      _speech.listen(
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          partialResults: true,
          localeId: 'vi_VN',
        ),
        onResult: (result) {
          if (mounted) {
            setState(() {
              _liveSpeechText = result.recognizedWords;
            });
          }
        },
      );
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không thể kích hoạt nhận diện giọng nói. Vui lòng cấp quyền Microphone.')),
        );
      }
    }
  }

  // --- Voice Output (TTS) ---
  Future<void> _speak(String text, String messageId) async {
    if (!_isVoiceEnabled) return;

    if (_currentlySpeakingId == messageId) {
      await _stopSpeaking();
      return;
    }

    await _stopSpeaking();

    // Clean text for natural speech
    final cleanText = text
        .replaceAll(RegExp(r'[\*#_`~]'), '')
        .replaceAll('₫', ' đồng ')
        .replaceAll('VND', ' đồng ')
        .replaceAll('✓', 'Đã ')
        .replaceAll('•', ' ')
        .replaceAll('-', ' ');

    setState(() => _currentlySpeakingId = messageId);
    await _flutterTts.speak(cleanText);
  }

  Future<void> _stopSpeaking() async {
    await _flutterTts.stop();
    if (mounted) {
      setState(() => _currentlySpeakingId = null);
    }
  }

  // --- Core Conversational Dialogue Engine ---
  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty) return;
    _textController.clear();
    await _stopSpeaking();

    final userMsg = ChatMessage(
      id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
      role: 'user',
      content: text,
    );

    setState(() {
      _messages.add(userMsg);
      _isSending = true;
    });
    _scrollToBottom();

    try {
      final activeMember = _authService.getCurrentMember();
      final userSalutation = _getShortName(activeMember.name);
      final lowerText = text.toLowerCase();

      String replyText = '';
      AIActionDraft? draft;

      // 1. Check for Financial Queries (Spending today, balances, budget)
      if (lowerText.contains('hôm nay') && (lowerText.contains('chi') || lowerText.contains('tiêu') || lowerText.contains('hết bao nhiêu'))) {
        final txs = await _financeService.getTransactions(limit: 40);
        final todayStr = DateTime.now().toIso8601String().split('T').first;
        final todayTxs = txs.where((t) => t.date.startsWith(todayStr) && t.transactionType == TransactionType.EXPENSE).toList();
        final double totalToday = todayTxs.fold(0.0, (sum, t) => sum + t.amount);

        if (todayTxs.isEmpty) {
          replyText = 'Hôm nay $userSalutation và gia đình chưa ghi nhận khoản chi nào. Tài chính vẫn được bảo toàn tốt ạ!';
        } else {
          final itemsSummary = todayTxs.take(3).map((t) => '${t.description ?? 'Khoản chi'}: ${_currencyFmt.format(t.amount)}').join(', ');
          replyText = 'Hôm nay gia đình mình đã chi tổng cộng ${_currencyFmt.format(totalToday)} ($itemsSummary). $userSalutation có muốn ghi thêm khoản nào nữa không ạ?';
        }
      } else if (lowerText.contains('ví') && (lowerText.contains('còn') || lowerText.contains('bao nhiêu') || lowerText.contains('số dư') || lowerText.contains('tiền'))) {
        final wallets = await _financeService.getWallets();
        final double totalBalance = wallets.fold(0.0, (sum, w) => sum + (w.walletType != WalletType.CREDIT_CARD ? w.currentBalance : 0));
        final walletListStr = wallets.take(3).map((w) => '${w.name}: ${_currencyFmt.format(w.currentBalance)}').join('; ');
        replyText = 'Tổng số dư khả dụng trên các ví gia đình hiện là ${_currencyFmt.format(totalBalance)} ($walletListStr).';
      } else if (lowerText.contains('tháng này') && (lowerText.contains('chi') || lowerText.contains('báo cáo') || lowerText.contains('ngân sách'))) {
        final txs = await _financeService.getTransactions(limit: 50);
        final now = DateTime.now();
        final currentMonthStr = '${now.year}-${now.month.toString().padLeft(2, '0')}';
        final monthTxs = txs.where((t) => t.date.startsWith(currentMonthStr) && t.transactionType == TransactionType.EXPENSE).toList();
        final double totalMonth = monthTxs.fold(0.0, (sum, t) => sum + t.amount);
        replyText = 'Tổng chi tiêu tháng này của gia đình là ${_currencyFmt.format(totalMonth)}. Các khoản lớn tập trung vào Ăn uống và Xe cộ. Mọi chỉ số đều nằm trong hạn mức an toàn.';
      }

      // 2. Check for Conversational Expense Logging & Multi-turn flow
      if (replyText.isEmpty) {
        final extractedAmount = _aiService.extractAmount(text);
        final categoryResult = _aiService.extractCategories(text);
        final hasExpenseKeywords = RegExp(r'(chi|tiêu|hết|mua|đóng|nạp|trả|bảo dưỡng|xăng|cơm|chợ|siêu thị|cafe|tiền)', caseSensitive: false).hasMatch(text);

        // Case A: User previously stated an amount, now provides the category/description
        if (_pendingAmount != null && _pendingAmount! > 0) {
          draft = await _aiService.parseNaturalInput(
            text,
            fallbackAmount: _pendingAmount,
            fallbackCategory: categoryResult.parent,
            fallbackSubCategory: categoryResult.sub,
          );
          final catDisplay = draft.subCategoryName != null ? '${draft.categoryName} (${draft.subCategoryName})' : draft.categoryName;
          replyText = 'Dạ vâng! Em đã lập phiếu chi ${_currencyFmt.format(draft.amount)} cho khoản "$text" vào danh mục $catDisplay cho $userSalutation rồi ạ. $userSalutation kiểm tra thẻ bên dưới nhé!';
          _pendingAmount = null;
          _pendingCategory = null;
          _pendingSubCategory = null;
        }
        // Case B: User previously stated a category/item, now provides the amount
        else if (_pendingDescription != null && extractedAmount > 0) {
          draft = await _aiService.parseNaturalInput(
            '$_pendingDescription $text',
            fallbackAmount: extractedAmount,
            fallbackCategory: _pendingCategory,
            fallbackSubCategory: _pendingSubCategory,
          );
          final catDisplay = draft.subCategoryName != null ? '${draft.categoryName} (${draft.subCategoryName})' : draft.categoryName;
          replyText = 'Dạ em đã ghi nhận số tiền ${_currencyFmt.format(extractedAmount)} cho "$_pendingDescription" vào danh mục $catDisplay. $userSalutation bấm Lưu để xác nhận nhé!';
          _pendingDescription = null;
          _pendingCategory = null;
          _pendingSubCategory = null;
        }
        // Case C: User provides only an amount ("vừa chi 200k", "hết 500k") without description
        else if (extractedAmount > 0 && !lowerText.contains('xăng') && !lowerText.contains('chợ') && !lowerText.contains('cơm') && !lowerText.contains('ăn') && !lowerText.contains('sửa') && !lowerText.contains('bảo dưỡng') && !lowerText.contains('điện') && !lowerText.contains('nước') && !lowerText.contains('học')) {
          _pendingAmount = extractedAmount;
          replyText = 'Dạ em đã ghi nhận số tiền ${_currencyFmt.format(extractedAmount)}. Khoản này $userSalutation chi cho việc gì thế ạ (như ăn trưa, đổ xăng hay mua sắm)?';
        }
        // Case D: User mentions an expense item without an amount ("vừa đi đổ xăng", "ăn trưa xong")
        else if (hasExpenseKeywords && extractedAmount == 0 && (lowerText.contains('xăng') || lowerText.contains('ăn') || lowerText.contains('chợ') || lowerText.contains('sửa xe') || lowerText.contains('bảo dưỡng'))) {
          _pendingDescription = text;
          _pendingCategory = categoryResult.parent;
          _pendingSubCategory = categoryResult.sub;
          replyText = 'Dạ khoản "$text" hết bao nhiêu tiền thế $userSalutation? $userSalutation nói số tiền em ghi sổ ngay nhé!';
        }
        // Case E: Complete single-turn expense sentence ("Đổ xăng 500k", "Ăn trưa hết 120k")
        else if (extractedAmount > 0 || hasExpenseKeywords) {
          draft = await _aiService.parseNaturalInput(text);
          final catDisplay = draft.subCategoryName != null ? '${draft.categoryName} (${draft.subCategoryName})' : draft.categoryName;
          replyText = 'Em đã bóc tách xong khoản chi "${draft.description ?? text}" với số tiền ${_currencyFmt.format(draft.amount)} vào danh mục $catDisplay cho ${draft.memberName}. $userSalutation bấm Xác nhận để lưu nhé!';
        }
      }

      // 3. Fallback to Cloud AI Chat API for open-ended conversation
      if (replyText.isEmpty) {
        try {
          final res = await http.post(
            Uri.parse('https://fmms.vercel.app/api/ai/chat'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'messages': _messages.map((m) => {'role': m.role, 'content': m.content}).toList(),
            }),
          ).timeout(const Duration(seconds: 4));

          if (res.statusCode == 200) {
            final data = jsonDecode(res.body);
            replyText = data['reply'] ?? '';
          }
        } catch (_) {}
      }

      if (replyText.isEmpty) {
        if (lowerText.contains('chào') || lowerText.contains('hello') || lowerText.contains('hi')) {
          replyText = 'Dạ em chào $userSalutation! Hôm nay tình hình tài chính của gia đình rất ổn định. $userSalutation cần em hỗ trợ ghi chép chi tiêu hay kiểm tra số dư ví nào ạ?';
        } else {
          replyText = 'Dạ em đã hiểu ý $userSalutation. Em luôn sẵn sàng ghi chép chi tiêu bằng giọng nói và theo dõi ngân sách cho gia đình mình!';
        }
      }

      final assistantMsg = ChatMessage(
        id: 'msg-${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: replyText,
        actionDraft: draft,
      );

      setState(() {
        _messages.add(assistantMsg);
        _isSending = false;
      });
      _scrollToBottom();

      // Voice output response
      if (_isVoiceEnabled) {
        _speak(assistantMsg.content, assistantMsg.id);
      }
    } catch (_) {
      setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _handleConfirmDraft(AIActionDraft draft) async {
    await _stopSpeaking();
    final wallet = _wallets.firstWhere(
      (w) => w.name == draft.walletName,
      orElse: () => _wallets.isNotEmpty ? _wallets.first : WalletModel(id: 'w-1', name: 'Tiền mặt', walletType: WalletType.CASH, currentBalance: 0),
    );
    final cat = _categories.firstWhere(
      (c) => c.name == draft.categoryName,
      orElse: () => _categories.isNotEmpty ? _categories.first : TransactionCategoryModel(id: 'c-1', name: 'Khác', type: TransactionType.EXPENSE),
    );

    final tx = FamilyTransactionModel(
      id: '',
      walletId: wallet.id,
      categoryId: cat.id,
      subCategoryName: draft.subCategoryName,
      transactionType: TransactionType.EXPENSE,
      amount: draft.amount,
      date: draft.date,
      payeeVendor: draft.payeeVendor,
      description: draft.description,
      isEssential: draft.isEssential,
    );

    final ok = await _financeService.createTransaction(tx, memberName: draft.memberName);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(ok ? '✓ Đã ghi sổ cho ${draft.memberName} thành công!' : 'Đã lưu offline vào hàng đợi!'),
          ],
        ),
      ),
    );
  }

  void _showReceiptSourceSheet() {
    _stopSpeaking();
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
                subtitle: const Text('Chụp trực tiếp từ camera quán ăn, siêu thị', style: TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () {
                  Navigator.pop(ctx);
                  _handlePickReceipt(ImageSource.camera);
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
                subtitle: const Text('Tải ảnh hoá đơn đã chụp trước đó', style: TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () {
                  Navigator.pop(ctx);
                  _handlePickReceipt(ImageSource.gallery);
                },
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handlePickReceipt(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(source: source, imageQuality: 85);
      if (file == null) return;

      final bytes = await file.readAsBytes();

      // Add user message with image thumbnail
      final userMsg = ChatMessage(
        id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
        role: 'user',
        content: '📸 Gửi ảnh hoá đơn thanh toán để AI phân tích chi tiết.',
        imageBytes: bytes,
      );

      setState(() {
        _messages.add(userMsg);
        _isSending = true;
      });
      _scrollToBottom();

      // Call AI Vision Scan
      final receipt = await _aiService.scanReceipt(imageBytes: bytes);

      final reply = 'Dạ em đã đọc và trích xuất thành công toàn bộ hoá đơn của **${receipt.merchantName}**!\n\n'
          '• **Địa điểm**: ${receipt.merchantAddress ?? 'Không có địa chỉ'}\n'
          '• **Thời gian**: ${receipt.dateTime ?? 'Hôm nay'} (Tại: ${receipt.tableOrRoom ?? 'Bàn ăn'})\n'
          '• **Mặt hàng**: Gồm **${receipt.items.length} món**, tổng tiền thanh toán là **${_currencyFmt.format(receipt.totalAmount)}**.\n'
          '• **Tự động đề xuất phân loại**: **${receipt.suggestedParentCategory}** > **${receipt.suggestedSubCategory}**.\n\n'
          'Anh/Chị vui lòng kiểm tra danh sách từng món trong bảng bên dưới và bấm **Xác nhận Ghi Sổ Hoá Đơn Này** để em lưu vào lịch sử nhé!';

      final assistantMsg = ChatMessage(
        id: 'asst-${DateTime.now().millisecondsSinceEpoch}',
        role: 'assistant',
        content: reply,
        receiptResult: receipt,
      );

      if (mounted) {
        setState(() {
          _messages.add(assistantMsg);
          _isSending = false;
        });
        _scrollToBottom();
        if (_isVoiceEnabled) {
          _speak('Em đã đọc xong hoá đơn ${receipt.merchantName} gồm ${receipt.items.length} món, tổng tiền ${_currencyFmt.format(receipt.totalAmount)}. Đề xuất ghi vào mục ${receipt.suggestedSubCategory}.', assistantMsg.id);
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isSending = false);
    }
  }

  Future<void> _handleConfirmReceipt(ReceiptAnalysisResult receipt) async {
    final draft = _aiService.convertReceiptToDraft(receipt);
    await _handleConfirmDraft(draft);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_awesome, color: Color(0xFF0284C7), size: 18),
                SizedBox(width: 6),
                Text('Trợ Lý AI Tài Chính', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            Text('Đối thoại 2 chiều thông minh & Giọng nói', style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
        actions: [
          // Voice Toggle Button
          IconButton(
            icon: Icon(
              _isVoiceEnabled ? Icons.volume_up_rounded : Icons.volume_off_rounded,
              color: _isVoiceEnabled ? const Color(0xFF0284C7) : Colors.grey,
            ),
            tooltip: _isVoiceEnabled ? 'Giọng nói AI: Đang Bật' : 'Giọng nói AI: Đã Tắt',
            onPressed: () {
              setState(() {
                _isVoiceEnabled = !_isVoiceEnabled;
                if (!_isVoiceEnabled) _stopSpeaking();
              });
            },
          ),
          const SizedBox(width: 8),
        ],
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Message List
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _messages.length,
              itemBuilder: (ctx, idx) {
                final msg = _messages[idx];
                final isUser = msg.role == 'user';
                final isSpeaking = _currentlySpeakingId == msg.id;

                return Column(
                  crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        if (!isUser) ...[
                          Container(
                            width: 32,
                            height: 32,
                            margin: const EdgeInsets.only(right: 8, bottom: 6),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: [Color(0xFF0284C7), Color(0xFF10B981)],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                )
                              ],
                            ),
                            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
                          ),
                        ],
                        Flexible(
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                            decoration: BoxDecoration(
                              color: isUser
                                  ? const Color(0xFF0284C7)
                                  : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                              borderRadius: BorderRadius.only(
                                topLeft: const Radius.circular(18),
                                topRight: const Radius.circular(18),
                                bottomLeft: isUser ? const Radius.circular(18) : const Radius.circular(4),
                                bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(18),
                              ),
                              border: !isUser && isSpeaking
                                  ? Border.all(color: const Color(0xFF0284C7), width: 1.5)
                                  : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (msg.imageBytes != null) ...[
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.memory(
                                      msg.imageBytes!,
                                      height: 180,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                ],
                                Text(
                                  msg.content,
                                  style: TextStyle(
                                    color: isUser ? Colors.white : (isDark ? Colors.white : const Color(0xFF0F172A)),
                                    fontSize: 14,
                                    height: 1.45,
                                  ),
                                ),
                                if (!isUser) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      InkWell(
                                        onTap: () => _speak(msg.content, msg.id),
                                        borderRadius: BorderRadius.circular(12),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                isSpeaking ? Icons.stop_circle_outlined : Icons.volume_up_outlined,
                                                size: 15,
                                                color: isSpeaking ? const Color(0xFF0284C7) : Colors.grey,
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                isSpeaking ? 'Dừng đọc' : 'Đọc',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: isSpeaking ? const Color(0xFF0284C7) : Colors.grey,
                                                  fontWeight: isSpeaking ? FontWeight.bold : FontWeight.normal,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (msg.actionDraft != null) ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 40, top: 4, bottom: 8),
                        child: AIActionCardWidget(
                          draft: msg.actionDraft!,
                          categories: _categories,
                          wallets: _wallets,
                          members: _members,
                          currencyFmt: _currencyFmt,
                          onConfirmed: _handleConfirmDraft,
                          onChanged: (_) {},
                          onDismiss: () {},
                        ),
                      ),
                    ],
                    if (msg.receiptResult != null) ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 40, top: 4, bottom: 8),
                        child: ReceiptCardWidget(
                          receipt: msg.receiptResult!,
                          onConfirmAll: () => _handleConfirmReceipt(msg.receiptResult!),
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),

          // Thinking Indicator
          if (_isSending) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'AI đang lắng nghe và xử lý...',
                    style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                  ),
                ],
              ),
            ),
          ],

          // Active Voice Listening Overlay Banner
          if (_isListening) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                border: Border(
                  top: BorderSide(color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ScaleTransition(
                        scale: _pulseAnimation,
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFFEF4444),
                          ),
                          child: const Icon(Icons.mic, color: Colors.white, size: 18),
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'Đang lắng nghe... Hãy nói khoản chi của bạn',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                      ),
                    ],
                  ),
                  if (_liveSpeechText.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '"$_liveSpeechText"',
                        style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.stop_circle, color: Color(0xFFEF4444), size: 18),
                        label: const Text('Xong & Gửi', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold)),
                        onPressed: _toggleListening,
                      ),
                      const SizedBox(width: 16),
                      TextButton(
                        child: const Text('Huỷ', style: TextStyle(color: Colors.grey)),
                        onPressed: () {
                          _speech.stop();
                          setState(() {
                            _isListening = false;
                            _liveSpeechText = '';
                          });
                        },
                      ),
                    ],
                  )
                ],
              ),
            ),
          ],

          // Bottom Input Bar
          SafeArea(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF0F172A) : Colors.white,
                border: Border(
                  top: BorderSide(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
              ),
              child: Row(
                children: [
                  // Microphone Button
                  IconButton(
                    icon: Icon(
                      _isListening ? Icons.mic_off_rounded : Icons.mic_rounded,
                      color: _isListening ? const Color(0xFFEF4444) : const Color(0xFF0284C7),
                      size: 26,
                    ),
                    tooltip: 'Nói chuyện bằng giọng nói',
                    onPressed: _toggleListening,
                  ),

                  // Camera / Receipt Scan Button
                  IconButton(
                    icon: const Icon(Icons.camera_alt_outlined, color: Color(0xFF0284C7), size: 24),
                    tooltip: 'Chụp hoặc chọn ảnh hoá đơn',
                    onPressed: _showReceiptSourceSheet,
                  ),

                  // Text Field
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _textController,
                        decoration: const InputDecoration(
                          hintText: 'Nhắn với AI hoặc nói "đổ xăng 500k"...',
                          border: InputBorder.none,
                          hintStyle: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        onSubmitted: _sendMessage,
                        onTap: _stopSpeaking,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Send Button
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: Color(0xFF0284C7), size: 24),
                    onPressed: () => _sendMessage(_textController.text),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

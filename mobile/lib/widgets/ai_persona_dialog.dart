import 'package:flutter/material.dart';
import '../models/ai_persona_model.dart';
import '../models/user_member_model.dart';
import '../services/ai_assistant_service.dart';
import '../services/auth_service.dart';

class AIPersonaDialog extends StatefulWidget {
  final AIPersonaModel currentConfig;
  final Function(AIPersonaModel newConfig)? onSaved;
  final void Function(String speechText)? onTestVoice;

  const AIPersonaDialog({
    super.key,
    required this.currentConfig,
    this.onSaved,
    this.onTestVoice,
  });

  static Future<AIPersonaModel?> show(
    BuildContext context, {
    required AIPersonaModel currentConfig,
    Function(AIPersonaModel newConfig)? onSaved,
    void Function(String speechText)? onTestVoice,
  }) {
    return showModalBottomSheet<AIPersonaModel>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AIPersonaDialog(
        currentConfig: currentConfig,
        onSaved: onSaved,
        onTestVoice: onTestVoice,
      ),
    );
  }

  @override
  State<AIPersonaDialog> createState() => _AIPersonaDialogState();
}

class _AIPersonaDialogState extends State<AIPersonaDialog> {
  final AIAssistantService _aiService = AIAssistantService();
  final AuthService _authService = AuthService();

  late String _roleKey;
  late TextEditingController _customRoleController;
  late String _selfPronoun;
  late TextEditingController _customSelfController;
  late String _userTitlePattern;
  late TextEditingController _customUserTitleController;
  late String _tone;
  late String _language;
  late TextEditingController _customInstructionsController;

  late FamilyMemberModel _activeMember;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final c = widget.currentConfig;
    _roleKey = c.roleKey;
    _customRoleController = TextEditingController(text: c.customRolePrompt);
    _selfPronoun = c.selfPronoun;
    _customSelfController = TextEditingController(text: c.customSelfPronoun);
    _userTitlePattern = c.userTitlePattern;
    _customUserTitleController = TextEditingController(text: c.customUserTitle);
    _tone = c.tone;
    _language = c.language;
    _customInstructionsController = TextEditingController(text: c.customInstructions);

    _activeMember = _authService.getCurrentMember();
  }

  @override
  void dispose() {
    _customRoleController.dispose();
    _customSelfController.dispose();
    _customUserTitleController.dispose();
    _customInstructionsController.dispose();
    super.dispose();
  }

  AIPersonaModel _buildConfigFromState() {
    return AIPersonaModel(
      roleKey: _roleKey,
      customRolePrompt: _customRoleController.text.trim(),
      selfPronoun: _selfPronoun,
      customSelfPronoun: _customSelfController.text.trim(),
      userTitlePattern: _userTitlePattern,
      customUserTitle: _customUserTitleController.text.trim(),
      tone: _tone,
      language: _language,
      customInstructions: _customInstructionsController.text.trim(),
    );
  }

  Future<void> _handleSave() async {
    setState(() => _isSaving = true);
    final config = _buildConfigFromState();
    await _aiService.savePersonaConfig(config);
    if (mounted) {
      setState(() => _isSaving = false);
      widget.onSaved?.call(config);
      Navigator.pop(context, config);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✓ Đã lưu cấu hình vai trò & xưng hô AI thành công!'),
          backgroundColor: Color(0xFF10B981),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _handleReset() {
    final def = AIPersonaModel.defaultConfig();
    setState(() {
      _roleKey = def.roleKey;
      _customRoleController.clear();
      _selfPronoun = def.selfPronoun;
      _customSelfController.clear();
      _userTitlePattern = def.userTitlePattern;
      _customUserTitleController.clear();
      _tone = def.tone;
      _language = def.language;
      _customInstructionsController.clear();
    });
  }

  void _testVoiceSample() {
    final config = _buildConfigFromState();
    final salutation = config.resolveUserSalutation(_activeMember.name);
    final selfPronoun = config.resolveSelfPronoun();

    String sampleText = '';
    if (config.language == 'en') {
      sampleText = 'Hello $salutation! I am your AI Financial Advisor. How may I assist you with your finances today?';
    } else {
      final roleTitle = config.getRoleTitle();
      sampleText = 'Dạ, $selfPronoun là $roleTitle của gia đình. $selfPronoun đã sẵn sàng hỗ trợ $salutation quản lý chi tiêu rồi ạ!';
    }

    widget.onTestVoice?.call(sampleText);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentConfig = _buildConfigFromState();
    final firstName = AIPersonaModel.extractFirstName(_activeMember.name);
    final resolvedSalutation = currentConfig.resolveUserSalutation(_activeMember.name);
    final resolvedSelf = currentConfig.resolveSelfPronoun();
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = bottomInset > 0;

    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      behavior: HitTestBehavior.opaque,
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: EdgeInsets.only(bottom: bottomInset),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.90,
          ),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.psychology_rounded, color: Color(0xFF0284C7), size: 22),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Cấu Hình Vai Trò & AI Chat',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'Cá nhân hoá tính cách, xưng hô theo tài khoản',
                              style: TextStyle(
                                fontSize: 12,
                                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        if (isKeyboardOpen)
                          IconButton(
                            icon: const Icon(Icons.keyboard_hide_rounded, color: Color(0xFF0284C7)),
                            tooltip: 'Thu bàn phím',
                            onPressed: () => FocusScope.of(context).unfocus(),
                          ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Body Content
              Expanded(
                child: ListView(
                  keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  children: [
                // 1. User & Live Preview Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: isDark
                          ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                          : [const Color(0xFFE0F2FE), const Color(0xFFF0F9FF)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 16,
                            backgroundColor: const Color(0xFF0284C7),
                            child: Text(
                              firstName.isNotEmpty ? firstName[0].toUpperCase() : 'U',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      _activeMember.name,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'Đang đăng nhập',
                                        style: TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'AI tự xưng: "$resolvedSelf"  •  Gọi bạn: "$resolvedSalutation"',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 18),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF0284C7), size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              currentConfig.language == 'en'
                                  ? '"Good morning $resolvedSalutation! How can I assist you with today\'s budget?"'
                                  : '"Dạ $resolvedSelf chào $resolvedSalutation ạ! Hôm nay $resolvedSalutation cần $resolvedSelf kiểm tra ngân sách hay ghi sổ khoản nào không ạ?"',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontStyle: FontStyle.italic,
                                color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 2. Section: AI Role & Persona
                const Text(
                  '1. Chọn Vai Trò / Tính Cách AI',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Quyết định tư duy, phong thái phân tích và cách phản hồi của AI',
                  style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                const SizedBox(height: 10),

                _buildRoleOption(
                  keyId: 'advisor',
                  icon: Icons.account_balance_rounded,
                  title: 'FMMS Senior AI Wealth & Fleet Strategist (Khuyên dùng)',
                  desc: 'Cố vấn tài chính cấp cao, quản trị dòng tiền, tất toán dư nợ giảm dần, TCO/km và bảo dưỡng chủ động.',
                ),
                _buildRoleOption(
                  keyId: 'assistant',
                  icon: Icons.sentiment_satisfied_alt_rounded,
                  title: 'Trợ lý ảo chu đáo, dịu dàng',
                  desc: 'Ân cần, nhẹ nhàng, hỗ trợ ghi sổ nhanh, phù hợp cho gia đình ấm cúng.',
                ),
                _buildRoleOption(
                  keyId: 'accountant',
                  icon: Icons.gavel_rounded,
                  title: 'Kế toán trưởng nghiêm khắc',
                  desc: 'Kỷ luật tài chính cao, thẳng thắn cảnh báo các khoản chi tiêu lãng phí.',
                ),
                _buildRoleOption(
                  keyId: 'speed',
                  icon: Icons.bolt_rounded,
                  title: 'Trợ lý siêu tốc & súc tích',
                  desc: 'Phản hồi cực ngắn gọn dưới 2 câu, chỉ tập trung vào số liệu và xác nhận.',
                ),
                _buildRoleOption(
                  keyId: 'custom',
                  icon: Icons.tune_rounded,
                  title: 'Tự định nghĩa vai trò riêng...',
                  desc: 'Tự tay viết mô tả vai trò và tính cách mà bạn mong muốn.',
                ),

                if (_roleKey == 'custom') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customRoleController,
                    maxLines: 3,
                    textInputAction: TextInputAction.done,
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    onEditingComplete: () => FocusScope.of(context).unfocus(),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Nhập mô tả vai trò mong muốn (Ví dụ: Bạn là quản gia quý tộc người Anh, luôn phục vụ tôi chu đáo...)',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: Color(0xFF0284C7)),
                      ),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ],

                const SizedBox(height: 22),

                // 3. Section: Addressing & Pronouns
                const Text(
                  '2. Quy Tắc Xưng Hô Theo Tài Khoản',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Chọn cách AI tự xưng và cách AI gọi bạn (${_activeMember.name})',
                  style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),

                // AI Self Pronoun
                const Text(
                  'AI Tự Xưng Là:',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildChip(
                      label: 'Em (Mặc định)',
                      isSelected: _selfPronoun == 'em',
                      onTap: () => setState(() => _selfPronoun = 'em'),
                    ),
                    _buildChip(
                      label: 'Tôi',
                      isSelected: _selfPronoun == 'tôi',
                      onTap: () => setState(() => _selfPronoun = 'tôi'),
                    ),
                    _buildChip(
                      label: 'Mình',
                      isSelected: _selfPronoun == 'mình',
                      onTap: () => setState(() => _selfPronoun = 'mình'),
                    ),
                    _buildChip(
                      label: 'Trợ lý',
                      isSelected: _selfPronoun == 'trợ lý',
                      onTap: () => setState(() => _selfPronoun = 'trợ lý'),
                    ),
                    _buildChip(
                      label: 'Cháu',
                      isSelected: _selfPronoun == 'cháu',
                      onTap: () => setState(() => _selfPronoun = 'cháu'),
                    ),
                    _buildChip(
                      label: 'Tự nhập...',
                      isSelected: _selfPronoun == 'custom',
                      onTap: () => setState(() => _selfPronoun = 'custom'),
                    ),
                  ],
                ),
                if (_selfPronoun == 'custom') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customSelfController,
                    textInputAction: TextInputAction.done,
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    onEditingComplete: () => FocusScope.of(context).unfocus(),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Nhập ngôi xưng của AI (VD: em út, đệ tử, búp bê...)',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ],

                const SizedBox(height: 14),

                // User Salutation
                Text(
                  'AI Gọi Bạn (${_activeMember.name}) Là:',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildChip(
                      label: 'Tự động (anh / chị)',
                      isSelected: _userTitlePattern == 'auto',
                      onTap: () => setState(() => _userTitlePattern = 'auto'),
                    ),
                    _buildChip(
                      label: 'Anh $firstName',
                      isSelected: _userTitlePattern == 'Anh {name}',
                      onTap: () => setState(() => _userTitlePattern = 'Anh {name}'),
                    ),
                    _buildChip(
                      label: 'Chị $firstName',
                      isSelected: _userTitlePattern == 'Chị {name}',
                      onTap: () => setState(() => _userTitlePattern = 'Chị {name}'),
                    ),
                    _buildChip(
                      label: 'Sếp $firstName',
                      isSelected: _userTitlePattern == 'Sếp {name}',
                      onTap: () => setState(() => _userTitlePattern = 'Sếp {name}'),
                    ),
                    _buildChip(
                      label: 'Bạn $firstName',
                      isSelected: _userTitlePattern == 'Bạn {name}',
                      onTap: () => setState(() => _userTitlePattern = 'Bạn {name}'),
                    ),
                    _buildChip(
                      label: 'Bác $firstName',
                      isSelected: _userTitlePattern == 'Bác {name}',
                      onTap: () => setState(() => _userTitlePattern = 'Bác {name}'),
                    ),
                    _buildChip(
                      label: 'Chỉ gọi $firstName',
                      isSelected: _userTitlePattern == '{name}',
                      onTap: () => setState(() => _userTitlePattern = '{name}'),
                    ),
                    _buildChip(
                      label: 'Tự gõ riêng...',
                      isSelected: _userTitlePattern == 'custom',
                      onTap: () => setState(() => _userTitlePattern = 'custom'),
                    ),
                  ],
                ),
                if (_userTitlePattern == 'custom') ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customUserTitleController,
                    textInputAction: TextInputAction.done,
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    onEditingComplete: () => FocusScope.of(context).unfocus(),
                    style: const TextStyle(fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Nhập cách gọi bạn (VD: Sếp $firstName, Đại ca $firstName...)',
                      filled: true,
                      fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onChanged: (_) => setState(() {}),
                  ),
                ],

                const SizedBox(height: 22),

                // 4. Section: Tone & Language
                const Text(
                  '3. Phong Cách Trò Chuyện & Ngôn Ngữ',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),

                const Text('Phong thái:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildChip(
                      label: 'Thân thiện & Ấm áp',
                      isSelected: _tone == 'friendly',
                      onTap: () => setState(() => _tone = 'friendly'),
                    ),
                    _buildChip(
                      label: 'Chuyên nghiệp & Súc tích',
                      isSelected: _tone == 'concise',
                      onTap: () => setState(() => _tone = 'concise'),
                    ),
                    _buildChip(
                      label: 'Hài hước & Dí dỏm',
                      isSelected: _tone == 'humorous',
                      onTap: () => setState(() => _tone = 'humorous'),
                    ),
                    _buildChip(
                      label: 'Kỷ luật & Tiết kiệm',
                      isSelected: _tone == 'strict',
                      onTap: () => setState(() => _tone = 'strict'),
                    ),
                  ],
                ),

                const SizedBox(height: 12),
                const Text('Ngôn ngữ phản hồi:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildChip(
                      label: '🇻🇳 Tiếng Việt',
                      isSelected: _language == 'vi',
                      onTap: () => setState(() => _language = 'vi'),
                    ),
                    _buildChip(
                      label: '🇬🇧 English',
                      isSelected: _language == 'en',
                      onTap: () => setState(() => _language = 'en'),
                    ),
                    _buildChip(
                      label: '🌐 Tự động theo người nhắn',
                      isSelected: _language == 'auto',
                      onTap: () => setState(() => _language = 'auto'),
                    ),
                  ],
                ),

                const SizedBox(height: 22),

                // 5. Section: Custom Extra Prompt Instructions
                const Text(
                  '4. Yêu Cầu Bổ Sung Đặc Biệt (Prompt tùy ý)',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Nhập các chỉ dẫn riêng biệt bạn muốn AI luôn tuân thủ khi trả lời',
                  style: TextStyle(fontSize: 12, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _customInstructionsController,
                  maxLines: 3,
                  textInputAction: TextInputAction.done,
                  onTapOutside: (_) => FocusScope.of(context).unfocus(),
                  onEditingComplete: () => FocusScope.of(context).unfocus(),
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Ví dụ: "Luôn khuyên tôi suy nghĩ kỹ trước khi mua đồ trên 1 triệu", "Trả lời ngắn gọn dưới 30 từ khi dùng giọng nói", "Dùng thêm icon vui nhộn"...',
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
                    ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),

                const SizedBox(height: 20),

                // Test voice button
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Color(0xFF0284C7)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.volume_up_rounded, color: Color(0xFF0284C7)),
                  label: const Text(
                    'Nghe thử câu chào với cấu hình này',
                    style: TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                  ),
                  onPressed: _testVoiceSample,
                ),
              ],
            ),
          ),

          if (isKeyboardOpen)
            Container(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    icon: const Icon(Icons.keyboard_hide_rounded, size: 16, color: Color(0xFF0284C7)),
                    label: const Text(
                      'Thu bàn phím để lưu',
                      style: TextStyle(fontSize: 12, color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                    ),
                    onPressed: () => FocusScope.of(context).unfocus(),
                  ),
                ],
              ),
            ),

          // Footer Action Buttons
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
              border: Border(top: BorderSide(color: isDark ? Colors.white12 : Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                TextButton(
                  onPressed: _handleReset,
                  child: const Text('Mặc định', style: TextStyle(color: Colors.grey)),
                ),
                const Spacer(),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Huỷ'),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: _isSaving
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_rounded, size: 18),
                  label: Text(_isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'),
                  onPressed: _isSaving ? null : _handleSave,
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  ),
);
  }

  Widget _buildRoleOption({
    required String keyId,
    required IconData icon,
    required String title,
    required String desc,
  }) {
    final isSelected = _roleKey == keyId;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => setState(() => _roleKey = keyId),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFF0284C7).withValues(alpha: 0.12)
                  : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? const Color(0xFF0284C7) : (isDark ? Colors.white12 : Colors.grey.shade200),
                width: isSelected ? 1.8 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF0284C7) : Colors.grey.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: isSelected ? Colors.white : Colors.grey, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                          fontSize: 13.5,
                          color: isSelected ? const Color(0xFF0284C7) : null,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        desc,
                        style: TextStyle(
                          fontSize: 11.5,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  const Icon(Icons.check_circle_rounded, color: Color(0xFF0284C7), size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: const Color(0xFF0284C7),
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        color: isSelected ? Colors.white : null,
      ),
      onSelected: (_) => onTap(),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
    );
  }
}

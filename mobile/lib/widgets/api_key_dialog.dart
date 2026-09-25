import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/ai_assistant_service.dart';

class ApiKeyDialog extends StatefulWidget {
  final VoidCallback? onSaved;
  final Function(String key)? onKeySaved;

  const ApiKeyDialog({
    super.key,
    this.onSaved,
    this.onKeySaved,
  });

  static Future<void> show(
    BuildContext context, {
    VoidCallback? onSaved,
    Function(String key)? onKeySaved,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => ApiKeyDialog(
        onSaved: onSaved,
        onKeySaved: onKeySaved,
      ),
    );
  }

  @override
  State<ApiKeyDialog> createState() => _ApiKeyDialogState();
}

class _ApiKeyDialogState extends State<ApiKeyDialog> {
  final TextEditingController _controller = TextEditingController();
  final AIAssistantService _aiService = AIAssistantService();
  bool _obscureText = true;
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isTesting = false;
  bool? _testSuccess;
  String? _testMessage;

  @override
  void initState() {
    super.initState();
    _loadCurrentKey();
  }

  Future<void> _loadCurrentKey() async {
    final key = await _aiService.getGeminiApiKey();
    if (mounted) {
      setState(() {
        _controller.text = key ?? '';
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _pasteFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      if (data?.text != null && data!.text!.trim().isNotEmpty) {
        setState(() {
          _controller.text = data.text!.trim();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Đã dán API Key từ bộ nhớ tạm!'),
              duration: Duration(seconds: 1),
            ),
          );
        }
      }
    } catch (_) {}
  }

  Future<void> _testConnection() async {
    final key = _controller.text.trim();
    if (key.isEmpty) {
      setState(() {
        _testSuccess = false;
        _testMessage = 'Vui lòng nhập hoặc dán Gemini API Key trước khi kiểm tra.';
      });
      return;
    }

    setState(() {
      _isTesting = true;
      _testSuccess = null;
      _testMessage = null;
    });

    final res = await _aiService.testGeminiApiKey(key);

    if (mounted) {
      setState(() {
        _isTesting = false;
        _testSuccess = res.success;
        _testMessage = res.message;
      });
    }
  }

  Future<void> _saveKey() async {
    final key = _controller.text.trim();
    if (key.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vui lòng nhập hoặc dán Gemini API Key'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    await _aiService.saveGeminiApiKey(key);
    setState(() => _isSaving = false);

    if (!mounted) return;
    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('✓ Đã lưu Google Gemini API Key thành công!'),
        backgroundColor: Color(0xFF10B981),
      ),
    );

    widget.onSaved?.call();
    widget.onKeySaved?.call(key);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF0284C7).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.vpn_key_rounded, color: Color(0xFF0284C7), size: 22),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Cấu Hình Gemini API Key',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Đọc hoá đơn thật & Trợ lý thông minh',
                  style: TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      ),
      content: _isLoading
          ? const SizedBox(
              height: 100,
              child: Center(child: CircularProgressIndicator()),
            )
          : SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Để ứng dụng đọc chính xác từng món ăn, đơn giá và số tiền từ ảnh chụp hoá đơn thật, hệ thống cần Google Gemini Vision OCR.',
                    style: TextStyle(fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.2)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.lightbulb_outline, size: 16, color: Color(0xFF0284C7)),
                            SizedBox(width: 6),
                            Text(
                              'Cách lấy API Key miễn phí 100%:',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                            ),
                          ],
                        ),
                        SizedBox(height: 6),
                        Text(
                          '1. Mở trình duyệt vào: aistudio.google.com/apikey\n2. Đăng nhập tài khoản Google và bấm "Create API Key"\n3. Copy rồi quay lại đây bấm nút [Dán từ Clipboard]',
                          style: TextStyle(fontSize: 11.5, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _controller,
                    obscureText: _obscureText,
                    decoration: InputDecoration(
                      labelText: 'Google Gemini API Key',
                      hintText: 'AIzaSy...',
                      filled: true,
                      fillColor: isDark ? Colors.grey.shade900 : Colors.grey.shade100,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      prefixIcon: const Icon(Icons.key_rounded, size: 20),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(
                              _obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                              size: 20,
                            ),
                            onPressed: () => setState(() => _obscureText = !_obscureText),
                          ),
                          IconButton(
                            icon: const Icon(Icons.paste_rounded, size: 20, color: Color(0xFF0284C7)),
                            tooltip: 'Dán từ clipboard',
                            onPressed: _pasteFromClipboard,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Test Connection Button & Status Box
                  if (_isTesting)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        children: [
                          SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Đang kiểm tra kết nối với Google AI Studio...',
                              style: TextStyle(fontSize: 12, color: Color(0xFF0284C7)),
                            ),
                          ),
                        ],
                      ),
                    )
                  else if (_testMessage != null)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (_testSuccess == true ? const Color(0xFF10B981) : Colors.red).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: (_testSuccess == true ? const Color(0xFF10B981) : Colors.red).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            _testSuccess == true ? Icons.check_circle_rounded : Icons.error_outline_rounded,
                            size: 18,
                            color: _testSuccess == true ? const Color(0xFF10B981) : Colors.red,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _testMessage!,
                              style: TextStyle(
                                fontSize: 12,
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                                color: _testSuccess == true ? const Color(0xFF065F46) : Colors.red.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        side: const BorderSide(color: Color(0xFF0284C7)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.bolt_rounded, size: 18, color: Color(0xFF0284C7)),
                      label: const Text(
                        'Kiểm tra kết nối API Key',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                      ),
                      onPressed: _isTesting ? null : _testConnection,
                    ),
                  ),
                ],
              ),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Đóng', style: TextStyle(color: Colors.grey)),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0284C7),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: _isSaving ? null : _saveKey,
          child: _isSaving
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Lưu API Key', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}

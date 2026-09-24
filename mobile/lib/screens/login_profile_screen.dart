import 'package:flutter/material.dart';
import '../models/user_member_model.dart';
import '../services/auth_service.dart';
import 'main_shell_screen.dart';

class LoginProfileScreen extends StatefulWidget {
  final bool isSwitching;

  const LoginProfileScreen({super.key, this.isSwitching = false});

  @override
  State<LoginProfileScreen> createState() => _LoginProfileScreenState();
}

class _LoginProfileScreenState extends State<LoginProfileScreen> {
  final AuthService _authService = AuthService();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPassController = TextEditingController();

  List<FamilyMemberModel> _familyMembers = [];
  bool _isSignUpMode = false;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _rememberMe = true;
  String? _errorMessage;

  static const String appVersion = 'v1.2.0';
  static const String appRevision = 'rev.20260924';

  @override
  void initState() {
    super.initState();
    _loadFamilyMembers();
  }

  Future<void> _loadFamilyMembers() async {
    final members = await _authService.fetchMembers();
    if (mounted) {
      setState(() => _familyMembers = members);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  void _quickFillUser(FamilyMemberModel member) {
    setState(() {
      _emailController.text = member.email ?? '';
      _passwordController.text = '123456';
      _isSignUpMode = false;
      _errorMessage = null;
    });
  }

  Future<void> _handleQuickSwitch(FamilyMemberModel member) async {
    setState(() => _isLoading = true);
    await _authService.setActiveMember(member);
    if (!mounted) return;

    if (widget.isSwitching) {
      Navigator.of(context).pop(member);
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainShellScreen()),
      );
    }
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final name = _nameController.text.trim();
    final confirmPass = _confirmPassController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng nhập đầy đủ Email và Mật khẩu.';
      });
      return;
    }

    if (_isSignUpMode) {
      if (name.isEmpty) {
        setState(() {
          _errorMessage = 'Vui lòng nhập họ và tên của bạn.';
        });
        return;
      }
      if (password != confirmPass) {
        setState(() {
          _errorMessage = 'Mật khẩu xác nhận không khớp.';
        });
        return;
      }
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    bool success = false;
    if (_isSignUpMode) {
      success = await _authService.signUpWithEmailPassword(
        name: name,
        email: email,
        password: password,
      );
    } else {
      success = await _authService.signInWithEmailPassword(
        email: email,
        password: password,
      );
    }

    if (!mounted) return;

    if (success) {
      final active = _authService.getCurrentMember();
      if (widget.isSwitching) {
        Navigator.of(context).pop(active);
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainShellScreen()),
        );
      }
    } else {
      setState(() {
        _isLoading = false;
        _errorMessage = _isSignUpMode
            ? 'Đăng ký tài khoản không thành công. Vui lòng thử lại.'
            : 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
      });
    }
  }

  void _showForgotPasswordDialog() {
    final emailResetCtrl = TextEditingController(text: _emailController.text.trim());
    showDialog(
      context: context,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          title: const Row(
            children: [
              Icon(Icons.lock_reset, color: Color(0xFF0284C7)),
              SizedBox(width: 10),
              Text('Đặt lại mật khẩu', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Nhập địa chỉ email tài khoản của bạn để nhận liên kết khôi phục mật khẩu:',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: emailResetCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  hintText: 'email@domain.com',
                  prefixIcon: Icon(Icons.email_outlined, size: 20),
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Huỷ', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                final em = emailResetCtrl.text.trim();
                Navigator.pop(ctx);
                final res = await _authService.resetPasswordEmail(em);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(res.message),
                      backgroundColor: const Color(0xFF0284C7),
                    ),
                  );
                }
              },
              child: const Text('Gửi yêu cầu'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [const Color(0xFF0F172A), const Color(0xFF020617)]
                : [const Color(0xFFF0F9FF), const Color(0xFFF8FAFC)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (widget.isSwitching)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      const Text(
                        'Chuyển Hồ Sơ Gia Đình',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(width: 48),
                    ],
                  )
                else
                  const SizedBox(height: 12),

                // Brand Logo & Title
                Center(
                  child: Container(
                    width: 68,
                    height: 68,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0284C7), Color(0xFF0EA5E9), Color(0xFF10B981)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 5),
                        )
                      ],
                    ),
                    child: const Icon(Icons.shield_outlined, color: Colors.white, size: 34),
                  ),
                ),
                const SizedBox(height: 14),

                const Center(
                  child: Text(
                    'FMMS MOBILITY & FINANCE',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.0,
                      color: Color(0xFF0284C7),
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                Center(
                  child: Text(
                    widget.isSwitching
                        ? 'Chọn Hồ Sơ Thành Viên'
                        : (_isSignUpMode ? 'Tạo Tài Khoản Mới' : 'Đăng Nhập Hệ Thống'),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 4),

                Center(
                  child: Text(
                    'Sổ thu chi gia đình & quản lý xe thông minh',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Fast Profile Switch Grid / Cards
                if (_familyMembers.isNotEmpty) ...[
                  Text(
                    widget.isSwitching ? 'Chạm vào thành viên để đăng nhập ngay:' : 'Đăng nhập nhanh với hồ sơ gia đình:',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 84,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _familyMembers.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, i) {
                        final m = _familyMembers[i];
                        final color = Color(int.tryParse(m.colorHex.replaceFirst('#', '0xFF')) ?? 0xFF0284C7);
                        return InkWell(
                          onTap: () {
                            if (widget.isSwitching) {
                              _handleQuickSwitch(m);
                            } else {
                              _quickFillUser(m);
                            }
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 110,
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                CircleAvatar(
                                  radius: 16,
                                  backgroundColor: color,
                                  child: Text(
                                    m.name.isNotEmpty ? m.name.characters.first.toUpperCase() : '?',
                                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  m.name,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  m.relationship ?? 'Thành viên',
                                  style: const TextStyle(fontSize: 9, color: Colors.grey),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Mode Switch Segmented Tabs
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (_isSignUpMode) {
                              setState(() {
                                _isSignUpMode = false;
                                _errorMessage = null;
                              });
                            }
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: !_isSignUpMode
                                  ? (isDark ? const Color(0xFF0F172A) : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: !_isSignUpMode
                                  ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4)]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                'Đăng Nhập',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: !_isSignUpMode ? FontWeight.bold : FontWeight.w500,
                                  color: !_isSignUpMode
                                      ? const Color(0xFF0284C7)
                                      : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            if (!_isSignUpMode) {
                              setState(() {
                                _isSignUpMode = true;
                                _errorMessage = null;
                              });
                            }
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            decoration: BoxDecoration(
                              color: _isSignUpMode
                                  ? (isDark ? const Color(0xFF0F172A) : Colors.white)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: _isSignUpMode
                                  ? [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4)]
                                  : null,
                            ),
                            child: Center(
                              child: Text(
                                'Đăng Ký Mới',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: _isSignUpMode ? FontWeight.bold : FontWeight.w500,
                                  color: _isSignUpMode
                                      ? const Color(0xFF0284C7)
                                      : (isDark ? Colors.grey[400] : Colors.grey[600]),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Error / Success Banner
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444), fontWeight: FontWeight.w500),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Credentials Form Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Full Name Field (Only in Sign Up Mode)
                      if (_isSignUpMode) ...[
                        const Text(
                          'Họ và tên',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _nameController,
                          textInputAction: TextInputAction.next,
                          decoration: InputDecoration(
                            hintText: 'VD: Nguyễn Trung Sơn',
                            prefixIcon: const Icon(Icons.person_outline, size: 20, color: Color(0xFF0284C7)),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      // Email Field
                      const Text(
                        'Email đăng nhập',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        decoration: InputDecoration(
                          hintText: 'Nhập email tài khoản...',
                          prefixIcon: const Icon(Icons.email_outlined, size: 20, color: Color(0xFF0284C7)),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Password Field
                      const Text(
                        'Mật khẩu',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        textInputAction: _isSignUpMode ? TextInputAction.next : TextInputAction.done,
                        onSubmitted: (_) {
                          if (!_isSignUpMode) _handleSubmit();
                        },
                        decoration: InputDecoration(
                          hintText: 'Nhập mật khẩu...',
                          prefixIcon: const Icon(Icons.lock_outline, size: 20, color: Color(0xFF0284C7)),
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                              size: 20,
                              color: Colors.grey,
                            ),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
                          filled: true,
                          fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                        ),
                      ),

                      // Forgot password link
                      if (!_isSignUpMode) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                SizedBox(
                                  height: 24,
                                  width: 24,
                                  child: Checkbox(
                                    value: _rememberMe,
                                    activeColor: const Color(0xFF0284C7),
                                    onChanged: (val) => setState(() => _rememberMe = val ?? true),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text('Ghi nhớ', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                            TextButton(
                              onPressed: _showForgotPasswordDialog,
                              child: const Text(
                                'Quên mật khẩu?',
                                style: TextStyle(fontSize: 12, color: Color(0xFF0284C7), fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ],

                      // Confirm Password (Only in Sign Up Mode)
                      if (_isSignUpMode) ...[
                        const SizedBox(height: 14),
                        const Text(
                          'Xác nhận mật khẩu',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _confirmPassController,
                          obscureText: _obscurePassword,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _handleSubmit(),
                          decoration: InputDecoration(
                            hintText: 'Nhập lại mật khẩu...',
                            prefixIcon: const Icon(Icons.lock_reset, size: 20, color: Color(0xFF0284C7)),
                            filled: true,
                            fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),

                      // Submit Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0284C7),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 2,
                          ),
                          onPressed: _isLoading ? null : _handleSubmit,
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : Text(
                                  _isSignUpMode ? 'Tạo Tài Khoản' : 'Đăng Nhập',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Version & Revision Management Badge
                Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified_outlined, size: 14, color: Color(0xFF0284C7)),
                        const SizedBox(width: 6),
                        Text(
                          'FMMS Mobile $appVersion • $appRevision',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: isDark ? Colors.grey[400] : Colors.grey[700],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    'Bản quyền © 2026 Sonsmartsoft. Toàn quyền bảo lưu.',
                    style: TextStyle(fontSize: 10, color: Colors.grey[500]),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

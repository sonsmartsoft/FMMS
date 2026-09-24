import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/user_member_model.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import 'login_profile_screen.dart';

class AppLockScreen extends StatefulWidget {
  final VoidCallback onUnlocked;
  final bool autoPromptBiometric;

  const AppLockScreen({
    super.key,
    required this.onUnlocked,
    this.autoPromptBiometric = true,
  });

  @override
  State<AppLockScreen> createState() => _AppLockScreenState();
}

class _AppLockScreenState extends State<AppLockScreen> with SingleTickerProviderStateMixin {
  final AuthService _authService = AuthService();
  final BiometricService _biometricService = BiometricService();

  FamilyMemberModel? _member;
  String _enteredPin = '';
  String? _expectedPin;
  bool _biometricEnabled = true;
  bool _isCheckingBio = false;
  String? _errorMessage;

  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 12)
        .chain(CurveTween(curve: Curves.elasticIn))
        .animate(_shakeController);

    _loadSecurityState();
  }

  Future<void> _loadSecurityState() async {
    final member = _authService.getCurrentMember();
    final pin = await _authService.getPinCode();
    final bioEnabled = await _authService.getBiometricEnabled();

    if (mounted) {
      setState(() {
        _member = member;
        _expectedPin = pin;
        _biometricEnabled = bioEnabled;
      });

      // Auto-prompt Face ID if enabled
      if (widget.autoPromptBiometric && bioEnabled) {
        Future.delayed(const Duration(milliseconds: 300), () {
          _triggerBiometricAuth();
        });
      }
    }
  }

  @override
  void dispose() {
    _shakeController.dispose();
    super.dispose();
  }

  Future<void> _triggerBiometricAuth() async {
    if (_isCheckingBio) return;
    setState(() {
      _isCheckingBio = true;
      _errorMessage = null;
    });

    final success = await _biometricService.authenticate(
      reason: 'Quét Face ID để mở khóa ứng dụng FMMS',
    );

    if (mounted) {
      setState(() => _isCheckingBio = false);
      if (success) {
        HapticFeedback.mediumImpact();
        widget.onUnlocked();
      }
    }
  }

  void _onDigitPressed(String digit) {
    if (_enteredPin.length >= 4) return;
    HapticFeedback.lightImpact();

    setState(() {
      _errorMessage = null;
      _enteredPin += digit;
    });

    if (_enteredPin.length == 4) {
      _verifyPin();
    }
  }

  void _onBackspace() {
    if (_enteredPin.isNotEmpty) {
      HapticFeedback.lightImpact();
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
        _errorMessage = null;
      });
    }
  }

  void _verifyPin() {
    if (_expectedPin != null && _expectedPin!.isNotEmpty) {
      if (_enteredPin == _expectedPin) {
        HapticFeedback.mediumImpact();
        widget.onUnlocked();
      } else {
        HapticFeedback.heavyImpact();
        _shakeController.forward(from: 0.0);
        setState(() {
          _errorMessage = 'Mã PIN không chính xác';
          _enteredPin = '';
        });
      }
    } else {
      // If PIN wasn't set, any 4-digit or unlock succeeds
      widget.onUnlocked();
    }
  }

  void _showForgotPinDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Quên mã PIN?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: const Text(
          'Để bảo mật tài chính gia đình, bạn có thể đăng nhập lại bằng mật khẩu tài khoản hoặc chuyển đổi hồ sơ thành viên.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              await _authService.clearActiveMember();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginProfileScreen()),
                  (route) => false,
                );
              }
            },
            child: const Text('Đăng nhập lại'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final m = _member ?? FamilyMemberModel.defaultMembers.first;
    final memberColor = Color(int.tryParse(m.colorHex.replaceFirst('#', '0xFF')) ?? 0xFF0284C7);

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: isDark ? const Color(0xFF0B1120) : const Color(0xFFF8FAFC),
        body: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 24),
              // Family logo & User info
              Container(
                width: 68,
                height: 68,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: memberColor,
                  boxShadow: [
                    BoxShadow(
                      color: memberColor.withValues(alpha: 0.35),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: Center(
                  child: Text(
                    m.name.isNotEmpty ? m.name.characters.first.toUpperCase() : 'F',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Xin chào, ${m.name}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Ứng dụng đang được khóa bảo vệ',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? Colors.grey[400] : Colors.grey[600],
                ),
              ),

              const SizedBox(height: 32),

              // PIN Dots with shake animation
              AnimatedBuilder(
                animation: _shakeAnimation,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(_shakeAnimation.value * (1 - _shakeController.value), 0),
                    child: child,
                  );
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(4, (index) {
                    final isFilled = index < _enteredPin.length;
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 10),
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isFilled
                            ? const Color(0xFF008C53)
                            : Colors.transparent,
                        border: Border.all(
                          color: isFilled
                              ? const Color(0xFF008C53)
                              : (isDark ? Colors.grey[600]! : Colors.grey[400]!),
                          width: 2,
                        ),
                      ),
                    );
                  }),
                ),
              ),

              const SizedBox(height: 16),
              if (_errorMessage != null)
                Text(
                  _errorMessage!,
                  style: const TextStyle(
                    color: Color(0xFFEF4444),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                )
              else
                const SizedBox(height: 14),

              const Spacer(),

              // Numeric Keypad
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 36),
                child: Column(
                  children: [
                    _buildKeypadRow(['1', '2', '3'], isDark),
                    const SizedBox(height: 16),
                    _buildKeypadRow(['4', '5', '6'], isDark),
                    const SizedBox(height: 16),
                    _buildKeypadRow(['7', '8', '9'], isDark),
                    const SizedBox(height: 16),
                    _buildBottomKeypadRow(isDark),
                  ],
                ),
              ),

              const Spacer(),

              // Forgot PIN / Switch member button
              TextButton(
                onPressed: _showForgotPinDialog,
                child: Text(
                  'Quên mã PIN? • Đăng nhập lại',
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> digits, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits.map((d) => _buildKeypadButton(d, isDark)).toList(),
    );
  }

  Widget _buildBottomKeypadRow(bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        // Biometric / Face ID button
        SizedBox(
          width: 72,
          height: 72,
          child: _biometricEnabled
              ? IconButton(
                  onPressed: _triggerBiometricAuth,
                  icon: const Icon(
                    Icons.face,
                    size: 34,
                    color: Color(0xFF008C53),
                  ),
                  tooltip: 'Face ID',
                )
              : const SizedBox(),
        ),

        // '0' button
        _buildKeypadButton('0', isDark),

        // Backspace button
        SizedBox(
          width: 72,
          height: 72,
          child: IconButton(
            onPressed: _onBackspace,
            icon: Icon(
              Icons.backspace_outlined,
              size: 26,
              color: isDark ? Colors.white70 : Colors.black54,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildKeypadButton(String digit, bool isDark) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _onDigitPressed(digit),
        borderRadius: BorderRadius.circular(36),
        child: Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            border: Border.all(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Center(
            child: Text(
              digit,
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

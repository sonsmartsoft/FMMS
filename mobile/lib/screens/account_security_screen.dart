import 'package:flutter/material.dart';
import '../models/user_member_model.dart';
import '../services/auth_service.dart';
import '../services/biometric_service.dart';
import '../widgets/app_lock_gatekeeper.dart';
import 'login_profile_screen.dart';

class AccountSecurityScreen extends StatefulWidget {
  const AccountSecurityScreen({super.key});

  @override
  State<AccountSecurityScreen> createState() => _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends State<AccountSecurityScreen> {
  final AuthService _authService = AuthService();

  FamilyMemberModel? _currentMember;
  bool _isLoading = true;

  // Password fields
  final TextEditingController _currentPassController = TextEditingController();
  final TextEditingController _newPassController = TextEditingController();
  final TextEditingController _confirmPassController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isChangingPassword = false;
  String? _passwordError;
  String? _passwordSuccess;

  // Security preferences
  bool _appLockEnabled = false;
  bool _biometricEnabled = true;
  bool _hideBalanceEnabled = false;
  int _autoLockMinutes = 1;
  String? _pinCode;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _currentPassController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final member = await _authService.getActiveMember() ?? _authService.getCurrentMember();
    final appLock = await _authService.getAppLockEnabled();
    final biometric = await _authService.getBiometricEnabled();
    final hideBal = await _authService.getHideBalanceEnabled();
    final autoLock = await _authService.getAutoLockMinutes();
    final pin = await _authService.getPinCode();

    if (mounted) {
      setState(() {
        _currentMember = member;
        _appLockEnabled = appLock;
        _biometricEnabled = biometric;
        _hideBalanceEnabled = hideBal;
        _autoLockMinutes = autoLock;
        _pinCode = pin;
        _isLoading = false;
      });
    }
  }

  Future<void> _handleChangePassword() async {
    final currentPass = _currentPassController.text.trim();
    final newPass = _newPassController.text.trim();
    final confirmPass = _confirmPassController.text.trim();

    setState(() {
      _passwordError = null;
      _passwordSuccess = null;
    });

    if (newPass.isEmpty) {
      setState(() => _passwordError = 'Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPass.length < 6) {
      setState(() => _passwordError = 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPass != confirmPass) {
      setState(() => _passwordError = 'Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setState(() => _isChangingPassword = true);

    final res = await _authService.changePassword(
      currentPassword: currentPass,
      newPassword: newPass,
    );

    if (!mounted) return;

    setState(() {
      _isChangingPassword = false;
      if (res.success) {
        _passwordSuccess = res.message;
        _currentPassController.clear();
        _newPassController.clear();
        _confirmPassController.clear();
      } else {
        _passwordError = res.message;
      }
    });

    if (res.success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle, color: Colors.white, size: 20),
              const SizedBox(width: 10),
              Expanded(child: Text(res.message)),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  Future<void> _confirmLogout() async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 22),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Xác nhận đăng xuất',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Text(
            'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ${_currentMember?.name ?? "này"}? Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? Colors.grey[300] : Colors.grey[700],
            ),
          ),
          actionsPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Huỷ bỏ', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Đăng Xuất', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );

    if (shouldLogout == true) {
      await _authService.clearActiveMember();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginProfileScreen()),
        (route) => false,
      );
    }
  }

  void _showSetPinDialog() {
    final pinController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Đặt mã PIN bảo vệ (4 số)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        content: TextField(
          controller: pinController,
          keyboardType: TextInputType.number,
          maxLength: 4,
          obscureText: true,
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 24, letterSpacing: 10, fontWeight: FontWeight.bold),
          decoration: const InputDecoration(
            hintText: '••••',
            counterText: '',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Huỷ', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7), foregroundColor: Colors.white),
            onPressed: () async {
              final pin = pinController.text.trim();
              if (pin.length == 4) {
                await _authService.setPinCode(pin);
                await _authService.setAppLockEnabled(true);
                if (mounted) {
                  setState(() {
                    _pinCode = pin;
                    _appLockEnabled = true;
                  });
                }
                Navigator.pop(ctx);
              }
            },
            child: const Text('Lưu PIN'),
          ),
        ],
      ),
    );
  }

  void _showSwitchProfileSheet() async {
    final members = await _authService.fetchMembers();
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Chuyển đổi hồ sơ gia đình',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Chọn thành viên đang sử dụng ứng dụng này:',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
                const SizedBox(height: 14),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: members.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final m = members[index];
                      final isSelected = m.id == _currentMember?.id;
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 4),
                        leading: CircleAvatar(
                          radius: 20,
                          backgroundColor: Color(int.tryParse(m.colorHex.replaceFirst('#', '0xFF')) ?? 0xFF0284C7),
                          child: Text(
                            m.name.isNotEmpty ? m.name.characters.first.toUpperCase() : '?',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        title: Text(m.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text('${m.relationship ?? "Thành viên"} • ${m.role}', style: const TextStyle(fontSize: 12)),
                        trailing: isSelected
                            ? const Icon(Icons.check_circle, color: Color(0xFF10B981))
                            : const Icon(Icons.chevron_right, color: Colors.grey),
                        onTap: () async {
                          Navigator.pop(ctx);
                          await _authService.setActiveMember(m);
                          setState(() => _currentMember = m);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Đã chuyển sang hồ sơ ${m.name}')),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bảo Mật & Tài Khoản', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Current Account Info Card
                  _buildProfileCard(isDark),
                  const SizedBox(height: 20),

                  // 2. Change Password Card
                  _buildChangePasswordCard(isDark),
                  const SizedBox(height: 20),

                  // 3. App Security & Protection
                  _buildAppProtectionCard(isDark),
                  const SizedBox(height: 20),

                  // 4. Active Device & Sessions
                  _buildDeviceSessionCard(isDark),
                  const SizedBox(height: 24),

                  // 5. Account Actions: Switch & Logout
                  _buildAccountActions(isDark),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }

  Widget _buildProfileCard(bool isDark) {
    final m = _currentMember;
    final name = m?.name ?? 'Người dùng';
    final email = m?.email ?? 'chuacoemail@fmms.vn';
    final role = m?.role ?? 'ADMIN';
    final relationship = m?.relationship ?? 'Chủ hộ';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
              : [const Color(0xFFF0FDF4), Colors.white],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFF86EFAC).withValues(alpha: 0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: const Color(0xFF10B981),
            child: Text(
              name.isNotEmpty ? name.characters.first.toUpperCase() : 'U',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        role,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.shield, size: 14, color: Color(0xFF10B981)),
                    const SizedBox(width: 4),
                    Text(
                      'Hồ sơ: $relationship • Đã xác thực an toàn',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChangePasswordCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.lock_reset, color: Color(0xFF0284C7), size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Đổi Mật Khẩu', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    Text('Bảo vệ tài khoản đăng nhập của bạn', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (_passwordError != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _passwordError!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444), fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          if (_passwordSuccess != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _passwordSuccess!,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF10B981), fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Mật khẩu hiện tại
          const Text('Mật khẩu hiện tại', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 6),
          TextField(
            controller: _currentPassController,
            obscureText: _obscureCurrent,
            decoration: InputDecoration(
              hintText: 'Nhập mật khẩu đang dùng (nếu có)...',
              prefixIcon: const Icon(Icons.lock_outline, size: 20),
              suffixIcon: IconButton(
                icon: Icon(_obscureCurrent ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18),
                onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
              ),
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 12),

          // Mật khẩu mới
          const Text('Mật khẩu mới', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 6),
          TextField(
            controller: _newPassController,
            obscureText: _obscureNew,
            decoration: InputDecoration(
              hintText: 'Tối thiểu 6 ký tự...',
              prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20),
              suffixIcon: IconButton(
                icon: Icon(_obscureNew ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18),
                onPressed: () => setState(() => _obscureNew = !_obscureNew),
              ),
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 12),

          // Xác nhận mật khẩu mới
          const Text('Xác nhận mật khẩu mới', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
          const SizedBox(height: 6),
          TextField(
            controller: _confirmPassController,
            obscureText: _obscureConfirm,
            decoration: InputDecoration(
              hintText: 'Nhập lại mật khẩu mới...',
              prefixIcon: const Icon(Icons.check_circle_outline, size: 20),
              suffixIcon: IconButton(
                icon: Icon(_obscureConfirm ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 18),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 18),

          // Nút cập nhật
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              onPressed: _isChangingPassword ? null : _handleChangePassword,
              icon: _isChangingPassword
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.save_outlined, size: 18),
              label: Text(
                _isChangingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppProtectionCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.fingerprint, color: Color(0xFF10B981), size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bảo Mật Ứng Dụng', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    Text('Khóa mã PIN, Face ID & tính riêng tư', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Switch: PIN code
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Khóa ứng dụng bằng mã PIN', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text(
              _pinCode != null ? 'Mã PIN đang được kích hoạt (••••)' : 'Chưa đặt mã PIN bảo vệ',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
            value: _appLockEnabled,
            activeColor: const Color(0xFF10B981),
            onChanged: (val) async {
              if (val && (_pinCode == null || _pinCode!.isEmpty)) {
                _showSetPinDialog();
              } else {
                await _authService.setAppLockEnabled(val);
                setState(() => _appLockEnabled = val);
              }
            },
          ),
          if (_appLockEnabled) ...[
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 6),
              child: TextButton.icon(
                onPressed: _showSetPinDialog,
                icon: const Icon(Icons.pin, size: 16, color: Color(0xFF008C53)),
                label: const Text('Đổi mã PIN mới (4 số)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF008C53))),
              ),
            ),
          ],
          const Divider(height: 1),

          // Switch: Biometrics (Face ID)
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Mở khóa bằng Face ID / Vân tay', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: const Text('Sử dụng cảm biến sinh trắc học trên iPhone', style: TextStyle(fontSize: 11, color: Colors.grey)),
            value: _biometricEnabled,
            activeColor: const Color(0xFF10B981),
            onChanged: (val) async {
              if (val) {
                final bio = BiometricService();
                final available = await bio.isBiometricAvailable();
                if (!available) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Thiết bị chưa bật hoặc chưa cài Face ID trong Cài đặt iPhone.')),
                    );
                  }
                  return;
                }
                final authOk = await bio.authenticate(reason: 'Quét Face ID để kích hoạt tính năng bảo mật');
                if (!authOk) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Chưa xác thực Face ID thành công.')),
                    );
                  }
                  return;
                }
              }
              await _authService.setBiometricEnabled(val);
              setState(() => _biometricEnabled = val);
            },
          ),
          const Divider(height: 1),

          // Switch: Ẩn số dư ví tiền
          SwitchListTile.adaptive(
            contentPadding: EdgeInsets.zero,
            title: const Text('Ẩn số dư tài chính tại nơi đông người', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: const Text('Hiển thị dạng •••••••• trên màn hình chính', style: TextStyle(fontSize: 11, color: Colors.grey)),
            value: _hideBalanceEnabled,
            activeColor: const Color(0xFF10B981),
            onChanged: (val) async {
              await _authService.setHideBalanceEnabled(val);
              setState(() => _hideBalanceEnabled = val);
            },
          ),
          const Divider(height: 1),

          // Auto-lock timer
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Tự động khóa khi rời ứng dụng', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: Text('Khóa sau $_autoLockMinutes phút chạy nền', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            trailing: DropdownButton<int>(
              value: _autoLockMinutes,
              underline: const SizedBox(),
              items: const [
                DropdownMenuItem(value: 0, child: Text('Ngay lập tức', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 1, child: Text('1 phút', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 5, child: Text('5 phút', style: TextStyle(fontSize: 12))),
                DropdownMenuItem(value: 15, child: Text('15 phút', style: TextStyle(fontSize: 12))),
              ],
              onChanged: (val) async {
                if (val != null) {
                  await _authService.setAutoLockMinutes(val);
                  setState(() => _autoLockMinutes = val);
                }
              },
            ),
          ),

          // Test Lock App Now Button
          if (_appLockEnabled) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF008C53),
                  side: const BorderSide(color: Color(0xFF008C53), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.lock, size: 18),
                label: const Text('Khóa Thử Ứng Dụng Ngay Bây Giờ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                onPressed: () {
                  AppLockGatekeeper.of(context)?.lockApp();
                },
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDeviceSessionCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.devices_outlined, color: Color(0xFFF59E0B), size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Thiết Bị & Phiên Đăng Nhập', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                    Text('Quản lý các thiết bị đang kết nối tài khoản', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Current device item
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.phone_iphone, color: Color(0xFF10B981), size: 22),
            ),
            title: const Row(
              children: [
                Text('iPhone 15', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                SizedBox(width: 8),
                Badge(
                  label: Text('Thiết bị này', style: TextStyle(fontSize: 9)),
                  backgroundColor: Color(0xFF10B981),
                ),
              ],
            ),
            subtitle: const Text(
              'iOS 17+ • Đang hoạt động • FMMS Release v1.2.0',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
            trailing: const Icon(Icons.verified_user, color: Color(0xFF10B981), size: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildAccountActions(bool isDark) {
    return Column(
      children: [
        // Chuyển đổi hồ sơ thành viên
        SizedBox(
          width: double.infinity,
          height: 48,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF0284C7),
              side: const BorderSide(color: Color(0xFF0284C7)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _showSwitchProfileSheet,
            icon: const Icon(Icons.switch_account_outlined, size: 20),
            label: const Text('Chuyển Đổi Hồ Sơ Thành Viên', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
        const SizedBox(height: 12),

        // Đăng xuất tài khoản
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.12),
              foregroundColor: const Color(0xFFEF4444),
              elevation: 0,
              side: const BorderSide(color: Color(0xFFEF4444), width: 1.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            onPressed: _confirmLogout,
            icon: const Icon(Icons.logout, size: 20),
            label: const Text('Đăng Xuất Tài Khoản', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          ),
        ),
      ],
    );
  }
}

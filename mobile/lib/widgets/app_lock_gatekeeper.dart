import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../screens/app_lock_screen.dart';

class AppLockGatekeeper extends StatefulWidget {
  final Widget child;

  const AppLockGatekeeper({super.key, required this.child});

  static AppLockGatekeeperState? of(BuildContext context) {
    return context.findAncestorStateOfType<AppLockGatekeeperState>();
  }

  @override
  State<AppLockGatekeeper> createState() => AppLockGatekeeperState();
}

class AppLockGatekeeperState extends State<AppLockGatekeeper> with WidgetsBindingObserver {
  final AuthService _authService = AuthService();

  bool _isLocked = false;
  bool _isChecking = true;
  DateTime? _pausedTime;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkInitialLock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _checkInitialLock() async {
    final lockEnabled = await _authService.getAppLockEnabled();
    final pin = await _authService.getPinCode();

    if (mounted) {
      setState(() {
        _isLocked = lockEnabled && (pin != null && pin.isNotEmpty);
        _isChecking = false;
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _pausedTime = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      _handleAppResume();
    }
  }

  Future<void> _handleAppResume() async {
    if (_isLocked) return;

    final lockEnabled = await _authService.getAppLockEnabled();
    final pin = await _authService.getPinCode();
    if (!lockEnabled || pin == null || pin.isEmpty) return;

    final autoLockMins = await _authService.getAutoLockMinutes();

    if (_pausedTime != null) {
      final elapsedSecs = DateTime.now().difference(_pausedTime!).inSeconds;
      final requiredSecs = autoLockMins * 60;

      if (autoLockMins == 0 || elapsedSecs >= requiredSecs) {
        lockApp();
      }
    }
  }

  /// Manually lock the app immediately
  void lockApp() {
    if (mounted) {
      setState(() => _isLocked = true);
    }
  }

  /// Unlock callback
  void unlockApp() {
    if (mounted) {
      setState(() {
        _isLocked = false;
        _pausedTime = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const SizedBox();
    }

    return Stack(
      children: [
        widget.child,
        if (_isLocked)
          Positioned.fill(
            child: AppLockScreen(
              onUnlocked: unlockApp,
              autoPromptBiometric: true,
            ),
          ),
      ],
    );
  }
}

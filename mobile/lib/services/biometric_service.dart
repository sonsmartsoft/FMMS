import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

class BiometricService {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  final LocalAuthentication _auth = LocalAuthentication();

  /// Check if the physical device has biometric sensors available and configured
  Future<bool> isBiometricAvailable() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      return canCheck || isSupported;
    } catch (_) {
      return false;
    }
  }

  /// Get list of available biometric types (Face ID, Fingerprint)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (_) {
      return [];
    }
  }

  /// Returns true if Face ID is available on this iOS device
  Future<bool> hasFaceId() async {
    try {
      final list = await getAvailableBiometrics();
      return list.contains(BiometricType.face);
    } catch (_) {
      return false;
    }
  }

  /// Authenticate user via Face ID / Fingerprint / Touch ID
  Future<bool> authenticate({String reason = 'Xác thực Face ID để mở khóa FMMS'}) async {
    try {
      final available = await isBiometricAvailable();
      if (!available) return false;

      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
    } on PlatformException catch (_) {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Stop any active authentication prompt
  Future<void> stopAuthentication() async {
    try {
      await _auth.stopAuthentication();
    } catch (_) {}
  }
}

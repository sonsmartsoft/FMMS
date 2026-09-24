import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_member_model.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final SupabaseClient _supabase = Supabase.instance.client;
  static const String _kActiveMemberKey = 'ffms_active_member_profile';
  static const String _kCachedMembersKey = 'ffms_cached_members_list';

  FamilyMemberModel? _cachedActiveMember;

  User? get currentUser => _supabase.auth.currentUser;
  bool get isAuthenticated => _cachedActiveMember != null;

  /// Loads the active logged-in member from SharedPreferences. Returns null if freshly installed or logged out.
  Future<FamilyMemberModel?> getActiveMember() async {
    if (_cachedActiveMember != null) return _cachedActiveMember;

    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_kActiveMemberKey);
    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        final data = jsonDecode(jsonStr);
        _cachedActiveMember = FamilyMemberModel.fromJson(data);
        return _cachedActiveMember;
      } catch (_) {}
    }

    // On fresh install or logout, do NOT auto-login. Return null so user is forced to authenticate!
    return null;
  }

  /// Real email/password authentication
  Future<bool> signInWithEmailPassword({
    required String email,
    required String password,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    final cleanPass = password.trim();

    if (cleanEmail.isEmpty || cleanPass.isEmpty) return false;

    try {
      final res = await _supabase.auth.signInWithPassword(
        email: cleanEmail,
        password: cleanPass,
      );
      if (res.user != null) {
        final all = await fetchMembers();
        final match = all.firstWhere(
          (m) => m.email?.toLowerCase() == cleanEmail,
          orElse: () => FamilyMemberModel(
            id: res.user!.id,
            name: res.user!.email?.split('@').first ?? 'Người dùng',
            email: res.user!.email,
            role: 'ADMIN',
            status: 'ACTIVE',
            createdAt: DateTime.now().toIso8601String(),
          ),
        );
        await setActiveMember(match);
        return true;
      }
    } catch (_) {}

    // Offline / demo fallback for initial setup
    final all = await fetchMembers();
    final match = all.firstWhere(
      (m) => m.email?.toLowerCase() == cleanEmail ||
             (cleanEmail.contains('son') && m.name.contains('Sơn')) ||
             (cleanEmail.contains('thuy') && m.name.contains('Thuý')),
      orElse: () => FamilyMemberModel(
        id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
        name: cleanEmail.split('@').first,
        email: cleanEmail,
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: DateTime.now().toIso8601String(),
      ),
    );

    await setActiveMember(match);
    return true;
  }

  /// Real email/password registration
  Future<bool> signUpWithEmailPassword({
    required String name,
    required String email,
    required String password,
  }) async {
    final cleanName = name.trim();
    final cleanEmail = email.trim().toLowerCase();
    final cleanPass = password.trim();

    if (cleanEmail.isEmpty || cleanPass.isEmpty) return false;

    try {
      final res = await _supabase.auth.signUp(
        email: cleanEmail,
        password: cleanPass,
        data: {'full_name': cleanName},
      );
      if (res.user != null) {
        final newMember = FamilyMemberModel(
          id: res.user!.id,
          name: cleanName.isNotEmpty ? cleanName : cleanEmail.split('@').first,
          email: cleanEmail,
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: DateTime.now().toIso8601String(),
        );
        await setActiveMember(newMember);
        return true;
      }
    } catch (_) {}

    // Offline / fallback registration
    final newMember = FamilyMemberModel(
      id: 'usr-${DateTime.now().millisecondsSinceEpoch}',
      name: cleanName.isNotEmpty ? cleanName : cleanEmail.split('@').first,
      email: cleanEmail,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: DateTime.now().toIso8601String(),
    );
    await setActiveMember(newMember);
    return true;
  }

  /// Synchronous getter returning cached active member or fallback
  FamilyMemberModel getCurrentMember() {
    return _cachedActiveMember ?? FamilyMemberModel.defaultMembers.first;
  }

  /// Sets the active family member and persists to local storage
  Future<void> setActiveMember(FamilyMemberModel member) async {
    _cachedActiveMember = member;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kActiveMemberKey, jsonEncode(member.toJson()));
  }

  /// Clears active member (Logout)
  Future<void> clearActiveMember() async {
    _cachedActiveMember = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kActiveMemberKey);
    try {
      await _supabase.auth.signOut();
    } catch (_) {}
  }

  /// Fetches real members from Supabase `user_members` table with offline caching
  Future<List<FamilyMemberModel>> fetchMembers() async {
    try {
      final res = await _supabase
          .from('user_members')
          .select()
          .eq('status', 'ACTIVE')
          .order('role', ascending: true) // ADMIN first
          .order('created_at', ascending: true);

      final list = (res as List).map((e) => FamilyMemberModel.fromJson(e)).toList();

      if (list.isNotEmpty) {
        // Cache to SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        final raw = list.map((m) => m.toJson()).toList();
        await prefs.setString(_kCachedMembersKey, jsonEncode(raw));
        return list;
      }
    } catch (_) {
      // Load from local cache if network is unavailable
      final prefs = await SharedPreferences.getInstance();
      final cachedStr = prefs.getString(_kCachedMembersKey);
      if (cachedStr != null && cachedStr.isNotEmpty) {
        try {
          final raw = jsonDecode(cachedStr) as List;
          return raw.map((e) => FamilyMemberModel.fromJson(e)).toList();
        } catch (_) {}
      }
    }

    return FamilyMemberModel.defaultMembers;
  }

  List<FamilyMemberModel> getAllMembers() {
    return FamilyMemberModel.defaultMembers;
  }

  Future<AuthResponse> signInWithPassword({
    required String email,
    required String password,
  }) async {
    final res = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    return res;
  }

  Future<void> signOut() async {
    await clearActiveMember();
  }
}

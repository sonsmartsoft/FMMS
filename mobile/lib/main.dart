import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'models/user_member_model.dart';
import 'screens/login_profile_screen.dart';
import 'screens/main_shell_screen.dart';
import 'services/auth_service.dart';
import 'widgets/app_lock_gatekeeper.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://opslebsdmwsnsyfmbynf.supabase.co',
    ),
    anonKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3',
    ),
  );

  final authService = AuthService();
  final activeMember = await authService.getActiveMember();

  runApp(FFMSApp(initialMember: activeMember));
}

class FFMSApp extends StatelessWidget {
  final FamilyMemberModel? initialMember;

  const FFMSApp({super.key, this.initialMember});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FMMS Tài Chính Gia Đình',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.system,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorSchemeSeed: const Color(0xFF0284C7),
        fontFamily: '.AppleSystemUIFont',
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B1120),
        colorSchemeSeed: const Color(0xFF0284C7),
        fontFamily: '.AppleSystemUIFont',
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Colors.transparent,
          surfaceTintColor: Colors.transparent,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 17,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('vi', 'VN'),
        Locale('en', 'US'),
      ],
      home: initialMember != null ? const MainShellScreen() : const LoginProfileScreen(),
      builder: (context, child) {
        if (initialMember == null) return child ?? const SizedBox();
        return AppLockGatekeeper(child: child ?? const SizedBox());
      },
    );
  }
}

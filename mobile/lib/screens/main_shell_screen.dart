import 'package:flutter/material.dart';
import 'ai_chat_screen.dart';
import 'analytics_report_screen.dart';
import 'cashbook_screen.dart';
import 'quick_expense_sheet.dart';
import 'utilities_hub_screen.dart';
import 'wallets_screen.dart';
import '../widgets/draggable_floating_ai_bubble.dart';

class MainShellScreen extends StatefulWidget {
  const MainShellScreen({super.key});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  int _currentIndex = 0;

  void _openQuickAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => QuickExpenseSheet(
        onSaved: () {
          // Trigger reload on current tab
          setState(() {});
        },
      ),
    );
  }

  void _openAIChat([Offset? origin]) {
    final screenSize = MediaQuery.of(context).size;
    Alignment expandAlignment = Alignment.bottomRight;
    if (origin != null && screenSize.width > 0 && screenSize.height > 0) {
      final double alignX = (origin.dx / screenSize.width) * 2 - 1.0;
      final double alignY = (origin.dy / screenSize.height) * 2 - 1.0;
      expandAlignment = Alignment(alignX.clamp(-1.0, 1.0), alignY.clamp(-1.0, 1.0));
    }

    Navigator.of(context).push(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 320),
        reverseTransitionDuration: const Duration(milliseconds: 270),
        pageBuilder: (context, animation, secondaryAnimation) => const AIChatScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
          return ScaleTransition(
            scale: Tween<double>(begin: 0.12, end: 1.0).animate(curved),
            alignment: expandAlignment,
            child: FadeTransition(
              opacity: curved,
              child: child,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final List<Widget> pages = [
      CashbookScreen(onOpenQuickAdd: _openQuickAddModal),
      const AnalyticsReportScreen(),
      const WalletsScreen(),
      UtilitiesHubScreen(onOpenQuickAdd: _openQuickAddModal),
    ];

    return Stack(
      children: [
        Scaffold(
          body: IndexedStack(
            index: _currentIndex,
            children: pages,
          ),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
          floatingActionButton: Container(
            height: 62,
            width: 62,
            margin: const EdgeInsets.only(top: 10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                colors: [Color(0xFF0284C7), Color(0xFF0EA5E9), Color(0xFF10B981)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.4),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                )
              ],
            ),
            child: FloatingActionButton(
              onPressed: _openQuickAddModal,
              backgroundColor: Colors.transparent,
              elevation: 0,
              tooltip: 'AI Ghi Sổ Nhanh',
              child: const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
            ),
          ),
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : Colors.white,
              border: Border(
                top: BorderSide(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                  width: 1,
                ),
              ),
            ),
            child: SafeArea(
              child: SizedBox(
                height: 64,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildNavItem(0, Icons.calendar_month_outlined, Icons.calendar_month, 'Sổ Thu Chi'),
                    _buildNavItem(1, Icons.pie_chart_outline, Icons.pie_chart, 'Báo cáo'),
                    const SizedBox(width: 48), // Gap for central Floating Action Button
                    _buildNavItem(2, Icons.account_balance_wallet_outlined, Icons.account_balance_wallet, 'Tài khoản'),
                    _buildNavItem(3, Icons.grid_view_outlined, Icons.grid_view, 'Tiện ích'),
                  ],
                ),
              ),
            ),
          ),
        ),
        DraggableFloatingAIBubble(
          onTapWithPosition: (pos) => _openAIChat(pos),
        ),
      ],
    );
  }

  Widget _buildNavItem(int index, IconData outlineIcon, IconData filledIcon, String label) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? const Color(0xFF0284C7) : Colors.grey;

    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isSelected ? filledIcon : outlineIcon, color: color, size: 22),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

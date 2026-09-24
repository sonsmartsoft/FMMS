import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../models/user_member_model.dart';
import '../services/analytics_service.dart';
import '../services/auth_service.dart';
import '../services/finance_service.dart';
import '../widgets/fintech_card.dart';
import '../widgets/member_spending_bar.dart';
import 'ai_chat_screen.dart';
import 'events_trips_screen.dart';
import 'loans_screen.dart';
import 'login_profile_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  final VoidCallback onOpenQuickAdd;

  const HomeDashboardScreen({super.key, required this.onOpenQuickAdd});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  final AuthService _authService = AuthService();
  final FinanceService _financeService = FinanceService();
  final AnalyticsService _analyticsService = AnalyticsService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  bool _hideBalance = false;
  late FamilyMemberModel _currentMember;
  MonthlyStats? _stats;
  List<WalletModel> _wallets = [];

  @override
  void initState() {
    super.initState();
    _currentMember = _authService.getCurrentMember();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    final current = await _authService.getActiveMember();
    final stats = await _analyticsService.getMonthlyAnalytics();
    final wallets = await _financeService.getWallets();

    setState(() {
      if (current != null) _currentMember = current;
      _stats = stats;
      _wallets = wallets;
      _isLoading = false;
    });
  }

  void _showMemberProfileModal() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: _currentMember.role == 'ADMIN'
                            ? const [Color(0xFF0284C7), Color(0xFF0EA5E9)]
                            : const [Color(0xFF10B981), Color(0xFF34D399)],
                      ),
                    ),
                    child: Center(
                      child: Text(
                        _currentMember.name.isNotEmpty ? _currentMember.name[0].toUpperCase() : 'U',
                        style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _currentMember.name,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _currentMember.email ?? _currentMember.role,
                          style: TextStyle(fontSize: 13, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                        ),
                        if (_currentMember.phone != null && _currentMember.phone!.isNotEmpty)
                          Text(
                            'SĐT: ${_currentMember.phone}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Divider(height: 1),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.swap_horiz, color: Color(0xFF0284C7)),
                ),
                title: const Text('Đổi thành viên gia đình', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Chuyển sang tài khoản thành viên khác', style: TextStyle(fontSize: 12, color: Colors.grey)),
                trailing: const Icon(Icons.chevron_right, size: 20),
                onTap: () async {
                  Navigator.pop(ctx);
                  final selected = await Navigator.push<FamilyMemberModel>(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginProfileScreen(isSwitching: true)),
                  );
                  if (selected != null) {
                    setState(() => _currentMember = selected);
                    _loadDashboardData();
                  }
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.logout, color: Color(0xFFEF4444)),
                ),
                title: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFEF4444))),
                subtitle: const Text('Thoát khỏi phiên đăng nhập hiện tại', style: TextStyle(fontSize: 12, color: Colors.grey)),
                onTap: () async {
                  Navigator.pop(ctx);
                  await _authService.clearActiveMember();
                  if (!mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginProfileScreen()),
                    (route) => false,
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  double get _totalBalance => _wallets.fold(0.0, (sum, w) => sum + w.currentBalance);

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final stats = _stats!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: CustomScrollView(
          slivers: [
            // Custom App Bar with Profile & AI Copilot Button
            SliverAppBar(
              expandedHeight: 80,
              floating: true,
              pinned: false,
              backgroundColor: Colors.transparent,
              elevation: 0,
              flexibleSpace: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  child: Row(
                    children: [
                      // Interactive Avatar & Member Name
                      Expanded(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(16),
                          onTap: _showMemberProfileModal,
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: _currentMember.role == 'ADMIN'
                                        ? const [Color(0xFF0284C7), Color(0xFF0EA5E9)]
                                        : const [Color(0xFF10B981), Color(0xFF34D399)],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                                      blurRadius: 8,
                                    )
                                  ],
                                ),
                                child: Center(
                                  child: Text(
                                    _currentMember.name.isNotEmpty
                                        ? _currentMember.name[0].toUpperCase()
                                        : 'U',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          _currentMember.role == 'ADMIN' ? '👑 Quản trị viên' : '👤 Thành viên',
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                        const SizedBox(width: 4),
                                        const Icon(Icons.arrow_drop_down, size: 16, color: Colors.grey),
                                      ],
                                    ),
                                    Text(
                                      _currentMember.name,
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // AI Copilot Sparkle Button
                      Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.3)),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.auto_awesome, color: Color(0xFF0284C7), size: 20),
                          tooltip: 'Trợ lý AI Trò chuyện',
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const AIChatScreen()),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Main Dashboard Body
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Total Available Balance Card
                    FintechCard(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'TỔNG TÀI SẢN KHẢ DỤNG',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                              IconButton(
                                icon: Icon(
                                  _hideBalance ? Icons.visibility_off : Icons.visibility,
                                  color: const Color(0xFF94A3B8),
                                  size: 18,
                                ),
                                onPressed: () => setState(() => _hideBalance = !_hideBalance),
                                constraints: const BoxConstraints(),
                                padding: EdgeInsets.zero,
                              )
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _hideBalance ? '•••••••• ₫' : _currencyFmt.format(_totalBalance),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '${_wallets.length} Ví & Tài khoản liên kết',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.bold),
                                ),
                              ),
                              const Spacer(),
                              Text(
                                'Tháng ${DateTime.now().month}/${DateTime.now().year}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                              )
                            ],
                          )
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Monthly Flow Row: Income & Expense
                    Row(
                      children: [
                        Expanded(
                          child: FintechCard(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.arrow_downward_rounded, size: 14, color: Color(0xFF10B981)),
                                    SizedBox(width: 4),
                                    Text('Thu nhập', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _currencyFmt.format(stats.totalIncome),
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: FintechCard(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.arrow_upward_rounded, size: 14, color: Color(0xFFEF4444)),
                                    SizedBox(width: 4),
                                    Text('Chi tiêu', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _currencyFmt.format(stats.totalExpense),
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Family Member Spending Ratio Card
                    FintechCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'TỶ LỆ CHI TIÊU GIA ĐÌNH',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Colors.grey),
                              ),
                              Icon(Icons.pie_chart_outline, size: 16, color: Colors.grey),
                            ],
                          ),
                          const SizedBox(height: 14),
                          MemberSpendingBar(
                            memberBreakdown: stats.memberBreakdown,
                            currencyFmt: _currencyFmt,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Family Loans & Installments Overview Card
                    InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen()));
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                                : [const Color(0xFFF8FAFC), Colors.white],
                          ),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
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
                                      child: const Icon(Icons.handshake_outlined, size: 18, color: Color(0xFF0284C7)),
                                    ),
                                    const SizedBox(width: 10),
                                    const Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Khoản Vay & Trả Góp',
                                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                        ),
                                        Text(
                                          'Vay mua xe Mazda, trả góp tín dụng...',
                                          style: TextStyle(fontSize: 11, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0284C7).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Row(
                                    children: [
                                      Text('Chi tiết', style: TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontWeight: FontWeight.bold)),
                                      Icon(Icons.chevron_right, size: 14, color: Color(0xFF0284C7)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Dư nợ còn lại', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                      SizedBox(height: 3),
                                      Text(
                                        '282.918.368 ₫',
                                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(width: 1, height: 28, color: Colors.grey.withValues(alpha: 0.2)),
                                const SizedBox(width: 14),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Hạn trả tiếp theo', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                      SizedBox(height: 3),
                                      Text(
                                        'Ngày 28 (còn 4 ngày)',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B)),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Quick Shortcuts: Sổ Tiết Kiệm & Sự Kiện / Chuyến Đi
                    Row(
                      children: [
                        // 1. Sổ Tiết Kiệm
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen()));
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.savings_outlined, size: 18, color: Color(0xFF10B981)),
                                  ),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Sổ Tiết Kiệm', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        Text('Tích luỹ ngân hàng', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),

                        // 2. Sự Kiện & Chuyến Đi
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(14),
                            onTap: () {
                              Navigator.push(context, MaterialPageRoute(builder: (_) => const EventsTripsScreen()));
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.beach_access, size: 18, color: Color(0xFF0284C7)),
                                  ),
                                  const SizedBox(width: 8),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Sự Kiện & Tour', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                        Text('Du lịch, lễ tết...', style: TextStyle(fontSize: 10, color: Colors.grey)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Recent Transactions Header & List
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Giao dịch gần đây',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        TextButton(
                          onPressed: () {},
                          child: const Text('Xem tất cả', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    if (stats.recentTransactions.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(32.0),
                        child: Center(
                          child: Text(
                            'Chưa có giao dịch nào trong tháng này.\nNhấn nút (+) bên dưới để nhờ AI ghi sổ ngay!',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey, height: 1.5),
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: stats.recentTransactions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final tx = stats.recentTransactions[idx];
                          final isExpense = tx.transactionType == TransactionType.EXPENSE;

                          // Extract member if present
                          String memberLabel = 'Tôi';
                          if (tx.notes != null && tx.notes!.contains('[Người chi:')) {
                            final match = RegExp(r'\[Người chi:\s*([^\]]+)\]').firstMatch(tx.notes!);
                            if (match != null) memberLabel = match.group(1)!;
                          }

                          return FintechCard(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: (isExpense ? const Color(0xFFEF4444) : const Color(0xFF10B981)).withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isExpense ? Icons.shopping_bag_outlined : Icons.account_balance_wallet_outlined,
                                    size: 18,
                                    color: isExpense ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        tx.payeeVendor ?? tx.categoryName ?? 'Khoản chi tiêu',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 3),
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: Colors.grey.withValues(alpha: 0.15),
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              memberLabel,
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            tx.date,
                                            style: const TextStyle(fontSize: 11, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '${isExpense ? '-' : '+'}${_currencyFmt.format(tx.amount)}',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: isExpense ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                    const SizedBox(height: 100), // padding for bottom bar
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

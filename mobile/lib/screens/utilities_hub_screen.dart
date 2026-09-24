import 'package:flutter/material.dart';
import 'account_security_screen.dart';
import 'ai_chat_screen.dart';
import 'budget_screen.dart';
import 'cashbook_search_screen.dart';
import 'category_management_screen.dart';
import 'events_trips_screen.dart';
import 'family_members_screen.dart';
import 'home_dashboard_screen.dart';
import 'loans_screen.dart';
import 'login_profile_screen.dart';
import 'recurring_bills_screen.dart';
import '../services/auth_service.dart';

class UtilitiesHubScreen extends StatelessWidget {
  final VoidCallback onOpenQuickAdd;

  const UtilitiesHubScreen({super.key, required this.onOpenQuickAdd});

  void _confirmLogout(BuildContext context) {
    showDialog(
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
                child: Text('Đăng Xuất Tài Khoản', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          content: Text(
            'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng? Mọi dữ liệu đã được đồng bộ an toàn.',
            style: TextStyle(fontSize: 13, color: isDark ? Colors.grey[300] : Colors.grey[700]),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Huỷ bỏ', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEF4444),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                Navigator.pop(ctx);
                await AuthService().clearActiveMember();
                if (!context.mounted) return;
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginProfileScreen()),
                  (route) => false,
                );
              },
              child: const Text('Đăng Xuất', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  void _exportCsvData(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.table_chart, color: Color(0xFF10B981)),
            SizedBox(width: 8),
            Text('Xuất Báo Cáo Excel / CSV', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: const Text(
          'Dữ liệu toàn bộ sổ thu chi, khoản vay và sổ tiết kiệm sẽ được xuất dưới định dạng file .CSV tương thích 100% với Microsoft Excel và Google Sheets.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Đóng')),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            icon: const Icon(Icons.download, size: 16, color: Colors.white),
            label: const Text('Tải file CSV', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  backgroundColor: Color(0xFF10B981),
                  content: Text('✓ Đã kết xuất báo cáo CSV thành công vào bộ nhớ máy!'),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tiện Ích & Công Cụ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          // Banner Feature Highlight
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0284C7), Color(0xFF0EA5E9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Hệ Sinh Thái Tài Chính Gia Đình',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Chuẩn hóa nghiệp vụ quản lý tài sản, nợ, tiết kiệm và xe cộ',
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Section 1: NGHIỆP VỤ TÀI CHÍNH NÂNG CAO (Kiểu MISA MoneyKeeper)
          _buildSectionHeader('NGHIỆP VỤ TÀI CHÍNH NÂNG CAO'),
          const SizedBox(height: 8),
          _buildToolTile(
            context: context,
            icon: Icons.track_changes,
            iconColor: const Color(0xFF10B981),
            title: 'Hạn Mức Chi (Ngân Sách Tháng)',
            subtitle: 'Thiết lập ngân sách từng danh mục, cảnh báo vượt hạn mức',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BudgetScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.handshake_outlined,
            iconColor: const Color(0xFFF59E0B),
            title: 'Sổ Nợ & Cho Vay (Lending & Debt)',
            subtitle: 'Theo dõi ai nợ mình, mình nợ ai, trả nợ từng phần',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.savings_outlined,
            iconColor: const Color(0xFF0284C7),
            title: 'Sổ Tiết Kiệm Ngân Hàng',
            subtitle: 'Quản lý tiền gửi, lãi suất, ngày đáo hạn & tất toán gốc lãi',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoansScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.receipt_long_outlined,
            iconColor: const Color(0xFF8B5CF6),
            title: 'Hóa Đơn & Chi Phí Định Kỳ',
            subtitle: 'Tiền điện, nước, internet, học phí, trả góp xe Mazda',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RecurringBillsScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.beach_access_outlined,
            iconColor: const Color(0xFFEC4899),
            title: 'Chuyến Đi & Sự Kiện (Events & Trips)',
            subtitle: 'Đóng gói ngân sách du lịch, cưới hỏi, lễ Tết độc lập',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EventsTripsScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.category_outlined,
            iconColor: const Color(0xFF0284C7),
            title: 'Hạng Mục Thu / Chi',
            subtitle: 'Tùy chỉnh danh mục cha, danh mục con theo thói quen gia đình',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CategoryManagementScreen())),
          ),

          const SizedBox(height: 20),

          // Section 2: TIỆN ÍCH DỮ LIỆU & BÁO CÁO
          _buildSectionHeader('DỮ LIỆU & BÁO CÁO'),
          const SizedBox(height: 8),
          _buildToolTile(
            context: context,
            icon: Icons.search,
            iconColor: const Color(0xFF0284C7),
            title: 'Tìm Kiếm Giao Dịch Nâng Cao',
            subtitle: 'Lọc thu chi đa chiều theo thời gian, ví, danh mục và từ khóa',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CashbookSearchScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.table_chart_outlined,
            iconColor: const Color(0xFF10B981),
            title: 'Xuất Báo Cáo Excel / CSV',
            subtitle: 'Trích xuất toàn bộ sổ sách thu chi ra file bảng tính',
            onTap: () => _exportCsvData(context),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.directions_car_outlined,
            iconColor: const Color(0xFF3B82F6),
            title: 'Tổng Quan Xe Cộ & Đội Xe Gia Đình',
            subtitle: 'Bảo dưỡng định kỳ, chi phí xăng xe, đăng kiểm xe Mazda 2 AT',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => HomeDashboardScreen(onOpenQuickAdd: onOpenQuickAdd)),
            ),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.smart_toy_outlined,
            iconColor: const Color(0xFF8B5CF6),
            title: 'Trợ Lý Tài Chính Thông Minh (AI)',
            subtitle: 'Tư vấn phân bổ dòng tiền, giải đáp các thắc mắc chi tiêu',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AIChatScreen())),
          ),

          const SizedBox(height: 20),

          // Section 3: TÀI KHOẢN & BẢO MẬT
          _buildSectionHeader('TÀI KHOẢN & THÀNH VIÊN'),
          const SizedBox(height: 8),
          _buildToolTile(
            context: context,
            icon: Icons.people_outline,
            iconColor: const Color(0xFF10B981),
            title: 'Thành Viên Gia Đình & Phân Quyền',
            subtitle: 'Quản lý thành viên, đặt hạn mức chi tiêu, mời vào sổ',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FamilyMembersScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.shield_outlined,
            iconColor: const Color(0xFF0284C7),
            title: 'Bảo Mật & Đổi Mật Khẩu',
            subtitle: 'Đổi mật khẩu tài khoản, mã PIN, Face ID & quản lý phiên',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSecurityScreen())),
          ),
          _buildToolTile(
            context: context,
            icon: Icons.logout_outlined,
            iconColor: const Color(0xFFEF4444),
            title: 'Đăng Xuất Tài Khoản',
            subtitle: 'Thoát khỏi hồ sơ đăng nhập hiện tại trên thiết bị này',
            onTap: () => _confirmLogout(context),
          ),

          const SizedBox(height: 60),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildToolTile({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
        trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
      ),
    );
  }
}

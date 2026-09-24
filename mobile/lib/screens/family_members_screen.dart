import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/finance_model.dart';
import '../models/user_member_model.dart';
import '../services/auth_service.dart';
import '../services/finance_service.dart';
import 'transaction_detail_screen.dart';

class FamilyMembersScreen extends StatefulWidget {
  const FamilyMembersScreen({super.key});

  @override
  State<FamilyMembersScreen> createState() => _FamilyMembersScreenState();
}

class _FamilyMembersScreenState extends State<FamilyMembersScreen> {
  final AuthService _authService = AuthService();
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<FamilyMemberModel> _members = [];
  FamilyMemberModel? _activeMember;
  Map<String, double> _memberExpensesThisMonth = {};

  final List<String> _relationships = [
    'Bố / Trụ cột',
    'Mẹ / Tay hòm chìa khóa',
    'Vợ',
    'Chồng',
    'Con trai',
    'Con gái',
    'Ông',
    'Bà',
    'Khách / Trợ lý',
    'Khác',
  ];

  final List<Color> _presetColors = [
    const Color(0xFF0284C7), // Blue
    const Color(0xFF10B981), // Emerald
    const Color(0xFFEC4899), // Pink
    const Color(0xFF8B5CF6), // Purple
    const Color(0xFFF59E0B), // Amber
    const Color(0xFFEF4444), // Red
    const Color(0xFF06B6D4), // Cyan
    const Color(0xFF64748B), // Slate
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final members = await _authService.fetchMembers();
    final active = await _authService.getActiveMember() ?? _authService.getCurrentMember();
    final transactions = await _financeService.getTransactions(limit: 500);

    // Calculate this month's expense for each member
    final now = DateTime.now();
    final Map<String, double> expenses = {};
    for (final tx in transactions) {
      if (tx.transactionType == TransactionType.EXPENSE && !tx.isExcludedFromReport) {
        try {
          final dt = DateTime.parse(tx.date);
          if (dt.year == now.year && dt.month == now.month) {
            final key = tx.paidByMember ?? tx.forMemberName ?? '';
            // Match against member names
            for (final m in members) {
              if (key.contains(m.name) || m.name.contains(key) || (m.role == 'ADMIN' && key.isEmpty)) {
                expenses[m.id] = (expenses[m.id] ?? 0.0) + tx.amount;
                break;
              }
            }
          }
        } catch (_) {}
      }
    }

    if (mounted) {
      setState(() {
        _members = members;
        _activeMember = active;
        _memberExpensesThisMonth = expenses;
        _isLoading = false;
      });
    }
  }

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return const Color(0xFF0284C7);
    }
  }

  String _colorToHex(Color color) {
    return '#${color.value.toRadixString(16).substring(2).toUpperCase()}';
  }

  void _switchProfile(FamilyMemberModel member) async {
    await _authService.setActiveMember(member);
    setState(() {
      _activeMember = member;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF10B981),
          content: Text('✓ Đã chuyển sang hồ sơ: ${member.name}'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _showAddOrEditMemberDialog([FamilyMemberModel? existing]) {
    final isEdit = existing != null;
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final emailCtrl = TextEditingController(text: existing?.email ?? '');
    final phoneCtrl = TextEditingController(text: existing?.phone ?? '');
    final budgetCtrl = TextEditingController(
      text: existing != null && existing.monthlyBudgetLimit > 0
          ? existing.monthlyBudgetLimit.toInt().toString()
          : '',
    );

    String selectedRole = existing?.role ?? 'MEMBER';
    String selectedRel = existing?.relationship ?? _relationships.first;
    Color selectedColor = existing != null ? _parseColor(existing.colorHex) : _presetColors.first;
    bool canRecord = existing?.canRecordExpense ?? true;
    bool canViewRep = existing?.canViewReports ?? true;
    bool canManageW = existing?.canManageWallets ?? (selectedRole == 'ADMIN');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogCtx, setModalState) {
            final isDark = Theme.of(dialogCtx).brightness == Brightness.dark;
            final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;

            return Container(
              height: MediaQuery.of(context).size.height * 0.88,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          isEdit ? 'Chỉnh Sửa Thành Viên' : 'Thêm Thành Viên Mới',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(dialogCtx),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Content
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      children: [
                        // Name
                        TextField(
                          controller: nameCtrl,
                          decoration: InputDecoration(
                            labelText: 'Họ và tên *',
                            hintText: 'VD: Nguyễn An, Mẹ Bích...',
                            prefixIcon: const Icon(Icons.person_outline),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Relationship
                        DropdownButtonFormField<String>(
                          value: _relationships.contains(selectedRel) ? selectedRel : _relationships.first,
                          decoration: InputDecoration(
                            labelText: 'Mối quan hệ gia đình',
                            prefixIcon: const Icon(Icons.family_restroom),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: _relationships.map((rel) {
                            return DropdownMenuItem(value: rel, child: Text(rel));
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setModalState(() => selectedRel = val);
                          },
                        ),
                        const SizedBox(height: 16),

                        // Role
                        DropdownButtonFormField<String>(
                          value: selectedRole,
                          decoration: InputDecoration(
                            labelText: 'Vai trò trong sổ *',
                            prefixIcon: const Icon(Icons.shield_outlined),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'ADMIN',
                              child: Text('Chủ gia đình / Quản trị viên (Toàn quyền)'),
                            ),
                            DropdownMenuItem(
                              value: 'MEMBER',
                              child: Text('Thành viên gia đình (Ghi chép & Xem)'),
                            ),
                            DropdownMenuItem(
                              value: 'VIEWER',
                              child: Text('Chỉ xem (Không được sửa / xóa)'),
                            ),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setModalState(() {
                                selectedRole = val;
                                if (val == 'ADMIN') {
                                  canRecord = true;
                                  canViewRep = true;
                                  canManageW = true;
                                } else if (val == 'VIEWER') {
                                  canRecord = false;
                                  canManageW = false;
                                }
                              });
                            }
                          },
                        ),
                        const SizedBox(height: 16),

                        // Phone & Email
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: phoneCtrl,
                                keyboardType: TextInputType.phone,
                                decoration: InputDecoration(
                                  labelText: 'Số điện thoại',
                                  prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextField(
                                controller: emailCtrl,
                                keyboardType: TextInputType.emailAddress,
                                decoration: InputDecoration(
                                  labelText: 'Email',
                                  prefixIcon: const Icon(Icons.email_outlined, size: 20),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Monthly Spending Limit
                        TextField(
                          controller: budgetCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Hạn mức chi tiêu hàng tháng (VNĐ)',
                            hintText: 'VD: 5000000 (Để trống = Không giới hạn)',
                            prefixIcon: const Icon(Icons.speed),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            suffixText: '₫',
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Color selection
                        const Text(
                          'MÀU SẮC NHẬN DIỆN THÀNH VIÊN',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 12,
                          runSpacing: 10,
                          children: _presetColors.map((col) {
                            final isSel = selectedColor == col;
                            return GestureDetector(
                              onTap: () => setModalState(() => selectedColor = col),
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: col,
                                  shape: BoxShape.circle,
                                  border: isSel
                                      ? Border.all(color: Colors.white, width: 3)
                                      : null,
                                  boxShadow: isSel
                                      ? [
                                          BoxShadow(
                                            color: col.withValues(alpha: 0.5),
                                            blurRadius: 8,
                                            spreadRadius: 2,
                                          )
                                        ]
                                      : null,
                                ),
                                child: isSel
                                    ? const Icon(Icons.check, color: Colors.white, size: 20)
                                    : null,
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        // Permissions
                        const Text(
                          'PHÂN QUYỀN TRÊN SỔ CHI TIÊU',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        SwitchListTile(
                          title: const Text('Quyền ghi chép thu chi', style: TextStyle(fontSize: 14)),
                          subtitle: const Text('Được thêm mới và chỉnh sửa khoản chi của mình', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: canRecord,
                          activeColor: const Color(0xFF10B981),
                          onChanged: selectedRole == 'VIEWER'
                              ? null
                              : (val) => setModalState(() => canRecord = val),
                        ),
                        SwitchListTile(
                          title: const Text('Quyền xem báo cáo phân tích', style: TextStyle(fontSize: 14)),
                          subtitle: const Text('Xem biểu đồ và dòng tiền gia đình', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: canViewRep,
                          activeColor: const Color(0xFF10B981),
                          onChanged: (val) => setModalState(() => canViewRep = val),
                        ),
                        SwitchListTile(
                          title: const Text('Quyền quản trị tài khoản / ví', style: TextStyle(fontSize: 14)),
                          subtitle: const Text('Thêm ví mới, điều chỉnh số dư, chuyển tiền', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          value: canManageW,
                          activeColor: const Color(0xFF10B981),
                          onChanged: selectedRole != 'ADMIN'
                              ? null
                              : (val) => setModalState(() => canManageW = val),
                        ),
                      ],
                    ),
                  ),

                  // Bottom Save Button
                  Padding(
                    padding: const EdgeInsets.all(20),
                    child: SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 2,
                        ),
                        icon: const Icon(Icons.save, color: Colors.white),
                        label: Text(
                          isEdit ? 'LƯU THAY ĐỔI' : 'TẠO THÀNH VIÊN',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 15),
                        ),
                        onPressed: () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Vui lòng nhập họ và tên thành viên!')),
                            );
                            return;
                          }

                          final budgetLimit = double.tryParse(budgetCtrl.text.replaceAll('.', '').replaceAll(',', '')) ?? 0.0;

                          final member = FamilyMemberModel(
                            id: existing?.id ?? 'usr-${DateTime.now().millisecondsSinceEpoch}',
                            name: name,
                            role: selectedRole,
                            relationship: selectedRel,
                            email: emailCtrl.text.trim().isNotEmpty ? emailCtrl.text.trim() : null,
                            phone: phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : null,
                            monthlyBudgetLimit: budgetLimit,
                            colorHex: _colorToHex(selectedColor),
                            canRecordExpense: canRecord,
                            canViewReports: canViewRep,
                            canManageWallets: canManageW,
                            createdAt: existing?.createdAt ?? DateTime.now().toIso8601String(),
                          );

                          await _authService.saveMember(member);
                          Navigator.pop(dialogCtx);
                          _loadData();

                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              backgroundColor: const Color(0xFF10B981),
                              content: Text('✓ Đã lưu thành viên: ${member.name}'),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDeleteMember(FamilyMemberModel member) {
    if (member.role == 'ADMIN' && _members.where((m) => m.role == 'ADMIN').length <= 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Colors.red,
          content: Text('Không thể xóa Quản trị viên duy nhất của sổ gia đình!'),
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.red),
            SizedBox(width: 8),
            Text('Xác Nhận Xóa', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text('Bạn có chắc chắn muốn xóa thành viên "${member.name}" khỏi sổ gia đình?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(ctx);
              await _authService.deleteMember(member.id);
              _loadData();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: Colors.red,
                  content: Text('Đã xóa thành viên "${member.name}".'),
                ),
              );
            },
            child: const Text('Xóa vĩnh viễn', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showInviteModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.qr_code_2, size: 36, color: Color(0xFF10B981)),
              ),
              const SizedBox(height: 16),
              const Text(
                'Mời Thành Viên Gia Đình',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              const SizedBox(height: 8),
              const Text(
                'Chia sẻ mã bên dưới để thành viên trong nhà cùng ghi chép và theo dõi chi tiêu chung:',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'FMMS-FAMILY-2026',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2, color: Color(0xFF10B981)),
                    ),
                    SizedBox(width: 10),
                    Icon(Icons.copy, size: 18, color: Color(0xFF10B981)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(Icons.share, color: Colors.white),
                  label: const Text('Sao Chép Liên Kết Mời', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        backgroundColor: Color(0xFF10B981),
                        content: Text('✓ Đã sao chép mã mời gia đình vào bộ nhớ tạm!'),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showMemberSpendingHistory(FamilyMemberModel member) async {
    final transactions = await _financeService.getTransactions(limit: 300);
    final memberTx = transactions.where((tx) {
      final key = tx.paidByMember ?? tx.forMemberName ?? '';
      return key.contains(member.name) || member.name.contains(key);
    }).toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        final bgColor = isDark ? const Color(0xFF1E293B) : Colors.white;

        return DraggableScrollableSheet(
          initialChildSize: 0.75,
          minChildSize: 0.45,
          maxChildSize: 0.95,
          builder: (_, scrollCtrl) {
            return Container(
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12, bottom: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: _parseColor(member.colorHex),
                          radius: 18,
                          child: Text(
                            member.name.isNotEmpty ? member.name[0].toUpperCase() : 'U',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                member.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                              Text(
                                '${member.relationship ?? "Thành viên"} • ${memberTx.length} giao dịch',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: memberTx.isEmpty
                        ? const Center(
                            child: Text('Chưa có giao dịch nào do thành viên này thực hiện.'),
                          )
                        : ListView.separated(
                            controller: scrollCtrl,
                            padding: const EdgeInsets.all(16),
                            itemCount: memberTx.length,
                            separatorBuilder: (_, __) => const Divider(height: 1),
                            itemBuilder: (context, i) {
                              final tx = memberTx[i];
                              final isExp = tx.transactionType == TransactionType.EXPENSE;
                              final color = isExp ? const Color(0xFFEF4444) : const Color(0xFF10B981);

                              return ListTile(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => TransactionDetailScreen(transaction: tx)),
                                  ).then((_) => _loadData());
                                },
                                contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                leading: CircleAvatar(
                                  backgroundColor: color.withValues(alpha: 0.12),
                                  child: Icon(
                                    isExp ? Icons.arrow_outward : Icons.arrow_downward,
                                    color: color,
                                    size: 18,
                                  ),
                                ),
                                title: Text(
                                  tx.categoryName ?? tx.description ?? 'Giao dịch',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                                subtitle: Text(
                                  '${tx.date} • ${tx.walletName ?? "Ví"}',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                ),
                                trailing: Text(
                                  '${isExp ? "-" : "+"}${_currencyFmt.format(tx.amount)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: color,
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Thành Viên Gia Đình', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code, color: Color(0xFF10B981)),
            tooltip: 'Mời thành viên',
            onPressed: _showInviteModal,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Tải lại',
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Family Household Header Card (MISA Style)
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF0284C7), Color(0xFF0EA5E9), Color(0xFF10B981)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0284C7).withValues(alpha: 0.3),
                          blurRadius: 14,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.family_restroom, color: Colors.white, size: 26),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'SỔ CHI TIÊU GIA ĐÌNH',
                                    style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Gia Đình SmartSoft (${_members.length} thành viên)',
                                    style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${_members.length} Active',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Divider(color: Colors.white24, height: 1),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Hồ sơ đang đăng nhập:', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                const SizedBox(height: 3),
                                Text(
                                  _activeMember?.name ?? 'Chưa xác định',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                              ],
                            ),
                            TextButton.icon(
                              style: TextButton.styleFrom(
                                backgroundColor: Colors.white.withValues(alpha: 0.2),
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              icon: const Icon(Icons.group_add, color: Colors.white, size: 16),
                              label: const Text('Mời vào sổ', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                              onPressed: _showInviteModal,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Section Title
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'DANH SÁCH THÀNH VIÊN',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.8),
                      ),
                      Text(
                        '${_members.length} người',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Member Cards
                  ..._members.map((member) => _buildMemberCard(member, isDark)),

                  const SizedBox(height: 80),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddOrEditMemberDialog(),
        backgroundColor: const Color(0xFF10B981),
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Thêm Thành Viên', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
      ),
    );
  }

  Widget _buildMemberCard(FamilyMemberModel member, bool isDark) {
    final isCurrent = _activeMember?.id == member.id;
    final memberColor = _parseColor(member.colorHex);
    final spentThisMonth = _memberExpensesThisMonth[member.id] ?? 0.0;
    final limit = member.monthlyBudgetLimit;
    final hasLimit = limit > 0;
    final ratio = hasLimit ? (spentThisMonth / limit) : 0.0;

    Color progressColor = const Color(0xFF10B981);
    if (ratio >= 1.0) {
      progressColor = const Color(0xFFEF4444); // Exceeded
    } else if (ratio >= 0.8) {
      progressColor = const Color(0xFFF59E0B); // Warning
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isCurrent
              ? const Color(0xFF10B981)
              : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          width: isCurrent ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar with Badge
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: memberColor.withValues(alpha: 0.15),
                      child: Text(
                        member.name.isNotEmpty ? member.name[0].toUpperCase() : 'U',
                        style: TextStyle(color: memberColor, fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                    ),
                    if (isCurrent)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(2),
                          decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle),
                          child: const Icon(Icons.check, size: 10, color: Colors.white),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 14),

                // Name & Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              member.name,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (isCurrent)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Bạn',
                                style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            member.relationship ?? 'Thành viên',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          const Text(' • ', style: TextStyle(color: Colors.grey)),
                          Text(
                            member.role == 'ADMIN'
                                ? 'Chủ gia đình'
                                : (member.role == 'VIEWER' ? 'Chỉ xem' : 'Thành viên'),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: member.role == 'ADMIN' ? const Color(0xFF0284C7) : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                      if (member.phone != null && member.phone!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(member.phone!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ],
                  ),
                ),

                // Popup menu
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                  onSelected: (val) {
                    if (val == 'switch') {
                      _switchProfile(member);
                    } else if (val == 'edit') {
                      _showAddOrEditMemberDialog(member);
                    } else if (val == 'history') {
                      _showMemberSpendingHistory(member);
                    } else if (val == 'delete') {
                      _confirmDeleteMember(member);
                    }
                  },
                  itemBuilder: (ctx) => [
                    if (!isCurrent)
                      const PopupMenuItem(
                        value: 'switch',
                        child: Row(
                          children: [
                            Icon(Icons.swap_horiz, size: 18, color: Color(0xFF10B981)),
                            SizedBox(width: 8),
                            Text('Chuyển sang hồ sơ này'),
                          ],
                        ),
                      ),
                    const PopupMenuItem(
                      value: 'history',
                      child: Row(
                        children: [
                          Icon(Icons.history, size: 18, color: Color(0xFF0284C7)),
                          SizedBox(width: 8),
                          Text('Lịch sử chi tiêu'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit_outlined, size: 18),
                          SizedBox(width: 8),
                          Text('Chỉnh sửa & Phân quyền'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, size: 18, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Xóa thành viên', style: TextStyle(color: Colors.red)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Monthly Limit Progress Bar (MISA Style)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A).withValues(alpha: 0.5) : const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(18)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Đã chi tháng này: ${_currencyFmt.format(spentThisMonth)}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      hasLimit
                          ? 'Hạn mức: ${_currencyFmt.format(limit)}'
                          : 'Không giới hạn',
                      style: TextStyle(
                        fontSize: 11,
                        color: hasLimit ? Colors.grey : const Color(0xFF10B981),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                if (hasLimit) ...[
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: ratio.clamp(0.0, 1.0),
                      minHeight: 6,
                      backgroundColor: isDark ? Colors.grey[800] : Colors.grey[200],
                      valueColor: AlwaysStoppedAnimation<Color>(progressColor),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        ratio >= 1.0
                            ? '⚠ Vượt hạn mức: ${_currencyFmt.format(spentThisMonth - limit)}'
                            : 'Còn lại: ${_currencyFmt.format(limit - spentThisMonth)}',
                        style: TextStyle(fontSize: 10, color: progressColor, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${(ratio * 100).toStringAsFixed(0)}%',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: progressColor),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../models/finance_model.dart';
import '../services/finance_service.dart';

class CategoryManagementScreen extends StatefulWidget {
  const CategoryManagementScreen({super.key});

  @override
  State<CategoryManagementScreen> createState() => _CategoryManagementScreenState();
}

class _CategoryManagementScreenState extends State<CategoryManagementScreen> with SingleTickerProviderStateMixin {
  final FinanceService _financeService = FinanceService();

  late TabController _tabController;
  bool _isLoading = true;
  List<TransactionCategoryModel> _categories = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadCategories();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    setState(() => _isLoading = true);
    final list = await _financeService.getCategories();
    if (mounted) {
      setState(() {
        _categories = list;
        _isLoading = false;
      });
    }
  }

  void _openCategoryEditor([TransactionCategoryModel? existing, String? defaultParentId, TransactionType? defaultType]) {
    final isEditing = existing != null;
    final nameController = TextEditingController(text: existing?.name ?? '');
    String selectedColor = existing?.color ?? '#0284C7';
    String selectedIcon = existing?.icon ?? 'category';
    TransactionType type = existing?.type ?? defaultType ?? (_tabController.index == 0 ? TransactionType.EXPENSE : TransactionType.INCOME);
    String? parentId = existing?.parentId ?? defaultParentId;

    final availableParents = _categories.where((c) => c.isParent && c.type == type && c.id != existing?.id).toList();

    final colorOptions = [
      '#0284C7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B', '#F97316'
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          decoration: BoxDecoration(
            color: Theme.of(ctx).brightness == Brightness.dark ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEditing ? 'Sửa Hạng Mục' : 'Thêm Hạng Mục Mới',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 12),

                // Name
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Tên hạng mục *',
                    hintText: 'VD: Ăn sáng, Bảo dưỡng xe, Học phí...',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),

                // Parent Selector (optional)
                DropdownButtonFormField<String?>(
                  initialValue: parentId,
                  decoration: const InputDecoration(
                    labelText: 'Thuộc hạng mục cha (Để trống nếu là mục chính)',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('(Hạng mục chính - Không có cha)')),
                    ...availableParents.map((p) => DropdownMenuItem(value: p.id, child: Text('📁 ${p.name}'))),
                  ],
                  onChanged: (val) => setModalState(() => parentId = val),
                ),
                const SizedBox(height: 14),

                // Color Selector
                const Text('Màu sắc đại diện:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 10,
                  children: colorOptions.map((cHex) {
                    final color = Color(int.parse(cHex.replaceFirst('#', '0xFF')));
                    final isSelected = selectedColor == cHex;
                    return GestureDetector(
                      onTap: () => setModalState(() => selectedColor = cHex),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: isSelected ? Border.all(color: Colors.white, width: 3) : null,
                          boxShadow: isSelected
                              ? [BoxShadow(color: color.withValues(alpha: 0.5), blurRadius: 6, spreadRadius: 1)]
                              : null,
                        ),
                        child: isSelected ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                // Save button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () async {
                      if (nameController.text.trim().isEmpty) return;

                      final cat = TransactionCategoryModel(
                        id: existing?.id ?? 'cat-local-${DateTime.now().millisecondsSinceEpoch}',
                        name: nameController.text.trim(),
                        type: type,
                        parentId: parentId,
                        color: selectedColor,
                        icon: selectedIcon,
                      );

                      await _financeService.saveCategory(cat);
                      if (!mounted) return;
                      Navigator.pop(ctx);
                      _loadCategories();

                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          backgroundColor: Color(0xFF10B981),
                          content: Text('✓ Đã lưu hạng mục thành công!'),
                        ),
                      );
                    },
                    child: Text(isEditing ? 'Lưu thay đổi' : 'Tạo hạng mục', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _confirmDeleteCategory(TransactionCategoryModel cat) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa hạng mục này?'),
        content: Text('Bạn có chắc chắn muốn xóa "${cat.name}"? Các hạng mục con trực thuộc cũng sẽ bị xóa.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            onPressed: () async {
              Navigator.pop(ctx);
              await _financeService.deleteCategory(cat.id);
              _loadCategories();
            },
            child: const Text('Xác nhận xóa', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final expenseParents = _categories.where((c) => c.isParent && c.type == TransactionType.EXPENSE).toList();
    final incomeParents = _categories.where((c) => c.isParent && c.type == TransactionType.INCOME).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hạng Mục Thu / Chi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Color(0xFF0284C7)),
            tooltip: 'Thêm mục mới',
            onPressed: () => _openCategoryEditor(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF0284C7),
          labelColor: const Color(0xFF0284C7),
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: 'KHOẢN CHI'),
            Tab(text: 'KHOẢN THU'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildCategoryList(expenseParents, TransactionType.EXPENSE, isDark),
                _buildCategoryList(incomeParents, TransactionType.INCOME, isDark),
              ],
            ),
    );
  }

  Widget _buildCategoryList(List<TransactionCategoryModel> parentList, TransactionType type, bool isDark) {
    if (parentList.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.category_outlined, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            const Text('Chưa có hạng mục nào', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => _openCategoryEditor(null, null, type),
              child: const Text('Thêm hạng mục đầu tiên'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: parentList.length,
      itemBuilder: (ctx, i) {
        final parent = parentList[i];
        final subCategories = _categories.where((c) => c.parentId == parent.id).toList();
        Color catColor = const Color(0xFF0284C7);
        if (parent.color != null && parent.color!.isNotEmpty) {
          try {
            catColor = Color(int.parse(parent.color!.replaceFirst('#', '0xFF')));
          } catch (_) {}
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              initiallyExpanded: false,
              leading: CircleAvatar(
                radius: 18,
                backgroundColor: catColor.withValues(alpha: 0.15),
                child: Icon(Icons.folder, color: catColor, size: 18),
              ),
              title: Text(parent.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text('${subCategories.length} mục con', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline, size: 18, color: Color(0xFF0284C7)),
                    tooltip: 'Thêm mục con',
                    onPressed: () => _openCategoryEditor(null, parent.id, type),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, size: 18, color: Colors.grey),
                    tooltip: 'Sửa',
                    onPressed: () => _openCategoryEditor(parent),
                  ),
                ],
              ),
              children: [
                if (subCategories.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text('Chưa có hạng mục con', style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic)),
                  )
                else
                  ...subCategories.map((sc) => ListTile(
                        dense: true,
                        contentPadding: const EdgeInsets.only(left: 36, right: 16),
                        leading: const Icon(Icons.subdirectory_arrow_right, size: 16, color: Color(0xFF0284C7)),
                        title: Text(sc.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, size: 16, color: Colors.grey),
                              onPressed: () => _openCategoryEditor(sc),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFFEF4444)),
                              onPressed: () => _confirmDeleteCategory(sc),
                            ),
                          ],
                        ),
                      )),
              ],
            ),
          ),
        );
      },
    );
  }
}

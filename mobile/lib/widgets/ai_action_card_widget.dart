import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/ai_action_model.dart';
import '../models/finance_model.dart';
import '../models/user_member_model.dart';

class AIActionCardWidget extends StatelessWidget {
  final AIActionDraft draft;
  final List<TransactionCategoryModel> categories;
  final List<WalletModel> wallets;
  final List<FamilyMemberModel> members;
  final NumberFormat currencyFmt;
  final Function(AIActionDraft) onConfirmed;
  final Function(AIActionDraft) onChanged;
  final VoidCallback onDismiss;

  const AIActionCardWidget({
    super.key,
    required this.draft,
    required this.categories,
    required this.wallets,
    required this.members,
    required this.currencyFmt,
    required this.onConfirmed,
    required this.onChanged,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final parentCategories = categories.where((c) => c.isParent).toList();
    final matchingParent = categories.firstWhere(
      (c) => c.name == draft.categoryName,
      orElse: () => parentCategories.isNotEmpty ? parentCategories.first : categories.first,
    );
    final subCategories = categories.where((c) => c.parentId == matchingParent.id).toList();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF10B981).withValues(alpha: 0.5),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Top Header: AI Badge & Confidence
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.auto_awesome, size: 14, color: Color(0xFF10B981)),
                    SizedBox(width: 4),
                    Text(
                      'AI ĐỀ XUẤT GHI SỔ',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: Colors.grey),
                onPressed: onDismiss,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              )
            ],
          ),
          const SizedBox(height: 12),

          // Amount Display
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                currencyFmt.format(draft.amount),
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFFEF4444),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                draft.actionType == 'EXPENSE' ? 'Khoản chi' : 'Khoản thu',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Chips / Dropdowns: Member, Category, Subcategory, Wallet
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              // 1. Member Selector
              PopupMenuButton<String>(
                initialValue: draft.memberName,
                onSelected: (val) => onChanged(draft.copyWith(memberName: val)),
                itemBuilder: (ctx) => members.map((m) => PopupMenuItem(value: m.name, child: Text(m.name))).toList(),
                child: _buildChip(
                  icon: Icons.person_outline,
                  label: draft.memberName ?? 'Người chi',
                  color: const Color(0xFF0284C7),
                ),
              ),

              // 2. Parent Category Selector
              PopupMenuButton<TransactionCategoryModel>(
                onSelected: (val) {
                  onChanged(draft.copyWith(
                    categoryName: val.name,
                    categoryId: val.id,
                    subCategoryName: null,
                    subCategoryId: null,
                  ));
                },
                itemBuilder: (ctx) => parentCategories.map((c) => PopupMenuItem(value: c, child: Text(c.name))).toList(),
                child: _buildChip(
                  icon: Icons.category_outlined,
                  label: draft.categoryName ?? 'Danh mục',
                  color: const Color(0xFF10B981),
                ),
              ),

              // 2.1 Subcategory Selector (if present or available)
              if (subCategories.isNotEmpty || draft.subCategoryName != null)
                PopupMenuButton<TransactionCategoryModel?>(
                  onSelected: (val) {
                    onChanged(draft.copyWith(
                      subCategoryName: val?.name,
                      subCategoryId: val?.id,
                    ));
                  },
                  itemBuilder: (ctx) => [
                    const PopupMenuItem<TransactionCategoryModel?>(
                      value: null,
                      child: Text('— Không phân loại con —', style: TextStyle(color: Colors.grey)),
                    ),
                    ...subCategories.map((sc) => PopupMenuItem<TransactionCategoryModel?>(
                      value: sc,
                      child: Text(sc.name),
                    )),
                  ],
                  child: _buildChip(
                    icon: Icons.subdirectory_arrow_right,
                    label: draft.subCategoryName ?? 'Chọn danh mục con',
                    color: const Color(0xFF0D9488),
                  ),
                ),

              // 3. Wallet Selector
              PopupMenuButton<String>(
                initialValue: draft.walletName,
                onSelected: (val) => onChanged(draft.copyWith(walletName: val)),
                itemBuilder: (ctx) => wallets.map((w) => PopupMenuItem(value: w.name, child: Text(w.name))).toList(),
                child: _buildChip(
                  icon: Icons.account_balance_wallet_outlined,
                  label: draft.walletName ?? 'Ví thanh toán',
                  color: const Color(0xFFF59E0B),
                ),
              ),
            ],
          ),

          if (draft.description != null && draft.description!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              'Ghi chú: ${draft.description}',
              style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey),
            ),
          ],

          const SizedBox(height: 14),

          // Confirm Button (1-Click)
          ElevatedButton.icon(
            onPressed: () => onConfirmed(draft),
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('Xác nhận ghi sổ ngay (1 chạm)'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
          )
        ],
      ),
    );
  }

  Widget _buildChip({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 160),
            child: Text(
              label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 3),
          Icon(Icons.arrow_drop_down, size: 14, color: color),
        ],
      ),
    );
  }
}

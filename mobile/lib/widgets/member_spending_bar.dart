import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class MemberSpendingBar extends StatelessWidget {
  final Map<String, double> memberBreakdown;
  final NumberFormat currencyFmt;

  const MemberSpendingBar({
    super.key,
    required this.memberBreakdown,
    required this.currencyFmt,
  });

  @override
  Widget build(BuildContext context) {
    final sonAmount = memberBreakdown['Nguyễn Trung Sơn (Tôi)'] ?? 0.0;
    final voAmount = memberBreakdown['Vợ (Bà xã)'] ?? 0.0;
    final chungAmount = memberBreakdown['Chi tiêu chung'] ?? 0.0;
    final total = sonAmount + voAmount + chungAmount;

    final sonPercent = total > 0 ? (sonAmount / total) * 100 : 0.0;
    final voPercent = total > 0 ? (voAmount / total) * 100 : 0.0;
    final chungPercent = total > 0 ? (chungAmount / total) * 100 : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Multi-segment progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            height: 12,
            child: Row(
              children: [
                if (sonPercent > 0)
                  Expanded(
                    flex: (sonPercent * 10).round(),
                    child: Container(color: const Color(0xFF0284C7)), // Blue for Husband
                  ),
                if (voPercent > 0)
                  Expanded(
                    flex: (voPercent * 10).round(),
                    child: Container(color: const Color(0xFFEC4899)), // Pink for Wife
                  ),
                if (chungPercent > 0)
                  Expanded(
                    flex: (chungPercent * 10).round(),
                    child: Container(color: const Color(0xFF10B981)), // Emerald for Common
                  ),
                if (total == 0)
                  Expanded(
                    child: Container(color: Colors.grey.withValues(alpha: 0.3)),
                  )
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Member badges row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildMemberBadge(
              context,
              name: 'Tôi (Chồng)',
              amount: sonAmount,
              percent: sonPercent,
              color: const Color(0xFF0284C7),
              icon: Icons.face,
            ),
            _buildMemberBadge(
              context,
              name: 'Vợ (Bà xã)',
              amount: voAmount,
              percent: voPercent,
              color: const Color(0xFFEC4899),
              icon: Icons.face_3,
            ),
            _buildMemberBadge(
              context,
              name: 'Chung',
              amount: chungAmount,
              percent: chungPercent,
              color: const Color(0xFF10B981),
              icon: Icons.groups,
            ),
          ],
        )
      ],
    );
  }

  Widget _buildMemberBadge(
    BuildContext context, {
    required String name,
    required double amount,
    required double percent,
    required Color color,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
            Text(
              name,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey),
            ),
          ],
        ),
        const SizedBox(height: 3),
        Text(
          currencyFmt.format(amount),
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
        ),
        Text(
          '${percent.toStringAsFixed(1)}%',
          style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }
}

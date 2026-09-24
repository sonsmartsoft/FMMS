import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class CategoryDonutChart extends StatelessWidget {
  final Map<String, double> categoryBreakdown;
  final Map<String, int>? categoryCounts;
  final NumberFormat currencyFmt;
  final ValueChanged<String>? onCategoryTap;

  const CategoryDonutChart({
    super.key,
    required this.categoryBreakdown,
    this.categoryCounts,
    required this.currencyFmt,
    this.onCategoryTap,
  });

  static const List<Color> _palette = [
    Color(0xFF0284C7), // Blue
    Color(0xFF10B981), // Emerald
    Color(0xFFF59E0B), // Amber
    Color(0xFFEC4899), // Pink
    Color(0xFF8B5CF6), // Purple
    Color(0xFFEF4444), // Red
    Color(0xFF06B6D4), // Cyan
    Color(0xFF64748B), // Slate
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final total = categoryBreakdown.values.fold(0.0, (sum, val) => sum + val);

    if (total == 0) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24.0),
          child: Text('Chưa có dữ liệu chi tiêu', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    final entries = categoryBreakdown.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Column(
      children: [
        // Donut Chart Graphic
        SizedBox(
          height: 190,
          child: Stack(
            alignment: Alignment.center,
            children: [
              CustomPaint(
                size: const Size(190, 190),
                painter: _DonutChartPainter(
                  entries: entries,
                  total: total,
                  colors: _palette,
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'TỔNG CHI TIÊU',
                    style: TextStyle(
                      fontSize: 10,
                      letterSpacing: 1.1,
                      color: Colors.grey,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    currencyFmt.format(total),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${entries.length} nhóm chi',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              )
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Spendee-style Categories List with transaction count & interactive tap
        ...entries.asMap().entries.map((entry) {
          final idx = entry.key;
          final cat = entry.value;
          final color = _palette[idx % _palette.length];
          final percent = (cat.value / total) * 100;
          final txCount = categoryCounts?[cat.key];

          return Container(
            margin: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: isDark
                  ? Colors.white.withValues(alpha: 0.03)
                  : Colors.grey.withValues(alpha: 0.05),
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onCategoryTap != null ? () => onCategoryTap!(cat.key) : null,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            cat.key,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (txCount != null)
                            Text(
                              '$txCount giao dịch',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.grey[400] : Colors.grey[600],
                              ),
                            ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          currencyFmt.format(cat.value),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${percent.toStringAsFixed(1)}%',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                    if (onCategoryTap != null) ...[
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right, size: 16, color: Colors.grey),
                    ],
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _DonutChartPainter extends CustomPainter {
  final List<MapEntry<String, double>> entries;
  final double total;
  final List<Color> colors;

  _DonutChartPainter({
    required this.entries,
    required this.total,
    required this.colors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    const strokeWidth = 24.0;

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    double startAngle = -pi / 2;

    for (int i = 0; i < entries.length; i++) {
      final sweepAngle = (entries[i].value / total) * 2 * pi;
      paint.color = colors[i % colors.length];

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius - strokeWidth / 2),
        startAngle + 0.04,
        max(0.01, sweepAngle - 0.08),
        false,
        paint,
      );

      startAngle += sweepAngle;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

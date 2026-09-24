import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/budget_model.dart';
import '../services/finance_service.dart';
import '../widgets/fintech_card.dart';

class BudgetScreen extends StatefulWidget {
  const BudgetScreen({super.key});

  @override
  State<BudgetScreen> createState() => _BudgetScreenState();
}

class _BudgetScreenState extends State<BudgetScreen> {
  final FinanceService _financeService = FinanceService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<BudgetModel> _budgets = [];

  @override
  void initState() {
    super.initState();
    _loadBudgets();
  }

  Future<void> _loadBudgets() async {
    setState(() => _isLoading = true);
    final list = await _financeService.getBudgets();
    setState(() {
      _budgets = list;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final totalLimit = _budgets.fold(0.0, (sum, b) => sum + b.limitAmount);
    final totalSpent = _budgets.fold(0.0, (sum, b) => sum + b.spentAmount);
    final overallPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ngân Sách & Hạn Mức Chi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadBudgets,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadBudgets,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                children: [
                  // Overall Budget Card
                  FintechCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('TIẾN ĐỘ NGÂN SÁCH THÁNG NÀY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                            Text(
                              '${overallPercent.toStringAsFixed(1)}%',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: overallPercent > 100 ? const Color(0xFFEF4444) : (overallPercent > 80 ? const Color(0xFFF59E0B) : const Color(0xFF10B981)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              _currencyFmt.format(totalSpent),
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                            ),
                            Text(
                              '/ ${_currencyFmt.format(totalLimit)}',
                              style: const TextStyle(fontSize: 14, color: Colors.grey),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: overallPercent > 0 ? (overallPercent / 100).clamp(0.0, 1.0) : 0.0,
                            minHeight: 10,
                            backgroundColor: Colors.grey.withValues(alpha: 0.2),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              overallPercent > 100 ? const Color(0xFFEF4444) : (overallPercent > 80 ? const Color(0xFFF59E0B) : const Color(0xFF10B981)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  const Text('Chi tiết theo hạng mục', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),

                  ..._budgets.map((b) {
                    final percent = b.percentage;
                    final isDanger = b.isExceeded;
                    final isWarn = b.isWarning;

                    final barColor = isDanger
                        ? const Color(0xFFEF4444)
                        : (isWarn ? const Color(0xFFF59E0B) : const Color(0xFF10B981));

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: FintechCard(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  b.categoryName,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: barColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    isDanger ? 'Vượt hạn mức' : (isWarn ? 'Cảnh báo 80%' : 'An toàn'),
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: barColor),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _currencyFmt.format(b.spentAmount),
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  'Còn lại: ${_currencyFmt.format(b.remaining)}',
                                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: (percent / 100).clamp(0.0, 1.0),
                                minHeight: 6,
                                backgroundColor: Colors.grey.withValues(alpha: 0.15),
                                valueColor: AlwaysStoppedAnimation<Color>(barColor),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 100),
                ],
              ),
            ),
    );
  }
}

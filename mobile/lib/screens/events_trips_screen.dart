import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/event_trip_model.dart';
import '../services/event_trip_service.dart';

class EventsTripsScreen extends StatefulWidget {
  const EventsTripsScreen({super.key});

  @override
  State<EventsTripsScreen> createState() => _EventsTripsScreenState();
}

class _EventsTripsScreenState extends State<EventsTripsScreen> {
  final EventTripService _service = EventTripService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);

  bool _isLoading = true;
  List<EventTripModel> _trips = [];

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() => _isLoading = true);
    final list = await _service.getEventTrips();
    if (mounted) {
      setState(() {
        _trips = list;
        _isLoading = false;
      });
    }
  }

  double get _totalBudget => _trips.fold(0.0, (s, t) => s + t.budget);
  double get _totalSpent => _trips.fold(0.0, (s, t) => s + t.totalSpent);

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'flight':
        return Icons.flight_takeoff;
      case 'celebration':
        return Icons.celebration;
      case 'home_repair_service':
        return Icons.home_repair_service;
      case 'directions_car':
        return Icons.directions_car;
      case 'beach_access':
      default:
        return Icons.beach_access;
    }
  }

  void _showAddTripModal() {
    final nameController = TextEditingController();
    final budgetController = TextEditingController();
    final vehicleController = TextEditingController(text: 'Mazda 2 AT');
    final noteController = TextEditingController();
    String selectedIcon = 'beach_access';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          return Container(
            height: MediaQuery.of(ctx).size.height * 0.82,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(color: Colors.grey.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Tạo Sự Kiện / Chuyến Đi Mới',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      const Text('Tên sự kiện / Chuyến đi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: nameController,
                        decoration: InputDecoration(
                          hintText: 'VD: Du lịch Phú Quốc 3N2Đ, Đám cưới bạn thân...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      const Text('Ngân sách dự kiến', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: budgetController,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          hintText: 'VD: 15000000',
                          suffixText: '₫',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      const Text('Biểu tượng đại diện', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          {'icon': 'beach_access', 'label': 'Nghỉ dưỡng', 'data': Icons.beach_access},
                          {'icon': 'flight', 'label': 'Bay/Xa', 'data': Icons.flight_takeoff},
                          {'icon': 'celebration', 'label': 'Lễ Tết', 'data': Icons.celebration},
                          {'icon': 'directions_car', 'label': 'Phượt xe', 'data': Icons.directions_car},
                        ].map((item) {
                          final isSel = selectedIcon == item['icon'];
                          return InkWell(
                            onTap: () => setModalState(() => selectedIcon = item['icon'] as String),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0xFF0284C7).withValues(alpha: 0.15) : Colors.transparent,
                                border: Border.all(color: isSel ? const Color(0xFF0284C7) : Colors.grey.withValues(alpha: 0.3)),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                children: [
                                  Icon(item['data'] as IconData, color: isSel ? const Color(0xFF0284C7) : Colors.grey),
                                  const SizedBox(height: 4),
                                  Text(item['label'] as String, style: TextStyle(fontSize: 10, color: isSel ? const Color(0xFF0284C7) : Colors.grey)),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),

                      const Text('Phương tiện xe liên kết (nếu có)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: vehicleController,
                        decoration: InputDecoration(
                          hintText: 'VD: Mazda 2 AT',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      const Text('Ghi chú kế hoạch', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: noteController,
                        maxLines: 2,
                        decoration: InputDecoration(
                          hintText: 'Lịch trình, người tham gia...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 24),

                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0284C7),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: () async {
                            final name = nameController.text.trim();
                            if (name.isEmpty) return;
                            final budget = double.tryParse(budgetController.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;

                            final newTrip = EventTripModel(
                              id: 'trip-${DateTime.now().millisecondsSinceEpoch}',
                              name: name,
                              startDate: DateTime.now().toIso8601String().split('T').first,
                              budget: budget,
                              icon: selectedIcon,
                              linkedVehicleName: vehicleController.text.trim().isNotEmpty ? vehicleController.text.trim() : null,
                              notes: noteController.text.trim(),
                            );

                            Navigator.pop(ctx);
                            await _service.createEventTrip(newTrip);
                            _loadTrips();
                          },
                          child: const Text('Tạo Chuyến Đi / Sự Kiện', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Sự Kiện & Chuyến Đi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0284C7)),
            onPressed: _showAddTripModal,
            tooltip: 'Tạo chuyến đi mới',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTrips,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // KPI Overview
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isDark
                            ? [const Color(0xFF1E293B), const Color(0xFF0F172A)]
                            : [const Color(0xFF0284C7), const Color(0xFF0369A1)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'TỔNG CHI PHÍ SỰ KIỆN & DU LỊCH',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 0.8),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _currencyFmt.format(_totalSpent),
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Colors.white24, height: 1),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Định mức ngân sách: ${_currencyFmt.format(_totalBudget)}',
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                            Text(
                              '${_trips.length} Sự kiện',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'DANH SÁCH CHUYẾN ĐI & SỰ KIỆN',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.8),
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Thêm mới', style: TextStyle(fontSize: 12)),
                        onPressed: _showAddTripModal,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  ..._trips.map((t) => _buildTripCard(t, isDark)),
                ],
              ),
            ),
    );
  }

  Widget _buildTripCard(EventTripModel trip, bool isDark) {
    final progress = (trip.budgetProgressPercent / 100.0).clamp(0.0, 1.0);
    final isOver = trip.isOverBudget;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isOver ? const Color(0xFFEF4444).withValues(alpha: 0.4) : Colors.grey.withValues(alpha: 0.15),
          width: isOver ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
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
                  color: const Color(0xFF0284C7).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(_getIconData(trip.icon), color: const Color(0xFF0284C7), size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      trip.name,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Text(
                          trip.startDate,
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                        if (trip.linkedVehicleName != null) ...[
                          const Text(' • ', style: TextStyle(color: Colors.grey)),
                          const Icon(Icons.directions_car, size: 12, color: Color(0xFF0284C7)),
                          const SizedBox(width: 2),
                          Text(
                            trip.linkedVehicleName!,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF0284C7), fontWeight: FontWeight.bold),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isOver ? const Color(0xFFEF4444).withValues(alpha: 0.12) : const Color(0xFF10B981).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isOver ? 'Vượt hạn mức' : 'Đang chi tiêu',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isOver ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Budget Progress Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.grey.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation<Color>(
                isOver ? const Color(0xFFEF4444) : (progress > 0.8 ? const Color(0xFFF59E0B) : const Color(0xFF0284C7)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Budget stats
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Đã chi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Text(
                    _currencyFmt.format(trip.totalSpent),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isOver ? const Color(0xFFEF4444) : null,
                    ),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Ngân sách dự kiến', style: TextStyle(fontSize: 11, color: Colors.grey)),
                  const SizedBox(height: 2),
                  Text(
                    _currencyFmt.format(trip.budget),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

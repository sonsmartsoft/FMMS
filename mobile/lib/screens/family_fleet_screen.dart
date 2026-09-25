import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/fleet_model.dart';
import '../services/fleet_service.dart';
import 'ai_chat_screen.dart';

class FamilyFleetScreen extends StatefulWidget {
  const FamilyFleetScreen({super.key});

  @override
  State<FamilyFleetScreen> createState() => _FamilyFleetScreenState();
}

class _FamilyFleetScreenState extends State<FamilyFleetScreen> with SingleTickerProviderStateMixin {
  final FleetService _fleetService = FleetService();
  final NumberFormat _currencyFmt = NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0);
  final NumberFormat _numFmt = NumberFormat.decimalPattern('vi_VN');

  bool _isLoading = true;
  List<VehicleModel> _vehicles = [];
  int _selectedVehicleIdx = 0;

  List<VehicleMaintenanceItem> _maintenanceList = [];
  List<VehicleFuelItem> _fuelLogs = [];
  bool _isLoadingDetails = false;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadFleetData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFleetData() async {
    setState(() => _isLoading = true);
    final list = await _fleetService.getVehicles();
    setState(() {
      _vehicles = list;
      _isLoading = false;
      if (_selectedVehicleIdx >= list.length) {
        _selectedVehicleIdx = 0;
      }
    });

    if (list.isNotEmpty) {
      await _loadSelectedVehicleDetails(list[_selectedVehicleIdx].id);
    }
  }

  Future<void> _loadSelectedVehicleDetails(String vehicleId) async {
    setState(() => _isLoadingDetails = true);
    final maint = await _fleetService.getMaintenanceRecords(vehicleId);
    final fuels = await _fleetService.getFuelLogs(vehicleId);
    setState(() {
      _maintenanceList = maint;
      _fuelLogs = fuels;
      _isLoadingDetails = false;
    });
  }

  void _onSelectVehicle(int idx) {
    if (idx == _selectedVehicleIdx) return;
    setState(() => _selectedVehicleIdx = idx);
    _loadSelectedVehicleDetails(_vehicles[idx].id);
  }

  void _showUpdateOdoDialog(VehicleModel vehicle) {
    final controller = TextEditingController(text: vehicle.currentOdometerKm.toInt().toString());
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.speed_rounded, color: Color(0xFF0284C7), size: 22),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text('Cập Nhật Số ODO', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Nhập số km lăn bánh thực tế trên đồng hồ xe ${vehicle.name}:',
              style: const TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              autofocus: true,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                suffixText: 'km',
                filled: true,
                fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Huỷ', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final newOdo = double.tryParse(controller.text.replaceAll(',', '').replaceAll('.', ''));
              if (newOdo != null && newOdo > 0) {
                Navigator.pop(ctx);
                await _fleetService.updateOdometer(vehicle.id, newOdo);
                _loadFleetData();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('✓ Đã cập nhật ODO xe ${vehicle.name} thành ${_numFmt.format(newOdo)} km'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                }
              }
            },
            child: const Text('Lưu Số Km', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _askAIConsultant(VehicleModel vehicle) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const AIChatScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Đội Xe Gia Đình')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_vehicles.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Đội Xe Gia Đình')),
        body: const Center(child: Text('Chưa có phương tiện nào trong danh sách.')),
      );
    }

    final currentVehicle = _vehicles[_selectedVehicleIdx];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Đội Xe & Bảo Dưỡng',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            tooltip: 'Hỏi Cố Vấn AI về xe này',
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF0284C7).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.psychology_rounded, color: Color(0xFF0284C7), size: 20),
            ),
            onPressed: () => _askAIConsultant(currentVehicle),
          ),
          IconButton(
            tooltip: 'Tải lại',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadFleetData,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Horizontal Vehicle Selector Tabs
          _buildVehiclePillSelector(isDark),

          // 2. Scrollable Body
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                // Hero Vehicle Card
                _buildHeroVehicleCard(currentVehicle, isDark),

                const SizedBox(height: 16),

                // Active Maintenance & Inspection Alerts
                _buildActiveAlertsCard(currentVehicle, isDark),

                const SizedBox(height: 16),

                // Vehicle Financial / Loan Overview
                _buildVehicleFinanceCard(currentVehicle, isDark),

                const SizedBox(height: 20),

                // Detailed Sub-tabs: Bảo dưỡng | Đổ xăng | Thông số
                _buildSubTabsSection(currentVehicle, isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVehiclePillSelector(bool isDark) {
    return Container(
      height: 52,
      margin: const EdgeInsets.only(top: 4, bottom: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _vehicles.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, idx) {
          final v = _vehicles[idx];
          final isSelected = idx == _selectedVehicleIdx;

          IconData icon = Icons.directions_car_rounded;
          if (v.type == VehicleType.motorbike) icon = Icons.two_wheeler_rounded;
          if (v.type == VehicleType.bicycle) icon = Icons.pedal_bike_rounded;

          return Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(26),
              onTap: () => _onSelectVehicle(idx),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF0284C7)
                      : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9)),
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF0284C7)
                        : (isDark ? Colors.white12 : Colors.grey.shade300),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 18,
                      color: isSelected ? Colors.white : (isDark ? Colors.grey[400] : Colors.grey[700]),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      v.name,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.white : (isDark ? Colors.grey[300] : Colors.grey[800]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeroVehicleCard(VehicleModel v, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: LinearGradient(
          colors: v.type == VehicleType.car
              ? [const Color(0xFF881337), const Color(0xFF4C0519), const Color(0xFF0F172A)] // Mazda Soul Red Theme
              : [const Color(0xFF0F172A), const Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: (v.type == VehicleType.car ? const Color(0xFF881337) : const Color(0xFF0284C7)).withValues(alpha: 0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background Watermark Icon
          Positioned(
            right: -20,
            bottom: -20,
            child: Icon(
              v.type == VehicleType.car
                  ? Icons.directions_car_filled_rounded
                  : (v.type == VehicleType.motorbike ? Icons.two_wheeler_rounded : Icons.pedal_bike_rounded),
              size: 150,
              color: Colors.white.withValues(alpha: 0.05),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Vehicle Name & License Plate Badge
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            v.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${v.brand} • Năm ${v.year} • ${v.engine ?? v.fuelType}',
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    if (v.licensePlate.isNotEmpty)
                      _buildVietnamLicensePlate(v.licensePlate),
                  ],
                ),

                const SizedBox(height: 18),

                // Middle: Odometer & Quick Update Button
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => _showUpdateOdoDialog(v),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.speed_rounded, color: Colors.white, size: 22),
                              const SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('ĐỒNG HỒ ODO', style: TextStyle(fontSize: 10, color: Colors.white70, fontWeight: FontWeight.bold)),
                                  Text(
                                    '${_numFmt.format(v.currentOdometerKm)} km',
                                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              const Icon(Icons.edit_outlined, color: Colors.white70, size: 16),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 14),

                // Bottom Stats Row: Fuel & Consumption
                Row(
                  children: [
                    if (v.fuelLevelPercent != null) ...[
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Mức nhiên liệu', style: TextStyle(fontSize: 11, color: Colors.white70)),
                                Text('${v.fuelLevelPercent!.toInt()}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                              ],
                            ),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: (v.fuelLevelPercent! / 100.0).clamp(0.0, 1.0),
                                minHeight: 6,
                                backgroundColor: Colors.white24,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  v.fuelLevelPercent! > 25 ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                    ],
                    if (v.avgConsumptionL100km != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Định mức tiêu hao', style: TextStyle(fontSize: 10, color: Colors.white70)),
                            Text(
                              '${v.avgConsumptionL100km} L/100km',
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVietnamLicensePlate(String plate) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.black87, width: 1.5),
        boxShadow: const [
          BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: Text(
        plate,
        style: const TextStyle(
          color: Colors.black,
          fontSize: 13,
          fontWeight: FontWeight.w900,
          letterSpacing: 1.2,
          fontFamily: '.AppleSystemUIFont',
        ),
      ),
    );
  }

  Widget _buildActiveAlertsCard(VehicleModel v, bool isDark) {
    final nextKm = v.nextMaintenanceKm ?? (v.currentOdometerKm + 2550);
    final remainingKm = (nextKm - v.currentOdometerKm).clamp(0, 999999);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.build_circle_outlined, color: Color(0xFFF59E0B), size: 20),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'Lịch Bảo Dưỡng & Pháp Lý Sắp Đến',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Maintenance Alert
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.25)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('Bảo dưỡng cấp kế tiếp: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                          Text(
                            '${_numFmt.format(nextKm)} km',
                            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFFD97706)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Còn ${_numFmt.format(remainingKm)} km (Dự kiến mốc 15/10/2026)',
                        style: TextStyle(fontSize: 11.5, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '• Hạng mục: Thay nhớt Castrol 0W-20, kiểm tra phanh, lọc gió',
                        style: TextStyle(fontSize: 11, color: Color(0xFFD97706)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Inspection & Insurance Row
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.verified_outlined, size: 14, color: Color(0xFF10B981)),
                          SizedBox(width: 4),
                          Text('Đăng Kiểm', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        v.inspectionExpiryDate ?? '08/09/2028',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const Text('Còn hạn hợp lệ', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF0284C7).withValues(alpha: 0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.shield_outlined, size: 14, color: Color(0xFF0284C7)),
                          SizedBox(width: 4),
                          Text('Bảo Hiểm Thân Vỏ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        v.insuranceExpiryDate ?? '08/03/2027',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const Text('Còn 160 ngày', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVehicleFinanceCard(VehicleModel v, bool isDark) {
    if (v.type != VehicleType.car) return const SizedBox();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.account_balance_outlined, color: Color(0xFF0284C7), size: 18),
                  SizedBox(width: 8),
                  Text('Tài Chính & Trả Góp Xe (TPBank)', style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold)),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('Đang trả góp', style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Dư nợ gốc còn lại', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 2),
                    Text(
                      _currencyFmt.format(270918368),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFEF4444)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Kỳ trả ngày 28/hàng tháng', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    const SizedBox(height: 2),
                    Text(
                      _currencyFmt.format(7378216),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubTabsSection(VehicleModel v, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: isDark ? Colors.white12 : Colors.grey.shade200),
      ),
      child: Column(
        children: [
          TabBar(
            controller: _tabController,
            labelColor: const Color(0xFF0284C7),
            unselectedLabelColor: Colors.grey,
            indicatorColor: const Color(0xFF0284C7),
            tabs: const [
              Tab(text: 'Lịch Sử Bảo Dưỡng'),
              Tab(text: 'Nhật Ký Đổ Xăng'),
              Tab(text: 'Hồ Sơ Kỹ Thuật'),
            ],
          ),
          SizedBox(
            height: 280,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMaintenanceTab(v, isDark),
                _buildFuelTab(v, isDark),
                _buildSpecsTab(v, isDark),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMaintenanceTab(VehicleModel v, bool isDark) {
    if (_isLoadingDetails) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_maintenanceList.isEmpty) {
      return const Center(child: Text('Chưa có lịch sử bảo dưỡng cho xe này.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _maintenanceList.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, idx) {
        final item = _maintenanceList[idx];
        return ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
          ),
          title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          subtitle: Text(
            '${item.serviceDate} • ODO: ${_numFmt.format(item.odometerKm)} km\n${item.garage ?? ''}\n${item.notes ?? ''}',
            style: const TextStyle(fontSize: 11),
          ),
          trailing: Text(
            _currencyFmt.format(item.cost),
            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7), fontSize: 12.5),
          ),
        );
      },
    );
  }

  Widget _buildFuelTab(VehicleModel v, bool isDark) {
    if (_isLoadingDetails) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_fuelLogs.isEmpty) {
      return const Center(child: Text('Chưa có nhật ký đổ xăng cho xe này.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _fuelLogs.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, idx) {
        final item = _fuelLogs[idx];
        return ListTile(
          dense: true,
          contentPadding: EdgeInsets.zero,
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF0284C7).withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.local_gas_station_rounded, color: Color(0xFF0284C7), size: 18),
          ),
          title: Text(
            '${item.liters} L (${item.gasStation ?? 'Cây xăng'})',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
          subtitle: Text(
            '${item.date} • ODO: ${_numFmt.format(item.odometerKm)} km',
            style: const TextStyle(fontSize: 11),
          ),
          trailing: Text(
            _currencyFmt.format(item.cost),
            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFEF4444), fontSize: 12.5),
          ),
        );
      },
    );
  }

  Widget _buildSpecsTab(VehicleModel v, bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(14),
      children: [
        _buildSpecRow('Tên thương mại', v.name),
        _buildSpecRow('Thương hiệu', v.brand),
        _buildSpecRow('Dòng xe', v.model),
        _buildSpecRow('Năm sản xuất', v.year.toString()),
        _buildSpecRow('Biển kiểm soát', v.licensePlate.isNotEmpty ? v.licensePlate : 'Chưa đăng ký'),
        if (v.vin != null && v.vin!.isNotEmpty) _buildSpecRow('Số khung (VIN)', v.vin!),
        if (v.engine != null && v.engine!.isNotEmpty) _buildSpecRow('Động cơ', v.engine!),
        _buildSpecRow('Nhiên liệu', v.fuelType),
        if (v.tankCapacityLiters != null) _buildSpecRow('Dung tích bình', '${v.tankCapacityLiters} Lít'),
        if (v.color != null) _buildSpecRow('Màu sơn', v.color!),
        if (v.purchasePrice > 0) _buildSpecRow('Giá mua ban đầu', _currencyFmt.format(v.purchasePrice)),
      ],
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          Text(value, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

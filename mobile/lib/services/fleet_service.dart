import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/fleet_model.dart';

class FleetService {
  final SupabaseClient _supabase = Supabase.instance.client;
  static const String _kLocalVehiclesKey = 'fmms_cached_vehicles_v1';

  static final List<VehicleModel> _defaultFleet = [
    const VehicleModel(
      id: '20260308-0001-4222-8888-19b213872026',
      name: 'Mazda 2 AT Luxury',
      brand: 'Mazda',
      model: 'Mazda 2 Sedan',
      year: 2026,
      licensePlate: '19B-213.87',
      type: VehicleType.car,
      currentOdometerKm: 12450.0,
      fuelType: 'Xăng (RON 95-V)',
      fuelLevelPercent: 68.0,
      tankCapacityLiters: 44.0,
      remainingFuelLiters: 29.9,
      avgConsumptionL100km: 6.2,
      purchaseDate: '2026-03-08',
      purchasePrice: 520000000.0,
      currentMarketValue: 495000000.0,
      nextMaintenanceDue: '2026-10-15',
      nextMaintenanceKm: 15000.0,
      inspectionExpiryDate: '2028-09-08',
      insuranceExpiryDate: '2027-03-08',
      color: 'Đỏ Pha Lê (Soul Red Crystal)',
      engine: '1.5L SkyActiv-G 110Hp',
      vin: 'MM6DJ2038RH213871',
      description: 'Xe gia đình sử dụng chính, phục vụ đi làm hàng ngày và về quê cuối tuần.',
    ),
    const VehicleModel(
      id: '20170801-0002-4111-8888-88c121063016',
      name: 'Yamaha Sirius RC Fi',
      brand: 'Yamaha',
      model: 'Sirius RC Phun Xăng Điện Tử',
      year: 2021,
      licensePlate: '19B-888.16',
      type: VehicleType.motorbike,
      currentOdometerKm: 28300.0,
      fuelType: 'Xăng RON 95',
      fuelLevelPercent: 55.0,
      tankCapacityLiters: 3.8,
      remainingFuelLiters: 2.1,
      avgConsumptionL100km: 2.08,
      purchaseDate: '2021-04-05',
      purchasePrice: 23500000.0,
      currentMarketValue: 14000000.0,
      nextMaintenanceDue: '2026-11-20',
      nextMaintenanceKm: 30000.0,
      insuranceExpiryDate: '2027-04-10',
      color: 'Đen Bạc Ánh Kim',
      engine: '115cc SOHC 4 thì',
      description: 'Xe máy đi chợ, dạo phố, linh hoạt trong ngõ hẻm.',
    ),
    const VehicleModel(
      id: '20240310-0004-4444-8888-000000260555',
      name: 'Xe Đạp Địa Hình Giant ATX',
      brand: 'Giant',
      model: 'ATX 830 D',
      year: 2024,
      licensePlate: 'MTB-26',
      type: VehicleType.bicycle,
      currentOdometerKm: 620.0,
      fuelType: 'Sức người',
      purchaseDate: '2024-03-10',
      purchasePrice: 9500000.0,
      currentMarketValue: 7500000.0,
      nextMaintenanceDue: '2026-12-01',
      color: 'Xanh Navy Nhám',
      description: 'Xe đạp rèn luyện thể thao buổi sáng và đi dạo công viên.',
    ),
  ];

  Future<List<VehicleModel>> getVehicles() async {
    try {
      final res = await _supabase
          .from('assets')
          .select('*')
          .order('created_at', ascending: true);

      if (res.isNotEmpty) {
        final list = (res as List).map((e) => VehicleModel.fromJson(e)).toList();
        await _saveLocalVehicles(list);
        return list;
      }
    } catch (e) {
      debugPrint('FleetService Supabase error: $e');
    }

    final local = await _loadLocalVehicles();
    if (local.isNotEmpty) return local;

    await _saveLocalVehicles(_defaultFleet);
    return _defaultFleet;
  }

  Future<List<VehicleMaintenanceItem>> getMaintenanceRecords(String vehicleId) async {
    try {
      final res = await _supabase
          .from('maintenance_records')
          .select('*')
          .eq('asset_id', vehicleId)
          .order('maintenance_date', ascending: false);

      if (res.isNotEmpty) {
        return (res as List).map((e) => VehicleMaintenanceItem.fromJson(e)).toList();
      }
    } catch (e) {
      debugPrint('FleetService maintenance query error: $e');
    }

    // Default sample maintenance history for Mazda 2
    if (vehicleId.contains('21387') || vehicleId.contains('20260308')) {
      return [
        const VehicleMaintenanceItem(
          id: 'maint-02',
          vehicleId: '20260308-0001-4222-8888-19b213872026',
          title: 'Bảo dưỡng định kỳ cấp 2 (10.000 km)',
          serviceDate: '2026-07-18',
          odometerKm: 10120.0,
          cost: 1250000.0,
          garage: 'Mazda Việt Trì 3S',
          notes: 'Thay dầu động cơ Castrol Edge 0W-20, thay cốc lọc nhớt, vệ sinh lọc gió & đảo lốp 4 bánh.',
        ),
        const VehicleMaintenanceItem(
          id: 'maint-01',
          vehicleId: '20260308-0001-4222-8888-19b213872026',
          title: 'Bảo dưỡng cấp 1 mốc Rodai (5.000 km)',
          serviceDate: '2026-05-02',
          odometerKm: 5040.0,
          cost: 680000.0,
          garage: 'Mazda Việt Trì 3S',
          notes: 'Thay dầu chạy rà khởi động, siết lại ốc gầm, kiểm tra mức nước làm mát và dầu phanh.',
        ),
      ];
    }

    return [];
  }

  Future<List<VehicleFuelItem>> getFuelLogs(String vehicleId) async {
    try {
      final res = await _supabase
          .from('fuel_logs')
          .select('*')
          .eq('asset_id', vehicleId)
          .order('timestamp', ascending: false)
          .limit(10);

      if (res.isNotEmpty) {
        return (res as List).map((e) => VehicleFuelItem.fromJson(e)).toList();
      }
    } catch (e) {
      debugPrint('FleetService fuel query error: $e');
    }

    if (vehicleId.contains('21387') || vehicleId.contains('20260308')) {
      return [
        const VehicleFuelItem(
          id: 'fuel-03',
          vehicleId: '20260308-0001-4222-8888-19b213872026',
          date: '2026-09-20',
          liters: 38.5,
          cost: 885000.0,
          pricePerLiter: 22987.0,
          odometerKm: 12450.0,
          gasStation: 'Petrolimex Cửa Hàng 12',
          consumptionL100km: 6.18,
        ),
        const VehicleFuelItem(
          id: 'fuel-02',
          vehicleId: '20260308-0001-4222-8888-19b213872026',
          date: '2026-09-06',
          liters: 40.2,
          cost: 924000.0,
          pricePerLiter: 22985.0,
          odometerKm: 11830.0,
          gasStation: 'Petrolimex Cửa Hàng 05',
          consumptionL100km: 6.25,
        ),
        const VehicleFuelItem(
          id: 'fuel-01',
          vehicleId: '20260308-0001-4222-8888-19b213872026',
          date: '2026-08-22',
          liters: 37.0,
          cost: 851000.0,
          pricePerLiter: 23000.0,
          odometerKm: 11190.0,
          gasStation: 'PVOIL Sông Lô',
          consumptionL100km: 6.10,
        ),
      ];
    }

    return [];
  }

  Future<bool> updateOdometer(String vehicleId, double newOdometerKm) async {
    try {
      await _supabase
          .from('assets')
          .update({'current_odometer_km': newOdometerKm})
          .eq('id', vehicleId);
    } catch (e) {
      debugPrint('Update odo error: $e');
    }

    final local = await _loadLocalVehicles();
    final idx = local.indexWhere((v) => v.id == vehicleId);
    if (idx != -1) {
      final old = local[idx];
      local[idx] = VehicleModel(
        id: old.id,
        name: old.name,
        brand: old.brand,
        model: old.model,
        year: old.year,
        licensePlate: old.licensePlate,
        type: old.type,
        currentOdometerKm: newOdometerKm,
        fuelType: old.fuelType,
        fuelLevelPercent: old.fuelLevelPercent,
        tankCapacityLiters: old.tankCapacityLiters,
        remainingFuelLiters: old.remainingFuelLiters,
        avgConsumptionL100km: old.avgConsumptionL100km,
        purchaseDate: old.purchaseDate,
        purchasePrice: old.purchasePrice,
        currentMarketValue: old.currentMarketValue,
        nextMaintenanceDue: old.nextMaintenanceDue,
        nextMaintenanceKm: old.nextMaintenanceKm,
        inspectionExpiryDate: old.inspectionExpiryDate,
        insuranceExpiryDate: old.insuranceExpiryDate,
        color: old.color,
        engine: old.engine,
        vin: old.vin,
        imageUrl: old.imageUrl,
        description: old.description,
      );
      await _saveLocalVehicles(local);
    }
    return true;
  }

  Future<void> _saveLocalVehicles(List<VehicleModel> list) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = jsonEncode(list.map((e) => e.toJson()).toList());
      await prefs.setString(_kLocalVehiclesKey, encoded);
    } catch (_) {}
  }

  Future<List<VehicleModel>> _loadLocalVehicles() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kLocalVehiclesKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => VehicleModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [];
  }
}

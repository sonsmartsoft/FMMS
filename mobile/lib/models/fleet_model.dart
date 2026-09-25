enum VehicleType {
  car,
  motorbike,
  bicycle,
  other,
}

class VehicleModel {
  final String id;
  final String name;
  final String brand;
  final String model;
  final int year;
  final String licensePlate;
  final VehicleType type;
  final double currentOdometerKm;
  final String fuelType;
  final double? fuelLevelPercent;
  final double? tankCapacityLiters;
  final double? remainingFuelLiters;
  final double? avgConsumptionL100km;
  final String? purchaseDate;
  final double purchasePrice;
  final double currentMarketValue;
  final String? nextMaintenanceDue;
  final double? nextMaintenanceKm;
  final String? inspectionExpiryDate;
  final String? insuranceExpiryDate;
  final String? color;
  final String? engine;
  final String? vin;
  final String? imageUrl;
  final String? description;

  const VehicleModel({
    required this.id,
    required this.name,
    required this.brand,
    required this.model,
    required this.year,
    required this.licensePlate,
    required this.type,
    required this.currentOdometerKm,
    required this.fuelType,
    this.fuelLevelPercent,
    this.tankCapacityLiters,
    this.remainingFuelLiters,
    this.avgConsumptionL100km,
    this.purchaseDate,
    this.purchasePrice = 0,
    this.currentMarketValue = 0,
    this.nextMaintenanceDue,
    this.nextMaintenanceKm,
    this.inspectionExpiryDate,
    this.insuranceExpiryDate,
    this.color,
    this.engine,
    this.vin,
    this.imageUrl,
    this.description,
  });

  static VehicleType parseType(String? val) {
    if (val == null) return VehicleType.car;
    final upper = val.toUpperCase();
    if (upper == 'CAR') return VehicleType.car;
    if (upper.contains('BIKE') || upper.contains('MOTO') || upper == 'SCOOTER') return VehicleType.motorbike;
    if (upper == 'BICYCLE') return VehicleType.bicycle;
    return VehicleType.other;
  }

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Phương tiện',
      brand: json['brand']?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      licensePlate: json['license_plate']?.toString() ?? '',
      type: parseType(json['asset_type']?.toString()),
      currentOdometerKm: (json['current_odometer_km'] as num?)?.toDouble() ?? 0.0,
      fuelType: json['fuel_type']?.toString() ?? 'PETROL',
      fuelLevelPercent: (json['fuel_level_percent'] as num?)?.toDouble(),
      tankCapacityLiters: (json['tank_capacity_liters'] as num?)?.toDouble(),
      remainingFuelLiters: (json['remaining_fuel_liters'] as num?)?.toDouble(),
      avgConsumptionL100km: (json['avg_consumption_l100km'] as num?)?.toDouble(),
      purchaseDate: json['purchase_date']?.toString(),
      purchasePrice: (json['purchase_price'] as num?)?.toDouble() ?? 0.0,
      currentMarketValue: (json['current_value'] as num?)?.toDouble() ?? 0.0,
      nextMaintenanceDue: json['next_maintenance_due']?.toString(),
      nextMaintenanceKm: (json['next_maintenance_km'] as num?)?.toDouble(),
      inspectionExpiryDate: json['inspection_expiry_date']?.toString(),
      insuranceExpiryDate: json['insurance_expiry_date']?.toString(),
      color: json['color']?.toString(),
      engine: json['engine']?.toString(),
      vin: json['vin']?.toString(),
      imageUrl: json['image_url']?.toString(),
      description: json['description']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'brand': brand,
    'model': model,
    'year': year,
    'license_plate': licensePlate,
    'asset_type': type.name.toUpperCase(),
    'current_odometer_km': currentOdometerKm,
    'fuel_type': fuelType,
    'fuel_level_percent': fuelLevelPercent,
    'tank_capacity_liters': tankCapacityLiters,
    'remaining_fuel_liters': remainingFuelLiters,
    'avg_consumption_l100km': avgConsumptionL100km,
    'purchase_date': purchaseDate,
    'purchase_price': purchasePrice,
    'current_value': currentMarketValue,
    'next_maintenance_due': nextMaintenanceDue,
    'next_maintenance_km': nextMaintenanceKm,
    'inspection_expiry_date': inspectionExpiryDate,
    'insurance_expiry_date': insuranceExpiryDate,
    'color': color,
    'engine': engine,
    'vin': vin,
    'image_url': imageUrl,
    'description': description,
  };
}

class VehicleMaintenanceItem {
  final String id;
  final String vehicleId;
  final String title;
  final String serviceDate;
  final double odometerKm;
  final double cost;
  final String? garage;
  final String? notes;
  final bool isCompleted;

  const VehicleMaintenanceItem({
    required this.id,
    required this.vehicleId,
    required this.title,
    required this.serviceDate,
    required this.odometerKm,
    required this.cost,
    this.garage,
    this.notes,
    this.isCompleted = true,
  });

  factory VehicleMaintenanceItem.fromJson(Map<String, dynamic> json) {
    return VehicleMaintenanceItem(
      id: json['id']?.toString() ?? '',
      vehicleId: json['asset_id']?.toString() ?? '',
      title: json['title']?.toString() ?? json['service_type']?.toString() ?? 'Bảo dưỡng xe',
      serviceDate: json['maintenance_date']?.toString() ?? json['service_date']?.toString() ?? '',
      odometerKm: (json['odometer_km'] as num?)?.toDouble() ?? 0.0,
      cost: (json['cost'] as num?)?.toDouble() ?? 0.0,
      garage: json['service_center']?.toString() ?? json['garage']?.toString(),
      notes: json['notes']?.toString(),
      isCompleted: json['status']?.toString().toUpperCase() != 'SCHEDULED',
    );
  }
}

class VehicleFuelItem {
  final String id;
  final String vehicleId;
  final String date;
  final double liters;
  final double cost;
  final double pricePerLiter;
  final double odometerKm;
  final String? gasStation;
  final double? consumptionL100km;

  const VehicleFuelItem({
    required this.id,
    required this.vehicleId,
    required this.date,
    required this.liters,
    required this.cost,
    required this.pricePerLiter,
    required this.odometerKm,
    this.gasStation,
    this.consumptionL100km,
  });

  factory VehicleFuelItem.fromJson(Map<String, dynamic> json) {
    final liters = (json['liters'] as num?)?.toDouble() ?? 0.0;
    final cost = (json['cost'] as num?)?.toDouble() ?? (json['total_cost'] as num?)?.toDouble() ?? 0.0;
    final price = liters > 0 ? (cost / liters) : 0.0;

    return VehicleFuelItem(
      id: json['id']?.toString() ?? '',
      vehicleId: json['asset_id']?.toString() ?? '',
      date: json['timestamp']?.toString().split('T').first ?? json['date']?.toString() ?? '',
      liters: liters,
      cost: cost,
      pricePerLiter: price,
      odometerKm: (json['odometer_km'] as num?)?.toDouble() ?? 0.0,
      gasStation: json['station']?.toString() ?? json['gas_station']?.toString(),
      consumptionL100km: (json['consumption_l100km'] as num?)?.toDouble(),
    );
  }
}

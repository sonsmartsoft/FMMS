// Service for managing Events & Trips
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/event_trip_model.dart';

class EventTripService {
  static final EventTripService _instance = EventTripService._internal();
  factory EventTripService() => _instance;
  EventTripService._internal();

  final SupabaseClient _client = Supabase.instance.client;
  static const String _cacheKey = 'fmms_event_trips_cache';

  List<EventTripModel> _cache = [];

  List<EventTripModel> get defaultMockTrips => [
    EventTripModel(
      id: 'trip-1',
      name: 'Du lịch Đà Nẵng - Hội An (Hè 2026)',
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      budget: 15000000.0,
      totalSpent: 8450000.0,
      icon: 'beach_access',
      status: 'ACTIVE',
      linkedVehicleName: 'Mazda 2 AT',
      notes: 'Chuyến đi nghỉ mát gia đình 4 người, gồm vé bay, khách sạn và ăn uống hải sản',
    ),
    EventTripModel(
      id: 'trip-2',
      name: 'Sắm Tết & Trang hoàng nhà cửa 2026',
      startDate: '2026-01-10',
      endDate: '2026-02-15',
      budget: 20000000.0,
      totalSpent: 5200000.0,
      icon: 'celebration',
      status: 'ACTIVE',
      notes: 'Bánh kẹo, hoa đào, cây cảnh, quà biếu ông bà nội ngoại',
    ),
  ];

  Future<List<EventTripModel>> getEventTrips({bool forceRefresh = false}) async {
    if (!forceRefresh && _cache.isNotEmpty) {
      return _cache;
    }

    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedJson = prefs.getString(_cacheKey);
      if (cachedJson != null) {
        final List<dynamic> list = jsonDecode(cachedJson);
        _cache = list.map((item) => EventTripModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('Error reading local event trips cache: $e');
    }

    try {
      final response = await _client
          .from('family_event_trips')
          .select()
          .order('start_date', ascending: false);

      final items = (response as List).map((x) => EventTripModel.fromJson(x)).toList();
      if (items.isNotEmpty) {
        _cache = items;
        _saveCacheLocally();
        return _cache;
      }
    } catch (e) {
      debugPrint('Supabase fetch family_event_trips skipped: $e');
    }

    if (_cache.isEmpty) {
      _cache = defaultMockTrips;
      _saveCacheLocally();
    }

    return _cache;
  }

  Future<bool> createEventTrip(EventTripModel trip) async {
    _cache.insert(0, trip);
    await _saveCacheLocally();

    try {
      await _client.from('family_event_trips').insert(trip.toJson());
    } catch (e) {
      debugPrint('Supabase insert trip error: $e');
    }
    return true;
  }

  Future<void> addExpenseToTrip(String tripId, double amount) async {
    final idx = _cache.indexWhere((t) => t.id == tripId);
    if (idx != -1) {
      final trip = _cache[idx];
      _cache[idx] = EventTripModel(
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget,
        totalSpent: trip.totalSpent + amount,
        icon: trip.icon,
        status: trip.status,
        linkedVehicleName: trip.linkedVehicleName,
        notes: trip.notes,
      );
      await _saveCacheLocally();

      try {
        await _client.from('family_event_trips').update({
          'total_spent': _cache[idx].totalSpent,
        }).eq('id', tripId);
      } catch (_) {}
    }
  }

  Future<void> _saveCacheLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(_cache.map((t) => t.toJson()).toList());
      await prefs.setString(_cacheKey, jsonStr);
    } catch (e) {
      debugPrint('Error saving event trips locally: $e');
    }
  }
}

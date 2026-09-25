import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/finance_model.dart';
import '../models/budget_model.dart';
import 'auth_service.dart';

class FinanceService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final AuthService _authService = AuthService();

  static const String _kOfflineQueueKey = 'offline_tx_queue';
  static const String _kWalletsStorageKey = 'local_wallets_storage';
  static const String _kTransactionsStorageKey = 'local_transactions_storage';
  static const String _kCategoriesStorageKey = 'local_categories_storage';

  // ==========================================
  // 1. WALLETS (TÀI KHOẢN / VÍ)
  // ==========================================
  Future<List<WalletModel>> getWallets() async {
    try {
      final res = await _supabase
          .from('wallets')
          .select()
          .order('created_at', ascending: true);

      final list = (res as List).map((e) => WalletModel.fromJson(e)).toList();
      if (list.isNotEmpty) {
        await _saveLocalWallets(list);
        return list;
      }
    } catch (_) {}

    return _loadLocalWallets();
  }

  Future<bool> saveWallet(WalletModel wallet) async {
    final list = await _loadLocalWallets();
    final idx = list.indexWhere((w) => w.id == wallet.id);

    try {
      final payload = wallet.toJson();
      if (payload['id'] == null || payload['id'].toString().isEmpty || payload['id'].toString().startsWith('w-local-')) {
        payload.remove('id');
      }
      await _supabase.from('wallets').upsert(payload);
    } catch (_) {}

    if (idx != -1) {
      list[idx] = wallet;
    } else {
      list.add(wallet);
    }
    await _saveLocalWallets(list);
    return true;
  }

  Future<bool> deleteWallet(String id) async {
    try {
      await _supabase.from('wallets').delete().eq('id', id);
    } catch (_) {}

    final list = await _loadLocalWallets();
    list.removeWhere((w) => w.id == id);
    await _saveLocalWallets(list);
    return true;
  }

  Future<List<WalletModel>> _loadLocalWallets() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kWalletsStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => WalletModel.fromJson(e)).toList();
      } catch (_) {}
    }
    final defaults = _getLocalWalletsFallback();
    await _saveLocalWallets(defaults);
    return defaults;
  }

  Future<void> _saveLocalWallets(List<WalletModel> wallets) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(wallets.map((w) => w.toJson()).toList());
    await prefs.setString(_kWalletsStorageKey, encoded);
  }

  // Adjust Wallet Balance (Điều chỉnh số dư ví với giao dịch đối ứng kiểu MISA)
  Future<bool> adjustWalletBalance({
    required String walletId,
    required double newBalance,
    String? note,
  }) async {
    final wallets = await getWallets();
    final idx = wallets.indexWhere((w) => w.id == walletId);
    if (idx == -1) return false;

    final targetWallet = wallets[idx];
    final diff = newBalance - targetWallet.currentBalance;

    // Update wallet balance
    wallets[idx] = targetWallet.copyWith(currentBalance: newBalance);
    await _saveLocalWallets(wallets);

    try {
      await _supabase.from('wallets').update({'current_balance': newBalance}).eq('id', walletId);
    } catch (_) {}

    // If there is a difference, record an automatic adjustment transaction
    if (diff.abs() > 0.01) {
      final isIncrease = diff > 0;
      final adjTx = FamilyTransactionModel(
        id: 'tx-adj-${DateTime.now().millisecondsSinceEpoch}',
        walletId: walletId,
        walletName: targetWallet.name,
        transactionType: isIncrease ? TransactionType.INCOME : TransactionType.EXPENSE,
        amount: diff.abs(),
        date: DateTime.now().toIso8601String().split('T').first,
        payeeVendor: 'Điều chỉnh số dư',
        description: note ?? (isIncrease ? 'Điều chỉnh tăng số dư ví' : 'Điều chỉnh giảm số dư ví'),
        notes: note ?? 'Cân đối lại số dư thực tế khớp với thực tế',
        isEssential: true,
      );

      final txList = await _loadLocalTransactions();
      txList.insert(0, adjTx);
      await _saveLocalTransactions(txList);

      try {
        await _supabase.from('family_transactions').insert(adjTx.toJson());
      } catch (_) {}
    }

    return true;
  }

  // ==========================================
  // 2. CATEGORIES (HẠNG MỤC THU / CHI)
  // ==========================================
  Future<List<TransactionCategoryModel>> getCategories() async {
    try {
      final res = await _supabase
          .from('transaction_categories')
          .select()
          .order('display_order', ascending: true);

      final list = (res as List).map((e) => TransactionCategoryModel.fromJson(e)).toList();
      if (list.isNotEmpty) {
        await _saveLocalCategories(list);
        return list;
      }
    } catch (_) {}

    return _loadLocalCategories();
  }

  Future<bool> saveCategory(TransactionCategoryModel category) async {
    final list = await _loadLocalCategories();
    final idx = list.indexWhere((c) => c.id == category.id);

    try {
      final payload = category.toJson();
      if (payload['id'] == null || payload['id'].toString().startsWith('cat-local-')) {
        payload.remove('id');
      }
      await _supabase.from('transaction_categories').upsert(payload);
    } catch (_) {}

    if (idx != -1) {
      list[idx] = category;
    } else {
      list.add(category);
    }
    await _saveLocalCategories(list);
    return true;
  }

  Future<bool> deleteCategory(String id) async {
    try {
      await _supabase.from('transaction_categories').delete().eq('id', id);
    } catch (_) {}

    final list = await _loadLocalCategories();
    list.removeWhere((c) => c.id == id || c.parentId == id);
    await _saveLocalCategories(list);
    return true;
  }

  Future<List<TransactionCategoryModel>> _loadLocalCategories() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kCategoriesStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => TransactionCategoryModel.fromJson(e)).toList();
      } catch (_) {}
    }
    final defaults = _getLocalCategoriesFallback();
    await _saveLocalCategories(defaults);
    return defaults;
  }

  Future<void> _saveLocalCategories(List<TransactionCategoryModel> categories) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(categories.map((c) => c.toJson()).toList());
    await prefs.setString(_kCategoriesStorageKey, encoded);
  }

  // ==========================================
  // 3. TRANSACTIONS (SỔ THU CHI & GIAO DỊCH)
  // ==========================================
  Future<List<FamilyTransactionModel>> getTransactions({int limit = 100}) async {
    // 1. Dọn dẹp triệt để bất kỳ giao dịch mẫu (mock) nào còn sót trong bộ nhớ cache
    await _purgeMockTransactions();

    final allTxs = <FamilyTransactionModel>[];

    // 2. Tải các giao dịch gia đình thực sự từ Supabase (bảng family_transactions)
    try {
      final res = await _supabase
          .from('family_transactions')
          .select('*, wallet:wallets!wallet_id(name), category:transaction_categories!category_id(name)')
          .order('date', ascending: false)
          .limit(limit);

      final list = (res as List)
          .map((e) => FamilyTransactionModel.fromJson(e))
          .where((t) => !t.id.startsWith('tx-def-')) // Loại bỏ bản ghi mẫu
          .toList();

      allTxs.addAll(list);
    } catch (e) {
      debugPrint('Error fetching family_transactions: $e');
    }

    // 3. Tự động đồng bộ các khoản chi thực tế từ hệ thống xe (Fleet & Mobility)
    try {
      // 3.1 Lấy danh mục xe (assets) để map tên xe và biển số
      final assetNameMap = <String, String>{};
      try {
        final assetsRes = await _supabase.from('assets').select('id, name, license_plate');
        if (assetsRes is List) {
          for (final a in assetsRes) {
            final id = a['id']?.toString() ?? '';
            final name = a['name']?.toString() ?? 'Xe gia đình';
            final plate = a['license_plate']?.toString();
            assetNameMap[id] = (plate != null && plate.isNotEmpty) ? '$name ($plate)' : name;
          }
        }
      } catch (_) {}

      final defaultCarName = assetNameMap.values.firstOrNull ?? 'Mazda 2AT 2026 (19B-213.87)';

      // 3.2 Lấy chi phí xe từ bảng `expenses`
      try {
        final expensesRes = await _supabase
            .from('expenses')
            .select('*')
            .order('date', ascending: false)
            .limit(limit);

        if (expensesRes is List && expensesRes.isNotEmpty) {
          for (final exp in expensesRes) {
            final expId = exp['id']?.toString() ?? '';
            final assetId = exp['asset_id']?.toString();
            final amount = (exp['amount'] as num?)?.toDouble() ?? 0.0;
            final rawDate = exp['date']?.toString() ?? '';
            final date = rawDate.contains('T')
                ? rawDate.split('T')[0]
                : (rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate);
            final vendor = exp['vendor']?.toString() ?? 'Dịch vụ xe ô tô';
            final desc = exp['description']?.toString() ?? exp['subcategory']?.toString() ?? 'Chi phí xe';
            final odo = exp['odometer_km'];
            final carName = (assetId != null && assetNameMap.containsKey(assetId))
                ? assetNameMap[assetId]
                : defaultCarName;

            final isDuplicate = allTxs.any((tx) {
              if (tx.id == 'exp_$expId' || tx.id == expId) return true;
              final sameDate = tx.date == date;
              final sameAmt = (tx.amount - amount).abs() < 100;
              final sameAsset = tx.assetId == assetId;
              return sameDate && sameAmt && (sameAsset || tx.notes?.contains(expId) == true);
            });

            if (!isDuplicate && amount > 0) {
              final mapped = _mapVehicleCategory(
                exp['category']?.toString(),
                exp['subcategory']?.toString(),
                desc,
              );

              allTxs.add(FamilyTransactionModel(
                id: 'exp_$expId',
                walletId: 'w-tcb-01',
                walletName: 'Techcombank Chi tiêu',
                categoryId: mapped['id'],
                categoryName: mapped['name'],
                subCategoryName: exp['subcategory']?.toString() ?? mapped['name'],
                assetId: assetId,
                assetName: carName,
                transactionType: TransactionType.EXPENSE,
                amount: amount,
                date: date,
                payeeVendor: vendor,
                description: desc,
                notes: '[Tự động đồng bộ từ xe] ${odo != null ? "ODO: ${odo} km - " : ""}$desc',
                isEssential: true,
                forMemberName: 'Cả gia đình',
              ));
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching vehicle expenses: $e');
      }

      // 3.3 Lấy nhật ký đổ xăng thực tế từ bảng `fuel_logs`
      try {
        final fuelRes = await _supabase
            .from('fuel_logs')
            .select('*')
            .order('timestamp', ascending: false)
            .limit(limit);

        if (fuelRes is List && fuelRes.isNotEmpty) {
          for (final f in fuelRes) {
            final fId = f['id']?.toString() ?? '';
            final assetId = f['asset_id']?.toString();
            final cost = (f['total_cost'] ?? f['cost'] as num?)?.toDouble() ?? 0.0;
            final rawTs = (f['timestamp'] ?? f['date'])?.toString() ?? '';
            final date = rawTs.contains('T')
                ? rawTs.split('T')[0]
                : (rawTs.length >= 10 ? rawTs.substring(0, 10) : rawTs);
            final station = f['station']?.toString() ?? 'Cây xăng';
            final liters = f['fuel_liters'] ?? f['liters'];
            final odo = f['odometer_km'];
            final carName = (assetId != null && assetNameMap.containsKey(assetId))
                ? assetNameMap[assetId]
                : defaultCarName;

            final isDuplicate = allTxs.any((tx) {
              if (tx.id == 'fuel_$fId' || tx.id == fId) return true;
              final sameDate = tx.date == date;
              final sameAmt = (tx.amount - cost).abs() < 100;
              return sameDate && sameAmt;
            });

            if (!isDuplicate && cost > 0) {
              allTxs.add(FamilyTransactionModel(
                id: 'fuel_$fId',
                walletId: 'w-tcb-01',
                walletName: 'Techcombank Chi tiêu',
                categoryId: 'cat-mob-fuel',
                categoryName: 'Xăng xe & Nhiên liệu',
                subCategoryName: 'Đổ xăng',
                assetId: assetId,
                assetName: carName,
                transactionType: TransactionType.EXPENSE,
                amount: cost,
                date: date,
                payeeVendor: station,
                description: 'Đổ xăng ${liters != null ? "$liters L " : ""}xe $carName',
                notes: '[Tự động đồng bộ từ xe] ${odo != null ? "ODO: ${odo} km" : ""}',
                isEssential: true,
                forMemberName: 'Cả gia đình',
              ));
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching fuel logs: $e');
      }

      // 3.4 Lấy lịch sử bảo dưỡng thực tế từ bảng `maintenance_records`
      try {
        final maintRes = await _supabase
            .from('maintenance_records')
            .select('*')
            .order('service_date', ascending: false)
            .limit(limit);

        if (maintRes is List && maintRes.isNotEmpty) {
          for (final m in maintRes) {
            final mId = m['id']?.toString() ?? '';
            final assetId = m['asset_id']?.toString();
            final cost = (m['cost'] as num?)?.toDouble() ?? 0.0;
            final rawDate = (m['service_date'] ?? m['date'])?.toString() ?? '';
            final date = rawDate.contains('T')
                ? rawDate.split('T')[0]
                : (rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate);
            final vendor = m['vendor']?.toString() ?? 'Gara ô tô';
            final mType = m['maintenance_type']?.toString() ?? 'Bảo dưỡng định kỳ';
            final desc = m['description']?.toString() ?? m['notes']?.toString() ?? mType;
            final odo = m['odometer_km'];
            final carName = (assetId != null && assetNameMap.containsKey(assetId))
                ? assetNameMap[assetId]
                : defaultCarName;

            final isDuplicate = allTxs.any((tx) {
              if (tx.id == 'maint_$mId' || tx.id == mId) return true;
              final sameDate = tx.date == date;
              final sameAmt = (tx.amount - cost).abs() < 100;
              return sameDate && sameAmt;
            });

            if (!isDuplicate && cost > 0) {
              allTxs.add(FamilyTransactionModel(
                id: 'maint_$mId',
                walletId: 'w-tcb-01',
                walletName: 'Techcombank Chi tiêu',
                categoryId: 'cat-mob-maint',
                categoryName: 'Bảo dưỡng & Sửa xe',
                subCategoryName: mType,
                assetId: assetId,
                assetName: carName,
                transactionType: TransactionType.EXPENSE,
                amount: cost,
                date: date,
                payeeVendor: vendor,
                description: 'Bảo dưỡng xe: $desc',
                notes: '[Tự động đồng bộ từ xe] ${odo != null ? "ODO: ${odo} km - " : ""}$desc',
                isEssential: true,
                forMemberName: 'Cả gia đình',
              ));
            }
          }
        }
      } catch (e) {
        debugPrint('Error fetching maintenance records: $e');
      }
    } catch (e) {
      debugPrint('Error syncing vehicle expenses: $e');
    }

    // 4. Nếu có giao dịch cục bộ hợp lệ (không phải mock tx-def-*) do người dùng tự nhập
    final localTxs = await _loadLocalTransactions();
    for (final ltx in localTxs) {
      if (!ltx.id.startsWith('tx-def-') && !allTxs.any((t) => t.id == ltx.id)) {
        allTxs.add(ltx);
      }
    }

    // 5. Sắp xếp giảm dần theo ngày và lưu cache
    allTxs.sort((a, b) => b.date.compareTo(a.date));

    if (allTxs.isNotEmpty) {
      await _saveLocalTransactions(allTxs);
      return allTxs;
    }

    return _loadLocalTransactions();
  }

  // Create Transaction (Cập nhật số dư ví tự động & Đồng bộ 2 chiều lên Supabase)
  Future<bool> createTransaction(FamilyTransactionModel tx, {String? memberName, String? memberId}) async {
    final activeMember = _authService.getCurrentMember();
    final effectiveName = memberName ?? activeMember.name;
    final effectiveId = memberId ?? activeMember.id;

    String notesWithMember = tx.notes ?? '';
    if (!notesWithMember.contains('[Người chi:')) {
      notesWithMember = '[Người chi: $effectiveName] $notesWithMember'.trim();
    }

    if (tx.subCategoryName != null && tx.subCategoryName!.isNotEmpty) {
      if (!notesWithMember.contains('[Chi tiết:')) {
        notesWithMember = '$notesWithMember [Chi tiết: ${tx.subCategoryName}]'.trim();
      }
    }

    final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');

    // 1. Chuẩn hoá wallet_id thành UUID hợp lệ
    String validWalletId = tx.walletId;
    if (!uuidRegex.hasMatch(validWalletId)) {
      final wallets = await getWallets();
      final matched = wallets.where(
        (w) => w.id == validWalletId || w.name.toLowerCase().contains(validWalletId.toLowerCase())
      ).firstOrNull;
      validWalletId = matched?.id ?? (wallets.isNotEmpty ? wallets.first.id : '00000000-0000-0000-0000-000000000001');
    }

    // 2. Chuẩn hoá category_id thành UUID hợp lệ
    String? validCategoryId = tx.categoryId;
    if (validCategoryId != null && !uuidRegex.hasMatch(validCategoryId)) {
      final categories = await getCategories();
      final matchedCat = categories.where((c) =>
          c.id == validCategoryId ||
          c.name.toLowerCase() == validCategoryId!.toLowerCase() ||
          (tx.categoryName != null && c.name.toLowerCase() == tx.categoryName!.toLowerCase())
      ).firstOrNull;
      validCategoryId = matchedCat?.id;
    }

    final txId = (tx.id.isNotEmpty && uuidRegex.hasMatch(tx.id))
        ? tx.id
        : 'tx-local-${DateTime.now().millisecondsSinceEpoch}';

    final finalTx = tx.copyWith(
      id: txId,
      walletId: validWalletId,
      categoryId: validCategoryId,
      notes: notesWithMember,
    );

    // 1. Apply wallet balance effects
    await _applyBalanceDelta(finalTx, isAdding: true);

    // 2. Save locally
    final localList = await _loadLocalTransactions();
    localList.removeWhere((t) => t.id == finalTx.id);
    localList.insert(0, finalTx);
    await _saveLocalTransactions(localList);

    // 3. Sync to Supabase với payload sạch đúng 100% schema bảng family_transactions
    try {
      final dbPayload = <String, dynamic>{
        'wallet_id': validWalletId,
        'transaction_type': finalTx.transactionType.name,
        'amount': finalTx.amount,
        'date': finalTx.date,
        'is_essential': finalTx.isEssential,
        'exclude_from_reports': finalTx.isExcludedFromReport,
        'created_by': effectiveId,
      };

      if (uuidRegex.hasMatch(finalTx.id)) {
        dbPayload['id'] = finalTx.id;
      }
      if (finalTx.toWalletId != null && uuidRegex.hasMatch(finalTx.toWalletId!)) {
        dbPayload['to_wallet_id'] = finalTx.toWalletId;
      }
      if (validCategoryId != null && uuidRegex.hasMatch(validCategoryId)) {
        dbPayload['category_id'] = validCategoryId;
      }
      if (finalTx.assetId != null && uuidRegex.hasMatch(finalTx.assetId!)) {
        dbPayload['asset_id'] = finalTx.assetId;
      }
      if (finalTx.payeeVendor != null && finalTx.payeeVendor!.isNotEmpty) {
        dbPayload['payee_vendor'] = finalTx.payeeVendor;
      }
      if (finalTx.description != null && finalTx.description!.isNotEmpty) {
        dbPayload['description'] = finalTx.description;
      }
      if (finalTx.notes != null && finalTx.notes!.isNotEmpty) {
        dbPayload['notes'] = finalTx.notes;
      }
      if (finalTx.imageUrl != null && finalTx.imageUrl!.isNotEmpty) {
        dbPayload['bill_image_url'] = finalTx.imageUrl;
      }

      final insertRes = await _supabase
          .from('family_transactions')
          .insert(dbPayload)
          .select()
          .maybeSingle();

      if (insertRes != null && insertRes['id'] != null) {
        final serverId = insertRes['id'].toString();
        // Cập nhật lại ID cục bộ bằng UUID chuẩn từ Supabase
        final updatedTx = finalTx.copyWith(id: serverId);
        final currentLocals = await _loadLocalTransactions();
        final idx = currentLocals.indexWhere((t) => t.id == finalTx.id);
        if (idx != -1) {
          currentLocals[idx] = updatedTx;
        } else {
          currentLocals.insert(0, updatedTx);
        }
        await _saveLocalTransactions(currentLocals);
      }
      return true;
    } catch (e) {
      debugPrint('Supabase insert family_transactions error: $e');
      await _enqueueOffline(finalTx, memberName: memberName);
      return false;
    }
  }

  // Update Transaction (Cập nhật & Cân đối lại số dư ví)
  Future<bool> updateTransaction(FamilyTransactionModel oldTx, FamilyTransactionModel newTx) async {
    // 1. Revert old transaction effect on wallets
    await _applyBalanceDelta(oldTx, isAdding: false);

    // 2. Apply new transaction effect on wallets
    await _applyBalanceDelta(newTx, isAdding: true);

    // 3. Update local transactions list
    final list = await _loadLocalTransactions();
    final idx = list.indexWhere((t) => t.id == oldTx.id);
    if (idx != -1) {
      list[idx] = newTx;
    } else {
      list.insert(0, newTx);
    }
    await _saveLocalTransactions(list);

    // 4. Update Supabase
    try {
      final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
      if (uuidRegex.hasMatch(newTx.id)) {
        final updatePayload = <String, dynamic>{
          'amount': newTx.amount,
          'date': newTx.date,
          'payee_vendor': newTx.payeeVendor,
          'description': newTx.description,
          'notes': newTx.notes,
          'is_essential': newTx.isEssential,
          'exclude_from_reports': newTx.isExcludedFromReport,
        };
        if (uuidRegex.hasMatch(newTx.walletId)) updatePayload['wallet_id'] = newTx.walletId;
        if (newTx.categoryId != null && uuidRegex.hasMatch(newTx.categoryId!)) updatePayload['category_id'] = newTx.categoryId;
        await _supabase.from('family_transactions').update(updatePayload).eq('id', newTx.id);
      }
      return true;
    } catch (e) {
      debugPrint('Update transaction error: $e');
      return false;
    }
  }

  // Delete Transaction (Hoàn lại tiền vào ví)
  Future<bool> deleteTransaction(FamilyTransactionModel tx) async {
    // 1. Revert transaction effect on wallets
    await _applyBalanceDelta(tx, isAdding: false);

    // 2. Remove from local storage
    final list = await _loadLocalTransactions();
    list.removeWhere((t) => t.id == tx.id);
    await _saveLocalTransactions(list);

    // 3. Delete from Supabase
    try {
      final uuidRegex = RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
      if (uuidRegex.hasMatch(tx.id)) {
        await _supabase.from('family_transactions').delete().eq('id', tx.id);
      }
      return true;
    } catch (e) {
      debugPrint('Delete transaction error: $e');
      return false;
    }
  }


  // Helper: Apply Balance Delta to Wallets
  Future<void> _applyBalanceDelta(FamilyTransactionModel tx, {required bool isAdding}) async {
    final wallets = await getWallets();
    final factor = isAdding ? 1.0 : -1.0;

    if (tx.transactionType == TransactionType.EXPENSE) {
      final idx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (idx != -1) {
        final totalDeducted = tx.amount + (tx.transferFee ?? 0.0);
        final newBal = wallets[idx].currentBalance - (factor * totalDeducted);
        wallets[idx] = wallets[idx].copyWith(currentBalance: newBal);
      }
    } else if (tx.transactionType == TransactionType.INCOME) {
      final idx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (idx != -1) {
        final newBal = wallets[idx].currentBalance + (factor * tx.amount);
        wallets[idx] = wallets[idx].copyWith(currentBalance: newBal);
      }
    } else if (tx.transactionType == TransactionType.TRANSFER) {
      final fromIdx = wallets.indexWhere((w) => w.id == tx.walletId);
      if (fromIdx != -1) {
        final totalFrom = tx.amount + (tx.transferFee ?? 0.0);
        final newFromBal = wallets[fromIdx].currentBalance - (factor * totalFrom);
        wallets[fromIdx] = wallets[fromIdx].copyWith(currentBalance: newFromBal);
      }
      if (tx.toWalletId != null) {
        final toIdx = wallets.indexWhere((w) => w.id == tx.toWalletId);
        if (toIdx != -1) {
          final newToBal = wallets[toIdx].currentBalance + (factor * tx.amount);
          wallets[toIdx] = wallets[toIdx].copyWith(currentBalance: newToBal);
        }
      }
    }

    await _saveLocalWallets(wallets);
  }

  // Transfer Money between Wallets (with optional transfer fee)
  Future<bool> transferMoney({
    required String fromWalletId,
    required String toWalletId,
    required double amount,
    required String date,
    double? transferFee,
    String? note,
  }) async {
    final wallets = await getWallets();
    final fromWallet = wallets.where((w) => w.id == fromWalletId).firstOrNull;
    final toWallet = wallets.where((w) => w.id == toWalletId).firstOrNull;

    final tx = FamilyTransactionModel(
      id: 'tx-trans-${DateTime.now().millisecondsSinceEpoch}',
      walletId: fromWalletId,
      toWalletId: toWalletId,
      walletName: fromWallet?.name,
      transactionType: TransactionType.TRANSFER,
      amount: amount,
      transferFee: transferFee,
      date: date,
      payeeVendor: 'Chuyển tiền: ${fromWallet?.name ?? "Ví nguồn"} ➔ ${toWallet?.name ?? "Ví đích"}',
      description: note ?? 'Chuyển tiền nội bộ',
      notes: note,
      isEssential: true,
    );

    return createTransaction(tx);
  }

  // Local Transactions Cache Management
  Future<List<FamilyTransactionModel>> _loadLocalTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kTransactionsStorageKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw) as List;
        final list = decoded
            .map((e) => FamilyTransactionModel.fromJson(e))
            .where((t) => !t.id.startsWith('tx-def-'))
            .toList();
        return list;
      } catch (_) {}
    }
    return [];
  }

  Future<void> _purgeMockTransactions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kTransactionsStorageKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw) as List;
        final cleaned = decoded.where((e) {
          final id = e['id']?.toString() ?? '';
          return !id.startsWith('tx-def-');
        }).toList();
        if (cleaned.length != decoded.length) {
          await prefs.setString(_kTransactionsStorageKey, jsonEncode(cleaned));
        }
      }
    } catch (_) {}
  }

  Future<void> _saveLocalTransactions(List<FamilyTransactionModel> list) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(list.map((t) => t.toJson()).toList());
    await prefs.setString(_kTransactionsStorageKey, encoded);
  }

  // ==========================================
  // 4. BUDGETS
  // ==========================================
  Future<List<BudgetModel>> getBudgets() async {
    try {
      final now = DateTime.now();
      final currentMonth = '${now.year}-${now.month.toString().padLeft(2, '0')}';

      final res = await _supabase
          .from('family_budgets')
          .select('*, category:transaction_categories!category_id(name, icon, color)')
          .eq('month', currentMonth);

      if ((res as List).isNotEmpty) {
        return res.map((e) => BudgetModel.fromJson(e)).toList();
      }
      return _getMockBudgets();
    } catch (_) {
      return _getMockBudgets();
    }
  }

  // Offline Queue handling
  Future<void> _enqueueOffline(FamilyTransactionModel tx, {String? memberName}) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_kOfflineQueueKey) ?? [];
    final payload = tx.toJson();
    if (memberName != null && memberName.isNotEmpty) {
      payload['notes'] = '[Người chi: $memberName] ${payload['notes'] ?? ''}'.trim();
    }
    list.add(jsonEncode(payload));
    await prefs.setStringList(_kOfflineQueueKey, list);
  }

  Future<int> syncOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_kOfflineQueueKey) ?? [];
    if (list.isEmpty) return 0;

    int synced = 0;
    final remaining = <String>[];

    for (final item in list) {
      try {
        final data = jsonDecode(item);
        final tx = FamilyTransactionModel.fromJson(data);
        final ok = await createTransaction(tx);
        if (ok) {
          synced++;
        } else {
          remaining.add(item);
        }
      } catch (_) {
        // Skip invalid item
      }
    }

    await prefs.setStringList(_kOfflineQueueKey, remaining);
    return synced;
  }

  // ==========================================
  // FALLBACK DEFAULTS
  // ==========================================
  List<WalletModel> _getLocalWalletsFallback() {
    return [
      WalletModel(id: '00000000-0000-0000-0000-000000000001', name: 'Tiền mặt gia đình', walletType: WalletType.CASH, currentBalance: 15400000, color: '#10B981', icon: 'Banknote'),
      WalletModel(id: '00000000-0000-0000-0000-000000000002', name: 'Techcombank Chi tiêu', walletType: WalletType.BANK, bankName: 'Techcombank', currentBalance: 38500000, color: '#EF4444', icon: 'Building2'),
      WalletModel(id: '00000000-0000-0000-0000-000000000003', name: 'Vietcombank Lương & Dự phòng', walletType: WalletType.BANK, bankName: 'Vietcombank', currentBalance: 85200000, color: '#059669', icon: 'CreditCard'),
      WalletModel(id: '00000000-0000-0000-0000-000000000004', name: 'Techcombank Visa Signature', walletType: WalletType.CREDIT_CARD, bankName: 'Techcombank', currentBalance: -4850000, creditLimit: 100000000, statementDay: 20, paymentDueDay: 5, color: '#6366F1', icon: 'CreditCard'),
      WalletModel(id: '00000000-0000-0000-0000-000000000005', name: 'Ví MoMo', walletType: WalletType.E_WALLET, currentBalance: 1250000, color: '#EC4899', icon: 'Smartphone'),
      WalletModel(id: '00000000-0000-0000-0000-000000000006', name: 'Sổ tiết kiệm ngân hàng', walletType: WalletType.SAVINGS, currentBalance: 150000000, color: '#38BDF8', icon: 'PiggyBank'),
      WalletModel(id: '208ebe0f-ebaa-435a-ae38-03be6f225581', name: 'Shinhan bank', walletType: WalletType.BANK, currentBalance: 0, color: '#0284C7', icon: 'Building2'),
    ];
  }

  List<TransactionCategoryModel> _getLocalCategoriesFallback() {
    return [
      // 1. Ăn uống & Đi chợ
      TransactionCategoryModel(id: '00000000-0000-0000-0001-000000000001', name: 'Ăn uống & Đi chợ', type: TransactionType.EXPENSE, icon: 'utensils', color: '#F59E0B', displayOrder: 1),
      TransactionCategoryModel(id: '00000000-0000-0000-0001-000000000002', name: 'Đi chợ & Siêu thị', parentId: '00000000-0000-0000-0001-000000000001', type: TransactionType.EXPENSE, icon: 'shopping-bag', color: '#F59E0B', displayOrder: 2),
      TransactionCategoryModel(id: '00000000-0000-0000-0001-000000000003', name: 'Ăn ngoài hàng & Cafe', parentId: '00000000-0000-0000-0001-000000000001', type: TransactionType.EXPENSE, icon: 'coffee', color: '#FBBF24', displayOrder: 3),

      // 2. Phương tiện & Xe cộ
      TransactionCategoryModel(id: '00000000-0000-0000-0003-000000000001', name: 'Phương tiện & Đi lại (Xe)', type: TransactionType.EXPENSE, icon: 'car', color: '#06B6D4', displayOrder: 4),
      TransactionCategoryModel(id: '00000000-0000-0000-0003-000000000002', name: 'Xăng xe & Nhiên liệu', parentId: '00000000-0000-0000-0003-000000000001', type: TransactionType.EXPENSE, icon: 'fuel', color: '#06B6D4', displayOrder: 5),
      TransactionCategoryModel(id: '00000000-0000-0000-0003-000000000003', name: 'Bảo dưỡng & Sửa xe', parentId: '00000000-0000-0000-0003-000000000001', type: TransactionType.EXPENSE, icon: 'wrench', color: '#0EA5E9', displayOrder: 6),
      TransactionCategoryModel(id: '00000000-0000-0000-0003-000000000004', name: 'Phí cầu đường VETC & Gửi xe', parentId: '00000000-0000-0000-0003-000000000001', type: TransactionType.EXPENSE, icon: 'credit-card', color: '#38BDF8', displayOrder: 7),
      TransactionCategoryModel(id: '00000000-0000-0000-0003-000000000006', name: 'Rửa xe & Phụ kiện xe', parentId: '00000000-0000-0000-0003-000000000001', type: TransactionType.EXPENSE, icon: 'sparkles', color: '#A5F3FC', displayOrder: 8),

      // 3. Nhà cửa & Tiện ích
      TransactionCategoryModel(id: '00000000-0000-0000-0002-000000000001', name: 'Nhà cửa & Tiện ích', type: TransactionType.EXPENSE, icon: 'home', color: '#3B82F6', displayOrder: 9),
      TransactionCategoryModel(id: '00000000-0000-0000-0002-000000000002', name: 'Điện, Nước, Internet, Rác', parentId: '00000000-0000-0000-0002-000000000001', type: TransactionType.EXPENSE, icon: 'zap', color: '#38BDF8', displayOrder: 10),
      TransactionCategoryModel(id: '00000000-0000-0000-0002-000000000003', name: 'Đồ gia dụng & Sửa nhà', parentId: '00000000-0000-0000-0002-000000000001', type: TransactionType.EXPENSE, icon: 'hammer', color: '#60A5FA', displayOrder: 11),

      // 4. Con cái & Giáo dục
      TransactionCategoryModel(id: '00000000-0000-0000-0005-000000000001', name: 'Con cái & Giáo dục', type: TransactionType.EXPENSE, icon: 'graduation-cap', color: '#8B5CF6', displayOrder: 12),
      TransactionCategoryModel(id: '00000000-0000-0000-0005-000000000002', name: 'Học phí & Khóa học', parentId: '00000000-0000-0000-0005-000000000001', type: TransactionType.EXPENSE, icon: 'book-open', color: '#A78BFA', displayOrder: 13),
      TransactionCategoryModel(id: '00000000-0000-0000-0005-000000000003', name: 'Sữa, Bỉm, Đồ chơi trẻ em', parentId: '00000000-0000-0000-0005-000000000001', type: TransactionType.EXPENSE, icon: 'baby', color: '#C4B5FD', displayOrder: 14),

      // 5. Mua sắm & Hưởng thụ
      TransactionCategoryModel(id: '00000000-0000-0000-0006-000000000001', name: 'Hưởng thụ & Du lịch', type: TransactionType.EXPENSE, icon: 'plane', color: '#EC4899', displayOrder: 15),
      TransactionCategoryModel(id: '00000000-0000-0000-0006-000000000002', name: 'Du lịch & Nghỉ dưỡng', parentId: '00000000-0000-0000-0006-000000000001', type: TransactionType.EXPENSE, icon: 'palmtree', color: '#F472B6', displayOrder: 16),
      TransactionCategoryModel(id: '00000000-0000-0000-0006-000000000003', name: 'Mua sắm & Thời trang', parentId: '00000000-0000-0000-0006-000000000001', type: TransactionType.EXPENSE, icon: 'shopping-bag', color: '#FB7185', displayOrder: 17),

      // 6. Y tế & Sức khỏe
      TransactionCategoryModel(id: '00000000-0000-0000-0004-000000000001', name: 'Sức khỏe & Y tế', type: TransactionType.EXPENSE, icon: 'heart', color: '#10B981', displayOrder: 18),
      TransactionCategoryModel(id: '00000000-0000-0000-0004-000000000002', name: 'Thuốc men & Khám bệnh', parentId: '00000000-0000-0000-0004-000000000001', type: TransactionType.EXPENSE, icon: 'pill', color: '#34D399', displayOrder: 19),

      // 7. Trả góp & Nợ
      TransactionCategoryModel(id: '00000000-0000-0000-0007-000000000001', name: 'Trả góp & Trả nợ ngân hàng', type: TransactionType.EXPENSE, icon: 'badge-percent', color: '#E11D48', displayOrder: 20),

      // 8. Thu nhập
      TransactionCategoryModel(id: '00000000-0000-0000-0008-000000000001', name: 'Lương cố định hàng tháng', type: TransactionType.INCOME, icon: 'coins', color: '#10B981', displayOrder: 21),
      TransactionCategoryModel(id: '00000000-0000-0000-0008-000000000002', name: 'Thưởng & Thu nhập phụ', parentId: '00000000-0000-0000-0008-000000000001', type: TransactionType.INCOME, icon: 'trending-up', color: '#34D399', displayOrder: 22),
      TransactionCategoryModel(id: '00000000-0000-0000-0008-000000000003', name: 'Lợi nhuận kinh doanh / Đầu tư', parentId: '00000000-0000-0000-0008-000000000001', type: TransactionType.INCOME, icon: 'briefcase', color: '#059669', displayOrder: 23),

      // 9. Chuyển tiền nội bộ
      TransactionCategoryModel(id: '00000000-0000-0000-0009-000000000001', name: 'Chuyển tiền nội bộ giữa các ví', type: TransactionType.TRANSFER, icon: 'arrow-right-left', color: '#64748B', displayOrder: 24),
    ];
  }

  Map<String, String> _mapVehicleCategory(String? category, String? subcategory, String? description) {
    final cat = (category ?? '').toUpperCase().trim();
    final text = '${subcategory ?? ''} ${description ?? ''}'.toLowerCase();

    // 1. Nhiên liệu / Xăng dầu
    if (cat == 'FUEL' || text.contains('xăng') || text.contains('dầu') || text.contains('ron 95') || text.contains('diesel')) {
      return {'id': 'cat-mob-fuel', 'name': 'Xăng xe & Nhiên liệu'};
    }
    // 2. Bảo dưỡng & Sửa chữa định kỳ
    if (cat == 'MAINTENANCE' || cat == 'LABOR' || text.contains('bảo dưỡng') || text.contains('thay dầu') || text.contains('nhớt') || text.contains('sửa chữa') || text.contains('gara') || text.contains('hãng')) {
      return {'id': 'cat-mob-maint', 'name': 'Bảo dưỡng & Sửa xe'};
    }
    // 3. Phí cầu đường BOT, VETC, ePass
    if (cat == 'TOLL' || text.contains('vetc') || text.contains('epass') || text.contains('cầu đường') || text.contains('bot') || text.contains('cao tốc')) {
      return {'id': 'cat-mob-toll', 'name': 'Phí VETC & Gửi xe'};
    }
    // 4. Vé gửi xe, đỗ xe
    if (cat == 'PARKING' || text.contains('gửi xe') || text.contains('đỗ xe') || text.contains('bãi đỗ')) {
      return {'id': 'cat-mob-toll', 'name': 'Phí VETC & Gửi xe'};
    }
    // 5. Rửa xe, dọn nội thất, spa
    if (cat == 'CAR_WASH' || text.contains('rửa xe') || text.contains('spa') || text.contains('dọn nội thất')) {
      return {'id': 'cat-mob-wash', 'name': 'Rửa xe & Chăm sóc xe'};
    }
    // 6. Khoản vay mua xe
    if (cat == 'LOAN' || cat == 'LOAN_PAYMENT' || text.contains('gốc vay') || text.contains('tiền gốc')) {
      return {'id': 'cat-debt', 'name': 'Trả gốc vay mua xe'};
    }
    if (cat == 'LOAN_INTEREST' || text.contains('lãi vay') || text.contains('tiền lãi')) {
      return {'id': 'cat-debt', 'name': 'Trả lãi vay mua xe'};
    }
    // Default
    return {'id': 'cat-mobility', 'name': 'Phương tiện & Đi lại (Xe)'};
  }

  List<FamilyTransactionModel> _getInitialDefaultTransactions() {
    return []; // Không sinh bất kỳ giao dịch mẫu nào
  }

  List<BudgetModel> _getMockBudgets() {
    return []; // Không sinh ngân sách mẫu
  }
}

import { createClient } from '@/lib/supabase/client';
import { MaintenanceRecord } from '@/types/mobility';
import { resolveAssetId, isValidUuid } from './assetService';

export interface MaintenanceInput {
  asset_id: string;
  maintenance_type: string;
  date: string;
  odometer_km?: number;
  cost?: number;
  currency?: string;
  vendor?: string;
  notes?: string;
  next_due_km?: number;
  next_due_date?: string;
  warranty_until?: string;
}

/** Compute 'OK' | 'DUE_SOON' | 'OVERDUE' from next_due_date */
function computeStatus(row: any): MaintenanceRecord['status'] {
  if (!row.next_due_date) return 'OK';
  const days = Math.ceil(
    (new Date(row.next_due_date).getTime() - Date.now()) / 86400000,
  );
  if (days < 0) return 'OVERDUE';
  if (days <= 30) return 'DUE_SOON';
  return 'OK';
}

export function mapMaintenanceRow(row: any): MaintenanceRecord {
  return {
    id: row.id,
    asset_id: row.asset_id,
    maintenance_type: row.maintenance_type,
    date: row.date ? row.date.slice(0, 10) : '',
    odometer_km: Number(row.odometer_km) || 0,
    cost: Number(row.cost) || 0,
    vendor: row.vendor ?? '',
    notes: row.notes ?? undefined,
    next_due_km: row.next_due_km != null ? Number(row.next_due_km) : undefined,
    next_due_date: row.next_due_date ?? undefined,
    status: computeStatus(row),
  };
}

export async function getMaintenanceRecords(assetId?: string): Promise<MaintenanceRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbMaint: MaintenanceRecord[] = [];
  try {
    const supabase = createClient();
    let query = supabase.from('maintenance_records').select('*').order('date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbMaint = data.map(mapMaintenanceRow);
    }
  } catch {}

  let allMaint: MaintenanceRecord[] = [...dbMaint];

  // Apply custom edits from localStorage
  allMaint = allMaint.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB (avoid duplicating if matching date + maintenance_type + cost exists)
  Object.values(customMap).forEach((customItem: any) => {
    if (!customItem || !customItem.id) return;
    const isAlreadyInDb = allMaint.some(m => 
      m.id === customItem.id || 
      (customItem.id.startsWith('MAINT_') && m.date === customItem.date && m.maintenance_type === customItem.maintenance_type && Number(m.cost) === Number(customItem.cost))
    );
    if (!isAlreadyInDb) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allMaint.unshift(customItem);
      }
    }
  });

  const seenIds = new Set<string>();
  const uniqueMaint: MaintenanceRecord[] = [];
  for (const m of allMaint) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      uniqueMaint.push(m);
    }
  }

  return uniqueMaint.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createMaintenanceRecord(data: MaintenanceInput, skipExpenseSync = false): Promise<MaintenanceRecord> {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  const payload = {
    asset_id: realId,
    maintenance_type: data.maintenance_type,
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km ?? null,
    cost: data.cost ?? 0,
    currency: data.currency ?? 'VND',
    vendor: data.vendor ?? null,
    notes: data.notes ?? null,
    next_due_km: data.next_due_km ?? null,
    next_due_date: data.next_due_date ?? null,
    warranty_until: data.warranty_until ?? null,
  };

  let newMaintObj: MaintenanceRecord;

  // 1. Insert to Supabase DB first
  try {
    const { data: dbData, error } = await supabase.from('maintenance_records').insert(payload).select().single();
    if (!error && dbData) {
      newMaintObj = mapMaintenanceRow(dbData);
      // Clean up matching temporary local custom items
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('fmms_custom_maintenance');
          if (stored) {
            const customMap = JSON.parse(stored);
            Object.keys(customMap).forEach(k => {
              if (k.startsWith('MAINT_') && customMap[k].maintenance_type === data.maintenance_type && Number(customMap[k].cost) === Number(data.cost)) {
                delete customMap[k];
              }
            });
            localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
          }
        } catch {}
      }
    } else {
      throw error || new Error('DB insert failed');
    }
  } catch (err) {
    // 2. Fallback to LocalStorage if DB insert fails
    const newId = `MAINT_${Date.now()}`;
    newMaintObj = {
      id: newId,
      asset_id: realId,
      maintenance_type: data.maintenance_type,
      date: payload.date,
      odometer_km: data.odometer_km || 0,
      cost: data.cost || 0,
      vendor: data.vendor || '',
      notes: data.notes,
      next_due_km: data.next_due_km,
      next_due_date: data.next_due_date,
      status: computeStatus(payload),
    };

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fmms_custom_maintenance');
        const customMap = stored ? JSON.parse(stored) : {};
        customMap[newId] = newMaintObj;
        localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
      } catch {}
    }
  }

  // 3. Auto-sync to expenses (Đồng bộ 2 chiều sang mục Chi Phí)
  if (!skipExpenseSync && (data.cost ?? 0) > 0) {
    try {
      await syncMaintenanceExpense({
        action: 'CREATE',
        maintId: newMaintObj.id,
        assetId: realId,
        date: payload.date,
        cost: data.cost ?? 0,
        maintenanceType: data.maintenance_type,
        vendor: data.vendor,
        odometerKm: data.odometer_km,
        notes: data.notes,
      });
    } catch {}
  }

  return newMaintObj;
}

/**
 * 🔄 Đồng bộ tự động 2 chiều giữa Bảo Dưỡng (Maintenance) và Chi Phí (Expenses)
 * Khi tạo/sửa/xóa bản ghi bảo dưỡng -> Tự động tạo/sửa/xóa bản ghi chi phí tương ứng
 */
export async function syncMaintenanceExpense(params: {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  maintId: string;
  assetId?: string;
  date?: string;
  cost?: number;
  maintenanceType?: string;
  vendor?: string;
  odometerKm?: number;
  notes?: string;
}) {
  const { action, maintId, assetId, date, cost, maintenanceType, vendor, odometerKm, notes } = params;
  try {
    const { getExpenses, createExpense, updateExpense, deleteExpense } = await import('./expenseService');
    const expenses = await getExpenses(assetId);

    // Tag để nhận diện bản ghi chi phí này thuộc về bảo dưỡng nào
    const refTag = `[MaintRef:${maintId}]`;

    // Tìm các bản ghi chi phí liên quan đến lần bảo dưỡng này
    const matchingExpenses = expenses.filter(e => {
      if (e.description && e.description.includes(refTag)) return true;
      if (e.id === `maint_exp_${maintId}` || e.id === `maint_${maintId}`) return true;
      // Khớp theo ngày và số tiền nếu chưa gắn refTag
      if (date && cost && (e.date || '').slice(0, 10) === date.slice(0, 10)) {
        const cat = (e.category || '').toUpperCase();
        const desc = (e.description || '').toLowerCase();
        const isMaint = cat === 'MAINTENANCE' || desc.includes('bảo dưỡng');
        if (isMaint && Math.abs(Number(e.amount || 0) - cost) < 100) return true;
      }
      return false;
    });

    if (action === 'DELETE') {
      // Xoá toàn bộ chi phí đi kèm bản ghi bảo dưỡng này
      for (const exp of matchingExpenses) {
        await deleteExpense(exp.id);
      }
      return;
    }

    const fullDesc = `Bảo dưỡng: ${maintenanceType || 'Bảo dưỡng định kỳ'}${notes ? ` - ${notes}` : ''} ${refTag}`;
    const amount = cost !== undefined ? cost : (matchingExpenses[0]?.amount || 0);

    if (action === 'UPDATE') {
      if (matchingExpenses.length > 0) {
        await updateExpense(matchingExpenses[0].id, {
          date: date || matchingExpenses[0].date,
          category: 'Maintenance',
          subcategory: maintenanceType || matchingExpenses[0].subcategory,
          amount: amount,
          vendor: vendor !== undefined ? vendor : matchingExpenses[0].vendor,
          odometer_km: odometerKm !== undefined ? odometerKm : matchingExpenses[0].odometer_km,
          description: fullDesc,
        });
        // Dọn dẹp bản ghi trùng lặp (nếu có)
        for (let i = 1; i < matchingExpenses.length; i++) {
          await deleteExpense(matchingExpenses[i].id);
        }
      } else if (assetId && amount > 0) {
        await createExpense({
          asset_id: assetId,
          date: date || new Date().toISOString().slice(0, 10),
          category: 'Maintenance',
          subcategory: maintenanceType || 'Bảo dưỡng định kỳ',
          amount: amount,
          currency: 'VND',
          vendor: vendor,
          odometer_km: odometerKm,
          description: fullDesc,
        }, true);
      }
      return;
    }

    if (action === 'CREATE') {
      if ((cost ?? 0) <= 0 || !assetId) return;

      if (matchingExpenses.length > 0) {
        await updateExpense(matchingExpenses[0].id, {
          date: date,
          amount: cost,
          vendor: vendor,
          odometer_km: odometerKm,
          description: fullDesc,
        });
      } else {
        await createExpense({
          asset_id: assetId,
          date: date || new Date().toISOString().slice(0, 10),
          category: 'Maintenance',
          subcategory: maintenanceType || 'Bảo dưỡng định kỳ',
          amount: cost ?? 0,
          currency: 'VND',
          vendor: vendor,
          odometer_km: odometerKm,
          description: fullDesc,
        }, true);
      }
    }
  } catch (err) {
    console.warn('syncMaintenanceExpense error:', err);
  }
}

export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>): Promise<MaintenanceRecord> {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;
  const supabase = createClient();

  const updatePayload: any = {};
  if (data.maintenance_type) updatePayload.maintenance_type = data.maintenance_type;
  if (data.date) updatePayload.date = data.date;
  if (data.odometer_km !== undefined) updatePayload.odometer_km = data.odometer_km;
  if (data.cost !== undefined) updatePayload.cost = data.cost;
  if (data.currency) updatePayload.currency = data.currency;
  if (data.vendor !== undefined) updatePayload.vendor = data.vendor;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.next_due_km !== undefined) updatePayload.next_due_km = data.next_due_km;
  if (data.next_due_date !== undefined) updatePayload.next_due_date = data.next_due_date;
  if (data.warranty_until !== undefined) updatePayload.warranty_until = data.warranty_until;
  if (realAssetId) updatePayload.asset_id = realAssetId;

  try {
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('maintenance_records').update(updatePayload).eq('id', id);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...data,
        id,
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
    } catch {}
  }

  // Đồng bộ 2 chiều sang bảng chi phí khi sửa bảo dưỡng
  await syncMaintenanceExpense({
    action: 'UPDATE',
    maintId: id,
    assetId: realAssetId,
    date: data.date,
    cost: data.cost,
    maintenanceType: data.maintenance_type,
    vendor: data.vendor,
    odometerKm: data.odometer_km,
    notes: data.notes,
  });

  return { id, ...data } as MaintenanceRecord;
}

export async function deleteMaintenanceRecord(id: string, assetId?: string): Promise<boolean> {
  // Đồng bộ 2 chiều: Xoá chi phí đi kèm trước khi xoá bản ghi bảo dưỡng
  await syncMaintenanceExpense({
    action: 'DELETE',
    maintId: id,
    assetId,
  });

  try {
    const supabase = createClient();
    await supabase.from('maintenance_records').delete().eq('id', id);
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      if (stored) {
        const customMap = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
      }
    } catch {}
  }

  return true;
}

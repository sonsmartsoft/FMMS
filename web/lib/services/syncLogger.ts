/**
 * 🛰️ FMMS Supabase Cloud Sync Logger & Trace System
 * Logs and tracks all real-time sync operations between Frontend & Supabase Cloud.
 */

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'RPC';
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  entityId?: string;
  summary: string;
  payload?: any;
  errorDetails?: string;
  durationMs?: number;
}

const STORAGE_KEY = 'fmms_sync_trace_logs';
const MAX_LOGS = 100;
const LISTENERS: Array<(logs: SyncLogEntry[]) => void> = [];

export function getSyncLogs(): SyncLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addSyncLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): SyncLogEntry {
  const newLog: SyncLogEntry = {
    ...entry,
    id: `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const current = getSyncLogs();
      const updated = [newLog, ...current].slice(0, MAX_LOGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      LISTENERS.forEach(fn => {
        try { fn(updated); } catch {}
      });
    } catch {}
  }

  // Also log to browser console with styled badge
  const badgeStyle = entry.status === 'SUCCESS' 
    ? 'background: #10B981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;'
    : entry.status === 'ERROR'
    ? 'background: #EF4444; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;'
    : 'background: #F59E0B; color: black; padding: 2px 6px; border-radius: 4px; font-weight: bold;';

  console.log(
    `%c[FMMS SYNC] ${entry.action} ${entry.table} -> ${entry.status}`,
    badgeStyle,
    entry.summary,
    entry.errorDetails || entry.payload || ''
  );

  return newLog;
}

export function clearSyncLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    LISTENERS.forEach(fn => {
      try { fn([]); } catch {}
    });
  }
}

export function subscribeToSyncLogs(callback: (logs: SyncLogEntry[]) => void): () => void {
  LISTENERS.push(callback);
  return () => {
    const idx = LISTENERS.indexOf(callback);
    if (idx !== -1) LISTENERS.splice(idx, 1);
  };
}

/**
 * Helper to trace any async Supabase operation with automatic timing and error logging
 */
export async function traceCloudOperation<T>(
  table: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'RPC',
  summary: string,
  fn: () => Promise<{ data?: T; error?: any }>,
  payload?: any
): Promise<{ data?: T; error?: any }> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);

    if (result.error) {
      addSyncLog({
        table,
        action,
        status: 'ERROR',
        summary,
        payload,
        errorDetails: result.error.message || JSON.stringify(result.error),
        durationMs,
      });
    } else {
      addSyncLog({
        table,
        action,
        status: 'SUCCESS',
        summary,
        payload,
        durationMs,
      });
    }

    return result;
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    addSyncLog({
      table,
      action,
      status: 'ERROR',
      summary,
      payload,
      errorDetails: err?.message || 'Network / Uncaught exception',
      durationMs,
    });
    return { error: err };
  }
}

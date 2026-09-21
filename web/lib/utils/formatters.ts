/**
 * Bulletproof formatters for FFMS (Family Finance & Mobility System)
 * Prevents all client-side exceptions from null, undefined, invalid dates, or non-string inputs.
 */

export function safeFormatCurrency(val?: number | string | null): string {
  if (val === null || val === undefined || val === '') return '0';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN');
}

export function safeFormatDate(val?: string | null): string {
  if (!val) return '—';
  try {
    const raw = String(val).trim();
    if (!raw) return '—';
    // If format like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const cleanDate = raw.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return String(val) || '—';
  }
}

export function safeMaskAccount(acc?: string | number | null): string {
  if (!acc) return '****';
  try {
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return `**** ${str.slice(-4)}`;
  } catch {
    return '****';
  }
}

export function safeNumber(val?: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

import { createClient } from '@/lib/supabase/client';

export const DEFAULT_ALLOWED_EMAILS = [
  'son.nt@utivina.com',
  'sondtk5@gmail.com',
  'son.smartsoft@gmail.com',
  'uti@utivina.com',
  'thanhvien@utivina.com',
];

export function getAllowedEmails(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ALLOWED_EMAILS;
  try {
    const custom = localStorage.getItem('fmms_allowed_emails');
    if (custom !== null) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        return parsed.map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch {}
  return DEFAULT_ALLOWED_EMAILS;
}

export async function saveAllowedEmails(emails: string[]): Promise<void> {
  const cleaned = Array.from(new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fmms_allowed_emails', JSON.stringify(cleaned));
      window.dispatchEvent(new Event('fmms_allowed_emails_updated'));
    } catch {}
  }

  // Persist directly to Supabase master_data
  try {
    const supabase = createClient();
    await supabase
      .from('master_data')
      .upsert({
        key: 'fmms_allowed_emails',
        data: cleaned,
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('Failed to save whitelist to Supabase:', err);
  }
}

export async function fetchAllowedEmailsFromCloud(): Promise<string[]> {
  const supabase = createClient();

  try {
    const { data: mData, error } = await supabase
      .from('master_data')
      .select('data')
      .eq('key', 'fmms_allowed_emails')
      .maybeSingle();

    if (!error && mData && Array.isArray(mData.data)) {
      const list = mData.data.map((e: string) => e.trim().toLowerCase()).filter(Boolean);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fmms_allowed_emails', JSON.stringify(list));
        } catch {}
      }
      return list;
    }
  } catch (err) {
    console.warn('fetchAllowedEmailsFromCloud error:', err);
  }

  return getAllowedEmails();
}

export async function isEmailAllowedAsync(email: string): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowed = await fetchAllowedEmailsFromCloud();
  return allowed.includes(cleanEmail);
}

export function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowed = getAllowedEmails().map(e => e.trim().toLowerCase());
  return allowed.includes(cleanEmail);
}

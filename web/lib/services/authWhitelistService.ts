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
  const set = new Set<string>();

  // 1. Fetch from user_members
  try {
    const { data: users, error: uErr } = await supabase
      .from('user_members')
      .select('email');
    if (!uErr && users && users.length > 0) {
      users.forEach((u: any) => {
        if (u.email) set.add(u.email.trim().toLowerCase());
      });
    }
  } catch (err) {
    console.warn('Error fetching user_members for whitelist:', err);
  }

  // 2. Fetch from master_data
  try {
    const { data: mData, error: mErr } = await supabase
      .from('master_data')
      .select('data')
      .eq('key', 'fmms_allowed_emails')
      .maybeSingle();

    if (!mErr && mData && Array.isArray(mData.data)) {
      mData.data.forEach((e: string) => {
        if (e) set.add(e.trim().toLowerCase());
      });
    }
  } catch (err) {
    console.warn('Error fetching master_data for whitelist:', err);
  }

  // Fallback defaults if cloud is empty
  if (set.size === 0) {
    DEFAULT_ALLOWED_EMAILS.forEach(e => set.add(e.toLowerCase()));
  }

  const list = Array.from(set);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fmms_allowed_emails', JSON.stringify(list));
    } catch {}
  }
  return list;
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

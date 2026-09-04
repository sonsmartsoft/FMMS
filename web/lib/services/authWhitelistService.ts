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
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...parsed.map((e: string) => e.trim().toLowerCase()).filter(Boolean)]));
      }
    }
  } catch {}
  return DEFAULT_ALLOWED_EMAILS;
}

export function saveAllowedEmails(emails: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...emails.map(e => e.trim().toLowerCase()).filter(Boolean)]));
    localStorage.setItem('fmms_allowed_emails', JSON.stringify(cleaned));
    window.dispatchEvent(new Event('fmms_allowed_emails_updated'));

    // Also persist to Supabase master_data in background
    const supabase = createClient();
    supabase
      .from('master_data')
      .upsert({
        key: 'fmms_allowed_emails',
        data: cleaned,
        updated_at: new Date().toISOString(),
      })
      .then();
  } catch {}
}

export async function fetchAllowedEmailsFromCloud(): Promise<string[]> {
  const supabase = createClient();
  const set = new Set<string>(DEFAULT_ALLOWED_EMAILS.map(e => e.toLowerCase()));

  try {
    // 1. Fetch from user_members
    const { data: users } = await supabase.from('user_members').select('email');
    if (users && users.length > 0) {
      users.forEach((u: any) => {
        if (u.email) set.add(u.email.trim().toLowerCase());
      });
    }

    // 2. Fetch from master_data
    const { data: mData } = await supabase.from('master_data').select('data').eq('key', 'fmms_allowed_emails').maybeSingle();
    if (mData && Array.isArray(mData.data)) {
      mData.data.forEach((e: string) => {
        if (e) set.add(e.trim().toLowerCase());
      });
    }

    const list = Array.from(set);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('fmms_allowed_emails', JSON.stringify(list));
      } catch {}
    }
    return list;
  } catch {
    return getAllowedEmails();
  }
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

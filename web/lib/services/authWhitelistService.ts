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
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_ALLOWED_EMAILS, ...parsed.map((e: string) => e.trim().toLowerCase())]));
      }
    }
  } catch {}
  return DEFAULT_ALLOWED_EMAILS;
}

export function saveAllowedEmails(emails: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const cleaned = Array.from(new Set(emails.map(e => e.trim().toLowerCase()).filter(Boolean)));
    localStorage.setItem('fmms_allowed_emails', JSON.stringify(cleaned));
  } catch {}
}

export function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const allowed = getAllowedEmails().map(e => e.trim().toLowerCase());
  return allowed.includes(cleanEmail);
}

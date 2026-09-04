import { createClient } from '@/lib/supabase/client';

export interface UserMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  assigned_asset_ids: string[];
  created_at: string;
  updated_at?: string;
}

export const INITIAL_DEFAULT_USERS: UserMember[] = [
  {
    id: 'usr-1',
    name: 'Nguyễn Trung Sơn',
    email: 'son.nt@utivina.com',
    phone: '0901234567',
    role: 'ADMIN',
    status: 'ACTIVE',
    assigned_asset_ids: [],
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-2',
    name: 'Nguyễn Trung Sơn (Gmail)',
    email: 'sondtk5@gmail.com',
    phone: '0988888888',
    role: 'ADMIN',
    status: 'ACTIVE',
    assigned_asset_ids: [],
    created_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'usr-smartsoft',
    name: 'Nguyễn Trung Sơn (SmartSoft)',
    email: 'son.smartsoft@gmail.com',
    phone: '0901234567',
    role: 'ADMIN',
    status: 'ACTIVE',
    assigned_asset_ids: [],
    created_at: '2026-01-16T00:00:00.000Z',
  },
  {
    id: 'usr-3',
    name: 'Trần Văn A (Thành viên)',
    email: 'thanhvien@utivina.com',
    phone: '0912345678',
    role: 'MEMBER',
    status: 'ACTIVE',
    assigned_asset_ids: [],
    created_at: '2026-02-10T00:00:00.000Z',
  },
];

const LOCAL_STORAGE_KEY = 'fmms_users_list';

export async function getUserMembers(): Promise<UserMember[]> {
  const supabase = createClient();
  let dbUsers: UserMember[] = [];

  try {
    const { data, error } = await supabase
      .from('user_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      dbUsers = data.map((u: any) => ({
        id: String(u.id),
        name: u.name || '',
        email: (u.email || '').trim().toLowerCase(),
        phone: u.phone || '',
        role: (u.role || 'MEMBER').toUpperCase() as 'ADMIN' | 'MEMBER',
        status: (u.status || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'INACTIVE',
        assigned_asset_ids: Array.isArray(u.assigned_asset_ids) ? u.assigned_asset_ids : [],
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at,
      }));

      // Cache locally for offline performance
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbUsers));
        } catch {}
      }
      return dbUsers;
    } else if (!error && data && data.length === 0) {
      // Table exists but is empty -> seed INITIAL_DEFAULT_USERS to Supabase
      try {
        await supabase.from('user_members').insert(INITIAL_DEFAULT_USERS.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          status: u.status,
          assigned_asset_ids: u.assigned_asset_ids,
          created_at: u.created_at,
          updated_at: new Date().toISOString(),
        })));
        return INITIAL_DEFAULT_USERS;
      } catch {}
    }
  } catch (err) {
    console.warn('Supabase fetch user_members error:', err);
  }

  // Fallback to localStorage or defaults
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }

  return INITIAL_DEFAULT_USERS;
}

export async function createUserMember(user: Omit<UserMember, 'id' | 'created_at'> & { id?: string }): Promise<UserMember> {
  const supabase = createClient();
  const newId = user.id || `usr-${Date.now()}`;
  const now = new Date().toISOString();

  const newMember: UserMember = {
    id: newId,
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    phone: user.phone?.trim() || '',
    role: user.role,
    status: user.status || 'ACTIVE',
    assigned_asset_ids: user.assigned_asset_ids || [],
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from('user_members')
      .insert({
        id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        phone: newMember.phone,
        role: newMember.role,
        status: newMember.status,
        assigned_asset_ids: newMember.assigned_asset_ids,
        created_at: newMember.created_at,
        updated_at: newMember.updated_at,
      })
      .select()
      .single();

    if (!error && data) {
      newMember.id = String(data.id);
    }
  } catch (err) {
    console.warn('Supabase insert user_members error:', err);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const current = await getUserMembers();
      const updated = [...current.filter(u => u.email !== newMember.email && u.id !== newMember.id), newMember];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('fmms_users_updated'));
    } catch {}
  }

  return newMember;
}

export async function updateUserMember(id: string, updates: Partial<UserMember>): Promise<UserMember | null> {
  const supabase = createClient();
  const now = new Date().toISOString();

  try {
    const payload: any = { ...updates, updated_at: now };
    if (payload.email) payload.email = payload.email.trim().toLowerCase();

    await supabase
      .from('user_members')
      .update(payload)
      .eq('id', id);
  } catch (err) {
    console.warn('Supabase update user_members error:', err);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: UserMember[] = JSON.parse(saved);
        const idx = parsed.findIndex(u => u.id === id);
        if (idx !== -1) {
          parsed[idx] = { ...parsed[idx], ...updates, updated_at: now };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          window.dispatchEvent(new Event('fmms_users_updated'));
          return parsed[idx];
        }
      }
    } catch {}
  }

  return null;
}

export async function deleteUserMember(id: string, email?: string): Promise<boolean> {
  const supabase = createClient();

  try {
    await supabase
      .from('user_members')
      .delete()
      .or(`id.eq.${id}${email ? `,email.eq.${email.trim().toLowerCase()}` : ''}`);
  } catch (err) {
    console.warn('Supabase delete user_members error:', err);
  }

  // Update local cache
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: UserMember[] = JSON.parse(saved);
        const filtered = parsed.filter(u => u.id !== id && (email ? u.email !== email.trim().toLowerCase() : true));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        window.dispatchEvent(new Event('fmms_users_updated'));
      }
    } catch {}
  }

  return true;
}

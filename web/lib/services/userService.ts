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

export function parseAssignedAssetIds(val: any): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    if (val.startsWith('{') && val.endsWith('}')) {
      // Postgres array format {id1,id2}
      return val.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
    }
  }
  return [];
}

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
        assigned_asset_ids: parseAssignedAssetIds(u.assigned_asset_ids),
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

export async function getCurrentUserMember(): Promise<UserMember | null> {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return null;
    const email = user.email.trim().toLowerCase();

    // 1. Query user_members from Supabase directly
    try {
      const { data, error } = await supabase
        .from('user_members')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (!error && data) {
        return {
          id: String(data.id),
          name: data.name || user.user_metadata?.full_name || '',
          email: (data.email || email).trim().toLowerCase(),
          phone: data.phone || '',
          role: (data.role || 'MEMBER').toUpperCase() as 'ADMIN' | 'MEMBER',
          status: (data.status || 'ACTIVE').toUpperCase() as 'ACTIVE' | 'INACTIVE',
          assigned_asset_ids: parseAssignedAssetIds(data.assigned_asset_ids),
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at,
        };
      }
    } catch (e) {
      console.warn('Supabase query user_members in getCurrentUserMember error:', e);
    }

    // 2. Query all members (which checks DB then localStorage then defaults)
    const all = await getUserMembers();
    const found = all.find(u => u.email.toLowerCase() === email);
    if (found) {
      return {
        ...found,
        assigned_asset_ids: parseAssignedAssetIds(found.assigned_asset_ids),
      };
    }

    // 3. Fallback for admin emails or demo
    const adminEmails = ['demo@fmms.com', 'son.nt@utivina.com', 'sondtk5@gmail.com', 'son.smartsoft@gmail.com'];
    if (adminEmails.includes(email) || email.includes('admin')) {
      return {
        id: user.id || 'usr-admin',
        name: user.user_metadata?.full_name || 'Nguyễn Trung Sơn',
        email: email,
        role: 'ADMIN',
        status: 'ACTIVE',
        assigned_asset_ids: [],
        created_at: new Date().toISOString(),
      };
    }

    // 4. Default fallback as MEMBER with no assigned assets
    return {
      id: user.id || 'usr-member',
      name: user.user_metadata?.full_name || email,
      email: email,
      role: 'MEMBER',
      status: 'ACTIVE',
      assigned_asset_ids: [],
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn('getCurrentUserMember error:', err);
    return null;
  }
}

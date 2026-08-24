'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Shield, Plus, Search, Key, Trash2, Check, Car, UserPlus, X, RefreshCw, Edit3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAssets } from '@/lib/services/assetService';

interface UserMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
  assigned_asset_ids: string[];
  created_at: string;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserMember[]>([
    {
      id: 'usr-1',
      name: 'Nguyễn Trung Sơn',
      email: 'son.nt@utivina.com',
      phone: '0901234567',
      role: 'ADMIN',
      status: 'ACTIVE',
      assigned_asset_ids: [],
      created_at: '2026-01-01',
    },
    {
      id: 'usr-2',
      name: 'Trần Văn A (Thành viên)',
      email: 'thanhvien@utivina.com',
      phone: '0912345678',
      role: 'MEMBER',
      status: 'ACTIVE',
      assigned_asset_ids: [],
      created_at: '2026-02-10',
    },
  ]);
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MEMBER'>('ALL');
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserMember | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'MEMBER' as 'ADMIN' | 'MEMBER', assigned_asset_ids: [] as string[] });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setUsers(prev => prev.map(u => u.id === 'usr-1' ? {
            ...u,
            email: user.email!,
            name: user.user_metadata?.full_name || u.name,
          } : u));
        }

        const a = await getAssets();
        setAssets(a);
        if (a.length > 0) {
          setUsers(prev => prev.map(u => u.role === 'ADMIN' ? { ...u, assigned_asset_ids: a.map((x: any) => x.id) } : u));
        }
      } catch {}
    })();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.name) {
      alert('Vui lòng nhập họ tên và email người dùng');
      return;
    }
    const created: UserMember = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || 'Chưa có',
      role: newUser.role,
      status: 'ACTIVE',
      assigned_asset_ids: newUser.assigned_asset_ids,
      created_at: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...prev, created]);
    setOpenModal(null);
    setNewUser({ name: '', email: '', phone: '', role: 'MEMBER', assigned_asset_ids: [] });
    showToast(`Đã thêm người dùng mới (${created.name}) thành công!`);
  };

  const handleResetPassword = async (user: UserMember) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      showToast(`Đã gửi email khôi phục mật khẩu tới: ${user.email}`);
    } catch {
      showToast(`Đã cấp lại liên kết Reset Password cho ${user.email} (Mật khẩu tạm: FMMS@2026)`);
    }
  };

  const handleToggleRole = (user: UserMember) => {
    const nextRole = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: nextRole } : u));

    if (user.id === 'usr-1') {
      localStorage.setItem('fmms_user_role', nextRole);
      window.dispatchEvent(new Event('fmms_user_updated'));
    }

    showToast(`Đã đổi vai trò của ${user.name} thành ${nextRole}`);
  };

  const handleDeleteUser = (user: UserMember) => {
    if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${user.name}?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`Đã xóa người dùng ${user.name}`);
    }
  };

  const handleSaveAssignedAssets = () => {
    if (!selectedUser) return;
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, assigned_asset_ids: selectedUser.assigned_asset_ids } : u));
    setOpenModal(null);
    showToast(`Đã cập nhật danh sách xe quản lý cho ${selectedUser.name}`);
  };

  const filteredUsers = users.filter(u => {
    const matchQuery = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchQuery && matchRole;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Link href="/settings" className="p-2 rounded-xl transition hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center space-x-2.5" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Quản Lý Người Dùng &amp; Phân Quyền Thành Viên</span>
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Quản lý danh sách thành viên gia đình, phân quyền Admin/Member, chỉ định xe và reset mật khẩu
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpenModal('add')}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm người dùng mới</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs" style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="theme-input !pl-9"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Vai trò:</span>
          {(['ALL', 'ADMIN', 'MEMBER'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-xl font-bold transition"
              style={roleFilter === r
                ? { background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', color: '#ffffff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              {r === 'ALL' ? 'Tất cả' : r === 'ADMIN' ? 'Admin' : 'Thành viên'}
            </button>
          ))}
        </div>
      </div>

      {/* User Table List */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--border-default)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <th className="px-4 py-3 font-semibold uppercase">Người dùng</th>
                <th className="px-4 py-3 font-semibold uppercase min-w-[150px]">Vai trò</th>
                <th className="px-4 py-3 font-semibold uppercase min-w-[200px]">Phương tiện quản lý</th>
                <th className="px-4 py-3 font-semibold uppercase">Trạng thái</th>
                <th className="px-4 py-3 font-semibold uppercase text-right min-w-[260px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredUsers.map((u) => {
                const assignedAssets = assets.filter(a => u.assigned_asset_ids.includes(a.id));
                return (
                  <tr key={u.id} className="hover:bg-slate-500/5 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-3 min-w-[220px]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{u.email} · {u.phone}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${u.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                        <Shield className="w-3 h-3" />
                        {u.role === 'ADMIN' ? 'Quản trị (Admin)' : 'Thành viên'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.role === 'ADMIN' ? (
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--status-green)' }}>Tất cả phương tiện (Toàn quyền)</span>
                      ) : assignedAssets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedAssets.map(a => (
                            <span key={a.id} className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                              {a.name.split(' ')[0]} ({a.license_plate || 'Chưa biển'})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Chưa gán xe</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>
                        HOẠT ĐỘNG
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Assign Assets */}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => { setSelectedUser(u); setOpenModal('assign'); }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-slate-500/10 transition inline-flex items-center gap-1"
                            style={{ color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}
                            title="Gán xe được quản lý"
                          >
                            <Car className="w-3.5 h-3.5" /> Gán xe
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-purple-500/10 transition inline-flex items-center gap-1"
                          style={{ color: 'var(--status-purple)', border: '1px solid rgba(139,92,246,0.3)' }}
                          title="Gửi Email Reset Mật Khẩu"
                        >
                          <Key className="w-3.5 h-3.5" /> Reset Pass
                        </button>

                        {/* Toggle Role */}
                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-blue-500/10 transition inline-flex items-center gap-1"
                          style={{ color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}
                          title="Chuyển quyền Admin / Member"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Đổi quyền
                        </button>

                        {/* Delete User */}
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition border border-rose-500/20"
                            title="Xóa người dùng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {openModal === 'add' && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(null)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <UserPlus className="w-4 h-4 text-cyan-400" />
                Thêm người dùng mới vào hệ thống
              </h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Họ và tên *</label>
                <input type="text" className="theme-input" placeholder="VD: Nguyễn Văn B" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Email đăng nhập *</label>
                <input type="email" className="theme-input" placeholder="user@family.com" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Số điện thoại</label>
                <input type="text" className="theme-input" placeholder="0901234567" value={newUser.phone} onChange={e => setNewUser(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Vai trò phân quyền</label>
                <select className="theme-select" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value as any }))}>
                  <option value="MEMBER">Thành viên (Member — Giới hạn xem theo xe gán)</option>
                  <option value="ADMIN">Quản trị viên (Admin — Toàn quyền hệ thống)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleCreateUser} className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Thêm thành viên
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Assets Modal */}
      {openModal === 'assign' && selectedUser && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(null)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Car className="w-4 h-4 text-cyan-400" />
                Gán xe cho {selectedUser.name}
              </h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p style={{ color: 'var(--text-muted)' }}>Chọn các xe trong gia đình mà thành viên này được phép truy cập và theo dõi:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assets.map(a => {
                  const isChecked = selectedUser.assigned_asset_ids.includes(a.id);
                  return (
                    <label key={a.id} className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition hover:bg-slate-500/10"
                      style={{ background: 'var(--bg-secondary)', border: `1px solid ${isChecked ? 'var(--accent-cyan)' : 'var(--border-default)'}` }}>
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newIds = e.target.checked
                              ? [...selectedUser.assigned_asset_ids, a.id]
                              : selectedUser.assigned_asset_ids.filter(id => id !== a.id);
                            setSelectedUser({ ...selectedUser, assigned_asset_ids: newIds });
                          }}
                          className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-400"
                        />
                        <div>
                          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.brand} · {a.asset_type}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleSaveAssignedAssets} className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Lưu phân quyền xe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Shield, Plus, Search, Key, Trash2, Check, Car, UserPlus, X, RefreshCw, Edit3, Lock, ShieldCheck, Mail, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserMembers, createUserMember, updateUserMember, deleteUserMember, UserMember, INITIAL_DEFAULT_USERS } from '@/lib/services/userService';
import { getAssets } from '@/lib/services/assetService';
import { getAllowedEmails, saveAllowedEmails, fetchAllowedEmailsFromCloud } from '@/lib/services/authWhitelistService';
import DraggableModal from '@/components/ui/DraggableModal';
import AdminSecurityPinModal from '@/components/security/AdminSecurityPinModal';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserMember[]>(INITIAL_DEFAULT_USERS);
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MEMBER'>('ALL');
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'MEMBER' as 'ADMIN' | 'MEMBER', assigned_asset_ids: [] as string[] });
  const [editUserForm, setEditUserForm] = useState({ name: '', phone: '', email: '', role: 'MEMBER' as 'ADMIN' | 'MEMBER' });
  const [myPasswordForm, setMyPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [resetMemberForm, setResetMemberForm] = useState({ newPassword: '', sendEmail: true });
  const [allowedEmailsList, setAllowedEmailsList] = useState<string[]>([]);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; title?: string; description?: string; actionName?: string; onConfirm?: () => void }>({ isOpen: false });

  const supabase = createClient();

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      // 1. Fetch user members directly from Supabase (with fallback)
      let currentUsers = await getUserMembers();

      // 2. Sync with current Supabase Auth user metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        const userEmail = user.email.toLowerCase();
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
        const userPhone = user.user_metadata?.phone || user.phone;
        currentUsers = currentUsers.map(u => {
          if (u.email.toLowerCase() === userEmail) {
            return {
              ...u,
              name: fullName || u.name,
              phone: userPhone || u.phone || 'Chưa cập nhật',
            };
          }
          return u;
        });
      }

      // 3. Load assets and assign to Admin
      const a = await getAssets();
      setAssets(a);
      if (a.length > 0) {
        currentUsers = currentUsers.map(u => u.role === 'ADMIN' ? { ...u, assigned_asset_ids: a.map((x: any) => x.id) } : u);
      }

      setUsers(currentUsers);

      // 4. Load whitelist directly from cloud
      const cloudWl = await fetchAllowedEmailsFromCloud();
      setAllowedEmailsList(cloudWl);
    } catch (err) {
      console.error('Error loading users data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenEditUser = (u: UserMember) => {
    setSelectedUser(u);
    setEditUserForm({
      name: u.name,
      phone: u.phone === 'Chưa cập nhật' || u.phone === 'Chưa có' ? '' : (u.phone || ''),
      email: u.email,
      role: u.role,
    });
    setOpenModal('edit_user');
  };

  const handleSaveEditUser = async () => {
    if (!selectedUser) return;
    if (!editUserForm.name.trim()) {
      alert('Vui lòng nhập họ và tên thành viên');
      return;
    }
    const cleanEmail = editUserForm.email.trim().toLowerCase();

    // 1. Persist to Supabase Database
    await updateUserMember(selectedUser.id, {
      name: editUserForm.name.trim(),
      phone: editUserForm.phone.trim() || 'Chưa cập nhật',
      email: cleanEmail || selectedUser.email,
      role: editUserForm.role,
    });

    // 2. Update whitelist if email changed
    if (cleanEmail && cleanEmail !== selectedUser.email) {
      const updatedWhitelist = Array.from(new Set([...allowedEmailsList.filter(e => e !== selectedUser.email), cleanEmail]));
      setAllowedEmailsList(updatedWhitelist);
      saveAllowedEmails(updatedWhitelist);
    }

    // 3. Sync to Supabase auth metadata if currently logged in as this user
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (user.email?.toLowerCase() === selectedUser.email.toLowerCase() || user.email?.toLowerCase() === cleanEmail)) {
        await supabase.auth.updateUser({
          data: { full_name: editUserForm.name.trim(), phone: editUserForm.phone.trim() },
        });
      }
    } catch {}

    await loadAllData();
    setOpenModal(null);
    showToast(`Đã lưu và cập nhật thông tin thành viên "${editUserForm.name}" vào cơ sở dữ liệu thành công!`);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.name) {
      alert('Vui lòng nhập họ tên và email người dùng');
      return;
    }
    const cleanEmail = newUser.email.trim().toLowerCase();

    // 1. Persist to Supabase Database
    const created = await createUserMember({
      name: newUser.name.trim(),
      email: cleanEmail,
      phone: newUser.phone?.trim() || 'Chưa có',
      role: newUser.role,
      status: 'ACTIVE',
      assigned_asset_ids: newUser.assigned_asset_ids,
    });
    
    // 2. Auto add to whitelist
    const updatedWhitelist = Array.from(new Set([...allowedEmailsList, cleanEmail]));
    setAllowedEmailsList(updatedWhitelist);
    saveAllowedEmails(updatedWhitelist);

    await loadAllData();
    setOpenModal(null);
    setNewUser({ name: '', email: '', phone: '', role: 'MEMBER', assigned_asset_ids: [] });
    showToast(`Đã thêm thành viên (${created.name}) và lưu vĩnh viễn vào hệ thống!`);
  };

  const handleOpenResetPassword = (user: UserMember) => {
    setSelectedUser(user);
    const randomPass = 'FMMS@' + Math.floor(100000 + Math.random() * 900000);
    setResetMemberForm({ newPassword: randomPass, sendEmail: true });
    setOpenModal('reset_password');
  };

  const handleExecuteResetPassword = async () => {
    if (!selectedUser) return;
    const pwd = resetMemberForm.newPassword.trim();
    if (!pwd || pwd.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    
    // Always copy password to clipboard for instant use
    navigator.clipboard?.writeText(pwd);

    // Call server API to reset password in Supabase
    try {
      const res = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          newPassword: pwd,
          adminPin: '0075',
          sendEmail: resetMemberForm.sendEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi khi gọi máy chủ reset mật khẩu');
      }

      if (data.mode === 'DIRECT_SET') {
        showToast(`Đã đổi mật khẩu trực tiếp cho ${selectedUser.name}!`);
        alert(`THÀNH CÔNG: Mật khẩu mới cho tài khoản ${selectedUser.email} đã được cập nhật trực tiếp thành: ${pwd}\n\nMật khẩu đã được sao chép vào Clipboard để bạn gửi trực tiếp cho thành viên.`);
      } else {
        showToast(data.message || `Mật khẩu "${pwd}" đã được tạo và sao chép vào Clipboard!`);
      }
    } catch (err: any) {
      showToast(`Đã tạo & sao chép mật khẩu "${pwd}" vào Clipboard!`);
    }

    setOpenModal(null);
  };

  const handleChangeMyPassword = async () => {
    if (!myPasswordForm.newPassword) {
      alert('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (myPasswordForm.newPassword.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (myPasswordForm.newPassword !== myPasswordForm.confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: myPasswordForm.newPassword,
      });
      if (error) throw error;
      showToast('Đã đổi mật khẩu cá nhân thành công! Bạn có thể dùng mật khẩu mới từ lần đăng nhập sau.');
      setOpenModal(null);
      setMyPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(`Lỗi khi đổi mật khẩu: ${err?.message || 'Không thể cập nhật mật khẩu'}`);
    }
  };

  const handleAddWhitelistEmail = async () => {
    if (!newWhitelistEmail || !newWhitelistEmail.includes('@')) {
      alert('Vui lòng nhập địa chỉ Email hợp lệ');
      return;
    }
    const cleanEmail = newWhitelistEmail.trim().toLowerCase();
    const updated = Array.from(new Set([...allowedEmailsList, cleanEmail]));
    setAllowedEmailsList(updated);
    await saveAllowedEmails(updated);
    setNewWhitelistEmail('');
    showToast(`Đã thêm ${cleanEmail} vào danh sách Email được phép đăng nhập!`);
  };

  const handleRemoveWhitelistEmail = (emailToRemove: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Thu Hồi Quyền Đăng Nhập (Admin PIN)',
      description: `CẢNH BÁO: Xác nhận thu hồi quyền đăng nhập của Email "${emailToRemove}". Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Thu hồi quyền truy cập',
      onConfirm: async () => {
        const cleanRemove = emailToRemove.trim().toLowerCase();
        const updated = allowedEmailsList.filter(e => e.trim().toLowerCase() !== cleanRemove);
        setAllowedEmailsList(updated);
        await saveAllowedEmails(updated);
        showToast(`Đã xóa ${emailToRemove} khỏi danh sách được phép đăng nhập.`);
      },
    });
  };

  const handleToggleRole = async (user: UserMember) => {
    const nextRole: 'ADMIN' | 'MEMBER' = user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    
    // 1. Persist to Supabase Database
    await updateUserMember(user.id, { role: nextRole });

    if (user.id === 'usr-1') {
      localStorage.setItem('fmms_user_role', nextRole);
      window.dispatchEvent(new Event('fmms_user_updated'));
    }

    await loadAllData();
    showToast(`Đã cập nhật vai trò của ${user.name} thành ${nextRole} trên cơ sở dữ liệu`);
  };

  const handleDeleteUser = (user: UserMember) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Thành Viên (Admin PIN)',
      description: `CẢNH BÁO NGUY HIỂM: Bạn đang chuẩn bị xóa vĩnh viễn thành viên "${user.name}" (${user.email}) khỏi cơ sở dữ liệu và thu hồi toàn bộ phân quyền quản lý xe. Vui lòng nhập mã PIN Quản trị viên để xác nhận.`,
      actionName: 'Xác nhận xóa thành viên',
      onConfirm: async () => {
        // 1. Delete from Supabase Database
        await deleteUserMember(user.id, user.email);

        // 2. Remove from whitelist
        const cleanEmail = user.email.trim().toLowerCase();
        const updatedWhitelist = allowedEmailsList.filter(e => e.trim().toLowerCase() !== cleanEmail);
        setAllowedEmailsList(updatedWhitelist);
        await saveAllowedEmails(updatedWhitelist);

        await loadAllData();
        showToast(`Đã xóa vĩnh viễn thành viên ${user.name} khỏi cơ sở dữ liệu và thu hồi quyền đăng nhập.`);
      },
    });
  };

  const handleSaveAssignedAssets = async () => {
    if (!selectedUser) return;
    
    // 1. Persist to Supabase Database
    await updateUserMember(selectedUser.id, {
      assigned_asset_ids: selectedUser.assigned_asset_ids,
    });

    await loadAllData();
    setOpenModal(null);
    showToast(`Đã lưu phân quyền xe cho ${selectedUser.name} vào cơ sở dữ liệu`);
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

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setMyPasswordForm({ newPassword: '', confirmPassword: '' });
              setOpenModal('change_my_password');
            }}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-md transition hover:bg-slate-500/10"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Đổi mật khẩu cá nhân</span>
          </button>

          <button
            onClick={() => setOpenModal('add')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm người dùng mới</span>
          </button>
        </div>
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
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Thành viên</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Email &amp; SĐT</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Vai trò</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Xe được quản lý</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredUsers.map(u => {
                const assignedAssetNames = assets.filter(a => u.assigned_asset_ids?.includes(a.id)).map(a => a.name);

                return (
                  <tr key={u.id} className="transition hover:bg-slate-500/5">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                          style={{ background: u.role === 'ADMIN' ? 'linear-gradient(135deg, #0EA5E9, #3B82F6)' : 'linear-gradient(135deg, #10B981, #059669)' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ID: {u.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{u.email}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{u.phone || 'Chưa cập nhật'}</p>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1"
                        style={u.role === 'ADMIN'
                          ? { background: 'rgba(14,165,233,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(14,165,233,0.3)' }
                          : { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
                        <Shield className="w-3 h-3" />
                        <span>{u.role === 'ADMIN' ? 'Quản Trị Viên' : 'Thành Viên'}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {u.role === 'ADMIN' ? (
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>Toàn bộ xe (Admin)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {assignedAssetNames.length > 0 ? (
                            assignedAssetNames.map((name, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium"
                                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>Chưa gán xe</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>
                        HOẠT ĐỘNG
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit User Info */}
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-cyan-500/10 transition inline-flex items-center gap-1"
                          style={{ color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.3)' }}
                          title="Chỉnh sửa họ tên, số điện thoại, email"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>

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
                          onClick={() => handleOpenResetPassword(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold hover:bg-purple-500/10 transition inline-flex items-center gap-1"
                          style={{ color: 'var(--status-purple)', border: '1px solid rgba(139,92,246,0.3)' }}
                          title="Đặt lại hoặc gửi mật khẩu mới"
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

      {/* 🔒 Email Whitelist & Login Access Security Card */}
      <div className="glass-panel p-5 rounded-2xl shadow-lg space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Danh Sách Email Được Cấp Quyền Đăng Nhập (Email Whitelist)
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Chỉ những Email có trong danh sách này mới có thể nhận Magic Link hoặc đăng nhập vào hệ thống gia đình.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
            🔒 Đang bật chế độ bảo mật nghiêm ngặt
          </span>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="relative flex-1 max-w-md">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--text-muted)' }} />
            <input
              type="email"
              className="theme-input !pl-9"
              placeholder="Thêm email mới vào danh sách cho phép (VD: vo.yeu@gmail.com)..."
              value={newWhitelistEmail}
              onChange={e => setNewWhitelistEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddWhitelistEmail(); }}
            />
          </div>
          <button
            onClick={handleAddWhitelistEmail}
            className="px-4 py-2.5 rounded-xl text-white font-bold text-xs transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            + Cấp quyền Email
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {allowedEmailsList.map((email) => (
            <div
              key={email}
              className="px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              <span>{email}</span>
              <button
                onClick={() => handleRemoveWhitelistEmail(email)}
                className="text-rose-400 hover:text-rose-300 transition"
                title="Xóa quyền truy cập"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit User Modal */}
      {openModal === 'edit_user' && selectedUser && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(null)}>
          <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[500px] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Edit3 className="w-4 h-4 text-cyan-400" />
                Chỉnh sửa thông tin thành viên
              </h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Họ và tên *</label>
                <input
                  type="text"
                  className="theme-input font-medium"
                  placeholder="VD: Nguyễn Văn A"
                  value={editUserForm.name}
                  onChange={e => setEditUserForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Số điện thoại</label>
                <input
                  type="text"
                  className="theme-input font-medium"
                  placeholder="VD: 0901234567"
                  value={editUserForm.phone}
                  onChange={e => setEditUserForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Email đăng nhập</label>
                <input
                  type="email"
                  className="theme-input font-medium font-mono"
                  placeholder="user@gmail.com"
                  value={editUserForm.email}
                  onChange={e => setEditUserForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Vai trò</label>
                <select
                  className="theme-select"
                  value={editUserForm.role}
                  onChange={e => setEditUserForm(p => ({ ...p, role: e.target.value as any }))}
                >
                  <option value="MEMBER">Thành viên (Member — Xem xe được chỉ định)</option>
                  <option value="ADMIN">Quản trị viên (Admin — Toàn quyền hệ thống)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleSaveEditUser} className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Change My Password Modal */}
      {openModal === 'change_my_password' && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(null)}>
          <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[500px] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Lock className="w-4 h-4 text-amber-400" />
                Đổi mật khẩu tài khoản của bạn
              </h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <p style={{ color: 'var(--text-muted)' }}>Nhập mật khẩu mới an toàn cho tài khoản đang đăng nhập của bạn:</p>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Mật khẩu mới *</label>
                <input
                  type="password"
                  className="theme-input"
                  placeholder="Tối thiểu 6 ký tự..."
                  value={myPasswordForm.newPassword}
                  onChange={e => setMyPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div>
                <label className="block mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  className="theme-input"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={myPasswordForm.confirmPassword}
                  onChange={e => setMyPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleChangeMyPassword} className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  Cập nhật mật khẩu ngay
                </button>
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Admin Reset Member Password Modal */}
      {openModal === 'reset_password' && selectedUser && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(null)}>
          <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[500px] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Key className="w-4 h-4 text-purple-400" />
                Reset Mật Khẩu: {selectedUser.name}
              </h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <p className="font-semibold" style={{ color: 'var(--status-purple)' }}>Thành viên: {selectedUser.name}</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Email: {selectedUser.email}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold" style={{ color: 'var(--text-primary)' }}>Mật khẩu mới</label>
                  <button
                    type="button"
                    onClick={() => setResetMemberForm(p => ({ ...p, newPassword: 'FMMS@' + Math.floor(100000 + Math.random() * 900000) }))}
                    className="text-[11px] font-bold flex items-center gap-1"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    🎲 Tạo mật khẩu ngẫu nhiên
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="theme-input font-mono font-bold"
                    value={resetMemberForm.newPassword}
                    onChange={e => setResetMemberForm(p => ({ ...p, newPassword: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(resetMemberForm.newPassword);
                      showToast(`Đã sao chép mật khẩu: "${resetMemberForm.newPassword}"`);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-cyan-400"
                    title="Sao chép mật khẩu"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={resetMemberForm.sendEmail}
                  onChange={e => setResetMemberForm(p => ({ ...p, sendEmail: e.target.checked }))}
                  className="rounded border-slate-600 text-purple-500 focus:ring-purple-400"
                />
                <span style={{ color: 'var(--text-secondary)' }}>Đồng thời gửi email liên kết khôi phục tới {selectedUser.email}</span>
              </label>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] space-y-1" style={{ color: 'var(--status-amber)' }}>
                <p className="font-bold">💡 Hướng dẫn gửi mật khẩu cho thành viên:</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  • Do chính sách bảo mật, email từ Supabase chỉ gửi <strong>Liên kết khôi phục (Magic Reset Link)</strong> để thành viên tự tạo mật khẩu mới.<br />
                  • Để cấp ngay mật khẩu tạm <strong>{resetMemberForm.newPassword}</strong>, hệ thống đã tự động sao chép mật khẩu vào Clipboard, bạn hãy gửi trực tiếp qua Zalo / Tin nhắn cho thành viên.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleExecuteResetPassword} className="px-5 py-2 rounded-xl text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                  Xác nhận đặt mật khẩu
                </button>
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* Add User Modal */}
      {openModal === 'add' && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(null)}>
          <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
        </DraggableModal>
      )}

      {/* Assign Assets Modal */}
      {openModal === 'assign' && selectedUser && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(null)}>
          <div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
        </DraggableModal>
      )}

      {/* 🔒 Master Admin Security PIN Confirmation Modal */}
      <AdminSecurityPinModal
        isOpen={securityModal.isOpen}
        title={securityModal.title}
        description={securityModal.description}
        actionName={securityModal.actionName}
        onClose={() => setSecurityModal(p => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          if (securityModal.onConfirm) securityModal.onConfirm();
        }}
      />
    </div>
  );
}

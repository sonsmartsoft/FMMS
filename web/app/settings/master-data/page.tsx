'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Trash2, Check, Pencil, Sliders, X, Save, Wrench } from 'lucide-react';

export default function MasterDataPage() {
  const [maintCategories, setMaintCategories] = useState<string[]>([
    'Thay dầu máy', 'Thay lọc dầu / Lọc nhớt', 'Thay lọc gió động cơ', 'Thay lọc gió điều hòa',
    'Thay bugi đánh lửa', 'Thay lốp xe', 'Kiểm tra & Thay má phanh', 'Thay ắc-quy', 'Nước làm mát', 'Thay dầu hộp số', 'Sửa chữa & Khác'
  ]);

  const [expCategories, setExpCategories] = useState<string[]>([
    'Nhiên liệu', 'Bảo dưỡng & Sửa chữa', 'Phí cầu đường (BOT)', 'Gửi xe & Bãi đỗ',
    'Rửa xe & Chăm sóc', 'Bảo hiểm vật chất', 'Bảo hiểm TNDS', 'Nâng cấp & Phụ kiện', 'Phạt vi phạm', 'Khác'
  ]);

  const [vendors, setVendors] = useState<string[]>([
    'Mazda Hà Đông', 'Honda Tây Hồ', 'Zestech Việt Nam', 'Bảo hiểm Quân Đội (MIC)', 'Bảo Việt Insurance', 'PV OIL', 'Petrolimex', 'Garage Chuyên Nghiệp'
  ]);

  const [banks, setBanks] = useState<string[]>([
    'Techcombank (TCB)', 'VPBank', 'VIB (Ngân hàng Quốc Tế)', 'TPBank (Tiên Phong)',
    'Shinhan Bank Việt Nam', 'Vietcombank (VCB)', 'BIDV', 'VietinBank',
    'MB Bank (Quân Đội)', 'Sacombank', 'ACB (Á Châu)', 'HDBank', 'MSB (Hàng Hải)', 'Woori Bank / Standard Chartered / HSBC'
  ]);

  // Edit inline modal / state
  const [editingCategory, setEditingCategory] = useState<{ listKey: string; oldVal: string; newVal: string } | null>(null);

  const [newMaint, setNewMaint] = useState('');
  const [newExp, setNewExp] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newBank, setNewBank] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sMaint = localStorage.getItem('fmms_master_maint');
    const sExp = localStorage.getItem('fmms_master_exp');
    const sVendor = localStorage.getItem('fmms_master_vendors');
    const sBank = localStorage.getItem('fmms_master_banks');

    if (sMaint) try { setMaintCategories(JSON.parse(sMaint)); } catch {}
    if (sExp) try { setExpCategories(JSON.parse(sExp)); } catch {}
    if (sVendor) try { setVendors(JSON.parse(sVendor)); } catch {}
    if (sBank) try { setBanks(JSON.parse(sBank)); } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('fmms_master_updated'));
  };

  // Category Add / Delete / Edit handlers
  const addMaint = () => {
    if (!newMaint.trim()) return;
    const updated = [...maintCategories, newMaint.trim()];
    setMaintCategories(updated);
    saveToStorage('fmms_master_maint', updated);
    setNewMaint('');
    showToast('Đã thêm danh mục bảo dưỡng mới!');
  };

  const deleteMaint = (cat: string) => {
    const updated = maintCategories.filter(c => c !== cat);
    setMaintCategories(updated);
    saveToStorage('fmms_master_maint', updated);
    showToast('Đã xóa danh mục bảo dưỡng!');
  };

  const addExp = () => {
    if (!newExp.trim()) return;
    const updated = [...expCategories, newExp.trim()];
    setExpCategories(updated);
    saveToStorage('fmms_master_exp', updated);
    setNewExp('');
    showToast('Đã thêm danh mục chi phí mới!');
  };

  const deleteExp = (cat: string) => {
    const updated = expCategories.filter(c => c !== cat);
    setExpCategories(updated);
    saveToStorage('fmms_master_exp', updated);
    showToast('Đã xóa danh mục chi phí!');
  };

  const addVendor = () => {
    if (!newVendor.trim()) return;
    const updated = [...vendors, newVendor.trim()];
    setVendors(updated);
    saveToStorage('fmms_master_vendors', updated);
    setNewVendor('');
    showToast('Đã thêm nhà cung cấp mới!');
  };

  const deleteVendor = (v: string) => {
    const updated = vendors.filter(x => x !== v);
    setVendors(updated);
    saveToStorage('fmms_master_vendors', updated);
    showToast('Đã xóa nhà cung cấp!');
  };

  const addBank = () => {
    if (!newBank.trim()) return;
    const updated = [...banks, newBank.trim()];
    setBanks(updated);
    saveToStorage('fmms_master_banks', updated);
    setNewBank('');
    showToast('Đã thêm ngân hàng mới!');
  };

  const deleteBank = (b: string) => {
    const updated = banks.filter(x => x !== b);
    setBanks(updated);
    saveToStorage('fmms_master_banks', updated);
    showToast('Đã xóa ngân hàng!');
  };

  const handleSaveInlineEdit = () => {
    if (!editingCategory || !editingCategory.newVal.trim()) return;
    const { listKey, oldVal, newVal } = editingCategory;
    const val = newVal.trim();

    if (listKey === 'maint') {
      const updated = maintCategories.map(c => c === oldVal ? val : c);
      setMaintCategories(updated);
      saveToStorage('fmms_master_maint', updated);
    } else if (listKey === 'exp') {
      const updated = expCategories.map(c => c === oldVal ? val : c);
      setExpCategories(updated);
      saveToStorage('fmms_master_exp', updated);
    } else if (listKey === 'vendor') {
      const updated = vendors.map(c => c === oldVal ? val : c);
      setVendors(updated);
      saveToStorage('fmms_master_vendors', updated);
    } else if (listKey === 'bank') {
      const updated = banks.map(c => c === oldVal ? val : c);
      setBanks(updated);
      saveToStorage('fmms_master_banks', updated);
    }

    setEditingCategory(null);
    showToast('Đã cập nhật tên danh mục thành công!');
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto px-2 sm:px-0">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Link href="/settings" className="p-2 rounded-xl transition hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold flex items-center space-x-2.5" style={{ color: 'var(--text-primary)' }}>
              <Database className="w-6 h-6 text-cyan-400" />
              <span>Quản Lý Danh Mục Master System (Admin CRUD)</span>
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Thêm, sửa, xóa các danh mục bảo dưỡng, loại chi phí và danh sách Đại lý / Garage hệ thống
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="p-4 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setEditingCategory(null)}>
          <div className="glass-panel rounded-2xl w-full max-w-md my-auto p-5 space-y-4 shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Pencil className="w-4 h-4 text-cyan-400" /> Chỉnh sửa tên danh mục
              </h3>
              <button onClick={() => setEditingCategory(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block font-bold" style={{ color: 'var(--text-muted)' }}>Tên danh mục mới</label>
              <input
                type="text"
                className="theme-input text-xs font-semibold"
                value={editingCategory.newVal}
                onChange={e => setEditingCategory({ ...editingCategory, newVal: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
              <button onClick={handleSaveInlineEdit} className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                <Save className="w-4 h-4" /> Lưu tên mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Maintenance Categories Master */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Wrench className="w-4 h-4 text-cyan-400" />
          <span>Danh Mục Bảo Dưỡng &amp; Phụ Tùng (Maintenance &amp; Service Categories)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {maintCategories.map(cat => (
            <span key={cat} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 group transition hover:scale-105" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{cat}</span>
              <div className="flex items-center space-x-1 ml-1 opacity-80 group-hover:opacity-100">
                <button onClick={() => setEditingCategory({ listKey: 'maint', oldVal: cat, newVal: cat })} className="text-cyan-400 hover:text-cyan-300 p-0.5" title="Sửa tên">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteMaint(cat)} className="text-rose-400 hover:text-rose-300 p-0.5" title="Xóa">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Thêm hạng mục bảo dưỡng mới (VD: Thay lọc xăng, Phủ Ceramic)..."
            value={newMaint}
            onChange={e => setNewMaint(e.target.value)}
          />
          <button onClick={addMaint} className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>

      {/* 2. Expense Categories Master */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Danh Mục Chi Phí (Expense Categories)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {expCategories.map(cat => (
            <span key={cat} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 group transition hover:scale-105" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{cat}</span>
              <div className="flex items-center space-x-1 ml-1 opacity-80 group-hover:opacity-100">
                <button onClick={() => setEditingCategory({ listKey: 'exp', oldVal: cat, newVal: cat })} className="text-cyan-400 hover:text-cyan-300 p-0.5" title="Sửa tên">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteExp(cat)} className="text-rose-400 hover:text-rose-300 p-0.5" title="Xóa">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Tên loại chi phí mới (VD: Phạt phạt vi phạm, Đăng kiểm)..."
            value={newExp}
            onChange={e => setNewExp(e.target.value)}
          />
          <button onClick={addExp} className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>

      {/* 3. Vendor / Garage Master */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Danh Sách Đại Lý / Garage / Cây Xăng (Vendors &amp; Service Providers)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {vendors.map(v => (
            <span key={v} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 group transition hover:scale-105" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{v}</span>
              <div className="flex items-center space-x-1 ml-1 opacity-80 group-hover:opacity-100">
                <button onClick={() => setEditingCategory({ listKey: 'vendor', oldVal: v, newVal: v })} className="text-cyan-400 hover:text-cyan-300 p-0.5" title="Sửa tên">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteVendor(v)} className="text-rose-400 hover:text-rose-300 p-0.5" title="Xóa">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Tên Đại lý / Garage / Cây xăng mới..."
            value={newVendor}
            onChange={e => setNewVendor(e.target.value)}
          />
          <button onClick={addVendor} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>

      {/* 4. Bank Providers Master */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>Danh Sách Ngân Hàng Vay Mua Xe (Bank Providers for Auto Loans)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {banks.map(b => (
            <span key={b} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 group transition hover:scale-105" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{b}</span>
              <div className="flex items-center space-x-1 ml-1 opacity-80 group-hover:opacity-100">
                <button onClick={() => setEditingCategory({ listKey: 'bank', oldVal: b, newVal: b })} className="text-cyan-400 hover:text-cyan-300 p-0.5" title="Sửa tên">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => deleteBank(b)} className="text-rose-400 hover:text-rose-300 p-0.5" title="Xóa">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Thêm ngân hàng mới (VD: Vietcombank, Standard Chartered)..."
            value={newBank}
            onChange={e => setNewBank(e.target.value)}
          />
          <button onClick={addBank} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

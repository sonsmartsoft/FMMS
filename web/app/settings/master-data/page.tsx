'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Trash2, Check, Pencil, Sliders } from 'lucide-react';

export default function MasterDataPage() {
  const [maintCategories, setMaintCategories] = useState<string[]>([
    'Thay dầu máy', 'Thay lọc dầu', 'Thay lốp xe', 'Thay phanh', 'Kiểm tra định kỳ',
    'Thay ắc-quy', 'Vệ sinh hệ thống làm mát', 'Cân thước lái', 'Phủ Ceramic', 'Khác'
  ]);

  const [expCategories, setExpCategories] = useState<string[]>([
    'Nhiên liệu', 'Bảo dưỡng & Sửa chữa', 'Phí cầu đường (BOT)', 'Gửi xe & Bãi đỗ',
    'Rửa xe & Chăm sóc', 'Bảo hiểm vật chất', 'Bảo hiểm TNDS', 'Nâng cấp & Phụ kiện', 'Phạt vi phạm', 'Khác'
  ]);

  const [vendors, setVendors] = useState<string[]>([
    'Mazda Hà Đông', 'Mazda Giải Phóng', 'Zestech Việt Nam', 'Bảo Việt Insurance', 'PV OIL', 'Petrolimex', 'Garagi Chuyên Nghiệp'
  ]);

  const [newMaint, setNewMaint] = useState('');
  const [newExp, setNewExp] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const sMaint = localStorage.getItem('fmms_master_maint');
    const sExp = localStorage.getItem('fmms_master_exp');
    const sVendor = localStorage.getItem('fmms_master_vendors');

    if (sMaint) try { setMaintCategories(JSON.parse(sMaint)); } catch {}
    if (sExp) try { setExpCategories(JSON.parse(sExp)); } catch {}
    if (sVendor) try { setVendors(JSON.parse(sVendor)); } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

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
    showToast('Đã xóa danh mục!');
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

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/settings" className="p-2 rounded-xl transition hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold flex items-center space-x-2.5" style={{ color: 'var(--text-primary)' }}>
              <Database className="w-6 h-6 text-cyan-400" />
              <span>Quản Lý Danh Mục &amp; Master Data Hệ Thống (Admin Edit)</span>
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Tùy chỉnh danh mục bảo dưỡng, danh mục chi phí và danh sách Đại lý / Garage cho phép người dùng chọn
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

      {/* 1. Maintenance Categories Master */}
      <div className="glass-panel p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Danh Mục Bảo Dưỡng &amp; Sửa Chữa (Maintenance Categories)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {maintCategories.map(cat => (
            <span key={cat} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{cat}</span>
              <button onClick={() => deleteMaint(cat)} className="text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Tên danh mục bảo dưỡng mới..."
            value={newMaint}
            onChange={e => setNewMaint(e.target.value)}
          />
          <button onClick={addMaint} className="px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>

      {/* 2. Expense Categories Master */}
      <div className="glass-panel p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Danh Mục Chi Phí (Expense Categories)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {expCategories.map(cat => (
            <span key={cat} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{cat}</span>
              <button onClick={() => deleteExp(cat)} className="text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Tên loại chi phí mới..."
            value={newExp}
            onChange={e => setNewExp(e.target.value)}
          />
          <button onClick={addExp} className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>

      {/* 3. Vendor / Garage Master */}
      <div className="glass-panel p-6 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
        <h3 className="font-extrabold text-sm flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span>Danh Sách Đại Lý / Garage / Nhà Cung Cấp (Vendor Master)</span>
        </h3>

        <div className="flex flex-wrap gap-2">
          {vendors.map(v => (
            <span key={v} className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
              <span>{v}</span>
              <button onClick={() => deleteVendor(v)} className="text-rose-400 hover:text-rose-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-2 max-w-md pt-2">
          <input
            type="text"
            className="theme-input text-xs"
            placeholder="Tên Đại lý / Garage mới..."
            value={newVendor}
            onChange={e => setNewVendor(e.target.value)}
          />
          <button onClick={addVendor} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition">
            <Plus className="w-4 h-4 inline mr-1" />Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

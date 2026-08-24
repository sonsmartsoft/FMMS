'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Plus, Trash2, Check, Pencil, Sliders, X, Save, Wrench } from 'lucide-react';

import { TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';

export default function MasterDataPage() {
  const [taxonomy, setTaxonomy] = useState<Record<string, { label: string; subcategories: Record<string, string> }>>(TAXONOMY);
  const [selectedCatKey, setSelectedCatKey] = useState<string>('Upgrade');
  const [newSubKey, setNewSubKey] = useState('');
  const [newSubLabel, setNewSubLabel] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [editingSub, setEditingSub] = useState<{ catKey: string; subKey: string; oldLabel: string; newLabel: string } | null>(null);

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
    setTaxonomy(getDynamicTaxonomy());
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

  const saveTaxonomy = (updatedTax: typeof taxonomy) => {
    setTaxonomy(updatedTax);
    saveToStorage('fmms_master_taxonomy', updatedTax);
    showToast('Đã cập nhật cấu hình danh mục 2 tầng thành công!');
  };

  const handleAddCategory = () => {
    if (!newCatKey.trim() || !newCatLabel.trim()) return;
    const key = newCatKey.trim();
    const updated = {
      ...taxonomy,
      [key]: {
        label: newCatLabel.trim(),
        subcategories: { Other: 'Khác' },
      }
    };
    saveTaxonomy(updated);
    setNewCatKey('');
    setNewCatLabel('');
    setSelectedCatKey(key);
  };

  const handleDeleteCategory = (catKey: string) => {
    if (Object.keys(taxonomy).length <= 1) {
      alert('Phải giữ lại ít nhất 1 danh mục chính');
      return;
    }
    if (!confirm(`Xóa danh mục chính "${taxonomy[catKey]?.label}"?`)) return;
    const updated = { ...taxonomy };
    delete updated[catKey];
    saveTaxonomy(updated);
    setSelectedCatKey(Object.keys(updated)[0]);
  };

  const handleAddSubCategory = () => {
    if (!newSubKey.trim() || !newSubLabel.trim() || !selectedCatKey) return;
    const subK = newSubKey.trim();
    const subL = newSubLabel.trim();
    const catObj = taxonomy[selectedCatKey];
    if (!catObj) return;

    const updated = {
      ...taxonomy,
      [selectedCatKey]: {
        ...catObj,
        subcategories: {
          ...catObj.subcategories,
          [subK]: subL,
        }
      }
    };
    saveTaxonomy(updated);
    setNewSubKey('');
    setNewSubLabel('');
  };

  const handleDeleteSubCategory = (catKey: string, subKey: string) => {
    const catObj = taxonomy[catKey];
    if (!catObj) return;
    if (!confirm(`Xóa danh mục con "${catObj.subcategories[subKey]}"?`)) return;
    const newSubMap = { ...catObj.subcategories };
    delete newSubMap[subKey];

    const updated = {
      ...taxonomy,
      [catKey]: {
        ...catObj,
        subcategories: newSubMap,
      }
    };
    saveTaxonomy(updated);
  };

  const handleSaveSubEdit = () => {
    if (!editingSub || !editingSub.newLabel.trim()) return;
    const { catKey, subKey, newLabel } = editingSub;
    const catObj = taxonomy[catKey];
    if (!catObj) return;

    const updated = {
      ...taxonomy,
      [catKey]: {
        ...catObj,
        subcategories: {
          ...catObj.subcategories,
          [subKey]: newLabel.trim(),
        }
      }
    };
    saveTaxonomy(updated);
    setEditingSub(null);
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
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setEditingCategory(null)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
      {/* Edit SubCategory Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setEditingSub(null)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Pencil className="w-4 h-4 text-cyan-400" /> Chỉnh sửa tên danh mục con ({editingSub.subKey})
              </h3>
              <button onClick={() => setEditingSub(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block font-bold" style={{ color: 'var(--text-muted)' }}>Tên hiển thị mới</label>
              <input
                type="text"
                className="theme-input text-xs font-semibold"
                value={editingSub.newLabel}
                onChange={e => setEditingSub({ ...editingSub, newLabel: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setEditingSub(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>Hủy</button>
              <button onClick={handleSaveSubEdit} className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                <Save className="w-4 h-4" /> Lưu nhãn mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 0. Admin 2-Tier Taxonomy Manager (Category & SubCategory) ─── */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-6 shadow-xl" style={{ border: '2px solid rgba(14,165,233,0.3)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
          <div>
            <h2 className="text-base font-extrabold flex items-center space-x-2 text-cyan-400">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Cấu Hình Danh Mục Chi Phí 2 Tầng (Category &amp; SubCategory Admin)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Cấu hình trực tiếp toàn bộ Danh mục lớn &amp; Danh mục con hiển thị trong Form Thêm / Sửa Chi Phí
            </p>
          </div>
        </div>

        {/* Categories Tab Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>1. Chọn Danh mục chính (Category)</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(taxonomy).map(([catKey, catVal]) => {
              const isSelected = catKey === selectedCatKey;
              return (
                <div key={catKey} className="flex items-center">
                  <button
                    onClick={() => setSelectedCatKey(catKey)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                    style={isSelected
                      ? { background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', color: '#fff' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  >
                    <span>{catVal.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({catKey})</span>
                  </button>
                  {Object.keys(taxonomy).length > 1 && (
                    <button
                      onClick={() => handleDeleteCategory(catKey)}
                      className="ml-1 text-rose-400 hover:text-rose-300 p-1 transition"
                      title="Xóa danh mục chính"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Category SubCategories List */}
        {selectedCatKey && taxonomy[selectedCatKey] && (
          <div className="p-4 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-xs flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                <span>📂 Danh mục con thuộc nhóm:</span>
                <span className="text-cyan-400 font-extrabold">{taxonomy[selectedCatKey].label}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(taxonomy[selectedCatKey].subcategories || {}).map(([subKey, subLabel]) => (
                <div key={subKey} className="p-3 rounded-xl flex items-center justify-between space-x-2 group transition" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{subLabel}</p>
                    <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Mã: {subKey}</p>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => setEditingSub({ catKey: selectedCatKey, subKey, oldLabel: subLabel, newLabel: subLabel })}
                      className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15 transition"
                      title="Sửa tên hiển thị"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubCategory(selectedCatKey, subKey)}
                      className="p-1 rounded text-rose-400 hover:bg-rose-500/15 transition"
                      title="Xóa danh mục con"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Form Add SubCategory */}
            <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Thêm danh mục con mới vào nhóm {selectedCatKey}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  className="theme-input text-xs font-mono"
                  placeholder="Mã danh mục (VD: Tire, BodyKit)..."
                  value={newSubKey}
                  onChange={e => setNewSubKey(e.target.value)}
                />
                <input
                  type="text"
                  className="theme-input text-xs"
                  placeholder="Tên hiển thị tiếng Việt (VD: Thay lốp xe)..."
                  value={newSubLabel}
                  onChange={e => setNewSubLabel(e.target.value)}
                />
                <button onClick={handleAddSubCategory} className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold shrink-0 hover:opacity-90 transition flex items-center justify-center space-x-1">
                  <Plus className="w-4 h-4" /><span>Thêm danh mục con</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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

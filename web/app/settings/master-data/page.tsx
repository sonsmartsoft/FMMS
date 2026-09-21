'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Database,
  Plus,
  Trash2,
  Check,
  Pencil,
  Sliders,
  X,
  Save,
  Wrench,
  FolderPlus,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronRight,
  Layers,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';

import {
  TransactionCategory,
  TransactionType,
  BudgetBucket,
} from '@/types/finance';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  resetToDefaultCategories,
} from '@/lib/services/familyFinanceService';
import { SAMPLE_FAMILY_CATEGORIES } from '@/lib/data/sampleFinanceCategories';

import { TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import {
  getMasterMaintenanceCategories,
  saveMasterMaintenanceCategories,
  getMasterExpenseCategories,
  saveMasterExpenseCategories,
  getMasterVendors,
  saveMasterVendors,
  getMasterBanks,
  saveMasterBanks,
  getMasterTaxonomy,
  saveMasterTaxonomy,
  DEFAULT_MAINT_CATEGORIES,
  DEFAULT_EXP_CATEGORIES,
  DEFAULT_VENDORS,
  DEFAULT_BANKS,
} from '@/lib/services/masterDataService';
import DraggableModal from '@/components/ui/DraggableModal';
import AdminSecurityPinModal from '@/components/security/AdminSecurityPinModal';

export default function MasterDataPage() {
  const [taxonomy, setTaxonomy] = useState<Record<string, { label: string; subcategories: Record<string, string> }>>(TAXONOMY);
  const [selectedCatKey, setSelectedCatKey] = useState<string>('Upgrade');
  const [newSubKey, setNewSubKey] = useState('');
  const [newSubLabel, setNewSubLabel] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [editingSub, setEditingSub] = useState<{ catKey: string; subKey: string; oldLabel: string; newLabel: string } | null>(null);

  const [maintCategories, setMaintCategories] = useState<string[]>(DEFAULT_MAINT_CATEGORIES);
  const [expCategories, setExpCategories] = useState<string[]>(DEFAULT_EXP_CATEGORIES);
  const [vendors, setVendors] = useState<string[]>(DEFAULT_VENDORS);
  const [banks, setBanks] = useState<string[]>(DEFAULT_BANKS);

  // Edit inline modal / state
  const [editingCategory, setEditingCategory] = useState<{ listKey: string; oldVal: string; newVal: string } | null>(null);

  const [newMaint, setNewMaint] = useState('');
  const [newExp, setNewExp] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newBank, setNewBank] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; title?: string; description?: string; actionName?: string; onConfirm?: () => void }>({ isOpen: false });

  // Family Finance Master Categories State
  const [financeCategories, setFinanceCategories] = useState<TransactionCategory[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('EXPENSE');
  const [newCatBucket, setNewCatBucket] = useState<BudgetBucket>('NECESSITY');
  const [newCatIsEssential, setNewCatIsEssential] = useState(true);
  const [newCatColor, setNewCatColor] = useState('#06b6d4');
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [editingFinanceCat, setEditingFinanceCat] = useState<TransactionCategory | null>(null);
  const [filterCatType, setFilterCatType] = useState<'ALL' | TransactionType>('ALL');

  const loadAllMasterData = async () => {
    try {
      const [maint, exp, vend, bnk, tax, fCats] = await Promise.all([
        getMasterMaintenanceCategories(),
        getMasterExpenseCategories(),
        getMasterVendors(),
        getMasterBanks(),
        getMasterTaxonomy(),
        getCategories(),
      ]);
      setMaintCategories(maint);
      setExpCategories(exp);
      setVendors(vend);
      setBanks(bnk);
      setTaxonomy(tax);
      setFinanceCategories(fCats);
      if (fCats.length > 0) {
        const firstParent = fCats.find((c) => !c.parent_id);
        if (firstParent) setSelectedParentId(firstParent.id);
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  useEffect(() => {
    loadAllMasterData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Category Add / Delete / Edit handlers
  const addMaint = async () => {
    if (!newMaint.trim()) return;
    const updated = [...maintCategories, newMaint.trim()];
    setMaintCategories(updated);
    await saveMasterMaintenanceCategories(updated);
    setNewMaint('');
    showToast('Đã thêm danh mục bảo dưỡng mới và lưu lên Cloud!');
  };

  const deleteMaint = (cat: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Danh Mục Bảo Dưỡng (Admin PIN)',
      description: `Xác nhận xóa danh mục bảo dưỡng "${cat}" khỏi hệ thống dữ liệu dùng chung. Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa danh mục',
      onConfirm: async () => {
        const updated = maintCategories.filter(c => c !== cat);
        setMaintCategories(updated);
        await saveMasterMaintenanceCategories(updated);
        showToast('Đã xóa danh mục bảo dưỡng khỏi hệ thống!');
      },
    });
  };

  const addExp = async () => {
    if (!newExp.trim()) return;
    const updated = [...expCategories, newExp.trim()];
    setExpCategories(updated);
    await saveMasterExpenseCategories(updated);
    setNewExp('');
    showToast('Đã thêm danh mục chi phí mới và lưu lên Cloud!');
  };

  const deleteExp = (cat: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Danh Mục Chi Phí (Admin PIN)',
      description: `Xác nhận xóa danh mục chi phí "${cat}" khỏi hệ thống dữ liệu dùng chung. Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa danh mục',
      onConfirm: async () => {
        const updated = expCategories.filter(c => c !== cat);
        setExpCategories(updated);
        await saveMasterExpenseCategories(updated);
        showToast('Đã xóa danh mục chi phí khỏi hệ thống!');
      },
    });
  };

  const addVendor = async () => {
    if (!newVendor.trim()) return;
    const updated = [...vendors, newVendor.trim()];
    setVendors(updated);
    await saveMasterVendors(updated);
    setNewVendor('');
    showToast('Đã thêm nhà cung cấp mới và lưu lên Cloud!');
  };

  const deleteVendor = (v: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Nhà Cung Cấp / Garage (Admin PIN)',
      description: `Xác nhận xóa nhà cung cấp / đối tác "${v}". Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa nhà cung cấp',
      onConfirm: async () => {
        const updated = vendors.filter(x => x !== v);
        setVendors(updated);
        await saveMasterVendors(updated);
        showToast('Đã xóa nhà cung cấp khỏi hệ thống!');
      },
    });
  };

  const addBank = async () => {
    if (!newBank.trim()) return;
    const updated = [...banks, newBank.trim()];
    setBanks(updated);
    await saveMasterBanks(updated);
    setNewBank('');
    showToast('Đã thêm ngân hàng mới và lưu lên Cloud!');
  };

  const deleteBank = (b: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Ngân Hàng Đối Tác (Admin PIN)',
      description: `Xác nhận xóa ngân hàng đối tác "${b}". Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa ngân hàng',
      onConfirm: async () => {
        const updated = banks.filter(x => x !== b);
        setBanks(updated);
        await saveMasterBanks(updated);
        showToast('Đã xóa ngân hàng khỏi hệ thống!');
      },
    });
  };

  const handleSaveInlineEdit = async () => {
    if (!editingCategory || !editingCategory.newVal.trim()) return;
    const { listKey, oldVal, newVal } = editingCategory;
    const val = newVal.trim();

    if (listKey === 'maint') {
      const updated = maintCategories.map(c => c === oldVal ? val : c);
      setMaintCategories(updated);
      await saveMasterMaintenanceCategories(updated);
    } else if (listKey === 'exp') {
      const updated = expCategories.map(c => c === oldVal ? val : c);
      setExpCategories(updated);
      await saveMasterExpenseCategories(updated);
    } else if (listKey === 'vendor') {
      const updated = vendors.map(c => c === oldVal ? val : c);
      setVendors(updated);
      await saveMasterVendors(updated);
    } else if (listKey === 'bank') {
      const updated = banks.map(c => c === oldVal ? val : c);
      setBanks(updated);
      await saveMasterBanks(updated);
    }

    setEditingCategory(null);
    showToast('Đã cập nhật tên danh mục thành công!');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Family Finance Master Category Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const refreshFinanceCategories = async () => {
    setFinanceLoading(true);
    try {
      const cats = await getCategories();
      setFinanceCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setFinanceLoading(false);
    }
  };

  const handleCreateFinanceCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      await createCategory({
        name: newCatName.trim(),
        type: newCatType,
        parent_id: newCatParentId ? newCatParentId : null,
        budget_bucket: newCatBucket,
        is_essential: newCatIsEssential,
        color: newCatColor,
        icon: 'Tag',
        is_system: false,
        display_order: financeCategories.length + 1,
      });

      setNewCatName('');
      setNewCatParentId('');
      showToast('Đã thêm danh mục thu chi mới thành công!');
      await refreshFinanceCategories();
    } catch (err) {
      alert('Không thể tạo danh mục: ' + (err as any)?.message);
    }
  };

  const handleUpdateFinanceCategory = async (cat: TransactionCategory) => {
    try {
      await updateCategory(cat.id, {
        name: cat.name,
        color: cat.color,
        budget_bucket: cat.budget_bucket,
        is_essential: cat.is_essential,
      });
      setEditingFinanceCat(null);
      showToast('Đã cập nhật danh mục thành công!');
      await refreshFinanceCategories();
    } catch (err) {
      alert('Cập nhật thất bại: ' + (err as any)?.message);
    }
  };

  const handleDeleteFinanceCategory = (cat: TransactionCategory) => {
    const isParent = !cat.parent_id;
    setSecurityModal({
      isOpen: true,
      title: isParent
        ? `Xác thực Xóa Danh Mục Mẹ "${cat.name}"`
        : `Xác thực Xóa Danh Mục Con "${cat.name}"`,
      description: isParent
        ? `CẢNH BÁO: Xóa danh mục mẹ "${cat.name}" sẽ xóa hoặc tách toàn bộ danh mục con trực thuộc. Vui lòng nhập mã PIN Admin để tiếp tục.`
        : `Xác nhận xóa danh mục con "${cat.name}". Vui lòng nhập mã PIN Admin để tiếp tục.`,
      actionName: 'Xóa danh mục',
      onConfirm: async () => {
        try {
          await deleteCategory(cat.id);
          showToast(`Đã xóa danh mục "${cat.name}" khỏi hệ thống!`);
          await refreshFinanceCategories();
        } catch (err) {
          alert('Xóa danh mục thất bại: ' + (err as any)?.message);
        }
      },
    });
  };

  const handleResetDefaultFinanceCategories = () => {
    setSecurityModal({
      isOpen: true,
      title: 'Khôi phục Bộ Danh Mục Thu Chi Mẫu Chuẩn Gia Đình',
      description:
        'Thao tác này sẽ nạp lại đầy đủ cây danh mục thu chi gia đình Việt chuẩn (Ăn uống, Nhà cửa, Xe cộ, Giáo dục, Y tế, Du lịch, Trả nợ...). Vui lòng nhập mã PIN Admin để xác nhận.',
      actionName: 'Nạp danh mục mẫu',
      onConfirm: async () => {
        try {
          const res = await resetToDefaultCategories();
          setFinanceCategories(res);
          showToast('Đã nạp toàn bộ cây danh mục thu chi mẫu chuẩn thành công!');
        } catch (err) {
          alert('Nạp danh mục mẫu thất bại: ' + (err as any)?.message);
        }
      },
    });
  };

  const saveTaxonomy = async (updatedTax: typeof taxonomy) => {
    setTaxonomy(updatedTax);
    await saveMasterTaxonomy(updatedTax);
    showToast('Đã cập nhật cấu hình danh mục 2 tầng lên Cloud thành công!');
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
    const catLabel = taxonomy[catKey]?.label || catKey;
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Danh Mục Chính (Admin PIN)',
      description: `CẢNH BÁO: Bạn đang chuẩn bị xóa toàn bộ danh mục chính "${catLabel}" cùng các phân loại con bên trong. Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa danh mục chính',
      onConfirm: () => {
        const updated = { ...taxonomy };
        delete updated[catKey];
        saveTaxonomy(updated);
        setSelectedCatKey(Object.keys(updated)[0]);
        showToast(`Đã xóa danh mục chính ${catLabel}!`);
      },
    });
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
    const subLabel = catObj.subcategories[subKey] || subKey;
    setSecurityModal({
      isOpen: true,
      title: 'Xác thực Xóa Phân Loại Con (Admin PIN)',
      description: `Xác nhận xóa phân loại con "${subLabel}" khỏi danh mục "${catObj.label}". Vui lòng nhập mã PIN Quản trị viên để tiếp tục.`,
      actionName: 'Xóa phân loại con',
      onConfirm: () => {
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
        showToast(`✅ Đã xóa phân loại con ${subLabel}!`);
      },
    });
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
        <DraggableModal isOpen={true} onClose={() => setEditingCategory(null)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-md p-5 space-y-4 shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
</DraggableModal>

      )}
      {/* Edit SubCategory Modal */}
      {editingSub && (
        <DraggableModal isOpen={true} onClose={() => setEditingSub(null)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-md p-5 space-y-4 shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
</DraggableModal>

      )}

      {/* Edit Finance Category Modal */}
      {editingFinanceCat && (
        <DraggableModal isOpen={true} onClose={() => setEditingFinanceCat(null)}>
          <div
            className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[500px] max-w-md p-5 space-y-4 shadow-2xl"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Pencil className="w-4 h-4 text-cyan-400" />
                <span>Chỉnh sửa danh mục: {editingFinanceCat.name}</span>
              </h3>
              <button onClick={() => setEditingFinanceCat(null)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Tên danh mục
                </label>
                <input
                  type="text"
                  className="theme-input text-xs font-semibold w-full"
                  value={editingFinanceCat.name}
                  onChange={(e) => setEditingFinanceCat({ ...editingFinanceCat, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                    Hũ ngân sách (6 Jars)
                  </label>
                  <select
                    className="theme-input text-xs w-full"
                    value={editingFinanceCat.budget_bucket || 'NECESSITY'}
                    onChange={(e) => setEditingFinanceCat({ ...editingFinanceCat, budget_bucket: e.target.value as any })}
                  >
                    <option value="NECESSITY">Thiết yếu (NEC - 55%)</option>
                    <option value="SAVINGS">Tiết kiệm (LTSS - 10%)</option>
                    <option value="EDUCATION">Giáo dục (EDU - 10%)</option>
                    <option value="PLAY">Hưởng thụ (PLAY - 10%)</option>
                    <option value="INVESTMENT">Tự do TC (FFA - 10%)</option>
                    <option value="GIVE">Cho đi (GIVE - 5%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                    Quy tắc 50/30/20
                  </label>
                  <select
                    className="theme-input text-xs w-full"
                    value={editingFinanceCat.is_essential ? 'true' : 'false'}
                    onChange={(e) => setEditingFinanceCat({ ...editingFinanceCat, is_essential: e.target.value === 'true' })}
                  >
                    <option value="true">Thiết yếu (Needs 50%)</option>
                    <option value="false">Sở thích / Hưởng thụ (Wants 30%)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  Mã màu nhận diện
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer p-0"
                    value={editingFinanceCat.color || '#06b6d4'}
                    onChange={(e) => setEditingFinanceCat({ ...editingFinanceCat, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="theme-input text-xs font-mono flex-1"
                    value={editingFinanceCat.color || '#06b6d4'}
                    onChange={(e) => setEditingFinanceCat({ ...editingFinanceCat, color: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <button
                onClick={() => setEditingFinanceCat(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}
              >
                Hủy
              </button>
              <button
                onClick={() => handleUpdateFinanceCategory(editingFinanceCat)}
                className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* ─── 0.1 MASTER DANH MỤC THU CHI GIA ĐÌNH TOÀN DIỆN (FFMS FINANCE TREE) ─── */}
      <div
        className="glass-panel p-5 sm:p-6 rounded-2xl space-y-6 shadow-xl"
        style={{
          border: '2px solid rgba(16, 185, 129, 0.4)',
          background: 'var(--bg-primary)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-black text-emerald-400">
                Cấu Hình Danh Mục Thu Chi Master Gia Đình (Phân Tầng Mẹ &amp; Con)
              </h2>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Quản lý danh mục cha (mẹ) và các tiểu mục con tương ứng, hỗ trợ chuẩn 6 Chiếc Hũ &amp; Quy tắc 50/30/20. Không bị lẫn lộn giữa mẹ và con.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaultFinanceCategories}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all active:scale-95"
              title="Khôi phục cây danh mục mẫu chuẩn gia đình Việt"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nạp danh mục mẫu chuẩn</span>
            </button>
          </div>
        </div>

        {/* Filter by Type: EXPENSE / INCOME / TRANSFER / ALL */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setFilterCatType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterCatType === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả loại ({financeCategories.length})
            </button>
            <button
              onClick={() => setFilterCatType('EXPENSE')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterCatType === 'EXPENSE'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chi tiêu
            </button>
            <button
              onClick={() => setFilterCatType('INCOME')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterCatType === 'INCOME'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Thu nhập
            </button>
            <button
              onClick={() => setFilterCatType('TRANSFER')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterCatType === 'TRANSFER'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chuyển tiền
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            Click vào Danh mục Mẹ để xem danh sách Danh mục Con bên trong
          </span>
        </div>

        {/* 2-Column Parent-Child Tree View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: DANH MỤC MẸ (PARENTS) */}
          <div
            className="lg:col-span-5 p-4 rounded-2xl space-y-3"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-extrabold text-xs flex items-center space-x-2 text-emerald-400 uppercase tracking-wide">
                <FolderPlus className="w-4 h-4" />
                <span>1. Danh mục mẹ (Parent Categories)</span>
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400">
                {financeCategories.filter((c) => !c.parent_id).length} nhóm
              </span>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {financeCategories
                .filter((c) => !c.parent_id)
                .filter((c) => filterCatType === 'ALL' || c.type === filterCatType)
                .map((parent) => {
                  const isSelected = parent.id === selectedParentId;
                  const childCount = financeCategories.filter((c) => c.parent_id === parent.id).length;

                  return (
                    <div
                      key={parent.id}
                      onClick={() => setSelectedParentId(parent.id)}
                      className="p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border group"
                      style={
                        isSelected
                          ? {
                              background: 'rgba(16, 185, 129, 0.15)',
                              borderColor: '#10b981',
                              boxShadow: '0 0 12px rgba(16,185,129,0.2)',
                            }
                          : {
                              background: 'var(--bg-primary)',
                              borderColor: 'var(--border-default)',
                            }
                      }
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: parent.color || '#10b981' }}
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                            {parent.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="uppercase font-bold text-[9px] px-1 rounded bg-slate-500/10">
                              {parent.type}
                            </span>
                            <span>• {childCount} mục con</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFinanceCat(parent);
                          }}
                          className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15 transition"
                          title="Sửa danh mục mẹ"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFinanceCategory(parent);
                          }}
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/15 transition"
                          title="Xóa danh mục mẹ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isSelected ? 'translate-x-0.5 text-emerald-400' : 'opacity-40'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Column: DANH MỤC CON (CHILDREN) */}
          <div
            className="lg:col-span-7 p-4 rounded-2xl space-y-3"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
          >
            {(() => {
              const currentParent = financeCategories.find((c) => c.id === selectedParentId);
              const subCats = financeCategories.filter((c) => c.parent_id === selectedParentId);

              return (
                <>
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <h3 className="font-extrabold text-xs flex items-center space-x-2 text-sky-400 uppercase tracking-wide">
                        <Tag className="w-4 h-4" />
                        <span>
                          2. Danh mục con thuộc: {currentParent ? currentParent.name : 'Chưa chọn'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Tiểu mục phục vụ ghi chép chi tiêu chi tiết hàng ngày
                      </p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-sky-500/15 text-sky-400">
                      {subCats.length} mục con
                    </span>
                  </div>

                  {subCats.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-500/5 border border-dashed border-slate-500/20">
                      <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-400">
                        Chưa có danh mục con nào trong nhóm này.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Dùng form bên dưới để thêm danh mục con đầu tiên.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto pr-1">
                      {subCats.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl flex items-center justify-between space-x-2 group transition hover:border-sky-500/50"
                          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: sub.color || '#38bdf8' }}
                              />
                              <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                                {sub.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-slate-500/10">
                                {sub.budget_bucket || 'NECESSITY'}
                              </span>
                              <span>• {sub.is_essential ? 'Thiết yếu (Needs)' : 'Hưởng thụ (Wants)'}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => setEditingFinanceCat(sub)}
                              className="p-1 rounded text-cyan-400 hover:bg-cyan-500/15 transition"
                              title="Sửa danh mục con"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteFinanceCategory(sub)}
                              className="p-1 rounded text-rose-400 hover:bg-rose-500/15 transition"
                              title="Xóa danh mục con"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Form Thêm Danh Mục Con vào nhóm đang chọn */}
                  {currentParent && (
                    <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
                      <p className="text-[11px] font-extrabold uppercase text-slate-400 flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5 text-sky-400" />
                        Thêm danh mục con vào nhóm &quot;{currentParent.name}&quot;
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          className="theme-input text-xs sm:col-span-2"
                          placeholder="Tên danh mục con mới (VD: Cafe, Đi chợ)..."
                          value={newCatParentId === currentParent.id ? newCatName : ''}
                          onFocus={() => {
                            setNewCatParentId(currentParent.id);
                            setNewCatType(currentParent.type);
                            setNewCatBucket(currentParent.budget_bucket || 'NECESSITY');
                          }}
                          onChange={(e) => {
                            setNewCatParentId(currentParent.id);
                            setNewCatName(e.target.value);
                          }}
                        />

                        <select
                          className="theme-input text-xs"
                          value={newCatBucket}
                          onChange={(e) => setNewCatBucket(e.target.value as BudgetBucket)}
                        >
                          <option value="NECESSITY">Thiết yếu</option>
                          <option value="SAVINGS">Tiết kiệm</option>
                          <option value="EDUCATION">Giáo dục</option>
                          <option value="PLAY">Hưởng thụ</option>
                          <option value="INVESTMENT">Đầu tư</option>
                          <option value="GIVE">Cho đi</option>
                        </select>

                        <button
                          type="button"
                          onClick={(e) => {
                            setNewCatParentId(currentParent.id);
                            setNewCatType(currentParent.type);
                            handleCreateFinanceCategory(e);
                          }}
                          className="px-3 py-2 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm Con</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Form Thêm Danh Mục Mẹ Mới (Top-level Parent Category) */}
        <div
          className="p-4 rounded-2xl space-y-3"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-400">
            <FolderPlus className="w-4 h-4" />
            <span>Thêm Danh Mục Mẹ Mới (Nhóm Thu Chi Cấp 1)</span>
          </div>

          <form onSubmit={handleCreateFinanceCategory} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <input
              type="text"
              required
              className="theme-input text-xs sm:col-span-2"
              placeholder="Tên danh mục mẹ (VD: Ăn uống, Con cái, Nhà cửa, Xe cộ)..."
              value={newCatParentId === '' ? newCatName : ''}
              onFocus={() => setNewCatParentId('')}
              onChange={(e) => {
                setNewCatParentId('');
                setNewCatName(e.target.value);
              }}
            />

            <select
              className="theme-input text-xs"
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as TransactionType)}
            >
              <option value="EXPENSE">Chi tiêu (Expense)</option>
              <option value="INCOME">Thu nhập (Income)</option>
              <option value="TRANSFER">Chuyển tiền (Transfer)</option>
            </select>

            <select
              className="theme-input text-xs"
              value={newCatBucket}
              onChange={(e) => setNewCatBucket(e.target.value as BudgetBucket)}
            >
              <option value="NECESSITY">Thiết yếu (55%)</option>
              <option value="SAVINGS">Tiết kiệm (10%)</option>
              <option value="EDUCATION">Giáo dục (10%)</option>
              <option value="PLAY">Hưởng thụ (10%)</option>
              <option value="INVESTMENT">Đầu tư (10%)</option>
              <option value="GIVE">Cho đi (5%)</option>
            </select>

            <button
              type="submit"
              onClick={() => setNewCatParentId('')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shrink-0 transition flex items-center justify-center space-x-1 shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Nhóm Mẹ</span>
            </button>
          </form>
        </div>
      </div>

      {/* ─── 0. Admin 2-Tier Taxonomy Manager (Category & SubCategory) ─── */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl space-y-6 shadow-xl" style={{ border: '2px solid rgba(14,165,233,0.3)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
          <div>
            <h2 className="text-base font-extrabold flex items-center space-x-2 text-cyan-400">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <span>Cấu Hình Danh Mục Chi Phí Xe 2 Tầng (Mobility Taxonomy Admin)</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Cấu hình trực tiếp toàn bộ Danh mục lớn &amp; Danh mục con hiển thị trong Form Thêm / Sửa Chi Phí Phương Tiện Xe
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

'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  Edit2,
  Trash2,
  Power,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Layers
} from 'lucide-react';
import { masterDataService } from '@/services/master-data.service';
import { MasterDataItem, MasterDataCategory } from '@/types';
import { Language } from '@/lib/i18n';

interface MasterDataCenterTabProps {
  currentUser: any;
  lang: Language;
}

export const MasterDataCenterTab: React.FC<MasterDataCenterTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [categories, setCategories] = useState<MasterDataCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].category);
    }
  }, [categories]);

  useEffect(() => {
    if (selectedCategory) {
      loadItems();
    }
  }, [selectedCategory, activeOnly]);

  const loadCategories = async () => {
    try {
      const res = await masterDataService.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await masterDataService.getItems(selectedCategory, activeOnly);
      if (res.success && res.data) {
        setItems(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await masterDataService.createItem({
        category: selectedCategory,
        code,
        name,
        nameAr: nameAr || undefined,
        description: description || undefined,
        sortOrder
      });

      if (res.success) {
        setShowCreateModal(false);
        resetForm();
        loadItems();
        loadCategories();
      } else {
        setErrorMsg(res.message || 'Failed to create item');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !name) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await masterDataService.updateItem(editingItem.id, {
        name,
        nameAr: nameAr || undefined,
        description: description || undefined,
        sortOrder,
        isActive: editingItem.isActive
      });

      if (res.success) {
        setShowEditModal(false);
        setEditingItem(null);
        resetForm();
        loadItems();
      } else {
        setErrorMsg(res.message || 'Failed to update item');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: MasterDataItem) => {
    try {
      const res = await masterDataService.toggleItemStatus(item.id);
      if (res.success) {
        loadItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (item: MasterDataItem) => {
    const promptMsg = isArabic
      ? `هل أنت متأكد من تعطيل/حذف القيمة (${item.name})؟ لن يتم حذفها مادياً للحفاظ على السجلات التاريخية.`
      : `Are you sure you want to deactivate/delete (${item.name})? It will be soft-deleted to protect historical audit data.`;

    if (!confirm(promptMsg)) return;

    try {
      const res = await masterDataService.deleteItem(item.id);
      if (res.success) {
        loadItems();
        loadCategories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setNameAr('');
    setDescription('');
    setSortOrder(0);
  };

  const openEditModal = (item: MasterDataItem) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setNameAr(item.nameAr || '');
    setDescription(item.description || '');
    setSortOrder(item.sortOrder);
    setErrorMsg('');
    setShowEditModal(true);
  };

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()) ||
      (i.nameAr && i.nameAr.includes(search))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'مركز البيانات الأساسية والقواميس (Master Data Center)' : 'Admin Master Data Center'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'إدارة قواميس الأعمال الديناميكية (أدوار، أولويات، حالات، أنواع مستندات) دون كتابة كود مسبق مع حفظ السجل التاريخي'
                : 'Configure dynamic business dictionaries with soft-deletion and historical audit integrity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setErrorMsg('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إضافة قيمة جديدة' : 'Add Item'}</span>
          </button>
          <button
            onClick={loadItems}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Categories on Left, Items Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category List Sidebar */}
        <div className="lg:col-span-4 space-y-2">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>{isArabic ? 'تصنيفات القواميس' : 'Master Dictionaries'}</span>
            <span className="font-mono text-cyan-400">{categories.length}</span>
          </div>

          <div className="space-y-1 max-h-[600px] overflow-y-auto pe-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.category;
              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-start transition-all border ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500/50 shadow-md text-slate-100'
                      : 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="truncate">
                    <span className="text-xs font-bold block truncate">{cat.displayName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{cat.category}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.itemCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Table Panel */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isArabic ? 'بحث بالاسم أو الرمز...' : 'Search by name or code...'}
                className="w-full ps-9 pe-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>{isArabic ? 'النشطة فقط' : 'Active only'}</span>
            </label>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            {loading ? (
              <div className="flex items-center justify-center p-16 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin me-2 text-cyan-400" />
                <span>{isArabic ? 'جاري تحميل البيانات...' : 'Loading items...'}</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center p-12 text-slate-500 text-xs">
                {isArabic ? 'لا توجد بيانات مطابقة في هذا التصنيف' : 'No master data items found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3 text-start">{isArabic ? 'الرمز (Code)' : 'Code'}</th>
                      <th className="p-3 text-start">{isArabic ? 'الاسم (En)' : 'Name (En)'}</th>
                      <th className="p-3 text-start">{isArabic ? 'الاسم (Ar)' : 'Name (Ar)'}</th>
                      <th className="p-3 text-center">{isArabic ? 'الترتيب' : 'Order'}</th>
                      <th className="p-3 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-mono font-bold text-cyan-400">
                          <div className="flex items-center gap-1.5">
                            {item.isSystem && (
                              <span title={isArabic ? 'قيمة نظام أساسية' : 'System item'}>
                                <Lock className="w-3 h-3 text-amber-400" />
                              </span>
                            )}
                            <span>{item.code}</span>
                          </div>
                        </td>
                        <td className="p-3 font-medium text-slate-100">{item.name}</td>
                        <td className="p-3 text-slate-300 font-arabic">{item.nameAr || '—'}</td>
                        <td className="p-3 text-center font-mono text-slate-400">{item.sortOrder}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title={isArabic ? 'تغيير الحالة' : 'Toggle status'}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                              item.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <span>{item.isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Inactive')}</span>
                          </button>
                        </td>
                        <td className="p-3 text-end">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-all"
                              title={isArabic ? 'تعديل' : 'Edit'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                              title={isArabic ? 'حذف آمن' : 'Safe Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Item */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? `إضافة قيمة جديدة إلى [${selectedCategory}]` : `Add Item to [${selectedCategory}]`}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الرمز التعريفي الفريد (Code)' : 'Code'}
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, ''))}
                  placeholder="e.g. SiteEngineer, FireAlarm"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الاسم بالإنجليزية (Name En)' : 'English Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Site Engineer"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الاسم بالعربية (Name Ar)' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: مهندس موقع"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-arabic"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'ترتيب الظهور (Sort Order)' : 'Sort Order'}
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'إنشاء' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? `تعديل القيمة [${editingItem.code}]` : `Edit Item [${editingItem.code}]`}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الاسم بالإنجليزية (Name En)' : 'English Name'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الاسم بالعربية (Name Ar)' : 'Arabic Name'}
                </label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-arabic"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'ترتيب الظهور (Sort Order)' : 'Sort Order'}
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'تحديث' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

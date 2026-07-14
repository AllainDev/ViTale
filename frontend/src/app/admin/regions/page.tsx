'use client';

import { useEffect, useState, useCallback } from 'react';
import { Map, Search, Edit2, Trash2, X, Plus, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';

type Region = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  checkpointCount: number;
  characterCount: number;
  productCount: number;
};

type RegionForm = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY_FORM: RegionForm = { name: '', slug: '', description: '', sortOrder: 0, isActive: true };

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function AdminRegionsPage() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Region | null>(null);
  const [form, setForm] = useState<RegionForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('vitale_admin_token')}`,
  });

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterActive !== 'all') params.set('isActive', filterActive);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/regions?${params}`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setRegions(data.regions || []);
      }
    } catch { /* non-critical */ }
    setLoading(false);
  }, [search, filterActive]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAutoSlug(true);
    setModalOpen(true);
  };

  const openEdit = (r: Region) => {
    setEditing(r);
    setForm({ name: r.name, slug: r.slug, description: r.description ?? '', sortOrder: r.sortOrder, isActive: r.isActive });
    setAutoSlug(false);
    setModalOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: autoSlug ? slugify(name) : f.slug }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      showToast('Tên và slug là bắt buộc.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/admin/regions/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/admin/regions`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(form) });
      if (res.ok) {
        showToast(editing ? 'Cập nhật khu vực thành công!' : 'Tạo khu vực thành công!');
        setModalOpen(false);
        fetchRegions();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Có lỗi xảy ra.', 'error');
      }
    } catch { showToast('Không thể kết nối server.', 'error'); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/regions/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 204) {
        showToast('Đã xoá khu vực.');
        fetchRegions();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Không thể xoá.', 'error');
      }
    } catch { showToast('Không thể kết nối server.', 'error'); }
    setDeleteConfirmId(null);
  };

  const moveOrder = async (r: Region, dir: 'up' | 'down') => {
    const newOrder = dir === 'up' ? r.sortOrder - 1 : r.sortOrder + 1;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/regions/${r.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ ...r, sortOrder: newOrder }),
      });
      fetchRegions();
    } catch { /* non-critical */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Khu vực</h1>
            <p className="text-sm text-gray-500">{regions.length} khu vực</p>
          </div>
        </div>
        <button
          id="btn-create-region"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm khu vực
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="region-search"
            type="text"
            placeholder="Tìm kiếm khu vực..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          id="region-filter-active"
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Không hoạt động</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">Đang tải...</div>
        ) : regions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Map className="w-10 h-10 opacity-30" />
            <p>Chưa có khu vực nào. Hãy tạo mới!</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Thứ tự</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Khu vực</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Slug</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Địa điểm</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Nhân vật</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Sản phẩm</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Trạng thái</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {regions.map((r, idx) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveOrder(r, 'up')}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                        title="Lên"
                      ><ChevronUp className="w-4 h-4" /></button>
                      <span className="text-center font-mono text-xs text-gray-500">{r.sortOrder}</span>
                      <button
                        onClick={() => moveOrder(r, 'down')}
                        disabled={idx === regions.length - 1}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-20"
                        title="Xuống"
                      ><ChevronDown className="w-4 h-4" /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{r.slug}</code>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-semibold text-sm">{r.checkpointCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-50 text-purple-700 font-semibold text-sm">{r.characterCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 font-semibold text-sm">{r.productCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <ToggleRight className="w-4 h-4" /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                        <ToggleLeft className="w-4 h-4" /> Tắt
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        id={`btn-edit-region-${r.id}`}
                        onClick={() => openEdit(r)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      ><Edit2 className="w-4 h-4" /></button>
                      <button
                        id={`btn-delete-region-${r.id}`}
                        onClick={() => setDeleteConfirmId(r.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xoá"
                        disabled={r.checkpointCount > 0}
                      ><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khu vực *</label>
                <input
                  id="region-form-name"
                  type="text"
                  placeholder="VD: Hà Nội"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                  <span className="ml-2 text-xs text-gray-400">(URL-safe, tự động sinh)</span>
                </label>
                <input
                  id="region-form-slug"
                  type="text"
                  placeholder="VD: ha-noi"
                  value={form.slug}
                  onChange={e => { setAutoSlug(false); setForm(f => ({ ...f, slug: e.target.value })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  id="region-form-description"
                  placeholder="Mô tả ngắn về khu vực..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thứ tự hiển thị</label>
                  <input
                    id="region-form-sort-order"
                    type="number"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      id="region-form-is-active"
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Đang hoạt động</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Huỷ
              </button>
              <button
                id="btn-save-region"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
              >
                {isSaving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Xác nhận xoá</h3>
            <p className="text-sm text-gray-500 mb-6">Bạn có chắc muốn xoá khu vực này không? Hành động này không thể hoàn tác.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Huỷ
              </button>
              <button
                id="btn-confirm-delete-region"
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
              >
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

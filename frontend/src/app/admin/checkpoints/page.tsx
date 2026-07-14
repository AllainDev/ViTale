'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, Search, Edit2, Trash2, X, Plus, Navigation, ToggleLeft, ToggleRight } from 'lucide-react';

type Checkpoint = {
  id: string;
  name: string;
  region: string;
  regionId?: string;
  regionName?: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  storyAssetUrl?: string;
  createdAt: string;
};

type RegionOption = { id: string; name: string; slug: string };

type CheckpointForm = {
  name: string;
  regionId: string;
  region: string;
  latitude: string;
  longitude: string;
  radius: string;
  storyAssetUrl: string;
  isActive: boolean;
};

const EMPTY_FORM: CheckpointForm = {
  name: '',
  regionId: '',
  region: '',
  latitude: '',
  longitude: '',
  radius: '100',
  storyAssetUrl: '',
  isActive: true,
};

/** Build an OpenStreetMap embed URL centered at given coordinates */
function buildMapEmbedUrl(lat: string, lng: string) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return null;
  // Using OpenStreetMap static embed (iframe bbox) — free, no key needed
  const delta = 0.005;
  const bbox = `${lngNum - delta},${latNum - delta},${lngNum + delta},${latNum + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lngNum}`;
}

export default function AdminCheckpointsPage() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Checkpoint | null>(null);
  const [form, setForm] = useState<CheckpointForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);

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

  const fetchCheckpoints = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      if (filterRegion) params.set('regionId', filterRegion);
      if (filterActive !== 'all') params.set('isActive', filterActive);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/checkpoints?${params}`,
        { headers: getHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
        setTotal(data.total || 0);
      }
    } catch { /* non-critical */ }
    setLoading(false);
  }, [search, filterRegion, filterActive, page]);

  const fetchRegions = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/regions/options`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRegions(data.regions || []);
      }
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchCheckpoints(); }, [fetchCheckpoints]);
  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  // Update map preview whenever lat/lng changes
  useEffect(() => {
    const url = buildMapEmbedUrl(form.latitude, form.longitude);
    setMapEmbedUrl(url);
  }, [form.latitude, form.longitude]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setMapEmbedUrl(null);
    setModalOpen(true);
  };

  const openEdit = (c: Checkpoint) => {
    setEditing(c);
    setForm({
      name: c.name,
      regionId: c.regionId ?? '',
      region: c.region,
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      radius: String(c.radius),
      storyAssetUrl: c.storyAssetUrl ?? '',
      isActive: c.isActive,
    });
    setModalOpen(true);
  };

  const handleRegionChange = (id: string) => {
    const r = regions.find(r => r.id === id);
    setForm(f => ({ ...f, regionId: id, region: r?.name ?? '' }));
  };

  const handleSave = async () => {
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const radius = parseInt(form.radius);

    if (!form.name.trim()) { showToast('Tên địa điểm là bắt buộc.', 'error'); return; }
    if (isNaN(lat) || lat < -90 || lat > 90) { showToast('Latitude không hợp lệ (-90 đến 90).', 'error'); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { showToast('Longitude không hợp lệ (-180 đến 180).', 'error'); return; }
    if (isNaN(radius) || radius < 10 || radius > 1000) { showToast('Bán kính phải từ 10 đến 1000m.', 'error'); return; }

    setIsSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        regionId: form.regionId || null,
        region: form.region.trim(),
        latitude: lat,
        longitude: lng,
        radius,
        storyAssetUrl: form.storyAssetUrl.trim() || null,
        isActive: form.isActive,
      };

      if (editing) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/checkpoints/${editing.id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
        if (res.ok) { showToast('Cập nhật địa điểm thành công!'); setModalOpen(false); fetchCheckpoints(); }
        else { const err = await res.json().catch(() => ({})); showToast(err.message || 'Có lỗi xảy ra.', 'error'); }
      } else {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/checkpoints`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(body),
        });
        if (res.status === 201 || res.ok) { showToast('Tạo địa điểm thành công!'); setModalOpen(false); fetchCheckpoints(); }
        else { const err = await res.json().catch(() => ({})); showToast(err.message || 'Có lỗi xảy ra.', 'error'); }
      }
    } catch { showToast('Không thể kết nối server.', 'error'); }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/checkpoints/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.status === 204) { showToast('Đã xoá địa điểm.'); fetchCheckpoints(); }
      else { const err = await res.json().catch(() => ({})); showToast(err.message || 'Không thể xoá.', 'error'); }
    } catch { showToast('Không thể kết nối server.', 'error'); }
    setDeleteConfirmId(null);
  };

  const toggleActive = async (c: Checkpoint) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/checkpoints/${c.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (res.ok) { showToast(`Địa điểm đã ${!c.isActive ? 'bật' : 'tắt'}.`); fetchCheckpoints(); }
    } catch { /* non-critical */ }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Địa điểm</h1>
            <p className="text-sm text-gray-500">{total} địa điểm</p>
          </div>
        </div>
        <button
          id="btn-create-checkpoint"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm địa điểm
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            id="checkpoint-search"
            type="text"
            placeholder="Tìm theo tên địa điểm..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          id="checkpoint-filter-region"
          value={filterRegion}
          onChange={e => { setFilterRegion(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Tất cả khu vực</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          id="checkpoint-filter-active"
          value={filterActive}
          onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        ) : checkpoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <MapPin className="w-10 h-10 opacity-30" />
            <p>Không có địa điểm nào.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Tên địa điểm</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Khu vực</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Tọa độ</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Bán kính</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Trạng thái</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checkpoints.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      {c.storyAssetUrl && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{c.storyAssetUrl}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {c.regionName || c.region}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-600 font-mono">
                        <Navigation className="w-3 h-3 text-gray-400" />
                        {Number(c.latitude).toFixed(5)}, {Number(c.longitude).toFixed(5)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-600 font-mono">{c.radius}m</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(c)}
                        title={c.isActive ? 'Tắt địa điểm' : 'Bật địa điểm'}
                        className="transition-colors"
                      >
                        {c.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <ToggleRight className="w-5 h-5" /> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                            <ToggleLeft className="w-5 h-5" /> Tắt
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          id={`btn-edit-checkpoint-${c.id}`}
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        ><Edit2 className="w-4 h-4" /></button>
                        <button
                          id={`btn-delete-checkpoint-${c.id}`}
                          onClick={() => setDeleteConfirmId(c.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá"
                        ><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >← Trước</button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >Sau →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900 text-lg">{editing ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Basic info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên địa điểm *</label>
                <input
                  id="checkpoint-form-name"
                  type="text"
                  placeholder="VD: Hồ Hoàn Kiếm"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
                <select
                  id="checkpoint-form-region"
                  value={form.regionId}
                  onChange={e => handleRegionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn khu vực (tuỳ chọn) --</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                  <input
                    id="checkpoint-form-lat"
                    type="number"
                    step="0.0000001"
                    placeholder="21.0285"
                    value={form.latitude}
                    onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                  <input
                    id="checkpoint-form-lng"
                    type="number"
                    step="0.0000001"
                    placeholder="105.8542"
                    value={form.longitude}
                    onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bán kính (m) *</label>
                  <input
                    id="checkpoint-form-radius"
                    type="number"
                    min={10}
                    max={1000}
                    value={form.radius}
                    onChange={e => setForm(f => ({ ...f, radius: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Map Preview — OpenStreetMap, no API key */}
              {mapEmbedUrl ? (
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-gray-600">
                      Xem trước bản đồ — OpenStreetMap
                    </span>
                  </div>
                  <iframe
                    src={mapEmbedUrl}
                    width="100%"
                    height="240"
                    className="block"
                    title="Bản đồ địa điểm"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
                  <MapPin className="w-5 h-5 opacity-40" />
                  Nhập latitude và longitude để xem bản đồ
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Story Asset URL</label>
                <input
                  id="checkpoint-form-story-asset"
                  type="url"
                  placeholder="https://..."
                  value={form.storyAssetUrl}
                  onChange={e => setForm(f => ({ ...f, storyAssetUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="checkpoint-form-is-active"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm text-gray-700">Địa điểm đang hoạt động (cho phép check-in)</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Huỷ
              </button>
              <button
                id="btn-save-checkpoint"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium disabled:opacity-60"
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
            <p className="text-sm text-gray-500 mb-6">
              Bạn có chắc muốn xoá địa điểm này không? Hành động này không thể hoàn tác và sẽ xoá toàn bộ lịch sử check-in liên quan.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Huỷ
              </button>
              <button
                id="btn-confirm-delete-checkpoint"
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

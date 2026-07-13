'use client';

import { useEffect, useState } from 'react';
import { Box, Search, Edit2, Trash2, X, Plus } from 'lucide-react';
import FileDropzone from '@/components/admin/FileDropzone';

type Character = {
  id: string;
  name: string;
  region: string;
  description?: string;
  modelUrl?: string;
};

export default function AdminCharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [editingCharacter, setEditingCharacter] = useState<Character | Partial<Character> | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/characters?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* non-critical */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchCharacters();
  }, [page, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa model này?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/characters/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchCharacters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCharacter) return;
    
    const isEditing = !!(editingCharacter as Character).id;
    const url = isEditing 
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/characters/${(editingCharacter as Character).id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/characters`;
      
    const payload = {
      name: editingCharacter.name || '',
      region: editingCharacter.region || 'VN',
      description: editingCharacter.description || '',
      modelUrl: uploadedUrl || editingCharacter.modelUrl || '',
    };

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingCharacter(null);
        setUploadedUrl('');
        fetchCharacters();
      } else {
        alert('Có lỗi xảy ra khi lưu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Nhân vật 3D</h1>
        </div>
        <ol className="flex text-sm text-gray-500">
          <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">Home</a></li>
          <li className="px-2">/</li>
          <li className="text-gray-400">Nhân vật 3D</li>
        </ol>
      </div>

      {/* Card */}
      <div className="bg-white rounded border-t-4 border-blue-600 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-gray-700">Danh sách Model 3D</h3>
          <button 
            onClick={() => { setEditingCharacter({}); setUploadedUrl(''); }}
            className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm"
          >
            <Plus size={16} /> Thêm mới
          </button>
        </div>
        
        <div className="p-4">
          {/* Search */}
          <div className="flex justify-end mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Tìm kiếm..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-64 border border-gray-300 rounded pl-9 pr-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200">
                  <th className="p-3 font-semibold">Tên nhân vật</th>
                  <th className="p-3 font-semibold">Khu vực</th>
                  <th className="p-3 font-semibold">Model URL (.glb)</th>
                  <th className="p-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                ) : characters.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu</td></tr>
                ) : (
                  characters.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <span className="font-medium text-gray-800">{c.name}</span>
                      </td>
                      <td className="p-3 text-gray-600">{c.region}</td>
                      <td className="p-3">
                        {c.modelUrl ? (
                          <a href={c.modelUrl} target="_blank" className="text-blue-600 hover:underline max-w-[200px] block truncate" title={c.modelUrl}>
                            {c.modelUrl}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">Chưa có file</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => { setEditingCharacter(c); setUploadedUrl(c.modelUrl || ''); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors mx-1" title="Sửa"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors mx-1" title="Xóa"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <div>Đang xem {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} / {total}</div>
              <div className="flex">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-l hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors">Trước</button>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 border-l-0 rounded-r hover:bg-gray-50 disabled:opacity-50 disabled:bg-gray-100 transition-colors">Sau</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Edit/Add */}
      {editingCharacter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-blue-600 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">{(editingCharacter as Character).id ? 'Sửa Nhân Vật 3D' : 'Thêm Nhân Vật 3D'}</h2>
              <button onClick={() => setEditingCharacter(null)} className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"><X size={20} /></button>
            </div>
            
            <div className="p-4 flex-1">
              <form id="charForm" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tên nhân vật <span className="text-red-500">*</span></label>
                    <input required type="text" value={editingCharacter.name || ''} onChange={e => setEditingCharacter({...editingCharacter, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Khu vực <span className="text-red-500">*</span></label>
                    <input required type="text" value={editingCharacter.region || ''} onChange={e => setEditingCharacter({...editingCharacter, region: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="VD: Hà Nội" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả</label>
                  <textarea rows={3} value={editingCharacter.description || ''} onChange={e => setEditingCharacter({...editingCharacter, description: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">File 3D Model (.glb / .gltf)</label>
                  <FileDropzone 
                    uploadUrl="" 
                    accept={{ 'model/gltf-binary': ['.glb'], 'model/gltf+json': ['.gltf'] }} 
                    maxSizeMB={50} 
                    label="Kéo thả hoặc click để chọn file 3D" 
                    onSuccess={(url) => setUploadedUrl(url)} 
                  />
                  {uploadedUrl && (
                    <div className="mt-3 flex items-center gap-3 bg-white border border-gray-200 p-2 rounded">
                      <Box className="text-blue-500 w-8 h-8 p-1" />
                      <div className="text-xs text-blue-600 truncate flex-1 underline"><a href={uploadedUrl} target="_blank">{uploadedUrl}</a></div>
                      <button type="button" onClick={() => setUploadedUrl('')} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={16}/></button>
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10 rounded-b">
              <button onClick={() => setEditingCharacter(null)} className="px-4 py-1.5 text-sm font-medium border border-gray-300 bg-white rounded hover:bg-gray-50 text-gray-700 transition-colors">Đóng</button>
              <button form="charForm" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded font-medium transition-colors shadow-sm">
                Lưu Nhân Vật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Package, Search, Edit2, Trash2, X, Plus, Image as ImageIcon } from 'lucide-react';
import FileDropzone from '@/components/admin/FileDropzone';
import { formatPrice } from '@/lib/utils';

const PRODUCT_TYPES = [
  { value: 'Doll', label: '🪆 Búp bê (Doll)' },
  { value: 'PassportCover', label: '📔 Vỏ hộ chiếu' },
];

type Product = {
  id: string;
  name: string;
  region: string;
  description?: string;
  material?: string;
  price?: string;
  imageUrl?: string;
  isHighlight?: boolean;
  sku?: string;
  productType?: string;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const [editingProduct, setEditingProduct] = useState<Product | Partial<Product> | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => { setToastMsg({ text, type }); setTimeout(() => setToastMsg(null), 3000); };

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/products?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* non-critical */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/products/${deleteConfirmId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        showToast('Đã xóa sản phẩm', 'success');
        fetchProducts();
      } else {
        showToast('Có lỗi xảy ra khi xóa', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi xóa', 'error');
    }
    setDeleteConfirmId(null);
  };

  const handleDelete = (id: string) => setDeleteConfirmId(id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const isEditing = !!(editingProduct as Product).id;
    const url = isEditing 
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/products/${(editingProduct as Product).id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/products`;
      
    const payload = {
      name: editingProduct.name || '',
      region: editingProduct.region || '',
      productType: (editingProduct as Product).productType || 'PassportCover',
      sku: editingProduct.sku || null,
      description: editingProduct.description || '',
      material: editingProduct.material || '',
      price: (editingProduct.price || '').toString(),
      imageUrl: uploadedUrl || editingProduct.imageUrl || '',
      isHighlight: editingProduct.isHighlight || false
    };

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingProduct(null);
        setUploadedUrl('');
        showToast('Lưu sản phẩm thành công!', 'success');
        fetchProducts();
      } else {
        showToast('Có lỗi xảy ra khi lưu.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Có lỗi xảy ra khi lưu.', 'error');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {toastMsg && (
        <div className={`fixed top-4 right-4 text-white px-6 py-3 rounded shadow-lg z-50 animate-fadeIn ${toastMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toastMsg.text}
        </div>
      )}
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Sản phẩm</h1>
        </div>
        <ol className="flex text-sm text-gray-500">
          <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">Home</a></li>
          <li className="px-2">/</li>
          <li className="text-gray-400">Sản phẩm</li>
        </ol>
      </div>

      {/* Card */}
      <div className="bg-white rounded border-t-4 border-blue-600 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-gray-700">Danh sách sản phẩm</h3>
          <button 
            onClick={() => { setEditingProduct({ productType: 'PassportCover' }); setUploadedUrl(''); }}
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
                  <th className="p-3 font-semibold">Hình ảnh</th>
                  <th className="p-3 font-semibold">Tên SP</th>
                  <th className="p-3 font-semibold">Loại</th>
                  <th className="p-3 font-semibold">Khu vực</th>
                  <th className="p-3 font-semibold">Giá</th>
                  <th className="p-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu</td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        {p.imageUrl ? (
                          <img 
                            src={p.imageUrl} 
                            alt={p.name} 
                            className="w-10 h-10 rounded border border-gray-200 object-cover" 
                            onError={(e) => { e.currentTarget.src = '/placeholder-product.png'; e.currentTarget.onerror = null; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                            <ImageIcon className="text-gray-400 w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-gray-800">{p.name}</span>
                        {p.isHighlight && <span className="ml-2 text-[10px] uppercase font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Nổi bật</span>}
                        {p.sku && <div className="text-xs text-gray-400 mt-0.5">SKU: {p.sku}</div>}
                      </td>
                      <td className="p-3">
                        {p.productType === 'Doll' 
                          ? <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs font-semibold">🪆 Búp bê</span>
                          : <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs">📔 Vỏ hộ chiếu</span>
                        }
                      </td>
                      <td className="p-3 text-gray-600">{p.region}</td>
                      <td className="p-3 font-medium text-gray-800">{formatPrice(p.price)}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => { setEditingProduct(p); setUploadedUrl(p.imageUrl || ''); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors mx-1" title="Sửa"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors mx-1" title="Xóa"><Trash2 size={16} /></button>
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
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-t-4 border-blue-600 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-800">{(editingProduct as Product).id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"><X size={20} /></button>
            </div>
            
            <div className="p-4 flex-1">
              <form id="productForm" onSubmit={handleSave} className="space-y-4">
                {/* Loại sản phẩm */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Loại sản phẩm <span className="text-red-500">*</span></label>
                  <div className="flex gap-3">
                    {PRODUCT_TYPES.map(pt => (
                      <label key={pt.value} className={`flex-1 flex items-center gap-2 p-3 border rounded cursor-pointer transition-all ${(editingProduct.productType || 'PassportCover') === pt.value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input 
                          type="radio" 
                          name="productType" 
                          value={pt.value}
                          checked={(editingProduct.productType || 'PassportCover') === pt.value}
                          onChange={e => setEditingProduct({...editingProduct, productType: e.target.value})}
                          className="accent-blue-600"
                          disabled={!!(editingProduct as Product).id} // Can't change type of existing product
                        />
                        <span className="text-sm font-medium">{pt.label}</span>
                      </label>
                    ))}
                  </div>
                  {!!(editingProduct as Product).id && <p className="text-xs text-gray-400 mt-1">Không thể đổi loại sản phẩm sau khi đã tạo.</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tên sản phẩm <span className="text-red-500">*</span></label>
                    <input required type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Khu vực <span className="text-red-500">*</span></label>
                    <input required type="text" value={editingProduct.region || ''} onChange={e => setEditingProduct({...editingProduct, region: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="VD: Hà Nội" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Giá (VNĐ)</label>
                    <input type="text" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="VD: ₫850,000" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Chất liệu</label>
                    <input type="text" value={editingProduct.material || ''} onChange={e => setEditingProduct({...editingProduct, material: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mã SKU</label>
                    <input type="text" value={editingProduct.sku || ''} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="VD: SKU-HN-001" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả</label>
                  <textarea rows={3} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hình ảnh sản phẩm</label>
                  <FileDropzone 
                    uploadUrl="/admin/upload-product-image"
                    accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }} 
                    maxSizeMB={5} 
                    label="Kéo thả hoặc click để chọn ảnh" 
                    onSuccess={(url) => setUploadedUrl(url)} 
                  />
                  {(uploadedUrl || editingProduct.imageUrl) && (
                    <div className="mt-3 flex items-center gap-3 bg-white border border-gray-200 p-2 rounded">
                      <img src={uploadedUrl || editingProduct.imageUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
                      <div className="text-xs text-blue-600 truncate flex-1 underline"><a href={uploadedUrl || editingProduct.imageUrl} target="_blank">{uploadedUrl || editingProduct.imageUrl}</a></div>
                      <button type="button" onClick={() => setUploadedUrl('')} className="p-1 hover:bg-red-50 text-red-500 rounded"><X size={16}/></button>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                  <div className="pt-0.5">
                    <input type="checkbox" checked={editingProduct.isHighlight || false} onChange={e => setEditingProduct({...editingProduct, isHighlight: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">Sản phẩm Nổi bật</div>
                    <div className="text-xs text-gray-500 mt-0.5">Hiển thị ưu tiên trên ứng dụng di động / User Collection</div>
                  </div>
                </label>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10 rounded-b">
              <button onClick={() => setEditingProduct(null)} className="px-4 py-1.5 text-sm font-medium border border-gray-300 bg-white rounded hover:bg-gray-50 text-gray-700 transition-colors">Đóng</button>
              <button form="productForm" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm rounded font-medium transition-colors shadow-sm">
                Lưu Sản Phẩm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Confirm Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa sản phẩm</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2.5 rounded-full font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex-1"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-2.5 rounded-full font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md hover:shadow-lg flex-1"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

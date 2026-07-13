'use client';

import { useEffect, useState } from 'react';
import { Package, Search, Edit2, Trash2, X, Plus, Image as ImageIcon } from 'lucide-react';
import FileDropzone from '@/components/admin/FileDropzone';

type Product = {
  id: string;
  name: string;
  region: string;
  description?: string;
  material?: string;
  price?: string;
  imageUrl?: string;
  isHighlight?: boolean;
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

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/collections?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này? (Sản phẩm sẽ được đưa vào thùng rác)')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/collections/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const isEditing = !!(editingProduct as Product).id;
    const url = isEditing 
      ? `${process.env.NEXT_PUBLIC_API_URL}/admin/collections/${(editingProduct as Product).id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/admin/collections`;
      
    const payload = {
      name: editingProduct.name || '',
      region: editingProduct.region || 'VN',
      description: editingProduct.description || '',
      material: editingProduct.material || '',
      price: (editingProduct.price || 0).toString(),
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
        fetchProducts();
      } else {
        alert('Có lỗi xảy ra khi lưu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="text-[#b2f822]" /> Sản phẩm
          </h1>
          <p className="text-white/60 mt-1">Quản lý các sản phẩm 3D và hiện vật</p>
        </div>
        <button 
          onClick={() => { setEditingProduct({}); setUploadedUrl(''); }}
          className="bg-[#b2f822] text-black px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-[#9ee01b] transition-colors"
        >
          <Plus size={20} /> Thêm mới
        </button>
      </div>

      <div className="bg-[#111820] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo tên hoặc khu vực..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#b2f822]/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-white/60 text-sm">
                <th className="p-4 font-medium">Hình ảnh</th>
                <th className="p-4 font-medium">Tên SP</th>
                <th className="p-4 font-medium">Khu vực</th>
                <th className="p-4 font-medium">Giá</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">Đang tải...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">Không tìm thấy sản phẩm nào</td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.name} 
                          className="w-12 h-12 rounded-lg object-cover bg-black/50" 
                          onError={(e) => { e.currentTarget.src = '/placeholder-product.png'; e.currentTarget.onerror = null; }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center">
                          <ImageIcon className="text-white/20 w-6 h-6" />
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-medium">{p.name} {p.isHighlight && <span className="ml-2 text-xs bg-[#b2f822]/20 text-[#b2f822] px-2 py-1 rounded-md">Nổi bật</span>}</td>
                    <td className="p-4 text-white/60">{p.region}</td>
                    <td className="p-4 text-[#b2f822]">{p.price || '-'}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingProduct(p); setUploadedUrl(p.imageUrl || ''); }} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-white/60">
            <div>Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} trong số {total} sản phẩm</div>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50">Trước</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50">Sau</button>
            </div>
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111820] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#111820]/90 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold">{(editingProduct as Product).id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h2>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form id="productForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Tên sản phẩm *</label>
                    <input required type="text" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#b2f822]/50 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Khu vực *</label>
                    <input required type="text" value={editingProduct.region || ''} onChange={e => setEditingProduct({...editingProduct, region: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#b2f822]/50 outline-none" placeholder="VD: Hà Nội" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Giá (VNĐ)</label>
                    <input type="text" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#b2f822]/50 outline-none" placeholder="VD: 150,000" />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Chất liệu</label>
                    <input type="text" value={editingProduct.material || ''} onChange={e => setEditingProduct({...editingProduct, material: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#b2f822]/50 outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">Mô tả</label>
                  <textarea rows={3} value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#b2f822]/50 outline-none resize-none" />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">Hình ảnh sản phẩm</label>
                  <FileDropzone uploadUrl={`${process.env.NEXT_PUBLIC_API_URL}/admin/upload-product-image`} accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }} maxSizeMB={5} label="Kéo thả hoặc click để chọn ảnh" onSuccess={(url) => setUploadedUrl(url)} />
                  {uploadedUrl && (
                    <div className="mt-4 flex items-center gap-4 bg-white/5 p-2 rounded-xl">
                      <img src={uploadedUrl} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
                      <div className="text-sm text-white/60 truncate flex-1">{uploadedUrl}</div>
                      <button type="button" onClick={() => setUploadedUrl('')} className="p-2 hover:bg-white/10 rounded-lg"><X size={16}/></button>
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${editingProduct.isHighlight ? 'bg-[#b2f822] border-[#b2f822]' : 'border-white/40'}`}>
                    {editingProduct.isHighlight && <div className="w-2.5 h-2.5 bg-black rounded-sm" />}
                  </div>
                  <input type="checkbox" checked={editingProduct.isHighlight || false} onChange={e => setEditingProduct({...editingProduct, isHighlight: e.target.checked})} className="hidden" />
                  <div>
                    <div className="font-medium">Sản phẩm Nổi bật</div>
                    <div className="text-sm text-white/60">Hiển thị ưu tiên trên ứng dụng di động</div>
                  </div>
                </label>
              </form>
            </div>
            <div className="p-6 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-[#111820]/90 backdrop-blur-md z-10">
              <button onClick={() => setEditingProduct(null)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-white/5 transition-colors">Hủy</button>
              <button form="productForm" type="submit" className="bg-[#b2f822] hover:bg-[#9ee01b] text-black px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-[#b2f822]/20">
                Lưu Sản Phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

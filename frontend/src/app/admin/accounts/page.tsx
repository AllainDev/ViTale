'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Lock, Unlock, ShieldAlert, CheckCircle } from 'lucide-react';

type Account = {
  id: string;
  email: string;
  oAuthProvider: number | null; // 0 for Facebook, 1 for Google, null for Email/Password
  createdAt: string;
  isLocked: boolean;
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, onConfirm: () => void } | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/accounts?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.data || []);
        setTotal(data.total || 0);
      }
    } catch { /* non-critical */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [page, search]);

  const handleToggleLock = async (id: string, isLocked: boolean) => {
    setConfirmDialog({
      isOpen: true,
      title: `Bạn có chắc chắn muốn ${isLocked ? 'mở khóa' : 'khóa'} tài khoản này?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/accounts/${id}/toggle-lock`, {
            method: 'PUT',
            headers: getHeaders()
          });
          if (res.ok) fetchAccounts();
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const getProviderName = (provider: number | null) => {
    if (provider === 0) return 'Facebook';
    if (provider === 1) return 'Google';
    return 'Email';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Tài khoản khách hàng</h1>
        </div>
        <ol className="flex text-sm text-gray-500">
          <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">Home</a></li>
          <li className="px-2">/</li>
          <li className="text-gray-400">Khách hàng</li>
        </ol>
      </div>

      {/* Card */}
      <div className="bg-white rounded border-t-4 border-blue-600 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-gray-700">Danh sách tài khoản</h3>
        </div>
        
        <div className="p-4">
          {/* Search */}
          <div className="flex justify-end mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                placeholder="Tìm kiếm email..."
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
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold text-center">Nguồn</th>
                  <th className="p-3 font-semibold text-center">Trạng thái</th>
                  <th className="p-3 font-semibold">Ngày đăng ký</th>
                  <th className="p-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Đang tải...</td></tr>
                ) : accounts.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu</td></tr>
                ) : (
                  accounts.map(a => (
                    <tr key={a.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${a.isLocked ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                      <td className="p-3 font-medium text-gray-800 flex items-center gap-2">
                        <Users size={16} className={a.isLocked ? "text-red-400" : "text-gray-400"} />
                        {a.email}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">
                          {getProviderName(a.oAuthProvider)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {a.isLocked ? (
                          <span className="inline-flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs font-semibold"><Lock size={12}/> Đã khóa</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs font-semibold"><CheckCircle size={12} className="lucide lucide-check-circle"/> Hoạt động</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">{new Date(a.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="p-3 text-right">
                        {a.isLocked ? (
                          <button onClick={() => handleToggleLock(a.id, a.isLocked)} className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors mx-1 text-xs font-medium flex items-center gap-1 ml-auto" title="Mở khóa">
                            <Unlock size={14} /> Mở khóa
                          </button>
                        ) : (
                          <button onClick={() => handleToggleLock(a.id, a.isLocked)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors mx-1 text-xs font-medium flex items-center gap-1 ml-auto" title="Khóa">
                            <Lock size={14} /> Khóa
                          </button>
                        )}
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

      {/* Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-slideUp">
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Xác nhận</h3>
              <p className="text-gray-600 text-center text-sm">{confirmDialog.title}</p>
            </div>
            <div className="bg-gray-50 px-4 py-3 flex gap-3 justify-end border-t border-gray-200">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

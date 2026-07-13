'use client';

import { useEffect, useState } from 'react';
import { Users, Search, Lock, Unlock, ShieldAlert } from 'lucide-react';

type Account = {
  id: string;
  email: string;
  oAuthProvider: number; // 0 for Apple, 1 for Google
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
    if (!confirm(`Bạn có chắc chắn muốn ${isLocked ? 'mở khóa' : 'khóa'} tài khoản này?`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/accounts/${id}/toggle-lock`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (res.ok) fetchAccounts();
    } catch (e) {
      console.error(e);
    }
  };

  const getProviderName = (provider: number) => {
    return provider === 0 ? 'Apple' : 'Google';
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-[#b2f822]" /> Tài khoản
          </h1>
          <p className="text-white/60 mt-1">Quản lý tài khoản người dùng đăng nhập qua Google/Apple</p>
        </div>
      </div>

      <div className="bg-[#111820] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
            <input 
              type="text"
              placeholder="Tìm kiếm theo email hoặc provider..."
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
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Nguồn</th>
                <th className="p-4 font-medium">Ngày tạo</th>
                <th className="p-4 font-medium">Trạng thái</th>
                <th className="p-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">Đang tải...</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">Không tìm thấy tài khoản nào</td>
                </tr>
              ) : (
                accounts.map(a => (
                  <tr key={a.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${a.isLocked ? 'opacity-60' : ''}`}>
                    <td className="p-4 font-medium">{a.email || 'Ẩn danh'}</td>
                    <td className="p-4 text-white/60">
                      <span className="bg-white/10 px-2 py-1 rounded text-xs">
                        {getProviderName(a.oAuthProvider)}
                      </span>
                    </td>
                    <td className="p-4 text-white/60">{new Date(a.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="p-4">
                      {a.isLocked ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm"><ShieldAlert size={14}/> Đã khóa</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#b2f822] text-sm">Đang hoạt động</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleToggleLock(a.id, a.isLocked)} 
                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                        title={a.isLocked ? "Mở khóa" : "Khóa tài khoản"}
                      >
                        {a.isLocked ? <Unlock size={18} className="text-[#b2f822]" /> : <Lock size={18} className="text-red-400" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-white/60">
            <div>Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} trong số {total} tài khoản</div>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50">Trước</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-50">Sau</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

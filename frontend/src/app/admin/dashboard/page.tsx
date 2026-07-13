'use client';

import { useEffect, useState } from 'react';
import { Package, Users, Box, ArrowRight, Activity, QrCode } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Stats = {
  products: number;
  characters: number;
  accounts: number;
  tokens: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ products: 0, characters: 0, accounts: 0, tokens: 0 });
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, charactersRes, accountsRes, dollsRes] = await Promise.allSettled([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/collections?pageSize=1`, { headers: getHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/characters?pageSize=1`, { headers: getHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/accounts?pageSize=1`, { headers: getHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dolls`, { headers: getHeaders() }) // to count tokens
        ]);

        let products = 0;
        let characters = 0;
        let accounts = 0;
        let tokens = 0;

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          products = (await productsRes.value.json()).total || 0;
        }
        if (charactersRes.status === 'fulfilled' && charactersRes.value.ok) {
          characters = (await charactersRes.value.json()).total || 0;
        }
        if (accountsRes.status === 'fulfilled' && accountsRes.value.ok) {
          accounts = (await accountsRes.value.json()).total || 0;
        }
        if (dollsRes.status === 'fulfilled' && dollsRes.value.ok) {
          const dollsData = await dollsRes.value.json();
          tokens = dollsData.dolls?.reduce((acc: number, cur: any) => acc + (cur.tokens?.total || 0), 0) || 0;
        }

        setStats({ products, characters, accounts, tokens });
      } catch { /* non-critical */ }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Sản phẩm', total: stats.products },
    { name: 'Nhân vật 3D', total: stats.characters },
    { name: 'Khách hàng', total: stats.accounts },
    { name: 'Doll Tokens', total: stats.tokens },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Dashboard</h1>
        </div>
        <ol className="flex text-sm text-gray-500">
          <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">Home</a></li>
          <li className="px-2">/</li>
          <li className="text-gray-400">Dashboard</li>
        </ol>
      </div>

      {/* Info Boxes (AdminLTE Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded shadow-sm flex overflow-hidden border border-gray-200">
          <div className="w-20 bg-blue-500 flex items-center justify-center text-white">
            <Package size={32} />
          </div>
          <div className="flex-1 p-3">
            <span className="block text-sm font-semibold text-gray-500 uppercase">Sản phẩm</span>
            <span className="block text-2xl font-bold text-gray-800">{loading ? '-' : stats.products}</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm flex overflow-hidden border border-gray-200">
          <div className="w-20 bg-green-500 flex items-center justify-center text-white">
            <Box size={32} />
          </div>
          <div className="flex-1 p-3">
            <span className="block text-sm font-semibold text-gray-500 uppercase">Nhân vật 3D</span>
            <span className="block text-2xl font-bold text-gray-800">{loading ? '-' : stats.characters}</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm flex overflow-hidden border border-gray-200">
          <div className="w-20 bg-yellow-500 flex items-center justify-center text-white">
            <Users size={32} />
          </div>
          <div className="flex-1 p-3">
            <span className="block text-sm font-semibold text-gray-500 uppercase">Khách hàng</span>
            <span className="block text-2xl font-bold text-gray-800">{loading ? '-' : stats.accounts}</span>
          </div>
        </div>

        <div className="bg-white rounded shadow-sm flex overflow-hidden border border-gray-200">
          <div className="w-20 bg-red-500 flex items-center justify-center text-white">
            <QrCode size={32} />
          </div>
          <div className="flex-1 p-3">
            <span className="block text-sm font-semibold text-gray-500 uppercase">Doll Tokens</span>
            <span className="block text-2xl font-bold text-gray-800">{loading ? '-' : stats.tokens}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Card */}
        <div className="bg-white rounded border-t-4 border-blue-600 shadow-sm flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Biểu đồ Số liệu
            </h3>
          </div>
          <div className="p-4 flex-1" style={{ minHeight: 300 }}>
            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-400">Đang tải biểu đồ...</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded border-t-4 border-green-500 shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h3 className="font-semibold text-gray-700">Truy cập nhanh</h3>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-gray-100">
              <li>
                <Link href="/admin/products" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Package size={16}/></div>
                    <div>
                      <p className="font-medium text-gray-800">Quản lý Sản phẩm</p>
                      <p className="text-xs text-gray-500">Cập nhật danh sách đồ thủ công mỹ nghệ</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              </li>
              <li>
                <Link href="/admin/characters" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Box size={16}/></div>
                    <div>
                      <p className="font-medium text-gray-800">Quản lý Nhân vật 3D</p>
                      <p className="text-xs text-gray-500">Tải lên file .glb và cập nhật Model 3D</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                </Link>
              </li>
              <li>
                <Link href="/admin/tokens" className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><QrCode size={16}/></div>
                    <div>
                      <p className="font-medium text-gray-800">Quản lý Doll Tokens</p>
                      <p className="text-xs text-gray-500">Tạo mã QR Token cho các mô hình</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-400 group-hover:text-red-600 transition-colors" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

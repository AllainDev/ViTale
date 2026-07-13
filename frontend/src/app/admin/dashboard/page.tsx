'use client';

import { useEffect, useState } from 'react';
import { Package, Users, Activity, ArrowRight, Box } from 'lucide-react';
import Link from 'next/link';

type Stats = {
  products: number;
  characters: number;
  accounts: number;
};

function StatCard({ icon: Icon, label, value, href, color }: {
  icon: typeof Package;
  label: string;
  value: number | string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="group relative bg-[#0d1520] border border-white/8 rounded-2xl p-6 hover:border-white/16 transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="w-4 h-4 text-slate-500" />
      </div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ products: 0, characters: 0, accounts: 0 });
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, charactersRes, accountsRes] = await Promise.allSettled([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/collections?pageSize=1`, { headers: getHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/characters?pageSize=1`, { headers: getHeaders() }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/accounts?pageSize=1`, { headers: getHeaders() }),
        ]);

        let products = 0;
        let characters = 0;
        let accounts = 0;

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          products = (await productsRes.value.json()).total || 0;
        }
        if (charactersRes.status === 'fulfilled' && charactersRes.value.ok) {
          characters = (await charactersRes.value.json()).total || 0;
        }
        if (accountsRes.status === 'fulfilled' && accountsRes.value.ok) {
          accounts = (await accountsRes.value.json()).total || 0;
        }

        setStats({ products, characters, accounts });
      } catch { /* non-critical */ }
      setLoading(false);
    };
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm">Tổng quan hệ thống ViTale</p>
      </div>

      {/* Live status */}
      <div className="flex items-center gap-2 mb-8 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 w-fit">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="text-emerald-400 text-sm font-medium">Backend API đang hoạt động</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard
          icon={Package}
          label="Sản phẩm"
          value={loading ? '—' : stats.products}
          href="/admin/products"
          color="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard
          icon={Box}
          label="Nhân vật 3D"
          value={loading ? '—' : stats.characters}
          href="/admin/characters"
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Users}
          label="Tài khoản"
          value={loading ? '—' : stats.accounts}
          href="/admin/accounts"
          color="bg-gradient-to-br from-orange-500 to-red-600"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-[#0d1520] border border-white/8 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { href: '/admin/products', label: '📦 Quản lý Sản phẩm', desc: 'Upload ảnh, xem danh sách' },
            { href: '/admin/characters', label: '🧝 Quản lý Nhân vật', desc: 'Upload model 3D (.glb)' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 transition-all group"
            >
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  Box,
  LogOut,
  Sparkles,
  ChevronRight,
  QrCode
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products',  icon: Package,         label: 'Sản phẩm'  },
  { href: '/admin/characters',icon: Box,             label: 'Nhân vật 3D'},
  { href: '/admin/tokens',    icon: QrCode,          label: 'Doll Tokens'},
  { href: '/admin/accounts',  icon: Users,           label: 'Khách hàng'},
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('vitale_admin_token');
    document.cookie = 'admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/admin/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 flex flex-col bg-[#343a40] shadow-xl z-40 text-[#c2c7d0]">
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-blue-600" />
        </div>
        <span className="text-white font-semibold text-lg tracking-wide">ViTale Admin</span>
      </div>

      {/* User Panel */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
          AD
        </div>
        <span className="text-sm font-medium text-[#c2c7d0]">Administrator</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-[#c2c7d0] hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#c2c7d0]'} group-hover:text-white transition-colors`} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-75" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}

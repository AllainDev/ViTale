'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminGuard from '@/components/admin/AdminGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#0a0f14] text-white flex">
        {!isLoginPage && <AdminSidebar />}
        <main className={`flex-1 ${!isLoginPage ? 'ml-60' : ''} min-h-screen flex flex-col`}>
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}

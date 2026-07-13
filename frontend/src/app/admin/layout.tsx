'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminGuard from '@/components/admin/AdminGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-100 text-gray-900 flex font-sans">
        {!isLoginPage && <AdminSidebar />}
        <div className={`flex-1 ${!isLoginPage ? 'ml-64' : ''} min-h-screen flex flex-col`}>
          {!isLoginPage && <AdminHeader />}
          <main className={`flex-1 ${!isLoginPage ? 'p-6' : 'p-0'}`}>
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}

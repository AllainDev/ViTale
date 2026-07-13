'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // allow login page to load without token
    if (pathname === '/admin/login') {
      setIsChecking(false);
      return;
    }

    const token = localStorage.getItem('vitale_admin_token');
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsChecking(false);
    }
  }, [pathname, router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#b2f822]/20 border-t-[#b2f822] rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

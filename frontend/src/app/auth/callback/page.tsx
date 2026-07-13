'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setJwt } = useAuth();

  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      router.push('/');
      return;
    }

    const token = searchParams.get('token');
    if (token) {
      setJwt(token);
      localStorage.setItem('vitale_jwt', token);
      router.push('/');
    } else {
      console.error('No token found in callback URL');
      router.push('/');
    }
  }, [error, searchParams, router, setJwt]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-stone-600 bg-stone-50">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <p className="text-sm font-medium">
        {error ? "Đang hủy..." : "Hoàn tất đăng nhập..."}
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-stone-50"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}

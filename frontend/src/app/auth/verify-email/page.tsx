'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { getTranslation } from '../../../lib/i18n';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { language } = useLanguage();
  const t = getTranslation(language);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t.auth.invalidTokenDesc);
      return;
    }

    const verifyEmail = async () => {
      try {
        let apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
        if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
        
        const res = await fetch(`${apiUrl}/auth/verify-email?token=${token}`);
        
        if (res.ok) {
          setStatus('success');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/?screen=auth');
          }, 3000);
        } else {
          const data = await res.json().catch(() => ({}));
          setStatus('error');
          setErrorMsg(data.error || t.auth.invalidTokenMsg);
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(t.auth.networkError);
      }
    };

    verifyEmail();
  }, [token, router]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
        <h2 className="text-xl font-semibold text-stone-700">{t.auth.verifyingTitle}</h2>
        <p className="text-stone-500">{t.auth.verifyingWait}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <XCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold text-stone-900">{t.auth.verifyFailTitle}</h2>
        <p className="text-stone-600 max-w-sm">{errorMsg}</p>
        <button
          onClick={() => router.push('/?screen=auth')}
          className="mt-6 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
        >
          {t.auth.backToLogin}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 text-center">
      <CheckCircle2 className="h-16 w-16 text-green-500" />
      <h2 className="text-2xl font-bold text-stone-900">{t.auth.verifySuccessTitle}</h2>
      <p className="text-stone-600 max-w-sm">
        {t.auth.verifySuccessDesc}
      </p>
      <div className="mt-6 flex items-center text-stone-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        <span>{t.auth.redirectingLogin}</span>
      </div>
      <button
        onClick={() => router.push('/?screen=auth')}
        className="mt-2 flex items-center justify-center px-4 py-2 border border-stone-300 rounded-md shadow-sm text-sm font-medium text-stone-700 bg-white hover:bg-stone-50"
      >
        {t.auth.goToLogin} <ArrowRight className="ml-2 w-4 h-4" />
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-12 px-4 shadow sm:rounded-lg sm:px-10">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

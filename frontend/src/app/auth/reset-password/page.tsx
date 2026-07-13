'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { getTranslation } from '../../../lib/i18n';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { language } = useLanguage();
  const t = getTranslation(language);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        let apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
        if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
        const res = await fetch(`${apiUrl}/auth/reset-password?token=${token}`);
        if (!res.ok) {
          setIsTokenExpired(true);
        }
      } catch (err) {
        // Network error, we can let them try to submit anyway or show error
      } finally {
        setIsVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  // Password validation state
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasNumber;
  const isMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setIsTokenExpired(true);
      return;
    }

    if (!isPasswordValid) {
      setError(t.auth.weakPasswordMsg);
      return;
    }

    if (!isMatch) {
      setError(t.auth.passwordMismatchMsg);
      return;
    }

    setLoading(true);

    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 400) {
          setIsTokenExpired(true);
        } else {
          setError(data.error || t.auth.resetFailedMsg);
        }
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/?screen=auth');
      }, 3000);
    } catch (err) {
      setError(t.auth.networkError);
      setLoading(false);
    }
  };

  if (!token || isTokenExpired) {
    return (
      <div className="bg-white py-12 px-4 shadow sm:rounded-lg sm:px-10 text-center">
        <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-stone-900 mb-2">{t.auth.invalidTokenTitle}</h2>
        <p className="text-stone-600 mb-6">
          {t.auth.invalidTokenDesc}
        </p>
        <button
          onClick={() => router.push('/?screen=auth')}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
        >
          {t.auth.requestNewLink}
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white py-12 px-4 shadow sm:rounded-lg sm:px-10 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-stone-900 mb-2">{t.auth.resetSuccessTitle}</h2>
        <p className="text-stone-600 mb-6">
          {t.auth.resetSuccessDesc}
        </p>
        <div className="flex items-center justify-center text-stone-500">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>{t.auth.redirectingLogin}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center mb-6">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
          {t.auth.resetPasswordTitle}
        </h2>
      </div>

      <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700">{t.auth.newPasswordLabel}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="password"
                required
                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-md py-2 border"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            {/* Password strength indicators */}
            {newPassword.length > 0 && (
              <div className="mt-3 text-xs space-y-1">
                <p className={`flex items-center ${hasMinLength ? 'text-green-600' : 'text-stone-500'}`}>
                  {hasMinLength ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <span className="w-3 h-3 mr-1" />}
                  {t.auth.minChars}
                </p>
                <p className={`flex items-center ${hasNumber ? 'text-green-600' : 'text-stone-500'}`}>
                  {hasNumber ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <span className="w-3 h-3 mr-1" />}
                  {t.auth.number}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700">{t.auth.confirmPasswordLabel}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="password"
                required
                className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-md py-2 border"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {confirmPassword.length > 0 && (
              <p className={`mt-2 text-xs flex items-center ${isMatch ? 'text-green-600' : 'text-red-500'}`}>
                {isMatch ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> {t.auth.passwordsMatch}</>
                ) : (
                  <><XCircle className="w-3 h-3 mr-1" /> {t.auth.passwordsMismatch}</>
                )}
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !isPasswordValid || !isMatch}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.auth.resetBtn}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
          </div>
        }>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}

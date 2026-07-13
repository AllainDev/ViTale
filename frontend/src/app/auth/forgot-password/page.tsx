'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { getTranslation } from '../../../lib/i18n';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslation(language);
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      if (!apiUrl.endsWith('/api/v1')) apiUrl += '/api/v1';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || t.auth.genericError);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(t.auth.networkError);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-stone-900 mb-2">{t.auth.checkEmailTitle}</h2>
            <p className="text-stone-600 mb-6">
              {t.auth.checkEmailDesc1}<strong>{email}</strong>{t.auth.checkEmailDesc2}
            </p>
            <p className="text-sm text-stone-500 mb-6">
              {t.auth.checkSpam}
            </p>
            <button
              onClick={() => router.push('/?screen=auth')}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
            >
              {t.auth.backToLogin}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <button onClick={() => router.push('/')} className="flex items-center text-stone-500 hover:text-stone-700 transition">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t.auth.backToLogin}
          </button>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
          {t.auth.forgotPasswordTitle}
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 px-4">
          {t.auth.forgotPasswordDesc}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
              <label className="block text-sm font-medium text-stone-700">{t.auth.emailLabel}</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-stone-400" />
                </div>
                <input
                  type="email"
                  required
                  className="focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 sm:text-sm border-stone-300 rounded-md py-2 border"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.auth.sendResetLink}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

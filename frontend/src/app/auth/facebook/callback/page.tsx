'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';

export default function FacebookCallbackPage() {
  const router = useRouter();
  const { setJwt } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Facebook implicit flow returns: /callback#access_token=...&expires_in=...
    // We read from window.location.hash (NOT search params — hash is never sent to server)
    const hash = window.location.hash.substring(1); // remove leading '#'
    const params = new URLSearchParams(hash);

    const accessToken = params.get('access_token');
    const error = params.get('error');
    const errorReason = params.get('error_reason');

    if (error || errorReason === 'user_denied' || !accessToken) {
      setErrorMsg(
        errorReason === 'user_denied'
          ? 'Bạn đã hủy đăng nhập Facebook.'
          : 'Đăng nhập Facebook thất bại. Vui lòng thử lại.'
      );
      setStatus('error');
      return;
    }

    // Send access_token to backend for validation + JWT exchange
    authApi.linkAccount('facebook', accessToken)
      .then((res) => {
        setJwt(res.token);
        router.replace('/');
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : 'Không thể xác thực. Vui lòng thử lại.');
        setStatus('error');
      });
  }, [router, setJwt]);

  return (
    <main className="page-wrapper">
      <div className="container" style={{ maxWidth: 400, paddingTop: '8rem', textAlign: 'center' }}>
        {status === 'loading' ? (
          <>
            <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1.5rem' }} />
            <h2>Đang xác thực với Facebook...</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>Vui lòng chờ một chút.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2>Đăng nhập thất bại</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>{errorMsg}</p>
            <button className="btn btn-outline" onClick={() => router.push('/auth/link')}>
              ← Thử lại
            </button>
          </>
        )}
      </div>
    </main>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';
import styles from './VerifyEmailPage.module.scss';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('No verification token provided'); return; }
    api<{ ok: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch(err => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [token]);

  return (
    <div className={styles.page}>
      {status === 'loading' && <p className={styles.text}>Verifying your email...</p>}
      {status === 'success' && (
        <>
          <h1 className={styles.title}>Email Verified!</h1>
          <p className={styles.text}>Your email has been verified. You now have full access to RigBuilder.</p>
          <a href="/marketplace" className={styles.cta}>Go to Marketplace</a>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className={styles.title}>Verification Failed</h1>
          <p className={styles.text}>{errorMsg}</p>
          <a href="/" className={styles.link}>Go Home</a>
        </>
      )}
    </div>
  );
}

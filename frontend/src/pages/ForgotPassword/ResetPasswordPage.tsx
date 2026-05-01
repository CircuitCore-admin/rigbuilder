import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { ApiError } from '../../utils/api';
import styles from './ForgotPasswordPage.module.scss';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      navigate('/login?reset=success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.body}>
            <div className={styles.error}>Invalid or missing reset token.</div>
            <Link to="/forgot-password" className={styles.backLink}>Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Rig<span>Builder</span></div>
          <p className={styles.subtitle}>Set a new password</p>
        </div>
        <form className={styles.body} onSubmit={handleSubmit}>
          {error && <div id="reset-error" className={styles.error} role="alert">{error}</div>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reset-password">New Password</label>
            <input
              id="reset-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby={error ? 'reset-error' : undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reset-confirm">Confirm New Password</label>
            <input
              id="reset-confirm"
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              autoComplete="new-password"
              aria-describedby={error ? 'reset-error' : undefined}
            />
          </div>
          <button className={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
          <Link to="/login" className={styles.backLink}>← Back to sign in</Link>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;

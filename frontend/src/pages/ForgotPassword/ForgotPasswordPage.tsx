import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import styles from './ForgotPasswordPage.module.scss';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Rig<span>Builder</span></div>
          <p className={styles.subtitle}>Reset your password</p>
        </div>

        {submitted ? (
          <div className={styles.body}>
            <div className={styles.success}>
              <p>If an account with that email exists, a reset link has been sent. Check your inbox (and spam folder).</p>
            </div>
            <Link to="/login" className={styles.backLink}>← Back to sign in</Link>
          </div>
        ) : (
          <form className={styles.body} onSubmit={handleSubmit}>
            {error && <div id="forgot-error" className={styles.error} role="alert">{error}</div>}
            <p className={styles.hint}>Enter your email and we'll send you a link to reset your password.</p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                className={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                aria-describedby={error ? 'forgot-error' : undefined}
              />
            </div>
            <button className={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <Link to="/login" className={styles.backLink}>← Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

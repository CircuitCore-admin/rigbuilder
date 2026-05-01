import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../utils/api';
import styles from '../Login/LoginPage.module.scss';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) { setError('You must accept the Terms of Service and Privacy Policy'); return; }
    setError(null);
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Rig<span>Builder</span></div>
          <p className={styles.subtitle}>Create your account</p>
        </div>
        <form className={styles.body} onSubmit={handleSubmit}>
          {error && <span id="register-error" className={styles.error} role="alert">{error}</span>}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-username">Username</label>
            <input
              id="register-username"
              className={styles.input}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="racername42"
              required
              autoComplete="username"
              minLength={3}
              maxLength={24}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-email">Email</label>
            <input
              id="register-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="register-password">Password</label>
            <input
              id="register-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 10 characters"
              required
              autoComplete="new-password"
              minLength={10}
              aria-describedby={error ? 'register-error' : undefined}
            />
          </div>
          <label className={styles.termsLabel}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              required
            />
            <span>
              I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and{' '}
              <Link to="/privacy" target="_blank">Privacy Policy</Link>
            </span>
          </label>
          <button className={styles.submitBtn} type="submit" disabled={loading || !termsAccepted}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <div className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;

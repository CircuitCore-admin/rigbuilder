import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './CookieConsent.module.scss';

const STORAGE_KEY = 'rigbuilder_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(STORAGE_KEY, 'all');
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(STORAGE_KEY, 'essential');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie consent">
      <div className={styles.content}>
        <div className={styles.text}>
          <p>
            We use essential cookies to keep you logged in, and optional analytics cookies to improve the Platform.
            See our <Link to="/privacy">Privacy Policy</Link> for details.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.essentialBtn} onClick={handleEssentialOnly}>
            Essential Only
          </button>
          <button className={styles.acceptBtn} onClick={handleAcceptAll}>
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

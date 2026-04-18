import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import styles from './OnboardingPage.module.scss';

const CATEGORIES = [
  { key: 'WHEELBASE', label: 'Wheel Bases', icon: '🎡' },
  { key: 'PEDALS', label: 'Pedals', icon: '🦶' },
  { key: 'COCKPIT', label: 'Rigs & Cockpits', icon: '🏗️' },
  { key: 'WHEEL_RIM', label: 'Wheel Rims', icon: '⭕' },
  { key: 'SEAT', label: 'Seats', icon: '💺' },
  { key: 'SHIFTER', label: 'Shifters', icon: '🔀' },
  { key: 'DISPLAY', label: 'Monitors', icon: '🖥️' },
  { key: 'EXTRAS', label: 'Accessories', icon: '🔧' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSteps = 4;

  const toggleInterest = (key: string) => {
    setSelectedInterests(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSaveInterests = async () => {
    setSaving(true);
    try {
      await api('/users/profile', { method: 'PUT', body: { interests: selectedInterests } });
    } catch { /* continue anyway */ }
    setSaving(false);
    setStep(2);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (bio.trim()) body.bio = bio.trim();
      if (location.trim()) body.location = location.trim();
      if (discordUsername.trim()) body.discordUsername = discordUsername.trim();
      if (Object.keys(body).length > 0) {
        await api('/users/profile', { method: 'PUT', body });
      }
    } catch { /* continue anyway */ }
    setSaving(false);
    setStep(3);
  };

  const handleComplete = async (dest?: string) => {
    try {
      await api('/users/profile', { method: 'PUT', body: { onboardingCompleted: true } });
      await refreshUser();
    } catch { /* continue anyway */ }
    navigate(dest ?? '/');
  };

  return (
    <div className={styles.onboardingPage}>
      <div className={styles.onboardingCard}>
        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ''}`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <h1 className={styles.onboardingTitle}>Welcome to RigBuilder! 🏁</h1>
            <p className={styles.onboardingSubtitle}>
              The all-in-one platform for sim racing enthusiasts. Build rigs, compare gear, trade with the community, and find your perfect setup.
            </p>
            <button className={styles.continueBtn} onClick={() => setStep(1)}>
              Get Started
            </button>
          </>
        )}

        {/* Step 1: Pick interests */}
        {step === 1 && (
          <>
            <h1 className={styles.onboardingTitle}>What are you interested in?</h1>
            <p className={styles.onboardingSubtitle}>
              Select the categories you care about. We&rsquo;ll personalize your experience.
            </p>
            <div className={styles.interestGrid}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  className={`${styles.interestCard} ${selectedInterests.includes(cat.key) ? styles.interestCardActive : ''}`}
                  onClick={() => toggleInterest(cat.key)}
                >
                  <span className={styles.interestIcon}>{cat.icon}</span>
                  <span className={styles.interestLabel}>{cat.label}</span>
                </button>
              ))}
            </div>
            <button className={styles.continueBtn} onClick={handleSaveInterests} disabled={saving}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button className={styles.skipLink} onClick={() => setStep(2)}>Skip</button>
          </>
        )}

        {/* Step 2: Profile setup */}
        {step === 2 && (
          <>
            <h1 className={styles.onboardingTitle}>Set up your profile</h1>
            <p className={styles.onboardingSubtitle}>
              Let the community know who you are. You can always update this later.
            </p>
            <div className={styles.profileFields}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Bio</label>
                <textarea
                  className={styles.fieldTextarea}
                  placeholder="Tell us about your sim racing journey..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Location</label>
                <input
                  className={styles.fieldInput}
                  placeholder="e.g. London, UK"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Discord</label>
                <input
                  className={styles.fieldInput}
                  placeholder="@username"
                  value={discordUsername}
                  onChange={e => setDiscordUsername(e.target.value)}
                />
              </div>
            </div>
            <button className={styles.continueBtn} onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button className={styles.skipLink} onClick={() => setStep(3)}>Skip</button>
          </>
        )}

        {/* Step 3: Start building */}
        {step === 3 && (
          <>
            <h1 className={styles.onboardingTitle}>You&rsquo;re all set! 🎉</h1>
            <p className={styles.onboardingSubtitle}>
              What would you like to do first?
            </p>
            <div className={styles.ctaGrid}>
              <button type="button" className={styles.ctaCard} onClick={() => handleComplete('/build')}>
                <span className={styles.ctaCardIcon}>🔧</span>
                <span className={styles.ctaCardTitle}>Start a Build</span>
                <span className={styles.ctaCardDesc}>Configure your dream sim rig</span>
              </button>
              <button type="button" className={styles.ctaCard} onClick={() => handleComplete('/marketplace')}>
                <span className={styles.ctaCardIcon}>🛒</span>
                <span className={styles.ctaCardTitle}>Browse Marketplace</span>
                <span className={styles.ctaCardDesc}>Find deals from the community</span>
              </button>
              <button type="button" className={styles.ctaCard} onClick={() => handleComplete('/community')}>
                <span className={styles.ctaCardIcon}>💬</span>
                <span className={styles.ctaCardTitle}>Join Community</span>
                <span className={styles.ctaCardDesc}>Discuss, ask, and share</span>
              </button>
            </div>
            <button className={styles.skipLink} onClick={() => handleComplete('/')}>
              Explore on my own
            </button>
          </>
        )}
      </div>
    </div>
  );
}

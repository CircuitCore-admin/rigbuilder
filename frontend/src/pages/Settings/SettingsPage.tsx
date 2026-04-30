import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast/Toast';
import { CustomSelect } from '../../components/CustomSelect/CustomSelect';
import styles from './SettingsPage.module.scss';

interface BlockedUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Privacy
  const [visibility, setVisibility] = useState('PUBLIC');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Discord
  const [discord, setDiscord] = useState('');

  // Digest
  const [digestFrequency, setDigestFrequency] = useState('WEEKLY');

  // Account deletion
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  useEffect(() => {
    if (!user) return;
    api<any>(`/users/${user.username}`)
      .then(p => {
        setVisibility(p.profileVisibility ?? 'PUBLIC');
        setDiscord(p.discordUsername ?? '');
        setDigestFrequency(p.digestFrequency ?? 'WEEKLY');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    api<BlockedUser[]>('/users/blocked').then(setBlockedUsers).catch(() => {});
  }, [user]);

  const handleSavePrivacy = async () => {
    try {
      await api('/users/profile', { method: 'PUT', body: { profileVisibility: visibility } });
      showToast('Privacy settings saved', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    setPasswordSaving(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      showToast('Password changed', 'success');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally { setPasswordSaving(false); }
  };

  const handleSaveDiscord = async () => {
    try {
      await api('/users/profile', { method: 'PUT', body: { discordUsername: discord || null } });
      showToast('Discord updated', 'success');
    } catch { showToast('Failed to save', 'error'); }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') {
      showToast('Please type DELETE MY ACCOUNT to confirm', 'error');
      return;
    }
    if (!deletePassword) { showToast('Password required', 'error'); return; }
    setDeleting(true);
    try {
      await api('/users/account', { method: 'DELETE', body: { password: deletePassword } });
      navigate('/');
      window.location.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete account', 'error');
    } finally { setDeleting(false); }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.settingsPage}>
      <h1 className={styles.pageTitle}>Account Settings</h1>

      {/* Privacy */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy</h2>
        <p className={styles.sectionDesc}>Control who can see your profile information. Marketplace listings and seller ratings are always public.</p>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Profile Visibility</label>
          <CustomSelect
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'PUBLIC', label: 'Public — Anyone can view your full profile' },
              { value: 'PRIVATE', label: 'Private — Only username, avatar, and seller info visible' },
            ]}
          />
        </div>
        <button className={styles.saveBtn} onClick={handleSavePrivacy}>Save Privacy Settings</button>
      </section>

      {/* Password */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Current Password</label>
          <input type="password" className={styles.fieldInput} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>New Password</label>
          <input type="password" className={styles.fieldInput} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Confirm New Password</label>
          <input type="password" className={styles.fieldInput} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
        <button className={styles.saveBtn} onClick={handleChangePassword} disabled={passwordSaving}>
          {passwordSaving ? 'Saving...' : 'Change Password'}
        </button>
      </section>

      {/* Linked Accounts */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Linked Accounts</h2>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Discord Username</label>
          <input className={styles.fieldInput} placeholder="@username" value={discord} onChange={e => setDiscord(e.target.value)} />
        </div>
        <button className={styles.saveBtn} onClick={handleSaveDiscord}>Save</button>
      </section>

      {/* Email Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Email Notifications</h2>
        <p className={styles.sectionDesc}>
          Get a summary of new listings matching your interests, trending discussions, and price drops on saved items.
        </p>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Weekly Digest</label>
          <CustomSelect
            value={digestFrequency}
            onChange={async (val) => {
              setDigestFrequency(val);
              try {
                await api('/users/profile', { method: 'PUT', body: { digestFrequency: val } });
                showToast('Preference saved', 'success');
              } catch { showToast('Failed to save', 'error'); }
            }}
            options={[
              { value: 'WEEKLY', label: 'Weekly — Every Sunday' },
              { value: 'DAILY', label: 'Daily — Every morning' },
              { value: 'NEVER', label: 'Never — No digest emails' },
            ]}
          />
        </div>
      </section>

      {/* Blocked Users */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Blocked Users</h2>
        {blockedUsers.length === 0 ? (
          <p className={styles.sectionDesc}>No blocked users</p>
        ) : (
          <div className={styles.blockedList}>
            {blockedUsers.map(u => (
              <div key={u.id} className={styles.blockedItem}>
                <span>{u.username}</span>
                <button
                  className={styles.unblockBtn}
                  onClick={async () => {
                    try {
                      await api(`/users/${u.username}/block`, { method: 'POST' });
                      setBlockedUsers(prev => prev.filter(b => b.id !== u.id));
                      showToast('Unblocked', 'success');
                    } catch { showToast('Failed', 'error'); }
                  }}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className={styles.dangerSection}>
        <h2 className={styles.dangerTitle}>Danger Zone</h2>
        <p className={styles.sectionDesc}>
          Permanently delete your account and all associated data. This action cannot be undone and is irreversible.
          Your listings, posts, and messages will be removed.
        </p>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Confirm Password</label>
          <input
            type="password"
            className={styles.fieldInput}
            placeholder="Enter your password"
            value={deletePassword}
            onChange={e => setDeletePassword(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Type <strong>DELETE MY ACCOUNT</strong> to confirm</label>
          <input
            type="text"
            className={styles.fieldInput}
            placeholder="DELETE MY ACCOUNT"
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
          />
        </div>
        <button
          className={styles.deleteBtn}
          onClick={handleDeleteAccount}
          disabled={deleting || deleteConfirm !== 'DELETE MY ACCOUNT' || !deletePassword}
        >
          {deleting ? 'Deleting…' : 'Delete My Account'}
        </button>
      </section>
    </div>
  );
}

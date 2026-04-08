import styles from './VerifiedCreatorBadge.module.scss';

interface VerifiedCreatorBadgeProps {
  role?: string;
}

/**
 * VerifiedCreatorBadge — renders a "✓ Verified Creator" badge when role is CREATOR.
 * Returns null for every other role. Import this single component on every surface
 * that displays a user identity to guarantee visual consistency.
 */
export function VerifiedCreatorBadge({ role }: VerifiedCreatorBadgeProps) {
  if (role !== 'CREATOR') return null;

  return (
    <span className={styles.badge} title="Verified Creator">
      <svg
        className={styles.icon}
        width="12"
        height="14"
        viewBox="0 0 12 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 0L7.41 1.62L9.6 1.2L9.78 3.42L11.73 4.58L10.68 6.54L11.73 8.5L9.78 9.66L9.6 11.88L7.41 11.46L6 13.08L4.59 11.46L2.4 11.88L2.22 9.66L0.27 8.5L1.32 6.54L0.27 4.58L2.22 3.42L2.4 1.2L4.59 1.62L6 0Z"
          fill="currentColor"
        />
        <path
          d="M4.5 6.2L5.4 7.2L7.5 5"
          stroke="var(--bg-void, #05050A)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified Creator
    </span>
  );
}

export default VerifiedCreatorBadge;

import styles from './Skeleton.module.scss';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.shimmer} ${className ?? ''}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        borderRadius: borderRadius !== undefined ? borderRadius : undefined,
      }}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className={styles.listingCard}>
      <div className={`${styles.shimmer} ${styles.listingCardImage}`} />
      <div className={styles.listingCardBody}>
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineLong}`} />
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineMedium}`} />
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineShort}`} />
      </div>
    </div>
  );
}

export function ThreadCardSkeleton() {
  return (
    <div className={styles.threadCard}>
      <div className={`${styles.shimmer} ${styles.threadCardAvatar}`} />
      <div className={styles.threadCardBody}>
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineLong}`} />
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineMedium}`} />
        <div className={`${styles.shimmer} ${styles.line} ${styles.lineShort}`} />
      </div>
    </div>
  );
}

import styles from "./LoadingSkeleton.module.css";

type LoadingSkeletonProps = {
  rows?: number;
};

export function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
  return (
    <div className={styles.skeleton} data-testid="loading-skeleton" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <div className={styles.skeletonHeader}>
            <div className={`${styles.skeletonBar} ${styles.skeletonTitle}`} />
          </div>
          <div className={styles.skeletonCells}>
            <div className={`${styles.skeletonBar} ${styles.skeletonCell}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonCell}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

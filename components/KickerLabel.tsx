import styles from '@/styles/KickerLabel.module.css';

export default function KickerLabel({ children, dot = true }: { children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={styles.kicker}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}

'use client';

// Current 15-minute UTC window + countdown to the next one.
import { useEffect, useState } from 'react';
import { SLOT_MINUTES } from '@/lib/constants';
import styles from '@/styles/Try.module.css';

const pad = (n: number) => String(n).padStart(2, '0');

export default function SlotClock({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <div className={styles.clock} aria-hidden />;

  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const start = Math.floor(mins / SLOT_MINUTES) * SLOT_MINUTES;
  const end = start + SLOT_MINUTES;
  const left = end * 60 - (mins * 60 + now.getUTCSeconds());
  const hm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;

  return (
    <div className={`${styles.clock} ${compact ? styles.clockCompact : ''}`}>
      <div>
        <span className={styles.clockKey}>Now airing</span>
        <span className={styles.clockVal}>{hm(start)}–{hm(end)} UTC</span>
      </div>
      <div>
        <span className={styles.clockKey}>Next window in</span>
        <span className={`${styles.clockVal} ${styles.clockCount}`}>
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </span>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/StatBox.module.css';

interface StatBoxProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

export default function StatBox({ value, label, prefix = '', suffix = '', decimals = 0 }: StatBoxProps) {
  const [display, setDisplay] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const duration = 1400;
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setDisplay(value * easeOutCubic(progress));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const formatted = display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div ref={boxRef} className={styles.box}>
      <div className={styles.num}>{prefix}{formatted}{suffix}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}

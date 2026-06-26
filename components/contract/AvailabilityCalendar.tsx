'use client';

import { useState } from 'react';
import { getDayStatus } from '@/lib/availability';
import styles from '@/styles/ContractBuilder.module.css';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Props {
  listingId: string;
  isSelected: (dateISO: string) => boolean;
  inRange?: (dateISO: string) => boolean;
  onPick: (dateISO: string) => void;
}

export default function AvailabilityCalendar({ listingId, isSelected, inRange, onPick }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = view.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  return (
    <div className={styles.cal}>
      <div className={styles.calHead}>
        <button type="button" aria-label="Previous month" onClick={() => setView(new Date(year, month - 1, 1))}>
          ‹
        </button>
        <span>{monthLabel}</span>
        <button type="button" aria-label="Next month" onClick={() => setView(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>

      <div className={styles.calWeek}>
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className={styles.calGrid}>
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const id = iso(d);
          const past = d < today;
          const status = getDayStatus(listingId, id);
          const disabled = past || status === 'full';
          const cls = [styles.day, styles[`day_${status}`]];
          if (disabled) cls.push(styles.dayDisabled);
          if (inRange?.(id)) cls.push(styles.dayRange);
          if (isSelected(id)) cls.push(styles.daySelected);
          return (
            <button
              type="button"
              key={i}
              disabled={disabled}
              className={cls.join(' ')}
              onClick={() => onPick(id)}
              title={`${id} · ${status}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span><i className={styles.swOpen} />Available</span>
        <span><i className={styles.swPartial} />Partial</span>
        <span><i className={styles.swFull} />Booked</span>
        <span><i className={styles.swSel} />Selected</span>
      </div>
    </div>
  );
}

'use client';

import type { ListingType } from '@/lib/mockData';
import { TYPE_LABELS } from '@/lib/mockData';
import styles from '@/styles/FilterBar.module.css';

const ALL_TYPES = Object.keys(TYPE_LABELS) as ListingType[];

interface FilterBarProps {
  active: ListingType | 'all';
  onChange: (v: ListingType | 'all') => void;
}

export default function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className={styles.bar}>
      <button
        className={`${styles.pill} ${active === 'all' ? styles.active : ''}`}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {ALL_TYPES.map((type) => (
        <button
          key={type}
          className={`${styles.pill} ${active === type ? styles.active : ''}`}
          onClick={() => onChange(type)}
        >
          {TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}

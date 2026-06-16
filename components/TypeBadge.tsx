import type { ListingType } from '@/lib/mockData';
import { TYPE_LABELS, TYPE_ICONS } from '@/lib/mockData';
import styles from '@/styles/TypeBadge.module.css';

export default function TypeBadge({ type }: { type: ListingType }) {
  return (
    <span className={`${styles.badge} ${styles[type]}`}>
      {TYPE_ICONS[type]} {TYPE_LABELS[type]}
    </span>
  );
}

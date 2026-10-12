import {
  SLOT_PRICE_USDC,
  SLOT_MINUTES,
  OUTBID_MIN_INCREMENT_USDC,
  FILLER_PRICE_USDC,
  FILLER_MINUTES_PER_DAY,
} from '@/lib/constants';
import styles from '@/styles/Try.module.css';

export default function PriceChips({ className = '' }: { className?: string }) {
  return (
    <div className={`${styles.prices} ${className}`}>
      <div className={styles.price}>
        <div className={styles.priceKey}>Exclusive slot</div>
        <div className={styles.priceVal}>${SLOT_PRICE_USDC}<small>USDC</small></div>
        <p className={styles.priceText}>{SLOT_MINUTES} minutes on screen, yours alone. Pick any window, UTC.</p>
      </div>
      <div className={styles.price}>
        <div className={styles.priceKey}>Outbid</div>
        <div className={styles.priceVal}>+${OUTBID_MIN_INCREMENT_USDC}<small>over holder</small></div>
        <p className={styles.priceText}>Want a booked window? Top the current bid. Highest verified payment airs.</p>
      </div>
      <div className={styles.price}>
        <div className={styles.priceKey}>Filler</div>
        <div className={styles.priceVal}>${FILLER_PRICE_USDC}<small>/ day</small></div>
        <p className={styles.priceText}>{FILLER_MINUTES_PER_DAY} minutes of airtime spread across the day&apos;s open windows.</p>
      </div>
    </div>
  );
}

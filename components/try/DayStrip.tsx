'use client';

// Today's 96 fifteen-minute windows (UTC), coloured from real on-chain bookings.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SLOTS_PER_DAY, SLOT_MINUTES } from '@/lib/constants';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import { getListingBookings, slotTopBids } from '@/lib/bookings';
import styles from '@/styles/Try.module.css';

export default function DayStrip({ listing = HOUSE_LISTING_ID }: { listing?: string }) {
  const [booked, setBooked] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState(-1);

  useEffect(() => {
    const now = new Date();
    setCurrent(Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / SLOT_MINUTES));
    const today = now.toISOString().slice(0, 10);
    getListingBookings(listing)
      .then((b) => setBooked(new Set(slotTopBids(b, today).keys())))
      .catch(() => {});
  }, [listing]);

  // Only windows from now onward are still bookable today.
  const open =
    current < 0
      ? SLOTS_PER_DAY
      : Array.from({ length: SLOTS_PER_DAY - current }, (_, k) => k + current).filter((i) => !booked.has(i)).length;

  return (
    <div className={styles.strip}>
      <div className={styles.stripHead}>
        <span>Today · 96 windows</span>
        <span><b>{open}</b> still open · {booked.size} booked</span>
      </div>
      <Link href={`/marketplace/${listing}`} className={styles.stripGrid} aria-label="Book a window">
        {Array.from({ length: SLOTS_PER_DAY }, (_, i) => (
          <span
            key={i}
            className={styles.stripCell}
            data-state={i === current ? 'now' : booked.has(i) ? 'booked' : i < current ? 'past' : 'open'}
          />
        ))}
      </Link>
      <div className={styles.stripAxis}>
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  );
}

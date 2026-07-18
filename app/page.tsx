'use client';

import { useEffect, useState } from 'react';
import type { Listing } from '@/lib/mockData';
import { LISTINGS } from '@/lib/mockData';
import { getAllListings } from '@/lib/listings';
import ListingGrid from '@/components/ListingGrid';
import KickerLabel from '@/components/KickerLabel';
import styles from '@/styles/Marketplace.module.css';

// The dApp opens straight on the listings — users arrive funneled from the
// marketing site, so there's no separate landing/splash. Minimal friction.
// Seed catalog renders instantly; on-chain listings merge in once loaded.
export default function Home() {
  const [listings, setListings] = useState<Listing[]>(LISTINGS);

  useEffect(() => {
    let active = true;
    getAllListings()
      .then((l) => { if (active) setListings(l); })
      .catch(() => { /* keep seed catalog on error */ });
    return () => { active = false; };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <KickerLabel>Marketplace</KickerLabel>
        <h1 className={styles.title}>Browse Ad Inventory</h1>
        <p className={styles.meta}>{listings.length} listings · Devnet · Updated live</p>
      </div>
      <div className={styles.body}>
        <ListingGrid listings={listings} />
      </div>
    </div>
  );
}

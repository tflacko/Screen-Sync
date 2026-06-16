'use client';

import { useState } from 'react';
import type { Listing, ListingType } from '@/lib/mockData';
import ListingCard from './ListingCard';
import FilterBar from './FilterBar';
import styles from '@/styles/ListingGrid.module.css';

export default function ListingGrid({ listings }: { listings: Listing[] }) {
  const [filter, setFilter] = useState<ListingType | 'all'>('all');
  const visible = filter === 'all' ? listings : listings.filter((l) => l.type === filter);

  return (
    <div>
      <FilterBar active={filter} onChange={setFilter} />
      <div style={{ marginTop: '2rem' }} className={styles.grid}>
        {visible.length === 0 ? (
          <p className={styles.empty}>No listings match this filter.</p>
        ) : (
          visible.map((listing) => <ListingCard key={listing.id} listing={listing} />)
        )}
      </div>
    </div>
  );
}

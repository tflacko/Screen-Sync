'use client';

// React twin of public/tag.js: renders whatever /api/ad says is live right now
// (paid slot > filler > house ad) and refreshes every 60s.
import { useEffect, useState } from 'react';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import styles from '@/styles/Try.module.css';

interface Ad {
  kind: 'slot' | 'filler' | 'house';
  imageUrl: string;
  clickUrl: string;
  bidUsdc?: number;
}

const KIND_LABEL: Record<Ad['kind'], string> = {
  slot: 'Live · paid slot',
  filler: 'Live · filler',
  house: 'Open · book this space',
};

export default function LiveAdSlot({
  listing = HOUSE_LISTING_ID,
  aspect = '728 / 90',
  showTag = true,
  className = '',
}: {
  listing?: string;
  aspect?: string;
  showTag?: boolean;
  className?: string;
}) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch(`/api/ad?listing=${encodeURIComponent(listing)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((a: Ad | null) => { if (active && a) setAd(a); })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { active = false; clearInterval(t); };
  }, [listing]);

  return (
    <div className={`${styles.slot} ${className}`} style={{ aspectRatio: aspect }} data-kind={ad?.kind ?? 'loading'}>
      {ad ? (
        <a href={ad.clickUrl} rel="sponsored">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.imageUrl} alt="Advertisement served on-chain by Screen Sync" />
        </a>
      ) : (
        <div className={styles.slotSkeleton} />
      )}
      {showTag && ad && (
        <span className={styles.slotTag} data-kind={ad.kind}>
          <i />
          {KIND_LABEL[ad.kind]}
          {ad.kind === 'slot' && ad.bidUsdc ? ` · $${ad.bidUsdc}` : ''}
        </span>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Listing } from '@/lib/mockData';
import { LISTINGS, PUBLISHER_LABELS, listingImage } from '@/lib/mockData';
import { getListingById } from '@/lib/listings';
import TypeBadge from '@/components/TypeBadge';
import KickerLabel from '@/components/KickerLabel';
import ContractBuilder from '@/components/contract/ContractBuilder';
import styles from '@/styles/ListingDetail.module.css';

function fmtImpr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seed = LISTINGS.find((l) => l.id === id);
    if (seed) { setListing(seed); setLoading(false); return; }
    let active = true;
    setLoading(true);
    getListingById(id)
      .then((l) => { if (active) { setListing(l); setLoading(false); } })
      .catch(() => { if (active) { setListing(null); setLoading(false); } });
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className={styles.notFound}><p>Loading listing…</p></div>;
  }

  if (!listing) {
    return (
      <div className={styles.notFound}>
        <p>Listing not found.</p>
        <Link href="/" style={{ color: 'var(--cherry-bright)', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Listings
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div style={{ width: 'var(--container)', margin: '0 auto' }}>
        <Link href="/" className={styles.back}>← Back to Listings</Link>
      </div>

      <div className={styles.layout}>
        {/* Left column */}
        <div>
          <div className={styles.media} data-type={listing.type}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listingImage(listing)} alt={listing.title} className={styles.mediaImg} />
          </div>

          <div className={styles.infoSection}>
            <KickerLabel>Listing Details</KickerLabel>
            <h1 className={styles.title}>{listing.title}</h1>
            <p className={styles.location}>{listing.location}</p>
            <div className={styles.badgeRow}>
              <TypeBadge type={listing.type} />
              <span className={`${styles.publisherBadge} ${styles[listing.publisherType]}`}>
                {PUBLISHER_LABELS[listing.publisherType]} Publisher
              </span>
            </div>
            <p className={styles.description}>{listing.description}</p>
            <div className={styles.tags}>
              {listing.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>

          <div className={styles.specGrid}>
            <div className={styles.spec}>
              <div className={styles.specKey}>Impressions / Day</div>
              <div className={styles.specVal}>{fmtImpr(listing.impressionsPerDay)}</div>
            </div>
            <div className={styles.spec}>
              <div className={styles.specKey}>Publisher</div>
              <div className={styles.specVal}>{PUBLISHER_LABELS[listing.publisherType]}</div>
            </div>
            <div className={styles.spec}>
              <div className={styles.specKey}>Audience</div>
              <div className={styles.specVal}>{listing.audience.split(',')[0]}</div>
            </div>
            <div className={styles.spec}>
              <div className={styles.specKey}>Network</div>
              <div className={styles.specVal}>Solana Devnet</div>
            </div>
            <div className={styles.spec}>
              <div className={styles.specKey}>Media Storage</div>
              <div className={styles.specVal}>IPFS · Pinata</div>
            </div>
            <div className={styles.spec} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.specKey}>Full Audience</div>
              <div className={styles.specVal}>{listing.audience}</div>
            </div>
          </div>
        </div>

        {/* Right column — Contract Builder */}
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <ContractBuilder listing={listing} />
            <div className={styles.cidRow}>IPFS CID: {listing.ipfsCid}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

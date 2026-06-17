'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LISTINGS, PUBLISHER_LABELS, listingImage } from '@/lib/mockData';
import { bookingTotal } from '@/lib/pricing';
import { PLATFORM_FEE_BPS } from '@/lib/constants';
import TypeBadge from '@/components/TypeBadge';
import Button from '@/components/Button';
import KickerLabel from '@/components/KickerLabel';
import styles from '@/styles/ListingDetail.module.css';

function fmtImpr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const listing = LISTINGS.find((l) => l.id === id);
  const [days, setDays] = useState(7);
  const [booked, setBooked] = useState(false);

  if (!listing) {
    return (
      <div className={styles.notFound}>
        <p>Listing not found.</p>
        <Link href="/marketplace" style={{ color: 'var(--cherry-bright)', marginTop: '1rem', display: 'inline-block' }}>
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const { base, fee, total } = bookingTotal(listing.pricePerDay, days);
  const feePct = (PLATFORM_FEE_BPS / 100).toFixed(1);

  function handleBook() {
    setBooked(true);
    setTimeout(() => setBooked(false), 3000);
  }

  return (
    <div className={styles.page}>
      <div style={{ width: 'var(--container)', margin: '0 auto' }}>
        <Link href="/marketplace" className={styles.back}>← Back to Marketplace</Link>
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

        {/* Right column — booking panel */}
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <div className={styles.panelPrice}>
              <div>
                <span className={styles.panelPriceNum}>{listing.pricePerDay.toFixed(2)}</span>
                <span className={styles.panelPriceSol}>SOL</span>
              </div>
              <div className={styles.panelPriceLabel}>per day · {fmtImpr(listing.impressionsPerDay)} impressions</div>
            </div>

            <div className={styles.daysRow}>
              <label className={styles.daysLabel} htmlFor="days">Duration (days)</label>
              <input
                id="days"
                type="number"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                className={styles.daysInput}
              />
            </div>

            <div className={styles.feeRow}>
              <span>Subtotal ({days} {days === 1 ? 'day' : 'days'})</span>
              <span>{base.toFixed(3)} SOL</span>
            </div>
            <div className={styles.feeRow}>
              <span>Protocol fee ({feePct}%)</span>
              <span>{fee.toFixed(3)} SOL</span>
            </div>
            <div className={styles.totalRow}>
              <span>Estimated Total</span>
              <span className={styles.totalVal}>{total.toFixed(3)} SOL</span>
            </div>

            <Button
              variant="cherry"
              full
              onClick={handleBook}
              disabled={booked}
            >
              {booked ? '✓ Request Sent (Mock)' : 'Book Now'}
            </Button>
            <div className={styles.btnGap}>
              <Button variant="ghost" full>Make Offer</Button>
            </div>

            <div className={styles.ownerRow}>
              <span>Owner</span>
              <span className={styles.ownerAddr}>{listing.owner}</span>
            </div>
            <div className={styles.cidRow}>IPFS CID: {listing.ipfsCid}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import type { Listing } from '@/lib/mockData';
import { listingImage } from '@/lib/mockData';
import Card from './Card';
import TypeBadge from './TypeBadge';
import Button from './Button';
import styles from '@/styles/ListingCard.module.css';

function fmtImpr(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const { id, type, title, location, pricePerDay, impressionsPerDay, verified } = listing;
  return (
    <Card className={styles.card}>
      <div className={styles.thumb} data-type={type}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={listingImage(listing)} alt={title} className={styles.thumbImg} loading="lazy" />
        {verified && <span className={styles.verifiedBadge}>✓ Verified</span>}
      </div>
      <div className={styles.header}>
        <TypeBadge type={type} />
      </div>
      <p className={styles.title}>{title}</p>
      <p className={styles.location}>{location}</p>
      <hr className={styles.divider} />
      <div className={styles.meta}>
        <div className={styles.price}>
          <span className={styles.priceNum}>{pricePerDay.toFixed(2)}</span>
          <span className={styles.priceSol}>SOL</span>
          <span className={styles.priceLabel}>per day</span>
        </div>
        <div className={styles.impr}>
          <span className={styles.imprNum}>{fmtImpr(impressionsPerDay)}</span>
          <span className={styles.imprLabel}>impr / day</span>
        </div>
      </div>
      <Button href={`/marketplace/${id}`} variant="cherry" full size="sm">
        View Details →
      </Button>
    </Card>
  );
}

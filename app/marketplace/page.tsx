import { LISTINGS } from '@/lib/mockData';
import ListingGrid from '@/components/ListingGrid';
import KickerLabel from '@/components/KickerLabel';
import styles from '@/styles/Marketplace.module.css';

export default function MarketplacePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <KickerLabel>Marketplace</KickerLabel>
        <h1 className={styles.title}>Browse Ad Inventory</h1>
        <p className={styles.meta}>{LISTINGS.length} listings · Devnet · Updated live</p>
      </div>
      <div className={styles.body}>
        <ListingGrid listings={LISTINGS} />
      </div>
    </div>
  );
}

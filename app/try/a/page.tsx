import Button from '@/components/Button';
import LiveAdSlot from '@/components/try/LiveAdSlot';
import SlotClock from '@/components/try/SlotClock';
import PriceChips from '@/components/try/PriceChips';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import styles from '@/styles/Try.module.css';

export const metadata = { title: 'Try Screen Sync — Live ad space' };

// Variant A — Billboard: one big live slot is the hero.
export default function TryBillboard() {
  return (
    <div className={styles.page}>
      <div className={`${styles.wrap} ${styles.aHero}`}>
        <span className={styles.kicker}>Live on-chain ad space</span>
        <h1 className={styles.h1}>This banner is <em>for sale.</em><br />Right now.</h1>
        <p className={styles.lede}>
          The space below is real. Book a 15-minute window for $20 USDC, upload your creative,
          and it airs here, settled on Solana with media on IPFS.
        </p>

        <div className={styles.aStage}>
          <div className={styles.aFrame}>
            <LiveAdSlot aspect="728 / 180" />
          </div>
          <div className={styles.aMeta}>
            <SlotClock />
            <div className={styles.ctaRow} style={{ marginTop: 0 }}>
              <Button href={`/marketplace/${HOUSE_LISTING_ID}`} variant="cherry">Book this exact space →</Button>
              <Button href="/" variant="ghost">Browse marketplace</Button>
            </div>
          </div>
        </div>

        <PriceChips className={styles.aPrices} />
        <p className={styles.fine}>Devnet MVP · Paid in USDC · Your ad appears within ~60s of its window opening</p>
      </div>
    </div>
  );
}

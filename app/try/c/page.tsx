import Link from 'next/link';
import Button from '@/components/Button';
import LiveAdSlot from '@/components/try/LiveAdSlot';
import SlotClock from '@/components/try/SlotClock';
import PriceChips from '@/components/try/PriceChips';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import styles from '@/styles/Try.module.css';

export const metadata = { title: 'Try Screen Sync — Ads, the way publishers will run them' };

const BOOK = `/marketplace/${HOUSE_LISTING_ID}`;

function Placement({ aspect, label }: { aspect: string; label: string }) {
  return (
    <div className={styles.placement}>
      <div className={styles.placementLabel}>
        <span>{label}</span>
        <Link href={BOOK}>Book this →</Link>
      </div>
      <LiveAdSlot aspect={aspect} />
    </div>
  );
}

// Variant C — Editorial: real placements threaded through a sample article.
export default function TryEditorial() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.cTop}>
          <div>
            <span className={styles.kicker}>Publisher preview</span>
            <h1 className={styles.h1}>Ads that <em>settle themselves.</em></h1>
          </div>
          <SlotClock compact />
        </div>

        <Placement aspect="728 / 90" label="Leaderboard · on-chain" />

        <div className={styles.cLayout}>
          <article className={styles.article}>
            <h2>Why ad space belongs on-chain</h2>
            <p>
              Every ad you see online passes through a stack of intermediaries that each take a cut and
              keep the receipts. Screen Sync removes the stack: the publisher lists a screen, the
              advertiser books it, and Solana records the deal.
            </p>
            <p>
              The banners on this page are not mockups. They read the same booking ledger as our
              homepage. Whatever has been paid for in the current 15-minute window is what you see.
            </p>
            <Placement aspect="728 / 120" label="In-article · on-chain" />
            <h2>How a booking works</h2>
            <p>
              An advertiser picks a window, uploads a creative to IPFS, and pays in USDC. The payment
              carries the booking terms and the creative&apos;s content ID, so anyone can verify what
              should air and when.
            </p>
            <p>
              Prices are fixed in USDC, so there is no oracle and no surprise. A booked window can be
              outbid, and unbooked time is shared out as filler.
            </p>
          </article>

          <aside className={styles.side}>
            <div className={styles.placement} style={{ margin: 0 }}>
              <div className={styles.placementLabel}>
                <span>Sidebar · on-chain</span>
                <Link href={BOOK}>Book →</Link>
              </div>
              <LiveAdSlot aspect="300 / 250" />
            </div>
            <div className={styles.sideCard}>
              <h3>Run your ad here</h3>
              <p className={styles.stepText}>$20 USDC per 15-minute window. Live within a minute of opening.</p>
              <div className={styles.ctaRow} style={{ marginTop: '1rem' }}>
                <Button href={BOOK} variant="cherry" full>Book a window</Button>
              </div>
            </div>
          </aside>
        </div>

        <div style={{ marginTop: 'var(--section-pad)' }}>
          <PriceChips />
        </div>
      </div>
    </div>
  );
}

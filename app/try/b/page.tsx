import Button from '@/components/Button';
import LiveAdSlot from '@/components/try/LiveAdSlot';
import SlotClock from '@/components/try/SlotClock';
import DayStrip from '@/components/try/DayStrip';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import { SLOT_PRICE_USDC, FILLER_PRICE_USDC } from '@/lib/constants';
import styles from '@/styles/Try.module.css';

export const metadata = { title: 'Try Screen Sync — How it works, live' };

const STEPS = [
  { t: 'Pick a window', d: `Choose any open 15-minute window (UTC) for $${SLOT_PRICE_USDC}, outbid a booked one, or run filler at $${FILLER_PRICE_USDC}/day.` },
  { t: 'Upload your creative', d: 'Your image is pinned to IPFS. Its content ID travels with your booking, so nobody can swap it.' },
  { t: 'Pay in USDC', d: 'One wallet signature. Funds settle to the Screen Sync treasury on Solana, with the terms written on-chain.' },
  { t: 'Go live', d: 'When your window opens, this banner serves your ad on screensync.xyz. Verify it all on Solana Explorer.' },
];

// Variant B — Live demo: browser mock + how-it-works + today's schedule.
export default function TryDemo() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.kicker}>Try it · P2P advertising, live</span>
        <h1 className={styles.h1}>Watch an ad slot <em>work on-chain.</em></h1>
        <p className={styles.lede}>
          No middlemen, no ad network. Book the banner in this demo, and the chain decides what airs.
        </p>

        <div className={styles.bGrid}>
          <div>
            <div className={styles.browser}>
              <div className={styles.browserBar}>
                <i /><i /><i />
                <span className={styles.browserUrl}>screensync.xyz</span>
              </div>
              <div className={styles.browserBody}>
                <LiveAdSlot />
                <div className={styles.ghostLine} />
                <div className={styles.ghostLine} />
                <div className={styles.ghostLine} />
                <div className={styles.ghostLine} />
              </div>
            </div>
            <div className={styles.bStrip}>
              <DayStrip />
            </div>
          </div>

          <div>
            <SlotClock />
            <div className={styles.steps} style={{ marginTop: '1.8rem' }}>
              {STEPS.map((s, i) => (
                <div key={s.t} className={styles.step}>
                  <span className={styles.stepNum}>0{i + 1}</span>
                  <div>
                    <div className={styles.stepTitle}>{s.t}</div>
                    <p className={styles.stepText}>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.ctaRow}>
              <Button href={`/marketplace/${HOUSE_LISTING_ID}`} variant="cherry">Book a window →</Button>
            </div>
            <p className={styles.fine}>Devnet MVP · USDC only · No price oracle, fixed prices</p>
          </div>
        </div>
      </div>
    </div>
  );
}

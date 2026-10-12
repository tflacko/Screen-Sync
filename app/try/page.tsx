import Link from 'next/link';
import styles from '@/styles/Try.module.css';

export const metadata = { title: 'Try Screen Sync — variants' };

// Review index for the /try variants. After picking a winner, point the
// marketing site's "Try now" at /try/<variant> (or make it the /try default).
const VARIANTS = [
  { id: 'a', name: 'Billboard', desc: 'One big live slot as the hero, with countdown, prices, and a single CTA. Fastest path to a booking.' },
  { id: 'b', name: 'Live demo', desc: 'Browser mock + 4-step explainer + today’s 96-window schedule. Best for explaining P2P ads.' },
  { id: 'c', name: 'Editorial', desc: 'Sample article with leaderboard, in-article and sidebar placements. Shows what publishers will embed.' },
];

export default function TryIndex() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.kicker}>Review</span>
        <h1 className={styles.h1}>Try-now page <em>variants</em></h1>
        <div className={styles.variants}>
          {VARIANTS.map((v) => (
            <Link key={v.id} href={`/try/${v.id}`} className={styles.variantCard}>
              <span className={styles.kicker}>Variant {v.id.toUpperCase()}</span>
              <h3>{v.name}</h3>
              <p>{v.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

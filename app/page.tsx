'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import ParticleCanvas from '@/components/ParticleCanvas';
import Button from '@/components/Button';
import WalletButton from '@/components/WalletButton';
import styles from '@/styles/Home.module.css';

const TICKER_ITEMS = [
  'P2P Ad Marketplace',
  'Solana-Powered',
  'On-Chain Listings',
  'IPFS Media Storage',
  'Instant Settlement',
  'No Middlemen',
  'Verified Inventory',
  'Real-Time Analytics',
];

export default function Home() {
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <main className={styles.hero}>
      <ParticleCanvas />

      <div className={styles.content}>
        <div className={styles.eyebrow}>Now on Devnet</div>

        <h1 className={styles.h1}>
          The P2P Ad
          <span>Marketplace</span>
        </h1>

        <p className={styles.sub}>
          List your screen. Book attention. Settle instantly — all on-chain.
          <br />
          Seven inventory types. One open protocol.
        </p>

        <div className={styles.solanaChip}>
          <span className={styles.solanaDot} />
          Built on Solana · IPFS via Pinata
        </div>

        <div className={styles.ctas}>
          {mounted && connected ? (
            <>
              <Button href="/marketplace" variant="cherry">Enter Marketplace →</Button>
              <Button href="/dashboard" variant="ghost">My Dashboard</Button>
            </>
          ) : (
            <>
              <WalletButton />
              <Button href="/marketplace" variant="ghost">Browse Listings</Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {doubled.map((item, i) => (
            <span key={i} className={styles.tickerItem}>
              {item}
              {i < doubled.length - 1 && <span className={styles.tickerSep}> ◆ </span>}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

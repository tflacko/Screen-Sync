'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LISTINGS } from '@/lib/mockData';
import StatBox from '@/components/StatBox';
import ListingCard from '@/components/ListingCard';
import KickerLabel from '@/components/KickerLabel';
import Button from '@/components/Button';
import WalletButton from '@/components/WalletButton';
import styles from '@/styles/Dashboard.module.css';

const MOCK_USER_LISTINGS = LISTINGS.slice(0, 3);

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!connected) {
    return (
      <div className={styles.page}>
        <div className={styles.connect}>
          <div className={styles.connectIcon}>🔐</div>
          <h1 className={styles.connectTitle}>Connect Your Wallet</h1>
          <p className={styles.connectSub}>
            Connect a Solana wallet to access your dashboard, view listings, and manage campaigns.
          </p>
          <WalletButton />
          <Button href="/marketplace" variant="ghost" size="sm">Browse Marketplace</Button>
        </div>
      </div>
    );
  }

  const addr = publicKey?.toBase58() ?? '';
  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-6)}` : '';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <KickerLabel>Dashboard</KickerLabel>
        <h1 className={styles.title}>My Account</h1>
        <div className={styles.walletRow}>
          <span className={styles.walletDot} />
          {short} · Solana Devnet
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.statsRow}>
          <StatBox value={3} label="Active Listings" />
          <StatBox value={42.69} label="SOL Balance" decimals={2} />
          <StatBox value={258000} label="Total Impressions" />
          <StatBox value={2} label="Active Campaigns" />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Your Listings</h2>
            <Button href="/list" variant="cherry" size="sm">+ List New</Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
            {MOCK_USER_LISTINGS.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

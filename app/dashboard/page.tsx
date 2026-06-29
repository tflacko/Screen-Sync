'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import type { Listing } from '@/lib/mockData';
import { getBalance } from '@/lib/solana';
import { getUserListings } from '@/lib/listings';
import StatBox from '@/components/StatBox';
import ListingCard from '@/components/ListingCard';
import KickerLabel from '@/components/KickerLabel';
import Button from '@/components/Button';
import WalletButton from '@/components/WalletButton';
import styles from '@/styles/Dashboard.module.css';

export default function DashboardPage() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!publicKey) return;
    const addr = publicKey.toBase58();
    let active = true;
    getBalance(addr).then((b) => { if (active) setBalance(b); }).catch(() => {});
    getUserListings(addr).then((l) => { if (active) setListings(l); }).catch(() => {});
    return () => { active = false; };
  }, [publicKey]);

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
          <Button href="/" variant="ghost" size="sm">Browse Marketplace</Button>
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
          <StatBox value={listings.length} label="Active Listings" />
          <StatBox value={balance ?? 0} label="SOL Balance" decimals={2} />
          <StatBox value={listings.reduce((s, l) => s + l.impressionsPerDay, 0)} label="Impressions / Day" />
          <StatBox value={0} label="Active Campaigns" />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Your Listings</h2>
            <Button href="/list" variant="cherry" size="sm">+ List New</Button>
          </div>
          {listings.length === 0 ? (
            <p style={{ color: 'var(--beige-dim)', padding: '1.5rem 0', lineHeight: 1.6 }}>
              You haven&apos;t registered any listings yet. Create one to see it here and in the marketplace.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
              {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

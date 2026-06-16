'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useState, useRef, useEffect } from 'react';
import styles from '@/styles/WalletButton.module.css';

export default function WalletButton() {
  const { connected, publicKey, disconnect, select, wallets, connecting } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (connecting) {
    return <button className={styles.btn} disabled>Connecting…</button>;
  }

  if (connected && publicKey) {
    const addr = publicKey.toBase58();
    const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
    return (
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button className={styles.connected} onClick={() => setShowDrop((p) => !p)}>
          <span className={styles.dot} />
          <span className={styles.address}>{short}</span>
        </button>
        {showDrop && (
          <div className={styles.dropdown}>
            <button
              className={styles.dropItem}
              onClick={() => { navigator.clipboard.writeText(addr); setShowDrop(false); }}
            >
              Copy Address
            </button>
            <button
              className={`${styles.dropItem} ${styles.danger}`}
              onClick={() => { disconnect(); setShowDrop(false); }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button className={styles.btn} onClick={() => setShowModal(true)}>
        Connect Wallet
      </button>
      {showModal && <WalletModal wallets={wallets} onSelect={(name) => { select(name); setShowModal(false); }} onClose={() => setShowModal(false)} />}
    </>
  );
}

function WalletModal({
  wallets,
  onSelect,
  onClose,
}: {
  wallets: ReturnType<typeof useWallet>['wallets'];
  onSelect: (name: Parameters<ReturnType<typeof useWallet>['select']>[0]) => void;
  onClose: () => void;
}) {
  const available = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable
  );
  const notInstalled = wallets.filter(
    (w) => w.readyState === WalletReadyState.NotDetected
  );
  const list = available.length > 0 ? available : notInstalled;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Connect Wallet</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {list.length === 0 ? (
          <p className={styles.noWallets}>
            No wallets detected. Install{' '}
            <a href="https://phantom.app" target="_blank" rel="noopener noreferrer">Phantom</a>{' '}
            or{' '}
            <a href="https://solflare.com" target="_blank" rel="noopener noreferrer">Solflare</a>.
          </p>
        ) : (
          <div className={styles.walletList}>
            {list.map((w) => (
              <button
                key={w.adapter.name}
                className={styles.walletOption}
                onClick={() => onSelect(w.adapter.name)}
              >
                <div className={styles.walletIcon}>
                  {w.adapter.icon && <img src={w.adapter.icon} alt={w.adapter.name} />}
                </div>
                <div>
                  <div className={styles.walletName}>{w.adapter.name}</div>
                  <div className={styles.walletStatus}>
                    {w.readyState === WalletReadyState.Installed ? 'Detected' : 'Not installed'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from 'next/link';
import styles from '@/styles/Footer.module.css';

const LINKS = [
  { href: '/', label: 'Marketplace' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/list', label: 'List Inventory' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.svg" alt="Screen Sync" className={styles.logoWordmark} />
        </div>
        <ul className={styles.links}>
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={styles.link}>{label}</Link>
            </li>
          ))}
        </ul>
        <div className={styles.solana}>
          <div className={styles.solanaDot} />
          Built on Solana
        </div>
        <p className={styles.legal}>© 2026 Screen Sync · All rights reserved · Devnet</p>
      </div>
    </footer>
  );
}

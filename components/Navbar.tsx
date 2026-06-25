'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import WalletButton from './WalletButton';
import styles from '@/styles/Navbar.module.css';

const NAV_LINKS = [
  { href: '/', label: 'Marketplace' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/list', label: 'List Inventory' },
];

export default function Navbar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.backdrop} />
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} aria-label="Screen Sync home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.svg" alt="Screen Sync" className={styles.logoWordmark} />
        </Link>
        <ul className={styles.links}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.link} ${isActive(href) ? styles.active : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.right}>
          <WalletButton />
          <button
            className={styles.menuBtn}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((p) => !p)}
          >
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarOpen1 : ''}`} />
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarOpen2 : ''}`} />
            <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarOpen3 : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu — only mounted when open */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.mobileLink} ${isActive(href) ? styles.active : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

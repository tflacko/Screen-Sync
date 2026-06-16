import type { Metadata } from 'next';
import './globals.css';
import WalletProviderWrapper from '@/components/WalletProviderWrapper';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Screen Sync — P2P Ad Marketplace on Solana',
  description: 'List your screen. Book attention. All on-chain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProviderWrapper>
          <Navbar />
          {children}
          <Footer />
        </WalletProviderWrapper>
      </body>
    </html>
  );
}

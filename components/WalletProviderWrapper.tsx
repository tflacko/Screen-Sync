'use client';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { useMemo, type FC, type PropsWithChildren } from 'react';
import { SOLANA_RPC } from '@/lib/solana';

// The Solana mobile wallet adapter drags in react-native -> @types/react@19, whose
// FC return type clashes with this app's React 18 JSX runtime. Re-type the providers
// against the app's React types so they're valid JSX components.
const ConnProvider = ConnectionProvider as unknown as FC<PropsWithChildren<{ endpoint: string }>>;
const WProvider = WalletProvider as unknown as FC<
  PropsWithChildren<{ wallets: unknown[]; autoConnect?: boolean }>
>;

export default function WalletProviderWrapper({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnProvider endpoint={SOLANA_RPC}>
      <WProvider wallets={wallets} autoConnect>
        {children}
      </WProvider>
    </ConnProvider>
  );
}

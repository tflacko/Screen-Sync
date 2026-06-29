import { PublicKey } from '@solana/web3.js';
import { getConnection } from './connection';
import { SOLANA_RPC_URL } from './config';

// Back-compat: WalletProviderWrapper imports SOLANA_RPC as its RPC endpoint.
export const SOLANA_RPC = SOLANA_RPC_URL;

const LAMPORTS = 1_000_000_000;

/** Real SOL balance for a wallet. Returns 0 on any RPC/parse error. */
export async function getBalance(walletAddress: string): Promise<number> {
  try {
    const lamports = await getConnection().getBalance(new PublicKey(walletAddress));
    return lamports / LAMPORTS;
  } catch (e) {
    console.error('[Screen Sync] getBalance failed', e);
    return 0;
  }
}

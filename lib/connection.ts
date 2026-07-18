// Shared Solana RPC connection + treasury helper. Safe to import client or server.
import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA_RPC_URL, TREASURY_ADDRESS } from './config';

let conn: Connection | null = null;

export function getConnection(): Connection {
  if (!conn) conn = new Connection(SOLANA_RPC_URL, 'confirmed');
  return conn;
}

/** Parsed treasury pubkey (payments + on-chain listing registry), or null in mock mode. */
export function getTreasury(): PublicKey | null {
  if (!TREASURY_ADDRESS) return null;
  try {
    return new PublicKey(TREASURY_ADDRESS);
  } catch {
    console.error('[Screen Sync] Invalid NEXT_PUBLIC_TREASURY_ADDRESS');
    return null;
  }
}

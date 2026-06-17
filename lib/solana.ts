import type { Listing } from './mockData';
import { LISTINGS } from './mockData';
import { bookingTotal } from './pricing';

// Phase 1 (hybrid): Devnet RPC. Override via env for mainnet/custom RPC later.
export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

/** Stub: simulate creating a listing on-chain */
export async function createListing(data: Partial<Listing>): Promise<string> {
  console.log('[Screen Sync] createListing stub →', data);
  await new Promise((r) => setTimeout(r, 1200));
  return `mock_tx_${Date.now()}`;
}

/** Stub: simulate booking a listing. Real version transfers `total` (incl. protocol fee). */
export async function bookListing(listingId: string, pricePerDay: number, days: number): Promise<string> {
  const { base, fee, total } = bookingTotal(pricePerDay, days);
  console.log(`[Screen Sync] bookListing stub → ${listingId} · ${days}d · base ${base} + fee ${fee} = ${total} SOL`);
  await new Promise((r) => setTimeout(r, 1000));
  return `mock_tx_${Date.now()}`;
}

/** Stub: fetch listings (returns mock data) */
export async function getListings(): Promise<Listing[]> {
  await new Promise((r) => setTimeout(r, 300));
  return LISTINGS;
}

/** Stub: get SOL balance for a wallet */
export async function getBalance(_walletAddress: string): Promise<number> {
  return 42.69;
}

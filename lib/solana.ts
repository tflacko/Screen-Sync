import type { Listing } from './mockData';
import { LISTINGS } from './mockData';

export const SOLANA_RPC = 'https://api.devnet.solana.com';

/** Stub: simulate creating a listing on-chain */
export async function createListing(data: Partial<Listing>): Promise<string> {
  console.log('[Screen Sync] createListing stub →', data);
  await new Promise((r) => setTimeout(r, 1200));
  return `mock_tx_${Date.now()}`;
}

/** Stub: simulate booking a listing */
export async function bookListing(listingId: string, days: number): Promise<string> {
  console.log(`[Screen Sync] bookListing stub → ${listingId} for ${days} days`);
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

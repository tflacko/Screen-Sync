// Listings data layer — database-free.
//
// Source of truth = chain + IPFS:
//   * Listing metadata (title, price, creative CID, ...) is pinned to IPFS.
//   * A registration tx anchors the metadata CID on-chain via a memo, with a
//     transfer to the treasury so the listing is discoverable by scanning the
//     treasury account's tx history.
//   * Reading = scan treasury signatures -> parse memos -> resolve IPFS metadata.
//
// The demo seed catalog (lib/mockData LISTINGS) is always appended so the
// marketplace is never empty. Everything degrades to seed-only in mock mode.
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import type { Listing, ListingType, PublisherType } from './mockData';
import { LISTINGS, TYPE_LABELS } from './mockData';
import { getConnection, getTreasury } from './connection';
import { ipfsUrl } from './pinata';

const LISTING_MEMO_PREFIX = 'ss:list:v1:';
const SCAN_LIMIT = 200;
// Cap how many on-chain listings we resolve per scan — bounds IPFS fetches and
// limits griefing (someone spamming registry memos can't unbounded-load the UI).
const MAX_RESULTS = 60;

const isListingType = (t: unknown): t is ListingType =>
  typeof t === 'string' && Object.prototype.hasOwnProperty.call(TYPE_LABELS, t);

/** Shape pinned to IPFS for each listing. */
export interface ListingMetadata {
  v: 1;
  type: ListingType;
  title: string;
  location: string;
  pricePerDay: number;
  description: string;
  tags: string[];
  audience: string;
  impressionsPerDay: number;
  publisherType: PublisherType;
  mediaCid: string;
  owner: string;
  createdAt: number;
}

/** Pin listing metadata JSON to IPFS, returning its CID. */
export async function pinListingMetadata(meta: ListingMetadata): Promise<string> {
  const res = await fetch('/api/pin-json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const data = (await res.json().catch(() => ({}))) as { cid?: string; error?: string };
  if (!res.ok || !data.cid) throw new Error(data.error || 'Failed to pin metadata');
  return data.cid;
}

/** Build the memo that anchors a listing's metadata CID on-chain. */
export const listingMemo = (metadataCid: string): string => `${LISTING_MEMO_PREFIX}${metadataCid}`;

// ---- Reads ---------------------------------------------------------------

function extractMemo(tx: ParsedTransactionWithMeta): string | null {
  for (const ix of tx.transaction.message.instructions) {
    if ('program' in ix && ix.program === 'spl-memo' && typeof ix.parsed === 'string') {
      return ix.parsed;
    }
  }
  return null;
}

function firstSigner(tx: ParsedTransactionWithMeta): string {
  const signer = tx.transaction.message.accountKeys.find((k) => k.signer);
  return signer ? signer.pubkey.toString() : '';
}

async function fetchMetadata(cid: string): Promise<ListingMetadata | null> {
  try {
    const res = await fetch(ipfsUrl(cid));
    if (!res.ok) return null;
    return (await res.json()) as ListingMetadata;
  } catch {
    return null;
  }
}

function metaToListing(cid: string, owner: string, m: ListingMetadata): Listing | null {
  // Untrusted IPFS metadata — validate the type before it reaches icon/CSS lookups.
  if (!isListingType(m.type)) return null;
  return {
    id: cid,
    type: m.type,
    title: m.title,
    location: m.location ?? '',
    pricePerDay: Number(m.pricePerDay) || 0,
    tags: m.tags ?? [],
    impressionsPerDay: m.impressionsPerDay ?? 0,
    audience: m.audience ?? '',
    owner: owner || m.owner || '',
    publisherType: m.publisherType ?? 'commercial',
    ipfsCid: m.mediaCid ?? '',
    verified: false,
    description: m.description ?? '',
    imageUrl: m.mediaCid ? ipfsUrl(m.mediaCid) : undefined,
  };
}

/** Listings registered on-chain (newest first). Empty in mock mode / on error. */
export async function getOnChainListings(): Promise<Listing[]> {
  const treasury = getTreasury();
  if (!treasury) return [];
  try {
    const conn = getConnection();
    const sigs = await conn.getSignaturesForAddress(treasury, { limit: SCAN_LIMIT });
    if (sigs.length === 0) return [];

    const txs = await conn.getParsedTransactions(
      sigs.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
    );

    const seen = new Set<string>();
    const pending: Promise<Listing | null>[] = [];
    for (const tx of txs) {
      if (pending.length >= MAX_RESULTS) break;
      if (!tx || tx.meta?.err) continue;
      const memo = extractMemo(tx);
      if (!memo || !memo.startsWith(LISTING_MEMO_PREFIX)) continue;
      const cid = memo.slice(LISTING_MEMO_PREFIX.length).trim();
      if (!cid || seen.has(cid)) continue;
      seen.add(cid);
      const owner = firstSigner(tx);
      pending.push(fetchMetadata(cid).then((m) => (m ? metaToListing(cid, owner, m) : null)));
    }
    const resolved = await Promise.all(pending);
    return resolved.filter((l): l is Listing => l !== null);
  } catch (e) {
    console.error('[Screen Sync] getOnChainListings failed', e);
    return [];
  }
}

/** All listings: on-chain (newest first) followed by the demo seed catalog. */
export async function getAllListings(): Promise<Listing[]> {
  const onchain = await getOnChainListings();
  return [...onchain, ...LISTINGS];
}

/** A single listing by id (seed id or on-chain metadata CID). */
export async function getListingById(id: string): Promise<Listing | null> {
  const seed = LISTINGS.find((l) => l.id === id);
  if (seed) return seed;
  const onchain = await getOnChainListings();
  return onchain.find((l) => l.id === id) ?? null;
}

/** Listings registered by a specific wallet. */
export async function getUserListings(owner: string): Promise<Listing[]> {
  const onchain = await getOnChainListings();
  return onchain.filter((l) => l.owner === owner);
}

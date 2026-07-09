// Bookings — database-free, USDC MVP.
//
// A booking is a real USDC payment to the treasury carrying a v2 memo:
//
//   ss:book:v2:<listingId>|<mode>|<detail>|<creativeCid>|<usdc>
//     slot   detail: <dateISO>:<slotIdx,slotIdx,...>   (15-min UTC slots, 0-95)
//     filler detail: <startISO>_<endISO>:<tier>        (low | medium | high)
//
// The chain is the booking database: the Contract Builder reads these to show
// real availability, and /api/ad reads them to decide which creative to serve.
// All slot windows are UTC so the dApp, server, and website agree on timing.
import type { ParsedTransactionWithMeta } from '@solana/web3.js';
import { SLOTS_PER_DAY, FILLER_TIERS, type FillerTier } from './constants';
import { getConnection, getTreasury } from './connection';

const BOOKING_MEMO_PREFIX = 'ss:book:v2:';
const SCAN_LIMIT = 500;
const CACHE_TTL_MS = 60_000;

export interface OnChainBooking {
  listingId: string;
  mode: 'slot' | 'filler';
  /** slot mode */
  dateISO?: string;
  slots?: number[];
  /** filler mode */
  startISO?: string;
  endISO?: string;
  tier?: FillerTier['id'];
  creativeCid: string;
  usdc: number;
  advertiser: string;
  signature: string;
}

// ---- Memo build -------------------------------------------------------------

export function slotBookingMemo(args: {
  listingId: string;
  dateISO: string;
  slots: number[];
  creativeCid: string;
  usdc: number;
}): string {
  const detail = `${args.dateISO}:${[...args.slots].sort((a, b) => a - b).join(',')}`;
  return `${BOOKING_MEMO_PREFIX}${args.listingId}|slot|${detail}|${args.creativeCid}|${args.usdc}`;
}

export function fillerBookingMemo(args: {
  listingId: string;
  startISO: string;
  endISO: string;
  tier: FillerTier['id'];
  creativeCid: string;
  usdc: number;
}): string {
  const detail = `${args.startISO}_${args.endISO}:${args.tier}`;
  return `${BOOKING_MEMO_PREFIX}${args.listingId}|filler|${detail}|${args.creativeCid}|${args.usdc}`;
}

// ---- Memo parse (defensive — memos are attacker-controlled) ------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isTier = (t: string): t is FillerTier['id'] => FILLER_TIERS.some((x) => x.id === t);

export function parseBookingMemo(memo: string): Omit<OnChainBooking, 'advertiser' | 'signature'> | null {
  if (!memo.startsWith(BOOKING_MEMO_PREFIX) || memo.length > 512) return null;
  const parts = memo.slice(BOOKING_MEMO_PREFIX.length).split('|');
  if (parts.length !== 5) return null;
  const [listingId, mode, detail, creativeCid, usdcStr] = parts;
  const usdc = Number(usdcStr);
  if (!listingId || !creativeCid || !Number.isFinite(usdc) || usdc < 0) return null;

  if (mode === 'slot') {
    const [dateISO, slotsStr] = detail.split(':');
    if (!DATE_RE.test(dateISO) || !slotsStr) return null;
    const slots = slotsStr
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < SLOTS_PER_DAY);
    if (slots.length === 0 || slots.length > SLOTS_PER_DAY) return null;
    return { listingId, mode, dateISO, slots, creativeCid, usdc };
  }

  if (mode === 'filler') {
    const [range, tier] = detail.split(':');
    const [startISO, endISO] = (range ?? '').split('_');
    if (!DATE_RE.test(startISO) || !DATE_RE.test(endISO) || !isTier(tier ?? '')) return null;
    if (endISO < startISO) return null;
    return { listingId, mode, startISO, endISO, tier: tier as FillerTier['id'], creativeCid, usdc };
  }

  return null;
}

// ---- Chain reads (cached) ----------------------------------------------------

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

let cache: { at: number; bookings: OnChainBooking[] } | null = null;

/** Drop the scan cache (call after making a booking so the UI shows it). */
export function clearBookingsCache(): void {
  cache = null;
}

/** All bookings recorded against the treasury (cached 60s). Empty in mock mode. */
export async function getTreasuryBookings(): Promise<OnChainBooking[]> {
  const treasury = getTreasury();
  if (!treasury) return [];
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.bookings;
  try {
    const conn = getConnection();
    const sigs = await conn.getSignaturesForAddress(treasury, { limit: SCAN_LIMIT });
    if (sigs.length === 0) {
      cache = { at: Date.now(), bookings: [] };
      return [];
    }
    const txs = await conn.getParsedTransactions(
      sigs.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
    );
    const bookings: OnChainBooking[] = [];
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (!tx || tx.meta?.err) continue;
      const memo = extractMemo(tx);
      if (!memo) continue;
      const parsed = parseBookingMemo(memo);
      if (!parsed) continue;
      bookings.push({ ...parsed, advertiser: firstSigner(tx), signature: sigs[i].signature });
    }
    cache = { at: Date.now(), bookings };
    return bookings;
  } catch (e) {
    console.error('[Screen Sync] getTreasuryBookings failed', e);
    return cache?.bookings ?? [];
  }
}

/** Bookings for one listing. */
export async function getListingBookings(listingId: string): Promise<OnChainBooking[]> {
  const all = await getTreasuryBookings();
  return all.filter((b) => b.listingId === listingId);
}

/** Slot indexes already booked for (listing, UTC date). */
export function bookedSlotSet(bookings: OnChainBooking[], dateISO: string): Set<number> {
  const set = new Set<number>();
  for (const b of bookings) {
    if (b.mode === 'slot' && b.dateISO === dateISO) for (const s of b.slots!) set.add(s);
  }
  return set;
}

/** Filler bookings active on a UTC date. */
export function activeFillers(bookings: OnChainBooking[], dateISO: string): OnChainBooking[] {
  return bookings.filter(
    (b) => b.mode === 'filler' && b.startISO! <= dateISO && dateISO <= b.endISO!
  );
}

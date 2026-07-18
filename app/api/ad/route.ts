// Ad decision endpoint — the serving plane of the MVP (USDC-only, no oracle).
//
// The website's tag.js calls this to learn which creative to show right now:
//   1. Exclusive 15-min slot (UTC) booked for the current window → the HIGHEST
//      verified USDC bid wins (outbidding; ties keep the earlier payer).
//   2. Otherwise filler: each $20 filler purchase gets 15 one-minute windows
//      spread deterministically across the day's unbooked minutes.
//   3. Otherwise the house ad rotation.
//
// Moderation: creatives whose CID is in AD_DENYLIST_CIDS (server env,
// comma-separated) are never served — the slot falls through to house.
// Bookings are read from the treasury's on-chain history (60s cache) — no DB.
import { NextRequest, NextResponse } from 'next/server';
import { SLOT_MINUTES, FILLER_MINUTES_PER_DAY } from '@/lib/constants';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import {
  getListingBookings,
  activeFillers,
  slotTopBids,
  type OnChainBooking,
} from '@/lib/bookings';
import { IPFS_GATEWAY } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=0, s-maxage=30',
};

/**
 * House ad rotation — shown when nothing is booked (and between filler
 * windows). Drop new images into public/house/ and list them here; the
 * rotation advances once per minute.
 */
const HOUSE_ADS: { imageUrl: string; clickUrl: string }[] = [
  { imageUrl: '/listings/lst_004.jpg', clickUrl: `/marketplace/${HOUSE_LISTING_ID}` },
];

/** CIDs that must never be served (moderation). Server env, comma-separated. */
const DENYLIST = new Set(
  (process.env.AD_DENYLIST_CIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const MINUTES_PER_DAY = 24 * 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get('listing') || HOUSE_LISTING_ID;
  const origin = req.nextUrl.origin;
  const absolute = (u: string) => (u.startsWith('http') ? u : `${origin}${u}`);

  const now = new Date();
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();

  const houseAd = HOUSE_ADS[Math.floor(now.getTime() / 60_000) % HOUSE_ADS.length];
  const house = {
    kind: 'house' as const,
    imageUrl: absolute(houseAd.imageUrl),
    clickUrl: absolute(houseAd.clickUrl),
    headline: 'This ad space is for sale — book it on-chain',
  };

  try {
    const all = await getListingBookings(listingId);
    // Moderation gate: denied creatives never serve (their windows fall to house).
    const bookings = all.filter((b) => !DENYLIST.has(b.creativeCid));

    const dateISO = now.toISOString().slice(0, 10); // UTC date
    const slotIdx = Math.floor(minute / SLOT_MINUTES);
    const topBids = slotTopBids(bookings, dateISO);

    // 1. Exclusive slot: highest verified bid holds the window.
    const winner = topBids.get(slotIdx);
    if (winner) {
      return NextResponse.json(
        {
          kind: 'slot',
          imageUrl: `${IPFS_GATEWAY}/${winner.booking.creativeCid}`,
          clickUrl: house.clickUrl,
          cid: winner.booking.creativeCid,
          bidUsdc: Number(winner.bid.toFixed(2)),
          window: { dateISO, slotIdx },
        },
        { headers: CORS }
      );
    }

    // 2. Filler: allocate each purchase its 15 one-minute windows, spread
    //    across the day's unbooked minutes. Deterministic, so every request
    //    in the same minute serves the same ad.
    const fillers = activeFillers(bookings, dateISO); // oldest-first
    if (fillers.length > 0) {
      const pick = pickFiller(fillers, topBids, minute);
      if (pick) {
        return NextResponse.json(
          {
            kind: 'filler',
            imageUrl: `${IPFS_GATEWAY}/${pick.creativeCid}`,
            clickUrl: house.clickUrl,
            cid: pick.creativeCid,
          },
          { headers: CORS }
        );
      }
    }

    // 3. House rotation.
    return NextResponse.json({ ...house, bookedSlotsToday: topBids.size }, { headers: CORS });
  } catch (e) {
    console.error('[Screen Sync] /api/ad failed', e);
    return NextResponse.json(house, { headers: CORS });
  }
}

/**
 * Which filler (if any) owns the current minute.
 * Each filler is entitled to FILLER_MINUTES_PER_DAY unbooked minutes. Unbooked
 * minutes are indexed in day order; every `spacing`-th one is a filler minute,
 * assigned round-robin, until all quotas are exhausted.
 */
function pickFiller(
  fillers: OnChainBooking[],
  topBids: Map<number, unknown>,
  minute: number
): OnChainBooking | null {
  const isBooked = (m: number) => topBids.has(Math.floor(m / SLOT_MINUTES));
  if (isBooked(minute)) return null;

  const bookedMinutes = topBids.size * SLOT_MINUTES;
  const unbookedTotal = Math.max(MINUTES_PER_DAY - bookedMinutes, 1);
  const quota = fillers.length * FILLER_MINUTES_PER_DAY;
  const spacing = Math.max(1, Math.floor(unbookedTotal / quota));

  // Index of this minute among the day's unbooked minutes so far.
  let k = 0;
  for (let m = 0; m < minute; m++) if (!isBooked(m)) k++;

  if (k % spacing !== 0) return null; // house's turn between filler windows
  const f = Math.floor(k / spacing);
  if (f >= quota) return null; // all quotas served for today
  return fillers[f % fillers.length];
}

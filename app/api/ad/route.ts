// Ad decision endpoint — the serving plane of the MVP.
//
// The website's tag.js calls this to learn which creative to show right now:
//   1. If an exclusive 15-min slot (UTC) is booked for the current window,
//      serve that creative.
//   2. Otherwise rotate through active filler bookings, weighted by tier
//      (low 1×, medium 2×, high 4×), interleaved with the house ad.
//   3. Otherwise serve the house ad.
//
// Bookings are read straight from the treasury's on-chain history (60s cache
// in lib/bookings) — no database. CORS is open: the marketing site lives on a
// different origin, and the response contains only public on-chain data.
import { NextRequest, NextResponse } from 'next/server';
import { SLOT_MINUTES, FILLER_TIERS } from '@/lib/constants';
import { HOUSE_LISTING_ID } from '@/lib/mockData';
import { getListingBookings, bookedSlotSet, activeFillers } from '@/lib/bookings';
import { IPFS_GATEWAY } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // Let CDNs cache briefly; decisions change at most once per rotation.
  'Cache-Control': 'public, max-age=0, s-maxage=30',
};

/** House fallback ad — shown when nothing is booked. */
const HOUSE_AD = {
  kind: 'house' as const,
  imageUrl: '/listings/lst_004.jpg',
  clickUrl: `/marketplace/${HOUSE_LISTING_ID}`,
  headline: 'This ad space is for sale — book it on-chain',
};

/** Rotation window for filler (seconds). Each window may show a different ad. */
const ROTATION_SECONDS = 60;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const listingId = req.nextUrl.searchParams.get('listing') || HOUSE_LISTING_ID;
  const origin = req.nextUrl.origin;

  const absolute = (u: string) => (u.startsWith('http') ? u : `${origin}${u}`);
  const house = {
    ...HOUSE_AD,
    imageUrl: absolute(HOUSE_AD.imageUrl),
    clickUrl: absolute(HOUSE_AD.clickUrl),
  };

  try {
    const bookings = await getListingBookings(listingId);
    const now = new Date();
    const dateISO = now.toISOString().slice(0, 10); // UTC date
    const slotIdx = Math.floor((now.getUTCHours() * 60 + now.getUTCMinutes()) / SLOT_MINUTES);

    // 1. Exclusive slot for the current window wins outright.
    const slotBooking = bookings.find(
      (b) => b.mode === 'slot' && b.dateISO === dateISO && b.slots!.includes(slotIdx)
    );
    if (slotBooking) {
      return NextResponse.json(
        {
          kind: 'slot',
          imageUrl: `${IPFS_GATEWAY}/${slotBooking.creativeCid}`,
          clickUrl: house.clickUrl,
          cid: slotBooking.creativeCid,
          window: { dateISO, slotIdx },
        },
        { headers: CORS }
      );
    }

    // 2. Weighted filler rotation, interleaved with the house ad.
    const fillers = activeFillers(bookings, dateISO);
    if (fillers.length > 0) {
      const weightOf = (t: string) => FILLER_TIERS.find((x) => x.id === t)?.weight ?? 1;
      // House ad keeps a share of rotations equal to the heaviest tier.
      const houseWeight = Math.max(...FILLER_TIERS.map((t) => t.weight));
      const total = fillers.reduce((s, f) => s + weightOf(f.tier!), 0) + houseWeight;
      // Deterministic rotation: same choice within a window, advances each window.
      const windowIdx = Math.floor(now.getTime() / (ROTATION_SECONDS * 1000));
      let pick = windowIdx % total;
      for (const f of fillers) {
        pick -= weightOf(f.tier!);
        if (pick < 0) {
          return NextResponse.json(
            {
              kind: 'filler',
              imageUrl: `${IPFS_GATEWAY}/${f.creativeCid}`,
              clickUrl: house.clickUrl,
              cid: f.creativeCid,
              tier: f.tier,
            },
            { headers: CORS }
          );
        }
      }
      // Fall through → house ad's turn in the rotation.
    }

    // 3. Nothing booked (or house's rotation turn).
    const taken = bookedSlotSet(bookings, dateISO).size;
    return NextResponse.json({ ...house, bookedSlotsToday: taken }, { headers: CORS });
  } catch (e) {
    console.error('[Screen Sync] /api/ad failed', e);
    return NextResponse.json(house, { headers: CORS });
  }
}

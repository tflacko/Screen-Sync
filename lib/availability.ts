// Availability — 15-minute UTC slots (96/day), derived from REAL on-chain
// bookings for the house listing (and any on-chain listing). Demo seed listings
// keep a deterministic mock overlay so the marketplace looks alive.
//
// All times are UTC: the dApp, /api/ad, and the website tag share slot windows.
import { SLOTS_PER_DAY, SLOT_MINUTES } from './constants';
import { HOUSE_LISTING_ID, LISTINGS } from './mockData';
import { type OnChainBooking, bookedSlotSet } from './bookings';

export interface TimeSlot {
  index: number;
  start: string; // "09:00" (UTC)
  end: string; // "09:15" (UTC)
  label: string; // "09:00 – 09:15"
  status: 'available' | 'booked';
  advertiser?: string;
}

export type DayStatus = 'open' | 'partial' | 'full';

const MOCK_ADVERTISERS = ['Helio', 'Orca', 'Magic Eden', 'Tensor', 'Jito', 'Drift', 'Kamino'];

// Deterministic pseudo-random in [0,1) from a string seed (FNV-1a).
function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const hhmm = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Demo seed listings get mock occupancy; the house listing is always real-only. */
export const isDemoListing = (listingId: string): boolean =>
  listingId !== HOUSE_LISTING_ID && LISTINGS.some((l) => l.id === listingId);

function mockBooked(listingId: string, dateISO: string): Set<number> {
  const set = new Set<number>();
  if (!isDemoListing(listingId)) return set;
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    if (seed(`${listingId}|${dateISO}|${i}`) < 0.35) set.add(i);
  }
  return set;
}

/**
 * The 96-slot schedule for (listing, UTC date). `bookings` are the listing's
 * real on-chain bookings (pass [] when none / mock mode).
 */
export function getDaySlots(
  listingId: string,
  dateISO: string,
  bookings: OnChainBooking[] = []
): TimeSlot[] {
  const real = bookedSlotSet(bookings, dateISO);
  const mock = mockBooked(listingId, dateISO);
  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
    const startM = i * SLOT_MINUTES;
    const isReal = real.has(i);
    const booked = isReal || mock.has(i);
    const adv = isReal
      ? 'On-chain booking'
      : MOCK_ADVERTISERS[Math.floor(seed(`${listingId}|${dateISO}|${i}|a`) * MOCK_ADVERTISERS.length)];
    return {
      index: i,
      start: hhmm(startM),
      end: hhmm(startM + SLOT_MINUTES),
      label: `${hhmm(startM)} – ${hhmm(startM + SLOT_MINUTES)}`,
      status: booked ? 'booked' : 'available',
      advertiser: booked ? adv : undefined,
    };
  });
}

/** Day-level rollup used to colour the calendar. */
export function getDayStatus(
  listingId: string,
  dateISO: string,
  bookings: OnChainBooking[] = []
): DayStatus {
  const booked = bookedSlotSet(bookings, dateISO).size + mockBooked(listingId, dateISO).size;
  if (booked === 0) return 'open';
  if (booked >= SLOTS_PER_DAY) return 'full';
  return 'partial';
}

/** Estimated filler plays available in the gaps between booked slots. */
export function getFillerCapacity(
  listingId: string,
  dateISO: string,
  bookings: OnChainBooking[] = []
): number {
  const open =
    SLOTS_PER_DAY - bookedSlotSet(bookings, dateISO).size - mockBooked(listingId, dateISO).size;
  return Math.max(open, 0) * 4; // ~4 filler plays per open 15-min slot
}

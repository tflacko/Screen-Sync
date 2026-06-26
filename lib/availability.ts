// Mock availability + time-slot model for the Contract Builder.
//
// Phase 1: deterministic mock data (seeded per listing+date) so the calendar and
// slot list look consistent across renders. Later this is replaced by on-chain
// booking reads, and location filters + an optimizer/LLM will suggest filler placements.
import { BLOCKS_PER_DAY } from './constants';

const HOURS_PER_BLOCK = 24 / BLOCKS_PER_DAY;

export interface TimeSlot {
  index: number;
  start: string; // "09:00"
  end: string; // "12:00"
  label: string; // "09:00 – 12:00"
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

const hhmm = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

/** The time-block schedule for a given listing + date, with which blocks are taken. */
export function getDaySlots(listingId: string, dateISO: string): TimeSlot[] {
  return Array.from({ length: BLOCKS_PER_DAY }, (_, i) => {
    const startH = i * HOURS_PER_BLOCK;
    const booked = seed(`${listingId}|${dateISO}|${i}`) < 0.45;
    const adv = MOCK_ADVERTISERS[Math.floor(seed(`${listingId}|${dateISO}|${i}|a`) * MOCK_ADVERTISERS.length)];
    return {
      index: i,
      start: hhmm(startH),
      end: hhmm(startH + HOURS_PER_BLOCK),
      label: `${hhmm(startH)} – ${hhmm(startH + HOURS_PER_BLOCK)}`,
      status: booked ? 'booked' : 'available',
      advertiser: booked ? adv : undefined,
    };
  });
}

/** Day-level rollup used to color the calendar. */
export function getDayStatus(listingId: string, dateISO: string): DayStatus {
  const booked = getDaySlots(listingId, dateISO).filter((s) => s.status === 'booked').length;
  if (booked === 0) return 'open';
  if (booked >= BLOCKS_PER_DAY) return 'full';
  return 'partial';
}

/** Estimated filler plays available in the gaps between premium ads (mock). */
export function getFillerCapacity(listingId: string, dateISO: string): number {
  const open = getDaySlots(listingId, dateISO).filter((s) => s.status === 'available').length;
  return open * 60; // ~60 filler plays per open block
}

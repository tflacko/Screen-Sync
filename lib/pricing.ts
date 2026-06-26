// Pricing — adapted from reference/legacy-react-vite/utils/pricing.ts.
// UI works in SOL (numbers); on-chain settlement uses lamports (see lib/format.ts).
import { PLATFORM_FEE_BPS, BLOCKS_PER_DAY, SLOT_PREMIUM } from './constants';

/** Flat protocol fee (in SOL) on a base amount in SOL. */
export const platformFee = (baseSol: number): number => baseSol * (PLATFORM_FEE_BPS / 10_000);

export interface CostBreakdown {
  subtotal: number;
  fee: number;
  total: number;
}

/** Wrap a subtotal with the protocol fee. */
export function withFee(subtotal: number): CostBreakdown {
  const fee = platformFee(subtotal);
  return { subtotal, fee, total: subtotal + fee };
}

/** Price of one exclusive time-block (SOL). */
export const slotPrice = (pricePerDay: number): number => (pricePerDay / BLOCKS_PER_DAY) * SLOT_PREMIUM;

/** Cost to reserve N exclusive slots. */
export const slotBookingCost = (pricePerDay: number, slotCount: number): CostBreakdown =>
  withFee(slotPrice(pricePerDay) * slotCount);

/** Cost of a filler run: a fraction of the daily rate, per day. */
export const fillerCost = (pricePerDay: number, days: number, factor: number): CostBreakdown =>
  withFee(pricePerDay * factor * days);

/** Booking cost breakdown: base = pricePerDay × days, plus the protocol fee. */
export function bookingTotal(pricePerDay: number, days: number): {
  base: number;
  fee: number;
  total: number;
} {
  const base = pricePerDay * days;
  const fee = platformFee(base);
  return { base, fee, total: base + fee };
}

/** What a host nets after the protocol fee. */
export const netRevenue = (grossSol: number): number => grossSol - platformFee(grossSol);

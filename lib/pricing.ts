// Pricing — adapted from reference/legacy-react-vite/utils/pricing.ts.
// UI works in SOL (numbers); on-chain settlement uses lamports (see lib/format.ts).
import { PLATFORM_FEE_BPS } from './constants';

/** Flat protocol fee (in SOL) on a base amount in SOL. */
export const platformFee = (baseSol: number): number => baseSol * (PLATFORM_FEE_BPS / 10_000);

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

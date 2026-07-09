// Pricing.
//
// MVP (self-contained, USDC): flat $20 per 15-minute exclusive slot and flat
// USDC/day filler tiers — see the USDC section below. The SOL-denominated
// functions further down mirror the Phase 2 Anchor program's escrow math.
import {
  PLATFORM_FEE_BPS,
  BLOCKS_PER_DAY,
  SLOT_PREMIUM,
  SLOT_PRICE_USDC,
  FILLER_TIERS,
  type FillerTier,
} from './constants';

// ---- MVP: USDC pricing ------------------------------------------------------

export interface UsdcCost {
  /** Line-item description for the breakdown UI. */
  label: string;
  /** Total USDC due (goes to the treasury in full). */
  totalUsdc: number;
}

/** Cost of N exclusive 15-minute slots (flat $20 each). */
export function slotCostUsdc(slotCount: number): UsdcCost {
  return {
    label: `${slotCount} × 15-min slot @ $${SLOT_PRICE_USDC}`,
    totalUsdc: SLOT_PRICE_USDC * slotCount,
  };
}

/** Cost of a filler run over `days` days at a tier (flat USDC/day). */
export function fillerCostUsdc(days: number, tierId: FillerTier['id']): UsdcCost {
  const tier = FILLER_TIERS.find((t) => t.id === tierId)!;
  return {
    label: `${days} day${days === 1 ? '' : 's'} × ${tier.label} filler @ $${tier.usdcPerDay}/day`,
    totalUsdc: tier.usdcPerDay * days,
  };
}

// ---- Phase 2 program: SOL-denominated escrow math ---------------------------

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

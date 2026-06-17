// Pricing calculation utilities

import { PLATFORM_FEE_BPS } from '../../constants/solana';

export const calculatePlatformFee = (basePrice: number): number => {
  return basePrice * (PLATFORM_FEE_BPS / 10000);
};

export const calculatePlatformFeeBigInt = (basePriceLamports: bigint): bigint => {
  return (basePriceLamports * BigInt(PLATFORM_FEE_BPS)) / 10000n;
};

export const calculateTotalCost = (
  baseRatePerSlot: bigint,
  numberOfSlots: number
): bigint => {
  const baseCost = baseRatePerSlot * BigInt(numberOfSlots);
  const platformFee = calculatePlatformFeeBigInt(baseCost);
  return baseCost + platformFee;
};

export const calculateNetRevenue = (
  grossRevenue: number,
  platformFeeBps: number = PLATFORM_FEE_BPS
): number => {
  const platformCut = grossRevenue * (platformFeeBps / 10000);
  return grossRevenue - platformCut;
};

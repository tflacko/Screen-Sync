// Solana formatting utilities

import { LAMPORTS_PER_SOL } from '../../constants/solana';

export const solToLamports = (sol: number): bigint => {
  return BigInt(Math.round(sol * 1_000_000_000));
};

export const lamportsToSol = (lamports: bigint): number => {
  return Number(lamports) / Number(LAMPORTS_PER_SOL);
};

export const formatSol = (lamports: bigint): string => {
  return lamportsToSol(lamports).toFixed(4);
};

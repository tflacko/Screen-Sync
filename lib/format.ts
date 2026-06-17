// SOL / lamports formatting — adapted from reference/legacy-react-vite/utils/solana-format.ts
import { LAMPORTS_PER_SOL } from './constants';

export const solToLamports = (sol: number): bigint => BigInt(Math.round(sol * 1_000_000_000));

export const lamportsToSol = (lamports: bigint): number => Number(lamports) / Number(LAMPORTS_PER_SOL);

export const formatSol = (lamports: bigint): string => lamportsToSol(lamports).toFixed(4);

/** Shorten an address for display, e.g. `7xK3Vr...9mNp`. */
export const shortenAddress = (addr: string, chars = 4): string =>
  addr.length <= chars * 2 + 3 ? addr : `${addr.slice(0, chars)}...${addr.slice(-chars)}`;

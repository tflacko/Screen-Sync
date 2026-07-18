// Solana Explorer link helpers (cluster-aware).
import { SOLANA_CLUSTER } from './config';

const suffix = SOLANA_CLUSTER === 'mainnet-beta' ? '' : `?cluster=${SOLANA_CLUSTER}`;

/** Explorer URL for a transaction signature. */
export const txUrl = (signature: string): string =>
  `https://explorer.solana.com/tx/${signature}${suffix}`;

/** Explorer URL for an account/address. */
export const addressUrl = (address: string): string =>
  `https://explorer.solana.com/address/${address}${suffix}`;

// Centralized runtime configuration + feature flags.
//
// Only CLIENT-SAFE (public) values live here. The one server-only secret
// (PINATA_JWT) is read directly inside the API routes so it is never bundled
// into the browser.
//
// Every integration is feature-flagged: when its env vars are absent the
// app falls back to mock behaviour, so it runs locally before any keys exist.

/** Solana JSON-RPC endpoint. Defaults to the public devnet. */
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

/** Cluster label, used for Explorer links and UI copy. */
export const SOLANA_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';

/** Public IPFS gateway for reads. */
export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs';

/** Treasury wallet that receives booking/listing payments (PUBLIC address). */
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '';

/** Real SOL payments go live once a treasury address is configured. */
export const PAYMENTS_ENABLED = TREASURY_ADDRESS.length > 0;

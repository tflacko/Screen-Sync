// Centralized runtime configuration + feature flags.
//
// Only CLIENT-SAFE (public) values live here. Server-only secrets
// (PINATA_JWT, SUPABASE_SERVICE_ROLE_KEY) are read directly inside their
// server modules so they are never bundled into the browser.
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

/** Supabase project URL + anon (public) key for client-side reads. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/** Real SOL payments go live once a treasury address is configured. */
export const PAYMENTS_ENABLED = TREASURY_ADDRESS.length > 0;

/** Client-side Supabase reads go live once URL + anon key are configured. */
export const SUPABASE_ENABLED = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Protocol constants — adapted from the legacy React/Vite dApp
// (see reference/legacy-react-vite/constants).

export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

/** Platform fee in basis points (2.5%). One flat protocol fee, no layered take-rates. */
export const PLATFORM_FEE_BPS = 250;

/**
 * Small on-chain fee (SOL) paid when registering a listing. Doubles as anti-spam
 * and as the transfer that anchors the listing to the treasury "registry" account
 * so it's discoverable by scanning treasury tx history (no database needed).
 * Set to 0 to make listing free (registration still anchors via the memo tx).
 */
export const LISTING_FEE_SOL = 0.001;

/** Max upload size for ad creatives (5 MB). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface AdDimension {
  value: string;
  label: string;
}

export const AVAILABLE_DIMENSIONS: AdDimension[] = [
  { value: '728x90', label: 'Leaderboard (728x90)' },
  { value: '300x250', label: 'Medium Rectangle (300x250)' },
  { value: '336x280', label: 'Large Rectangle (336x280)' },
  { value: '160x600', label: 'Wide Skyscraper (160x600)' },
  { value: '320x50', label: 'Mobile Banner (320x50)' },
  { value: '970x250', label: 'Billboard (970x250)' },
];

export interface SlotDurationOption {
  value: number; // seconds
  label: string;
  multiplier: number;
}

export const SLOT_DURATION_OPTIONS: SlotDurationOption[] = [
  { value: 3600, label: '1 Hour', multiplier: 1 },
  { value: 21600, label: '6 Hours', multiplier: 5.5 },
  { value: 86400, label: '24 Hours', multiplier: 20 },
  { value: 604800, label: '7 Days', multiplier: 120 },
];

/** Magic-number signatures for client-side file-type validation. */
export const FILE_SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
  'video/mp4': [0x00, 0x00, 0x00],
  'video/webm': [0x1a, 0x45, 0xdf, 0xa3],
};

// ---- Contract Builder — MVP pricing (USDC) ----
//
// The self-contained MVP sells Screen Sync's OWN ad space: exclusive 15-minute
// slots at a flat USDC price, plus frequency-based filler. All slot windows are
// defined in UTC so the dApp, the ad server, and the website agree on timing.

/** Exclusive slot length (minutes). */
export const SLOT_MINUTES = 15;

/** 15-minute slots per day (24h × 4). */
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES; // 96

/** Flat price of one exclusive 15-minute slot (USDC). */
export const SLOT_PRICE_USDC = 20;

export interface FillerTier {
  id: 'low' | 'medium' | 'high';
  label: string;
  usdcPerDay: number; // flat USDC per day at this frequency
  weight: number; // relative rotation share in the serving loop
  cadence: string; // human-readable rotation frequency
}

/** Filler runs your ad in the gaps between booked slots, at a chosen frequency. */
export const FILLER_TIERS: FillerTier[] = [
  { id: 'low', label: 'Low', usdcPerDay: 5, weight: 1, cadence: '~1 in 6 rotations' },
  { id: 'medium', label: 'Medium', usdcPerDay: 10, weight: 2, cadence: '~1 in 3 rotations' },
  { id: 'high', label: 'High', usdcPerDay: 20, weight: 4, cadence: '~every other rotation' },
];

// ---- Legacy / Phase 2 program constants (SOL-denominated escrow model) ----

/** Phase 2 Anchor program: blocks per day in the on-chain slot bitmap. */
export const BLOCKS_PER_DAY = 8;

/** Phase 2 Anchor program: exclusive-slot premium over the per-day average rate. */
export const SLOT_PREMIUM = 1.5;

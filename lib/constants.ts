// Protocol constants — adapted from the legacy React/Vite dApp
// (see reference/legacy-react-vite/constants).

export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

/** Platform fee in basis points (2.5%). One flat protocol fee, no layered take-rates. */
export const PLATFORM_FEE_BPS = 250;

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

// ---- Contract Builder ----

/** A day is split into time blocks advertisers can reserve exclusively (3-hour blocks). */
export const BLOCKS_PER_DAY = 8;

/** An exclusive premium slot costs more than the per-day average rate. */
export const SLOT_PREMIUM = 1.5;

export interface FillerTier {
  id: 'low' | 'medium' | 'high';
  label: string;
  factor: number; // fraction of pricePerDay charged per day
  cadence: string; // human-readable rotation frequency
}

/** Filler runs your ad in the gaps between premium slot ads, at a chosen frequency. */
export const FILLER_TIERS: FillerTier[] = [
  { id: 'low', label: 'Low', factor: 0.25, cadence: '~1 in 6 rotations' },
  { id: 'medium', label: 'Medium', factor: 0.5, cadence: '~1 in 3 rotations' },
  { id: 'high', label: 'High', factor: 1.0, cadence: '~every other rotation' },
];

/**
 * $SSC token launch config — single source of truth for the scripts in
 * token/scripts/*. Fill in every FILL_IN before running anything.
 *
 * Approach: mint the exact custom supply/decimals directly via
 * mpl-token-metadata (createFungible + mintV1), then transfer each
 * allocation bucket to its designated wallet. This gives full control over
 * every number in the allocation table, at the cost of doing distribution
 * yourselves rather than through a Genesis launch product (which enforces
 * a fixed 1B supply and a 2-bucket model — see docs/TOKEN-LAUNCH.md).
 *
 * A Genesis bonding-curve/launchpool sale remains an option later, funded
 * from the `allocation.publicLaunch` bucket once it's sitting in a wallet.
 *
 * Nothing secret belongs in this file. Wallet keypairs are loaded from
 * WALLET_KEYPAIR_PATH (see token/.env.example) — never hardcode a private
 * key or seed phrase here or anywhere else in the repo.
 */

export type Network = 'devnet' | 'mainnet';

const FILL_IN = 'FILL_IN' as const;
type Fillable<T> = T | typeof FILL_IN;

export const tokenConfig = {
  name: FILL_IN as Fillable<string>, // e.g. "Screen Sync Credits"
  symbol: 'SSC',
  decimals: 6,
  totalSupply: FILL_IN as Fillable<number>, // whole tokens, e.g. 1_000_000_000
  description: FILL_IN as Fillable<string>,
  website: 'https://screensync.xyz',
  twitter: FILL_IN as Fillable<string>, // e.g. "@screensync"
  logoPath: FILL_IN as Fillable<string>, // local path to a square PNG, min 500x500
  metadataUri: FILL_IN as Fillable<string>, // filled in after IPFS/Pinata upload
};

/**
 * Whole-token allocation + the wallet each bucket is transferred to once
 * minted. Amounts must sum to tokenConfig.totalSupply.
 */
export const allocation = {
  publicLaunch: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
  marketing: {
    smallVoices: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
    seedHunt: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
    ideaWars: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
    learnMode: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
    buffer: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
  },
  treasuryOps: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
  // Team allocation should land in a vesting stream (Streamflow) or multisig
  // (Squads), not a plain wallet — see docs/TOKEN-LAUNCH.md §5.
  team: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
  reserve: { amount: FILL_IN as Fillable<number>, wallet: FILL_IN as Fillable<string> },
};

export const network: Network = (process.env.SSC_NETWORK as Network) || 'devnet';

export const rpcUrl =
  network === 'mainnet'
    ? process.env.SSC_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
    : process.env.SSC_DEVNET_RPC_URL || 'https://api.devnet.solana.com';

function isFilledIn(v: unknown): boolean {
  return v !== FILL_IN && v !== undefined && v !== null && v !== '';
}

type Bucket = { amount: number | typeof FILL_IN; wallet: string | typeof FILL_IN };

function allBuckets(): Record<string, Bucket> {
  return {
    'allocation.publicLaunch': allocation.publicLaunch,
    'allocation.marketing.smallVoices': allocation.marketing.smallVoices,
    'allocation.marketing.seedHunt': allocation.marketing.seedHunt,
    'allocation.marketing.ideaWars': allocation.marketing.ideaWars,
    'allocation.marketing.learnMode': allocation.marketing.learnMode,
    'allocation.marketing.buffer': allocation.marketing.buffer,
    'allocation.treasuryOps': allocation.treasuryOps,
    'allocation.team': allocation.team,
    'allocation.reserve': allocation.reserve,
  };
}

/** Throws with a precise list of what's still missing. Call before any deploy. */
export function assertConfigComplete() {
  const missing: string[] = [];

  for (const [k, v] of Object.entries(tokenConfig)) {
    if (!isFilledIn(v)) missing.push(`tokenConfig.${k}`);
  }
  for (const [name, bucket] of Object.entries(allBuckets())) {
    if (!isFilledIn(bucket.amount)) missing.push(`${name}.amount`);
    if (!isFilledIn(bucket.wallet)) missing.push(`${name}.wallet`);
  }

  if (missing.length > 0) {
    throw new Error(
      `token/config.ts is incomplete. Fill in before running any launch script:\n` +
        missing.map((m) => `  - ${m}`).join('\n'),
    );
  }

  const totalAlloc = Object.values(allBuckets()).reduce((sum, b) => sum + Number(b.amount), 0);
  if (totalAlloc !== Number(tokenConfig.totalSupply)) {
    throw new Error(
      `Allocation sum (${totalAlloc}) does not equal totalSupply (${tokenConfig.totalSupply}).`,
    );
  }

  if (network === 'mainnet' && process.env.SSC_CONFIRM_MAINNET !== 'yes') {
    throw new Error(
      'SSC_NETWORK=mainnet requires SSC_CONFIRM_MAINNET=yes to be set explicitly. ' +
        'This is a deliberate speed bump before spending real SOL / minting a real token.',
    );
  }
}

/** Total supply expressed in base units (10^decimals), as a bigint. */
export function totalSupplyBaseUnits(): bigint {
  return toBaseUnits(tokenConfig.totalSupply as number);
}

export function toBaseUnits(wholeTokens: number): bigint {
  const decimalsFactor = Math.pow(10, tokenConfig.decimals);
  return BigInt(Math.round(wholeTokens * decimalsFactor));
}

/** Flat list of {name, amount, wallet} for scripts that iterate all buckets. */
export function allocationList() {
  return Object.entries(allBuckets()).map(([name, bucket]) => ({
    name,
    amount: bucket.amount as number,
    wallet: bucket.wallet as string,
  }));
}

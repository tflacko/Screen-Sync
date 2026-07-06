/**
 * OPTIONAL / FUTURE — not part of the primary launch flow.
 *
 * Metaplex Genesis's public launch API (createAndRegisterLaunch) always
 * mints its own new token via its own bonding-curve or launchpool
 * mechanism — as of @metaplex-foundation/genesis@0.38.0 there is no public
 * option to run a Genesis sale against an *existing* SPL token (i.e. the
 * $SSC mint created by mintToken.ts). Supply/decimals are fixed protocol
 * defaults (1B supply), not configurable.
 *
 * This script is kept as a reference for later if Screen Sync decides to
 * do a separate permissionless bonding-curve/launchpool listing (its own
 * mint, its own economics) rather than distributing the `allocation.publicLaunch`
 * bucket of the real $SSC token directly. Talk this through before using it —
 * it does not touch the $SSC mint from mintToken.ts at all.
 *
 * Run: npx tsx token/scripts/genesisPublicSale.optional.ts
 */
import { createAndRegisterLaunch } from '@metaplex-foundation/genesis';
import { network, tokenConfig } from '../config';
import { loadUmi } from '../umi';

// Genesis requires the image hosted on Irys specifically
// (must start with https://gateway.irys.xyz/) — a plain Pinata/IPFS URL
// will be rejected. Upload separately from tokenConfig.metadataUri.
const IRYS_IMAGE_URL = 'FILL_IN (https://gateway.irys.xyz/...)';
const CREATOR_FEE_WALLET = 'FILL_IN (treasury wallet pubkey)';
const FIRST_BUY_SOL = 0; // 0 disables the mandatory-first-buy restriction

async function main() {
  const umi = loadUmi();

  const result = await createAndRegisterLaunch(umi, {}, {
    wallet: umi.identity.publicKey,
    launchType: 'bondingCurve',
    network: network === 'mainnet' ? 'solana-mainnet' : 'solana-devnet',
    token: {
      name: tokenConfig.name as string,
      symbol: tokenConfig.symbol,
      image: IRYS_IMAGE_URL,
      description: tokenConfig.description as string,
      externalLinks: {
        website: tokenConfig.website,
        twitter: tokenConfig.twitter as string,
      },
    },
    launch: {
      creatorFeeWallet: CREATOR_FEE_WALLET,
      firstBuyAmount: FIRST_BUY_SOL || undefined,
    },
  });

  console.log('New Genesis token mint:', result.mintAddress);
  console.log('Genesis account:', result.genesisAccount);
  console.log('Launch link:', result.launch.link);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Move each allocation bucket from the deployer's holding wallet to its
 * designated recipient wallet (per token/config.ts `allocation`). Run this
 * after mintToken.ts.
 *
 * The `team` bucket should generally go to a Streamflow vesting stream or a
 * Squads multisig, not a plain wallet — see docs/TOKEN-LAUNCH.md §5. If
 * `allocation.team.wallet` is a plain wallet, transfer from there into the
 * vesting stream/multisig as a separate step; this script doesn't assume
 * vesting mechanics.
 *
 * Run: npx tsx token/scripts/distributeAllocations.ts <mintAddress>
 */
import { createTokenIfMissing, findAssociatedTokenPda, transferTokens } from '@metaplex-foundation/mpl-toolbox';
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi';
import { allocationList, assertConfigComplete, toBaseUnits } from '../config';
import { loadUmi } from '../umi';

async function main() {
  assertConfigComplete();

  const [mintArg] = process.argv.slice(2);
  if (!mintArg) {
    throw new Error('Usage: npx tsx token/scripts/distributeAllocations.ts <mintAddress>');
  }

  const umi = loadUmi();
  const mint = publicKey(mintArg);
  const sourceAta = findAssociatedTokenPda(umi, { mint, owner: umi.identity.publicKey });

  for (const bucket of allocationList()) {
    const destOwner = publicKey(bucket.wallet);
    const destAta = findAssociatedTokenPda(umi, { mint, owner: destOwner });
    const amount = toBaseUnits(bucket.amount);

    console.log(`${bucket.name}: ${bucket.amount} tokens -> ${bucket.wallet}`);

    await transactionBuilder()
      .add(createTokenIfMissing(umi, { mint, owner: destOwner, token: destAta }))
      .add(transferTokens(umi, { source: sourceAta, destination: destAta, amount }))
      .sendAndConfirm(umi);
  }

  console.log('\nAll allocation buckets distributed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

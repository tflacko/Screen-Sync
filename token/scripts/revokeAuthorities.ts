/**
 * Post-launch checklist, step 1-3 (docs/TOKEN-LAUNCH.md §6): revoke mint
 * authority, revoke freeze authority, and set metadata immutable.
 *
 * Each is irreversible. Only run after confirming supply, distribution, and
 * metadata are all correct.
 *
 * Run: npx tsx token/scripts/revokeAuthorities.ts <mintAddress> [--skip-immutable]
 */
import { findMetadataPda, updateV1 } from '@metaplex-foundation/mpl-token-metadata';
import { AuthorityType, setAuthority } from '@metaplex-foundation/mpl-toolbox';
import { publicKey } from '@metaplex-foundation/umi';
import { loadUmi } from '../umi';

async function main() {
  const [mintArg, ...flags] = process.argv.slice(2);
  if (!mintArg) {
    throw new Error('Usage: npx tsx token/scripts/revokeAuthorities.ts <mintAddress> [--skip-immutable]');
  }

  const umi = loadUmi();
  const mint = publicKey(mintArg);

  console.log('Revoking mint authority...');
  await setAuthority(umi, {
    owned: mint,
    owner: umi.identity,
    authorityType: AuthorityType.MintTokens,
    newAuthority: null,
  }).sendAndConfirm(umi);

  console.log('Revoking freeze authority...');
  await setAuthority(umi, {
    owned: mint,
    owner: umi.identity,
    authorityType: AuthorityType.FreezeAccount,
    newAuthority: null,
  }).sendAndConfirm(umi);

  if (flags.includes('--skip-immutable')) {
    console.log('Skipping metadata-immutable step (--skip-immutable passed).');
  } else {
    console.log('Setting metadata immutable...');
    const metadata = findMetadataPda(umi, { mint });
    await updateV1(umi, { mint, metadata, isMutable: false }).sendAndConfirm(umi);
  }

  console.log('\nDone. Verify on Solana Explorer before proceeding to Jupiter verification.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

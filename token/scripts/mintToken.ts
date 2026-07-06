/**
 * Create the $SSC mint + on-chain metadata, then mint the full total supply
 * to the deploying wallet (umi.identity). Run distributeAllocations.ts next
 * to move each bucket to its designated wallet.
 *
 * Devnet by default — see token/.env.example for how to opt into mainnet.
 * Run: npx tsx token/scripts/mintToken.ts
 */
import { createFungible, mintV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { assertConfigComplete, network, tokenConfig, totalSupplyBaseUnits } from '../config';
import { loadUmi } from '../umi';

async function main() {
  assertConfigComplete();

  const umi = loadUmi();
  const mint = generateSigner(umi);
  console.log(`Minting $${tokenConfig.symbol} on ${network} as wallet ${umi.identity.publicKey}`);
  console.log(`Mint address will be: ${mint.publicKey}`);

  await createFungible(umi, {
    mint,
    name: tokenConfig.name as string,
    uri: tokenConfig.metadataUri as string,
    sellerFeeBasisPoints: percentAmount(0),
    decimals: tokenConfig.decimals,
  }).sendAndConfirm(umi);

  await mintV1(umi, {
    mint: mint.publicKey,
    authority: umi.identity,
    amount: totalSupplyBaseUnits(),
    tokenOwner: umi.identity.publicKey,
    tokenStandard: TokenStandard.Fungible,
  }).sendAndConfirm(umi);

  console.log('\nToken mint:', mint.publicKey.toString());
  console.log('Total supply minted to:', umi.identity.publicKey.toString());
  console.log(
    'Explorer:',
    `https://explorer.solana.com/address/${mint.publicKey.toString()}${network === 'devnet' ? '?cluster=devnet' : ''}`,
  );
  console.log('\nSave the mint address into docs/TOKEN-LAUNCH.md §7, then run distributeAllocations.ts.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { genesis } from '@metaplex-foundation/genesis';
import { keypairIdentity, type Umi } from '@metaplex-foundation/umi';
import fs from 'node:fs';
import { rpcUrl } from './config';

/**
 * Loads the signing keypair from a local file (Solana CLI JSON keypair
 * format: a JSON array of 64 bytes). Never reads a key from an env var
 * directly or from anything checked into the repo.
 */
export function loadUmi(): Umi {
  const keypairPath = process.env.WALLET_KEYPAIR_PATH;
  if (!keypairPath) {
    throw new Error(
      'WALLET_KEYPAIR_PATH is not set. Point it at a local Solana CLI keypair file ' +
        '(e.g. ~/.config/solana/id.json for devnet). Never store mainnet private keys ' +
        'in this repo or in plaintext env files — use a hardware wallet or KMS instead.',
    );
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, 'utf-8')));
  const umi = createUmi(rpcUrl).use(mplToolbox()).use(mplTokenMetadata()).use(genesis());
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));
  return umi;
}

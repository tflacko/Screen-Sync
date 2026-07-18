'use client';

import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token';
import { getConnection, getTreasury } from './connection';
import { USDC_MINT, USDC_DECIMALS } from './config';
import { solToLamports } from './format';

// SPL Memo program — lets us attach a human/parseable note to a tx with no
// extra signer accounts (memo with zero keys just logs the data).
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

type SendFn = (
  tx: Transaction,
  connection: ReturnType<typeof getConnection>,
  options?: { skipPreflight?: boolean }
) => Promise<string>;

/**
 * Transfer `amountSol` to the treasury and attach an on-chain memo.
 * Used for bookings (full amount) and listing registration (small fee).
 * The treasury doubles as the on-chain registry: scanning its tx history
 * surfaces every listing/booking. Returns the confirmed signature.
 */
export async function sendTreasuryTx(args: {
  payer: PublicKey;
  amountSol: number;
  memo: string;
  sendTransaction: SendFn;
}): Promise<string> {
  const treasury = getTreasury();
  if (!treasury) throw new Error('Treasury wallet not configured');

  const connection = getConnection();
  const lamports = Number(solToLamports(args.amountSol));

  const tx = new Transaction()
    .add(SystemProgram.transfer({ fromPubkey: args.payer, toPubkey: treasury, lamports }))
    .add(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(args.memo, 'utf8'),
      })
    );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = args.payer;

  const signature = await args.sendTransaction(tx, connection);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );
  return signature;
}

/**
 * Pay `amountUsdc` USDC to the treasury with an on-chain memo (booking record).
 * Creates the treasury's USDC token account if needed (idempotent, payer =
 * advertiser, ~0.002 SOL rent once). The advertiser signs one transaction:
 * [ensure treasury ATA] + [transferChecked USDC] + [memo].
 */
export async function sendUsdcTreasuryTx(args: {
  payer: PublicKey;
  amountUsdc: number;
  memo: string;
  sendTransaction: SendFn;
}): Promise<string> {
  const treasury = getTreasury();
  if (!treasury) throw new Error('Treasury wallet not configured');

  const connection = getConnection();
  const mint = new PublicKey(USDC_MINT);
  const fromAta = getAssociatedTokenAddressSync(mint, args.payer);
  const toAta = getAssociatedTokenAddressSync(mint, treasury);
  const amount = BigInt(Math.round(args.amountUsdc * 10 ** USDC_DECIMALS));

  const tx = new Transaction()
    .add(
      createAssociatedTokenAccountIdempotentInstruction(args.payer, toAta, treasury, mint)
    )
    .add(
      createTransferCheckedInstruction(fromAta, mint, toAta, args.payer, amount, USDC_DECIMALS)
    )
    .add(
      new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(args.memo, 'utf8'),
      })
    );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = args.payer;

  const signature = await args.sendTransaction(tx, connection);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  );
  return signature;
}

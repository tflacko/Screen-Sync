'use client';

import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { getConnection, getTreasury } from './connection';
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

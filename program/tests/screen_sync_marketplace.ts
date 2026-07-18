// Happy-path tests for screen_sync_marketplace.
// Run with: anchor test   (requires the Solana + Anchor toolchain installed).
//
// This is a starting skeleton — extend with conflict/refund/auth cases:
//   * book_slot rejects overlapping slot masks (SlotTaken)
//   * cancel_booking refunds escrow + frees slots, and rejects after start_date
//   * settle_booking pays publisher `amount` and treasury `fee`, rejects non-oracle
//   * register_listing rejects invalid blocks/mode; fee math matches lib/pricing.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ScreenSyncMarketplace } from "../target/types/screen_sync_marketplace";
import { assert } from "chai";

const enc = (s: string) => Buffer.from(s);
const u64 = (n: number | bigint) => new anchor.BN(n.toString());
const le = (n: number, bytes: number) => {
  const b = Buffer.alloc(bytes);
  b.writeBigUInt64LE(BigInt(n));
  return b.subarray(0, bytes);
};

describe("screen_sync_marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace
    .ScreenSyncMarketplace as Program<ScreenSyncMarketplace>;

  const admin = provider.wallet as anchor.Wallet;
  const treasury = Keypair.generate();
  const oracle = admin.payer; // admin doubles as oracle for the test

  const [configPda] = PublicKey.findProgramAddressSync([enc("config")], program.programId);

  const listingId = Date.now();
  const [listingPda] = PublicKey.findProgramAddressSync(
    [enc("listing"), admin.publicKey.toBuffer(), le(listingId, 8)],
    program.programId
  );

  const baseRate = 0.8 * LAMPORTS_PER_SOL; // lamports/day
  const blocksPerDay = 8;

  it("initializes config", async () => {
    await program.methods
      .initializeConfig(250, oracle.publicKey)
      .accounts({ admin: admin.publicKey, treasury: treasury.publicKey })
      .rpc();
    const cfg = await program.account.config.fetch(configPda);
    assert.equal(cfg.feeBps, 250);
    assert.ok(cfg.treasury.equals(treasury.publicKey));
  });

  it("registers a listing", async () => {
    await program.methods
      .registerListing(u64(listingId), u64(baseRate), blocksPerDay, 0)
      .accounts({ owner: admin.publicKey, config: configPda, listing: listingPda })
      .rpc();
    const l = await program.account.listing.fetch(listingPda);
    assert.equal(l.baseRate.toString(), baseRate.toString());
    assert.isTrue(l.active);
  });

  it("books a slot and escrows funds", async () => {
    const nonce = Date.now();
    const date = Math.floor(Date.now() / 86_400_000) + 3; // 3 days out
    const slotMask = 0b0000_0011; // two blocks

    const [bookingPda] = PublicKey.findProgramAddressSync(
      [enc("booking"), listingPda.toBuffer(), admin.publicKey.toBuffer(), le(nonce, 8)],
      program.programId
    );
    const [dayPda] = PublicKey.findProgramAddressSync(
      [enc("day"), listingPda.toBuffer(), le(date, 4)],
      program.programId
    );

    await program.methods
      .bookSlot(u64(nonce), date, slotMask)
      .accounts({
        advertiser: admin.publicKey,
        config: configPda,
        listing: listingPda,
        dayLedger: dayPda,
        booking: bookingPda,
      })
      .rpc();

    const b = await program.account.booking.fetch(bookingPda);
    // slotPrice = baseRate/8 * 1.5 ; amount = slotPrice * 2 ; fee = 2.5%
    const slotPrice = Math.floor((baseRate * 3) / (blocksPerDay * 2));
    const amount = slotPrice * 2;
    const fee = Math.floor((amount * 250) / 10_000);
    assert.equal(b.amount.toString(), amount.toString());
    assert.equal(b.fee.toString(), fee.toString());
    assert.equal(b.escrow.toString(), (amount + fee).toString());

    const day = await program.account.dayLedger.fetch(dayPda);
    assert.equal(day.slotBitmap, slotMask);
  });
});

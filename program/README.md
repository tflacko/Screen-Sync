# screen_sync_marketplace — Anchor program (Phase 2)

On-chain marketplace logic for Screen Sync: listing registration, slot/filler
bookings, **SOL escrow**, and **2.5% protocol fee** settlement. This is the
trustless layer that replaces the MVP's custodial direct-transfer payments.

> **Status: scaffold.** Code is written but **not yet built/deployed** — that
> needs the Solana + Anchor toolchain and your deploy wallet (neither was
> available in the session that wrote it). Build + test + audit before mainnet.

## Layout
```
program/
  Anchor.toml
  Cargo.toml                                  workspace
  programs/screen_sync_marketplace/
    Cargo.toml
    src/lib.rs                                the program
  tests/screen_sync_marketplace.ts            test skeleton (happy paths)
  package.json  tsconfig.json                 anchor test harness
```

## Prerequisites (one-time)
```bash
# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
# Anchor via avm
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1 && avm use 0.30.1
# A deploy wallet (THIS is the "project wallet to deploy smart contracts")
solana-keygen new -o ~/.config/solana/id.json     # save the seed phrase securely
solana config set --url devnet
solana airdrop 2
```

## Build / test / deploy
```bash
cd program
anchor build                 # compiles the program + generates the IDL
anchor keys sync             # writes the real program id into lib.rs + Anchor.toml
anchor build                 # rebuild so the embedded id matches
anchor test                  # runs tests on a local validator
# Devnet:
anchor deploy --provider.cluster devnet
```
After `anchor keys sync`, replace the placeholder `declare_id!` — the command does
this for you; commit the change.

## Instructions (Phase 2a core)
| Ix | Signer | Effect |
|----|--------|--------|
| `initialize_config` | admin | Set treasury, oracle, fee_bps. PDA `["config"]`. |
| `update_config` | admin | Update fee/oracle/treasury/pause. |
| `register_listing` | publisher | Create Listing PDA `["listing", owner, listing_id]`. |
| `update_listing` | publisher | Update rate/mode/active. |
| `book_slot` | advertiser | Reserve block(s) on a date; escrow `slotPrice×count + fee`. |
| `book_filler` | advertiser | Reserve filler over a range; escrow `rate×tier×days + fee`. |
| `settle_booking` | oracle/admin | Publisher gets amount, treasury gets fee, booking closes. |
| `cancel_booking` | advertiser | Pre-start refund (escrow + rent); frees slots. |

Pricing mirrors `lib/pricing.ts` / `lib/constants.ts` exactly (250 bps fee, 8
blocks/day, 1.5× slot premium, filler tiers 25/50/100%). All math is integer
lamports with checked arithmetic.

## Wiring back into the dApp (when deployed)
Swap the MVP's direct-transfer path for program calls, keeping `lib/*` signatures:
- `lib/transactions.ts` `sendTreasuryTx` → build `book_slot` / `book_filler` ixs.
- `app/list` registration → `register_listing` ix.
- `lib/listings.ts` reads → fetch `Listing` PDAs (or DAS once Core NFTs land) +
  read `DayLedger` for `lib/availability.ts` instead of the mock.
- Copy the generated IDL + types from `program/target/idl` & `target/types` into
  the dApp and use `@coral-xyz/anchor` to call the program.

## Not yet implemented (later phases — see ../docs/SMART-CONTRACTS.md)
- Metaplex Core NFTs (listings/creatives/contract receipts).
- Proof-of-display (Bubblegum cNFT) + `record_delivery` + dispute resolution.
- USDC (SPL) escrow path (Config can be extended with `accepted_mint`).
- Strict multi-day on-chain filler-cap enforcement.

## Security
Apply the Phase 2 checklist in [`../docs/SECURITY.md`](../docs/SECURITY.md) and
run the Solana MCP `program_autofixer` before any audit/deploy.

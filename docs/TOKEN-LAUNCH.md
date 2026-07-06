# $SSC Token — Launch Runbook

Fill in [`token/config.ts`](../token/config.ts) before running anything in
`token/scripts/`. `assertConfigComplete()` refuses to run if a field is
still `FILL_IN` or the allocation doesn't sum to `totalSupply`. Devnet
first, always — see §5.

## Why this isn't a Genesis bonding-curve/launchpool launch

The original plan (per the pasted launch template) was to use Metaplex
Genesis's public launch API for the whole thing. Verified against the
actually-installed `@metaplex-foundation/genesis@0.38.0`:

- **There is a real, reachable Metaplex API** — `createLaunch` /
  `createAndRegisterLaunch` / `claimCreatorRewards` all POST to
  `https://api.metaplex.com/v1/...`, plain JSON, no API key. "Connecting to
  Metaplex" is just outbound HTTPS to that host; nothing to authorize.
- But its public launch products (bonding curve, launchpool) are
  **fixed-parameter, pump.fun-style mechanisms**: 1 billion total supply,
  fixed decimals, and — for bonding curve — fully automatic fund-flow with
  no custom allocation buckets at all. Launchpool adds exactly two bucket
  types (one public-sale allocation + optional Streamflow vesting streams),
  not the five-bucket table (public / 4 marketing sub-pools / treasury /
  team / reserve) this token needs.
- The low-level PDA instructions the template called directly
  (`findGenesisAccountV2Pda`, `initializeV2`, `addLaunchPoolBucketV2`, etc.)
  aren't exported by the current published package — only the raw
  generated instruction builders are, and the SDK routes through the
  hosted API instead.

**Decision:** mint $SSC directly via `mpl-token-metadata` with the exact
supply/decimals/allocation this repo needs, and distribute each bucket
ourselves. A Genesis bonding-curve/launchpool listing remains a real
option later — see §6 — but it would be a *separate* token/economics, not
a sale of the $SSC mint itself (Genesis's public API always mints its own
token).

---

## 1. Fill in the config

Edit [`token/config.ts`](../token/config.ts):

- `tokenConfig`: name, totalSupply (whole tokens), description, twitter,
  logoPath, metadataUri (see §2 for how to get this).
- `allocation`: each bucket's `amount` (whole tokens) and destination
  `wallet` (public key). Must sum to `tokenConfig.totalSupply`.

`team.wallet` should be a Streamflow vesting stream or Squads multisig
address, not a wallet you can freely spend from — see §4.

---

## 2. Upload metadata to IPFS (Pinata)

Upload the logo, get its CID, fill it into
[`token/metadata.template.json`](../token/metadata.template.json)'s `image`
field, then upload that file. The resulting CID/URL becomes
`tokenConfig.metadataUri`, e.g. `https://cdn.screensync.xyz/ipfs/<CID>`.

---

## 3. Environment setup

```bash
npm install   # already wired into package.json — installs the Metaplex/Solana deps below
cp token/.env.example token/.env   # then fill in WALLET_KEYPAIR_PATH etc. (gitignored)
```

**Wallet setup — do NOT put a plaintext keypair on mainnet.**
`WALLET_KEYPAIR_PATH` should point at a local Solana CLI keypair file for
devnet only. For mainnet, sign with a hardware wallet (Ledger) or KMS —
these scripts assume a local signer and are devnet-appropriate as written;
adapt `token/umi.ts` before using them against real funds.

For the post-launch authority checklist (§4), the Metaplex CLI is
available on demand — no need to install it globally:

```bash
npx @metaplex-foundation/cli --help
```

> Correction from the original draft: the package is
> **`@metaplex-foundation/cli`**, not `@metaplex-foundation/mplx-cli` (that
> name doesn't exist on npm). It's deliberately *not* a project dependency —
> it pulls in Ledger hardware-wallet support (`node-hid`), which needs
> native `libusb` headers and would break `npm install` for anyone without
> them. `npx` installs it on demand instead.

---

## 4. Deploy

```bash
npm run token:mint                          # creates the mint + metadata, mints total supply to your wallet
npm run token:distribute -- <MINT_ADDRESS>  # transfers each allocation bucket to its wallet
```

Then move the team allocation into its actual vesting mechanism (in order
of preference):

- **Streamflow** (recommended) — https://streamflow.finance. Create a
  stream: recipient = team wallet, amount = team allocation, 3-month
  cliff, 12-month linear vesting, cancel authority = none.
- **Squads multisig** — https://v4.squads.so. 2/2 approval + time
  condition before transfers.
- **Off-chain + ToS** (minimum viable, least trust) — document vesting
  terms publicly and disclose the holding wallet.

### Post-launch checklist

Run in order once the token is live and distribution is confirmed:

- [ ] **Revoke mint + freeze authority, set metadata immutable**
  ```bash
  npm run token:revoke-authorities -- <MINT_ADDRESS>
  ```
  All three steps are irreversible — confirm supply, distribution, and
  metadata are correct first. Pass `--skip-immutable` to defer that one
  step if metadata might still need a correction.
- [ ] **Verify on Solana Explorer** — confirm metadata, supply, and
  revoked authorities: `https://explorer.solana.com/address/<MINT>`
- [ ] **Submit for Jupiter community verification** —
  https://catdetlist.jup.ag
- [ ] **Transfer team allocation** into the vesting stream/multisig (above).
- [ ] **Monitor the indexer** — confirm `contribute_to_mission` and
  `book_campaign` events are being picked up by the backend.

---

## 5. Devnet test run

Always deploy to devnet and verify the full flow before touching mainnet.
`token/config.ts` defaults `network` to `devnet`; mainnet requires
`SSC_NETWORK=mainnet` **and** `SSC_CONFIRM_MAINNET=yes` (see
`token/.env.example`) as a deliberate speed bump.

```bash
solana airdrop 5 --url devnet   # fund the devnet wallet at WALLET_KEYPAIR_PATH

# Then verify end-to-end:
# 1. Token mints correctly with metadata
# 2. Each allocation bucket lands in the right wallet with the right amount
# 3. Mint/freeze authority revoke + metadata-immutable all succeed
```

---

## 6. Later — an optional Genesis public listing

If Screen Sync wants a permissionless bonding-curve or launchpool listing
in addition to (not instead of) the $SSC mint above — e.g. to bootstrap
liquidity/attention with its own separate economics — see
[`token/scripts/genesisPublicSale.optional.ts`](../token/scripts/genesisPublicSale.optional.ts).
Read the caveats at the top of that file first: it mints its **own** token
via Genesis's public API (1B fixed supply), it does not sell the $SSC mint
created here, and the image must be hosted on Irys
(`https://gateway.irys.xyz/...`), not Pinata/IPFS.

---

## References

- [Metaplex Genesis Docs](https://www.metaplex.com/docs/smart-contracts/genesis)
- [Genesis Bonding Curve](https://www.metaplex.com/docs/smart-contracts/genesis/bonding-curve)
- [Genesis Launch Pool](https://www.metaplex.com/docs/smart-contracts/genesis/launch-pool)
- [Genesis Creator Fees](https://www.metaplex.com/docs/smart-contracts/genesis/creator-fees)
- [Token Metadata — Create Fungible Token](https://developers.metaplex.com/tokens/create-a-token)
- [Metaplex Protocol Fees](https://www.metaplex.com/docs/protocol-fees)
- [Jupiter Community Verification](https://catdetlist.jup.ag/)
- [Streamflow Vesting](https://streamflow.finance/)
- [Squads Multisig](https://v4.squads.so/)

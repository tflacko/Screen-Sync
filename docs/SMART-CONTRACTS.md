# Screen Sync — On-Chain Architecture & Smart Contract Plan

> **Handoff doc.** Self-contained plan for a session that will implement Screen Sync's
> Solana smart contracts and wire them into the dApp **and** the website ad spaces.
> Read this top-to-bottom before writing any program code.

---

## 1. Product context (for a cold session)

**Screen Sync** is a peer-to-peer advertising marketplace on Solana. Anyone lists an ad
space (website banner, in-game billboard, streamer overlay, casino/boutique screen, aerial,
etc.); advertisers book it directly; settlement happens on-chain. Media (ad creatives) is
stored on IPFS via Pinata, with the content ID (CID) anchored on-chain.

The product spans **two separate codebases** (do not merge them):
- **Marketing website** — `Fable test site/` (static HTML/CSS/JS). Hosted separately. Design reference only.
- **dApp** — this repo (`screensync-dapp/`, Next.js 14 + TypeScript). The app users interact with. Repo: `github.com/tflacko/Screen-Sync`.

**Architecture is hybrid today, migrating to fully on-chain in phases** (see §10):
- Now: UI-first, **mock data**; Solana/IPFS calls stubbed in `lib/solana.ts`, `lib/pinata.ts`, `lib/availability.ts`.
- Target: listings, bookings, settlement on-chain; media on IPFS (CID anchored); proof-of-display on-chain.

**Current dApp state (already built, all mock):**
- Listings browse at `/` (root); detail at `/marketplace/[id]`.
- 8 mock listings in `lib/mockData.ts` (types: video-game, billboard, streamer, website, business-front, aerial).
- **Contract Builder** (`components/contract/`) on each listing — two booking modes:
  - **Slot**: reserve exclusive time blocks (8 × 3-hour blocks/day) via an availability calendar.
  - **Filler**: run the ad in the gaps between booked slots at a frequency tier (Low/Med/High).
- Pricing in `lib/pricing.ts` (2.5% protocol fee, slot premium ×1.5, filler factors).
- Create-listing flow at `/list` with file validation + mock IPFS upload.

---

## 2. Three planes

| Plane | What | Where it lives |
|-------|------|----------------|
| **Control** | List, browse, book (Contract Builder), manage | The dApp (this repo) |
| **Settlement / ownership** | Listings, creatives, bookings, escrow, fees, proof-of-display | Metaplex assets + Anchor program on Solana |
| **Serving / measurement** | Display the booked creative on the ad space, report impressions | Screen Sync **ad tag/SDK** embedded in each website/app ad space + a serving/oracle service |

The website ad spaces and the dApp intertwine through the **settlement plane**: an ad space is
registered as an on-chain **Listing**; the dApp books it; the ad tag serves the booked creative
and reports impressions; the program settles funds and mints proof-of-display.

---

## 3. Entity → standard mapping

| Entity | Standard | Rationale | Skill files to read |
|--------|----------|-----------|---------------------|
| **Listing** (ad space) | **Core NFT** (collection "Screen Sync Listings") + **Anchor state PDA** | Core: transferable ownership, plugins, ~87% cheaper than TM. Mutable booking/availability ledger can't live in NFT metadata cheaply → Anchor PDA keyed by the listing asset. | `cli-core.md`, `sdk-core.md`, `metadata-json.md`, `concepts.md` |
| **Ad creative** | **Core NFT** (collection "Screen Sync Creatives") | Provenance + reuse across campaigns; CID in metadata. | `cli-core.md`, `metadata-json.md` |
| **Booking / contract** | **Anchor PDA** (escrow + terms) **+ Core NFT receipt** minted to advertiser | Program owns escrow/terms; the Core "Contract" NFT is the advertiser's transferable proof. | `sdk-core.md` (mint), Anchor §6 |
| **Proof-of-display** | **Bubblegum cNFT** per delivery batch | Thousands of impression receipts at minimal cost. | `cli-bubblegum.md`, `sdk-bubblegum.md` |
| **Protocol fee / treasury** | **Anchor PDA** | 2.5% (250 bps, see `lib/constants.ts`) collected on settle. | Anchor §6 |
| *(future)* **$SCREEN token** | **Genesis** (bonding curve or launchpool) | Fair launch if/when a protocol token ships. | `cli-genesis.md`, `sdk-genesis.md` |
| *(future)* **Filler-optimizer agent** | **Agent Registry** (Core asset + delegated executive) | The planned algorithm/LLM that auto-places filler can be an on-chain agent acting for advertisers. | `cli-agent.md`, `sdk-agent.md` |

> Metaplex CLI/SDK choice: prefer the `mplx` **CLI** for one-off ops (create collections, mint).
> Use the **Umi SDK** for in-app minting (Core listing/creative/contract NFTs) and DAS queries.
> Program IDs and standards detail are in the skill's `concepts.md`.

---

## 4. Anchor program — `screen_sync_marketplace`

The custom marketplace logic Metaplex doesn't provide. Single program, multiple account types.

### Accounts (PDAs)
- **Config** — `["config"]`: admin pubkey, `fee_bps` (250), treasury, accepted mint (SOL or USDC), pause flag.
- **Listing** — `["listing", core_asset]`: links to the Core listing NFT; owner; `base_rate` (lamports/day); `blocks_per_day` (8); `booking_mode` (exclusive | rotating); `max_advertisers`; per-date **availability ledger** (slot bitmap + filler usage). Large/rolling state → consider one **DayLedger** PDA per `(listing, date)` to bound account size: `["day", listing, date_u32]` with an 8-bit slot bitmap + filler counter.
- **Booking** — `["booking", listing, advertiser, nonce]`: kind (slot | filler), date range, slot indices / filler tier, amount, escrow balance, status (escrowed | live | settled | refunded | disputed), creative CID, contract NFT mint.
- **Treasury** — `["treasury"]`: accrued protocol fees.

### Instructions
| Ix | Who | Effect |
|----|-----|--------|
| `initialize_config` | admin | Set fee, treasury, accepted mint. |
| `register_listing` | publisher | Bind a Core listing NFT to a Listing PDA; set rate/mode/blocks. |
| `update_listing` | publisher | Rate, mode, pause. |
| `book_slot` | advertiser | Reserve exclusive block(s) on date(s); mark bitmap; escrow `slotPrice × count + fee`; mint Contract NFT. |
| `book_filler` | advertiser | Reserve filler at a tier over a range; increment filler usage; escrow `rate × factor × days + fee`; mint Contract NFT. |
| `settle_booking` | oracle/permissionless after delivery | Release escrow → publisher; `fee` → treasury; flip status `settled`. |
| `cancel_booking` | advertiser (pre-start) | Refund escrow minus optional cancel fee; free the slots. |
| `raise_dispute` / `resolve_dispute` | advertiser / admin (later: governance) | Hold/Refund/release against on-chain proof-of-display. |
| `record_delivery` | oracle | Reference a proof-of-display cNFT batch; advance booking toward settle. |
| `withdraw_fees` | admin | Treasury → admin/treasury wallet. |

### Escrow & fee
Escrow held in the Booking PDA (SOL) or an associated token account (USDC). On `settle_booking`:
`publisher += amount − fee; treasury += fee` where `fee = amount × 250 / 10_000`.

Mirror the dApp math exactly: see `lib/pricing.ts` (`slotPrice`, `slotBookingCost`, `fillerCost`, `platformFee`) and `lib/constants.ts` (`PLATFORM_FEE_BPS`, `BLOCKS_PER_DAY`, `SLOT_PREMIUM`, `FILLER_TIERS`).

---

## 5. Payment model — DECIDED: SOL + USDC-ready
- **v1: SOL** (matches the dApp's SOL pricing today — least friction on devnet).
- **USDC-ready from day one:** Config carries `accepted_mint` (native-SOL sentinel **or** an SPL mint). Build SOL escrow first, but design every escrow/settle path mint-agnostic so enabling **USDC (SPL)** is a config flip + token-account plumbing, not a refactor. Escrow holds either lamports (SOL) or an SPL token account (USDC) keyed off `accepted_mint`. UI shows the active currency; `lib/pricing.ts` math is currency-agnostic (units only).

---

## 6. dApp ↔ chain mapping (wire these existing stubs)

| dApp stub (file) | Replace with |
|------------------|--------------|
| `lib/solana.ts` `createListing()` | `register_listing` ix + mint Core listing NFT (Umi). |
| `lib/solana.ts` `bookListing()` / Contract Builder `sign()` (`components/contract/ContractBuilder.tsx`) | `book_slot` or `book_filler` ix (+ escrow + Contract NFT). Builder already produces `{ mode, date, slotIdx }` or `{ rangeStart, rangeEnd, tier }`. |
| `lib/solana.ts` `getListings()` | DAS query of the Listings collection + read Listing/DayLedger PDAs. |
| `lib/availability.ts` `getDaySlots()` / `getDayStatus()` / `getFillerCapacity()` | Read DayLedger PDA (slot bitmap + filler counter) for `(listing, date)`. Keep the same return shapes so the calendar/UI are unchanged. |
| `lib/pinata.ts` `uploadToIPFS()` | Real Pinata pin (keys server-side); CID goes into the creative NFT metadata + Booking. |
| `lib/solana.ts` `getBalance()` | RPC `getBalance`. |

Keep the function signatures/return types stable so the UI (Contract Builder, calendar, marketplace) needs no changes — only the lib internals swap from mock to chain.

---

## 7. Website ad-space ↔ dApp integration (the intertwining)

This is the core handoff goal: connect real website ad spaces to dApp bookings.

1. **Register** — a publisher adds an ad space via the dApp `/list` flow → `register_listing` → Core listing NFT + Listing PDA. The dApp returns a **listing id / asset address**.
2. **Embed** — the website places a Screen Sync **ad tag** in that slot:
   ```html
   <div class="screensync-ad" data-listing="<core_asset_address>" data-size="728x90"></div>
   <script src="https://cdn.screensync.xyz/tag.js" async></script>
   ```
   `tag.js` (new, to build) calls a **serving endpoint** (or reads chain directly via RPC/DAS) for the creative currently booked for this listing at the current time slot — or, if no premium slot is active, the next **filler** creative in rotation.
3. **Serve** — the tag renders the creative (image/video) from the IPFS gateway (`IPFS_GATEWAY` in `lib/pinata.ts`).
4. **Measure** — the tag reports a viewable impression to the serving/oracle service.
5. **Prove + settle** — the oracle batches impressions into **Bubblegum cNFTs** (proof-of-display), calls `record_delivery`, and once a booking's delivery is complete, `settle_booking` releases escrow to the publisher (minus 2.5%).

**Trust model:** start with a **centralized Screen Sync oracle** signing delivery (fast to ship), then decentralize (multiple attestors / verifiable measurement) in a later phase. Document the oracle key in Config.

The **marketing website** (`Fable test site/`) can be the **first real publisher**: register its own banner/signage slots as listings to dogfood the full loop.

---

## 8. Suggested account schema sketch (Anchor / Rust)

```rust
#[account] pub struct Config { admin: Pubkey, treasury: Pubkey, fee_bps: u16,
  accepted_mint: Pubkey /* SOL = native sentinel */, oracle: Pubkey, paused: bool }

#[account] pub struct Listing { core_asset: Pubkey, owner: Pubkey, base_rate: u64,
  blocks_per_day: u8, mode: u8 /* 0 exclusive,1 rotating */, max_advertisers: u8, active: bool }

#[account] pub struct DayLedger { listing: Pubkey, date: u32 /* days since epoch */,
  slot_bitmap: u8 /* 1 bit per 3h block */, filler_used: u16 }

#[account] pub struct Booking { listing: Pubkey, advertiser: Pubkey, kind: u8 /* slot|filler */,
  start_date: u32, end_date: u32, slots: u8, filler_tier: u8, amount: u64, fee: u64,
  escrow: u64, status: u8, creative_cid: String, contract_nft: Pubkey, delivered: u32 }
```

Round all UI numbers; on-chain is integer lamports — convert with `lib/format.ts` (`solToLamports`/`lamportsToSol`).

---

## 9. Implementation plan (phased — aligns with the hybrid → on-chain roadmap)

- **Phase 2a — Anchor core (devnet):** scaffold `screen_sync_marketplace` (Anchor); `initialize_config`, `register_listing`, `book_slot`, `book_filler`, `settle_booking`, `cancel_booking`; SOL escrow; treasury fee. Tests.
- **Phase 2b — Metaplex assets:** create Listings + Creatives Core collections (CLI); mint listing NFT on register, contract NFT on book (Umi in `lib/solana.ts`). Pinata live in `lib/pinata.ts`.
- **Phase 2c — wire dApp:** swap `lib/solana.ts`, `lib/availability.ts`, `lib/pinata.ts` internals to the program + DAS, keeping return shapes. Wallet already integrated (`@solana/wallet-adapter`, Phantom/Solflare).
- **Phase 3 — serving + proof-of-display:** build `tag.js` ad tag + serving/oracle service; Bubblegum cNFT impression receipts; `record_delivery`; dispute resolution against receipts.
- **Phase 4 — decentralize + intelligence:** USDC payments; decentralize pinning + oracle; **filler-optimizer agent** via Agent Registry; **location targeting**; optional **$SCREEN** token via Genesis.

---

## 10. Open decisions (resolve with the team)
1. ~~**Payment currency**~~ — **DECIDED: SOL + USDC-ready.** Ship SOL escrow first; keep all escrow/settle paths mint-agnostic via `Config.accepted_mint` so USDC turns on without a refactor. (See §5.)
2. ~~**Listing as Core NFT vs pure PDA**~~ — **DECIDED: Core NFT + state PDA.** Listings are transferable Core NFTs (publishers can sell/transfer an ad space; secondary market enabled); the mutable booking/availability ledger lives in the Anchor PDA. (See §3, §4.)
3. **Booking granularity** — day + 3-hour blocks (current UI). Confirm before locking the bitmap layout.
4. **Rotation/filler enforcement** — how strictly to cap filler share on-chain vs trust the serving layer.
5. ~~**Oracle trust**~~ — **DECIDED: centralized Screen Sync oracle for now**, decentralize later. The oracle key is stored in `Config.oracle` and signs `record_delivery` / `settle_booking`; design these ix so the signer can later become a multi-attestor set without changing the booking flow. (See §7.)
6. **Contract NFT** — mint a Core receipt per booking (recommended) or keep bookings PDA-only to save cost?

---

## 11. References
- Metaplex skill (this workspace): `concepts.md`, `cli-core.md`, `sdk-core.md`, `cli-bubblegum.md`, `sdk-bubblegum.md`, `metadata-json.md`, `cli-genesis.md`, `cli-agent.md`.
- Program IDs (devnet/mainnet shared): Core `CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d`; Bubblegum V2 `BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY`; Token Metadata `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`; Genesis `GNS1S5J5AspKXgpjz6SvKL66kPaKWAhaGRhCqPRxii2B`.
- dApp anchors: `lib/constants.ts` (fee/blocks/tiers), `lib/pricing.ts` (cost math), `lib/availability.ts` (slot model), `components/contract/ContractBuilder.tsx` (booking UX), `README.md` (hybrid → on-chain roadmap).
- Metaplex docs: https://metaplex.com/docs · Anchor: https://www.anchor-lang.com

# Next session — kickoff checklist

Quick-start so a new session is productive immediately. Pairs with
[`SMART-CONTRACTS.md`](./SMART-CONTRACTS.md) (Phase 2 on-chain architecture),
[`BACKEND-SETUP.md`](./BACKEND-SETUP.md) (manual setup + wallet architecture),
and [`SECURITY.md`](./SECURITY.md) (trust model + audit trail).

## 1. Current state (post backend-integration)

The **self-contained USDC MVP** is fully wired (see PR #2 / branch
`claude/dapp-mvp-backend-integration-aevkz2`):

- **Product:** Screen Sync sells its own ad space (`house_web` listing).
  $20 USDC / exclusive 15-min UTC slot; **outbid** = holder's bid + $5
  (highest verified payment wins); **filler** = $20/day for 15 min of total
  airtime spread across unbooked windows. **USDC-only — no price oracle.**
- **Chain+IPFS, no database:** bookings are USDC transfers to the treasury
  with memos (terms + creative CID); payment amounts are verified from token
  balance deltas; listings are IPFS metadata anchored on-chain ($1 USDC fee).
- **Serving:** website embeds `public/tag.js` → `/api/ad` (slot winner →
  filler allocator → house rotation; `AD_DENYLIST_CIDS` moderation).
- **Phase 2 scaffold:** `program/` holds the `screen_sync_marketplace` Anchor
  program (escrow/settle/cancel) — written, NOT yet built/deployed.

## 2. First commands
```bash
npm install
npm run dev        # http://localhost:3001 — mock mode with zero config
npm run build      # authoritative type-check — use this to verify
cp .env.example .env.local   # then fill in to go live (see BACKEND-SETUP.md)
```

## 3. What's manual (user-only) before live
Treasury wallet address, Pinata JWT, devnet SOL+USDC in a test wallet
(faucet.solana.com / faucet.circle.com), Netlify env vars, ad-tag snippet on
the marketing site. Full checklist: `BACKEND-SETUP.md`.

## 4. Environment caveats
- **`gh` CLI may not be installed** — use plain `git`. Repo:
  `github.com/tflacko/Screen-Sync`. Netlify deploys from `main` only; work on
  a feature branch → PR → merge when verified.
- **Build type-check gotcha (fixed — don't undo):** `package.json` `overrides`
  pin `@types/react`/`-dom` to 18; `WalletProviderWrapper.tsx` casts providers
  to React-18 `FC`; `tsconfig.json` excludes `reference/` and `program/`.
- Solana MCP (`.mcp.json`) available for program work; Metaplex skill for
  Phase 2b NFT work.

## 5. Next implementation steps
1. **Build + deploy the Anchor program** (`program/README.md`): needs the
   deploy wallet + Anchor toolchain. Update it for the current pricing model
   (USDC/SPL escrow, 96-slot bitmap → u128 or per-slot PDAs, outbid ix).
2. **Wire the dApp to the program** once deployed (swap direct transfers for
   `book_slot`/`book_filler`/escrow; automatic outbid refunds on-chain).
3. **Metaplex Core NFTs** (Phase 2b): listing/creative/contract-receipt mints.
4. **Indexer-as-cache** (Helius/DAS) when treasury scans get slow.
5. **Proactive moderation** before mainnet (approval gate before first serve).

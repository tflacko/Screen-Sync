# Next session — kickoff checklist

Quick-start so a new session is productive immediately. Pairs with
[`SMART-CONTRACTS.md`](./SMART-CONTRACTS.md) (the on-chain architecture/handoff).

## 1. Open the right folder
Open **`screensync-dapp/`** as the workspace — **not** the parent or the marketing site
(`Fable test site/`, which is a separate project / design reference only). Opening the dApp
folder makes the preview, `.mcp.json`, and config self-contained.

## 2. First commands
```bash
npm install        # restores deps (incl. @types/react overrides — keep them)
npm run dev        # http://localhost:3001
npm run build      # USE THIS to verify — see caveat below
```

## 3. Environment caveats (important for efficiency)
- **This repo lives in OneDrive.** The Next dev server gets constant Fast-Refresh churn and the
  in-tool screenshot/preview is flaky and sometimes 500s on a stale server. **`npm run build` is
  the reliable source of truth** (full type-check + static gen). If the dev server misbehaves,
  stop and restart it. For the heavy Anchor/Rust toolchain, consider a **non-OneDrive clone**.
- **`gh` CLI is NOT installed.** Use plain `git` (Git Credential Manager handles GitHub auth via
  a browser popup on first push). Repo: `github.com/tflacko/Screen-Sync`, branch `main`.
  Author: Thomas Orta `<web3.w.t@gmail.com>`. Work on a feature branch → PR → `main`
  (Netlify-style deploys ship from `main`).
- **Build type-check gotcha (already fixed — don't undo):** the Solana mobile wallet adapter pulls
  a nested `@types/react@19`. `package.json` `overrides` pin `@types/react`/`-dom` to 18 and
  `components/WalletProviderWrapper.tsx` casts the providers to React-18 `FC`. `tsconfig.json`
  excludes `reference/`. Keep these.

## 4. Tools available
- **Solana MCP** (`.mcp.json`, server `solana` → https://mcp.solana.com/mcp): approve it when
  prompted, verify with `/mcp`. Gives Solana docs search, an expert "ask for help", and
  **`program_autofixer`** (Anchor + Pinocchio) — use it while building the program.
- **Metaplex skill** — invoke for token-standard detail; read the specific files named in
  `SMART-CONTRACTS.md` §3/§11 (`cli-core.md`, `sdk-core.md`, `cli-bubblegum.md`, `concepts.md`).

## 5. Decisions already locked (see SMART-CONTRACTS.md §10)
- Payment: **SOL now, USDC-ready** (mint-agnostic escrow via `Config.accepted_mint`).
- Listings: **transferable Core NFT + Anchor state PDA**.
- Oracle: **centralized for now**, designed to become multi-attestor.
- Still open (have recommendations): booking granularity, filler enforcement strictness, contract-receipt NFT.

## 6. First implementation step (Phase 2a)
Scaffold the Anchor program `screen_sync_marketplace` per `SMART-CONTRACTS.md` §4:
`initialize_config`, `register_listing`, `book_slot`, `book_filler`, `settle_booking`,
`cancel_booking`; SOL escrow + 2.5% treasury fee; mirror the math in `lib/pricing.ts` /
`lib/constants.ts`. Then wire the `lib/*.ts` stubs (§6 mapping), keeping return shapes stable.

## 7. File map (where things are)
```
app/                      pages — / (listings), /marketplace/[id], /dashboard, /list
components/contract/      Contract Builder (slot + filler) + AvailabilityCalendar
lib/mockData.ts           6 listing types: video-game, billboard, stream-tv, website, mobile, storefront
lib/availability.ts       mock slot/availability model  -> becomes on-chain reads
lib/pricing.ts            fee + slot + filler math (mirror on-chain)
lib/constants.ts          fee bps, blocks/day, slot premium, filler tiers, file rules
lib/solana.ts lib/pinata.ts   STUBS to replace with real program + Pinata
reference/                old React/Vite code (reference only, excluded from build)
docs/SMART-CONTRACTS.md   the architecture + handoff
```

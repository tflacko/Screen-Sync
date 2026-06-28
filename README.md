# Screen Sync — dApp

The decentralized application for **Screen Sync**, a peer-to-peer advertising marketplace built on **Solana** with media stored on **IPFS** (via Pinata).

List your screen. Book attention. Settle instantly — all on-chain.

---

## Overview

Screen Sync turns ad inventory into a tradeable, on-chain marketplace. Advertisers browse and book real-world and digital ad placements directly from inventory owners — no middlemen, transparent pricing, instant settlement.

This repository contains the **frontend dApp** (UI). It currently runs on **mock data** with stubbed on-chain and IPFS calls, architected so the live Solana program and Pinata integration can be wired in without UI changes.

### Inventory types
🎮 Video Game · 📺 Billboard · 📡 Stream/TV · 🌐 Website ·  🛸 Mobile · 🏪 Storefront

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS Modules (shared design tokens) |
| Wallet | `@solana/wallet-adapter` (Phantom, Solflare) |
| Chain | Solana (`@solana/web3.js`) — Devnet |
| Media storage | IPFS via Pinata |

---

## Architecture

Screen Sync runs a **hybrid Solana + IPFS** model today, deliberately designed as a stepping stone toward a **fully on-chain protocol**.

**Today (hybrid):**
- **Listings, bookings & settlement** → on-chain (Solana program)
- **Ad creatives & media** → IPFS via Pinata; the resulting content ID (CID) is recorded in the on-chain account, so the media is content-addressed and tamper-evident even while pinning is delegated

**The intent — gradually go fully on-chain.** The hybrid split exists because large media and rich state are impractical/expensive to put directly on-chain right now. As tooling and costs improve, we migrate responsibilities on-chain in phases:

1. **Phase 1 (current):** on-chain listings + settlement, media on IPFS/Pinata (CID anchored on-chain).
2. **Phase 2:** decentralize pinning (multiple pinning providers / Arweave permanence) and move more booking/escrow logic into the program.
3. **Phase 3:** on-chain proof-of-display and dispute resolution against immutable records.
4. **Phase 4:** fully on-chain protocol — minimize off-chain trust to indexing/RPC only.

All chain/IPFS calls are currently stubbed in [`lib/solana.ts`](lib/solana.ts) and [`lib/pinata.ts`](lib/pinata.ts) so the UI works on mock data and the real integrations drop in without UI changes.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

A Solana wallet (Phantom or Solflare) browser extension is needed to test wallet-gated pages (Dashboard, List Inventory).

---

## Project Structure

```
app/                    # Next.js App Router pages
  page.tsx              # Landing / connect splash
  marketplace/          # Browse + listing detail
  dashboard/            # Wallet-gated account view
  list/                 # Multi-step create-listing flow
components/             # Reusable UI components
lib/                    # Mock data + Solana/Pinata stubs
styles/                 # CSS Modules
```

---

## Roadmap

- [ ] Deploy Solana program & wire `lib/solana.ts`
- [ ] Live Pinata uploads in `lib/pinata.ts`
- [ ] Real booking + escrow flow
- [ ] On-chain analytics dashboard

---

© 2026 Screen Sync · Built on Solana

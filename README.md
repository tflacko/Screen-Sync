# Screen Sync — dApp

The decentralized application for **Screen Sync**, a peer-to-peer advertising marketplace built on **Solana** with media stored on **IPFS** (via Pinata).

List your screen. Book attention. Settle instantly — all on-chain.

---

## Overview

Screen Sync turns ad inventory into a tradeable, on-chain marketplace. Advertisers browse and book real-world and digital ad placements directly from inventory owners — no middlemen, transparent pricing, instant settlement.

This repository contains the **frontend dApp** (UI). It currently runs on **mock data** with stubbed on-chain and IPFS calls, architected so the live Solana program and Pinata integration can be wired in without UI changes.

### Inventory types
🎮 Video Game · 📺 Billboard · 📡 Streamer · 🌐 Website · 🎰 Casino · 🛸 Blimp · 🏪 Storefront

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

Screen Sync uses a **hybrid Solana + IPFS** model:

- **Listing metadata & bookings** → stored on-chain (Solana program)
- **Ad creatives & media** → uploaded to IPFS via Pinata; the resulting CID is stored in the on-chain account

All chain/IPFS calls are currently stubbed in [`lib/solana.ts`](lib/solana.ts) and [`lib/pinata.ts`](lib/pinata.ts) for easy wiring later.

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

# Screen Sync — dApp

The decentralized application for **Screen Sync**, a peer-to-peer advertising marketplace built on **Solana** with media stored on **IPFS** (via Pinata).

List your screen. Book attention. Settle instantly — all on-chain.

---

## Overview

Screen Sync turns ad inventory into a tradeable, on-chain marketplace. Advertisers browse and book real-world and digital ad placements directly from inventory owners — no middlemen, transparent pricing, instant settlement.

This repository contains the **dApp**. The hybrid MVP backend is wired: **real SOL
payments** (devnet), **real IPFS media** (Pinata), and a **database-free** listing
model where listing metadata lives on IPFS with its CID anchored on-chain. With no
configuration it runs in **mock mode** (demo data, no keys needed); adding a treasury
address + Pinata key flips it live. See [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md).

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

**Today (hybrid MVP — database-free):**
- **Payments** → real SOL transfers on devnet (booking + listing registration), via the connected wallet, with an on-chain memo describing the deal.
- **Listings** → metadata pinned to IPFS; the CID is anchored on-chain via the registration tx. Listings are **discovered by scanning the treasury account's tx history** — no backend database. The treasury doubles as the on-chain registry.
- **Ad creatives & media** → IPFS via Pinata; the CID is content-addressed and tamper-evident.
- **Source of truth = chain + IPFS.** Off-chain pieces (RPC, Pinata) are caches/services, not the system of record.

**The intent — gradually go fully on-chain**, in phases:

1. **Phase 1 (current):** real SOL payments; listings = IPFS metadata + on-chain CID; discovery via chain scan.
2. **Phase 2:** Anchor program for **trustless escrow/refunds**, an on-chain availability ledger, and a fast read **indexer** (Helius/DAS) as a cache.
3. **Phase 3:** on-chain proof-of-display + dispute resolution; ad-serving SDK/oracle.
4. **Phase 4:** fully on-chain protocol — minimize off-chain trust to indexing/RPC only.

Integration code lives in [`lib/transactions.ts`](lib/transactions.ts), [`lib/listings.ts`](lib/listings.ts), [`lib/solana.ts`](lib/solana.ts), [`lib/pinata.ts`](lib/pinata.ts), and the API routes under `app/api/`. Every integration falls back to mock when its env vars are absent, so the UI never depends on configuration.

---

## Getting Started

```bash
npm install
npm run dev          # http://localhost:3001 — runs in mock mode, no setup needed
```

To go live (real payments + IPFS), copy the env template and fill it in:

```bash
cp .env.example .env.local
```

See [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md) for the (short) list of values you provide.

A Solana wallet (Phantom or Solflare) browser extension is needed to test wallet-gated pages (Dashboard, List Inventory).

---

## Project Structure

```
app/                    # Next.js App Router pages
  page.tsx              # Landing / connect splash
  marketplace/          # Browse + listing detail
  dashboard/            # Wallet-gated account view
  list/                 # Multi-step create-listing flow
  api/                  # Server routes: /api/upload, /api/pin-json (Pinata, server-side)
components/             # Reusable UI components
lib/                    # config, connection, transactions, listings, pinata, pricing, mock seed
styles/                 # CSS Modules
docs/                   # BACKEND-SETUP.md (your manual inputs), SMART-CONTRACTS.md (Phase 2)
```

---

## Roadmap

- [x] Real SOL payments (booking + listing registration) on devnet
- [x] Live Pinata uploads (media + metadata) via server-side routes
- [x] Database-free listings (IPFS metadata + on-chain CID, discovered by chain scan)
- [ ] Anchor program: trustless escrow/refunds + on-chain availability ledger
- [ ] Read indexer (Helius/DAS) as a cache for fast browse at scale
- [ ] On-chain proof-of-display + ad-serving SDK/oracle

---

© 2026 Screen Sync · Built on Solana

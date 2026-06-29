# Backend setup — your manual inputs

This is the **only** list of things you need to create/provide to take the dApp
from mock mode to a live hybrid MVP on Solana **devnet**. It's intentionally short.

> **Golden rule:** you will only ever paste **public** values + **one API key**.
> You never give anyone (including this app, or me) a wallet **private key / seed
> phrase**. If a step ever asks for a seed phrase, stop — it's wrong.

The app runs fully in **mock mode with zero setup** (`npm run dev`). Each item below
flips one piece from mock to real. Do them in any order.

---

## What runs without any setup (mock mode)

- Browse the marketplace (demo seed listings), open listing details.
- Connect a wallet (Phantom/Solflare).
- Walk the full create-listing and booking flows (no real tx, no real upload).

So you can click through everything first, then add the two items below to go live.

---

## 1. Treasury wallet address  (required for real payments + listings)

This is the wallet that **receives** booking payments and acts as the on-chain
"registry" we scan to discover listings. We only need its **public address**.

1. Install **Phantom** (or Solflare) browser extension.
2. Create a **new wallet** for the project (keep it separate from personal funds).
   Save its recovery phrase somewhere safe — **never type it into this project.**
3. In Phantom: **Settings → Developer Settings → Change Network → Devnet.**
4. Copy the wallet's **public address** (the string starting like `7xK3...`).
5. Paste it as:

   ```
   NEXT_PUBLIC_TREASURY_ADDRESS=<paste the public address>
   ```

> Public address = safe to share/commit-as-config. Private key/seed = never.

---

## 2. Pinata JWT  (required for real media + listing metadata on IPFS)

This stores ad creatives and listing metadata on IPFS. The key stays **server-side**.

1. Go to **https://pinata.cloud** → sign up (free tier is fine).
2. **API Keys → New Key.**
   - Enable **Admin** (simplest), or scoped: `pinFileToIPFS` + `pinJSONToIPFS`.
3. Copy the **JWT** (the long token, *not* the API key/secret pair).
4. Paste it as:

   ```
   PINATA_JWT=<paste the JWT>
   ```

> Secret. Never prefix with `NEXT_PUBLIC`. Never commit it.

---

## 3. (Optional) Dedicated RPC

The default public devnet RPC works but is rate-limited and slow for reads.
For smoother testing, get a free **devnet** RPC URL from Helius or QuickNode and set:

```
NEXT_PUBLIC_SOLANA_RPC_URL=<your devnet rpc url>
```

---

## Where to put these values

### Local testing (your machine)
```bash
cp .env.example .env.local      # then edit .env.local with the values above
npm install
npm run dev                     # http://localhost:3001
```
`.env.local` is git-ignored — it never gets committed.

### Production (Netlify)
Netlify **Site settings → Environment variables** → add the same names/values.
- Public (safe): `NEXT_PUBLIC_TREASURY_ADDRESS`, `NEXT_PUBLIC_SOLANA_RPC_URL`, `NEXT_PUBLIC_IPFS_GATEWAY`
- Secret (server-only): `PINATA_JWT`

After adding/changing variables, trigger a redeploy.

---

## Quick test once live (devnet)

1. Phantom on **Devnet**, get free SOL: run `solana airdrop 2 <your-address> --url devnet`
   or use https://faucet.solana.com.
2. Open the dApp → **Dashboard** shows your real SOL balance.
3. **List Inventory** → upload an image → submit. Approve the tx in Phantom →
   you get a **Solana Explorer** link, and the listing appears in the marketplace.
4. Open a listing → **Contract Builder** → pick slot/dates → **Sign Contract** →
   approve in Phantom → real SOL moves to the treasury, with an Explorer link.

---

## What's intentionally NOT in this MVP (Phase 2)

These need a deployed Anchor program (which needs a dedicated **deploy wallet**
and the Rust toolchain) and are deliberately deferred:

- Trustless **escrow / refunds** (today payments are direct to the treasury — custodial).
- On-chain **availability ledger** (slots/filler availability is still simulated).
- **Proof-of-display** + the ad-serving SDK/oracle.
- A fast read **indexer** (today we read listings straight from chain + IPFS, which is
  lite and decentralized but slower at scale).

See [`SMART-CONTRACTS.md`](./SMART-CONTRACTS.md) for the full Phase 2 plan.

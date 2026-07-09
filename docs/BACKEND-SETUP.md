# Backend setup — your manual inputs

Everything YOU must do by hand to take the self-contained MVP live on **devnet**.
The MVP sells Screen Sync's **own** ad space (the house listing): flat **$20 USDC
15-minute exclusive slots** + frequency filler ($5/$10/$20 per day), paid straight
to the treasury, with the booked creative served onto the marketing website.

> **Golden rule:** you only ever paste **public** values + **one API key**.
> Never type a wallet **private key / seed phrase** into this project, an env
> var, or a chat. If a step seems to ask for one, stop — it's wrong.

Zero-config still works: `npm run dev` runs the whole flow in mock mode.

---

## Checklist (everything manual, in order)

| # | What | Where it goes |
|---|------|----------------|
| 1 | Treasury wallet → copy **public address** | `NEXT_PUBLIC_TREASURY_ADDRESS` |
| 2 | Pinata account → copy **JWT** | `PINATA_JWT` (secret) |
| 3 | Test USDC + SOL in your *advertiser* test wallet | (wallet only, no env) |
| 4 | Set env in `.env.local` (local) and Netlify (prod) | see below |
| 5 | Paste the ad-tag snippet into the marketing website | Hostinger editor |
| 6 | *(Phase 2, later)* deploy wallet + `anchor deploy` | see `program/README.md` |

---

## 1. Treasury wallet (receives all USDC + acts as the on-chain registry)

1. Install **Phantom**. Create a **new wallet dedicated to the project**
   (separate from personal funds). Store the recovery phrase offline.
2. Phantom → Settings → Developer Settings → **change network to Devnet**.
3. Copy the wallet's **public address** →
   ```
   NEXT_PUBLIC_TREASURY_ADDRESS=<public address>
   ```
That's it — the treasury needs no funding; the first booking auto-creates its
USDC token account (the advertiser pays that one-time ~0.002 SOL rent).

## 2. Pinata JWT (stores ad creatives + listing metadata on IPFS)

1. https://pinata.cloud → sign up (free tier fine).
2. API Keys → **New Key** → scope it to `pinFileToIPFS` + `pinJSONToIPFS`
   (or Admin if simpler). Copy the **JWT**.
3. ```
   PINATA_JWT=<jwt>
   ```
   Secret — never `NEXT_PUBLIC`, never committed.

## 3. Test money (to play the advertiser and demo the loop)

Use a **second** Phantom wallet (or profile) as the "advertiser":
- **Devnet SOL** (pays network fees): https://faucet.solana.com → paste address.
- **Devnet USDC** (pays for slots): https://faucet.circle.com → select
  **Solana Devnet** → paste address. This matches the app's default
  `NEXT_PUBLIC_USDC_MINT` (Circle devnet USDC `4zMMC9...ncDU`).

## 4. Where the env values go

**Local:** `cp .env.example .env.local`, fill in — then `npm install && npm run dev`
(http://localhost:3001).

**Production (Netlify):** Site settings → Environment variables → add
`NEXT_PUBLIC_TREASURY_ADDRESS`, `PINATA_JWT` (and optionally
`NEXT_PUBLIC_SOLANA_RPC_URL` for a dedicated RPC). Redeploy.

## 5. Put the ad space on the marketing website (Hostinger)

Paste this **one snippet** where the banner should appear (replace the domain
with your Netlify app URL):

```html
<!-- Screen Sync — on-chain ad space -->
<script async src="https://YOUR-DAPP.netlify.app/tag.js"
        data-listing="house_web" data-width="728" data-height="90"></script>
```

What it does: every 60s it asks the dApp's `/api/ad` what's booked **right now**
for the current 15-minute UTC window — exclusive slot first, then filler
rotation (weighted Low 1× / Medium 2× / High 4×, house ad keeps a share), then
the house "this space is for sale" ad. No cookies, no tracking.

Tip for the sales pitch: link the banner's caption to
`https://YOUR-DAPP.netlify.app/marketplace/house_web` — that's the live booking
page for the very space the visitor is looking at.

## 6. Phase 2 — program (deploy) wallet — later, not needed for the MVP

When you're ready for trustless escrow (`program/`): create a **separate**
deploy wallet (`solana-keygen new`), fund with devnet SOL, then follow
`program/README.md` (`anchor build`, `keys sync`, `test`, `deploy`). Keep the
deploy keypair offline; it's the program's upgrade authority.

---

## End-to-end demo script (what you'll show people)

1. Marketing site shows the house ad in the banner (space for sale).
2. Click through → dApp house listing → Contract Builder.
3. As the "advertiser" wallet: pick a 15-min slot (UTC), **upload a creative**
   (goes to IPFS), pay **$20 USDC** in Phantom.
4. Explorer link proves payment + memo (listing, window, creative CID) on-chain.
5. When the slot window arrives, **the website banner shows the paid creative**
   (within ~60s). Filler bookings rotate in the gaps.
6. USDC sits in the treasury wallet — check it in Phantom.

That's decentralized P2P advertising, demonstrated on your own inventory.

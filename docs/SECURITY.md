# Security notes

Posture for the **hybrid MVP** (Solana devnet). Read alongside `BACKEND-SETUP.md`
and `SMART-CONTRACTS.md` (Phase 2). This is a living doc — update it as the
on-chain program and serving layer land.

## Trust model (today)

- **Payments are custodial.** Bookings/listing fees transfer SOL directly to the
  treasury wallet. There is **no on-chain escrow or refund** yet — that requires
  the Phase 2 Anchor program. The UI states this ("direct payment (MVP)").
- **Source of truth = chain + IPFS.** Listings are IPFS metadata with the CID
  anchored on-chain; discovery scans the treasury account's tx history. No DB.
- **One server-side secret:** `PINATA_JWT`. Everything else is a public value.

## What's handled

| Area | Control |
|------|---------|
| Secret exposure | `PINATA_JWT` read only in `app/api/*` (nodejs runtime); never `NEXT_PUBLIC`, never bundled to the browser. |
| Upload validation | Server-side re-validation of size + MIME + magic bytes in `/api/upload` (client checks are not trusted). |
| Body-size DoS | `Content-Length` guard + `file.size` check **before** buffering in both API routes; only the first bytes are read for the magic check. |
| Untrusted metadata | On-chain/IPFS listing fields are rendered through React (auto-escaped). `type` is validated against the known enum; results are capped (`MAX_RESULTS`). |
| Ownership spoofing | A listing's `owner` is derived from the real tx **signer**, not from self-reported metadata. |
| Error disclosure | API routes return generic messages; details are logged server-side only. |
| Double-submit | Booking/listing buttons disable while a tx is in flight. |

## Residual risks / known limitations (MVP)

1. **Open pin endpoints (`/api/upload`, `/api/pin-json`).** No auth or rate limiting,
   so a third party could consume your Pinata quota/bandwidth. Mitigated by size/type
   caps. **Before mainnet:** add rate limiting (Netlify edge rate limits or an
   external store — in-memory won't work on serverless), use **scoped** Pinata keys
   (only `pinFileToIPFS` + `pinJSONToIPFS`), and consider gating writes behind a
   wallet-signed message.
2. **Custodial treasury.** Funds sent on booking are not escrowed; delivery/refund
   is trust-based until the Anchor program ships (Phase 2).
3. **Registry griefing.** Anyone can write listing-memo txs to the treasury (each
   costs them the listing fee + network fee). `MAX_RESULTS` bounds UI impact; a real
   indexer + on-chain `Listing` PDAs (Phase 2) remove the scan entirely.
4. **Public RPC.** Default devnet RPC is rate-limited; use a dedicated RPC in prod.
5. **Memo parsing.** Booking memos use delimiter-separated fields; the future
   indexer should parse defensively (treat as untrusted, length-limit, prefer a
   structured/length-prefixed encoding).

## Operational

- Never commit `.env.local`. Set production secrets in the Netlify dashboard.
- The treasury wallet's **seed phrase/private key** is never needed by the app and
  must never be shared or committed — only its public address is configured.
- Rotate `PINATA_JWT` if it is ever exposed; revoke in the Pinata dashboard.

## Phase 2 (on-chain program) — security checklist (to apply when built)

- Validate all instruction inputs; enforce signer/PDA seeds and `owner` checks.
- Escrow funds in a program PDA; release only on `settle` / refund on `cancel`.
- Guard arithmetic (checked math) for fees/amounts; mirror `lib/pricing.ts`.
- Gate privileged ix (`settle_booking`, `withdraw_fees`) to the config admin/oracle.
- Independent review/audit before mainnet; run the Solana MCP `program_autofixer`.

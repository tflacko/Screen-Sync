# Legacy reference — React/Vite dApp

These files are preserved from the **previous React/Vite implementation** of Screen Sync
(the `legacy-react-vite` branch / former `main`). They are kept here purely as **reference**
for wiring up the real Solana + IPFS integration in the current Next.js app — they are not
imported by the running app.

## What's actually useful here
The old `services/*.ts` turned out to be near-empty stubs (just an RPC connection and Pinata
key reads). The real, reusable logic is in the **constants** and **utils**:

| File | Reused as |
|------|-----------|
| `constants/solana.ts` (platform fee, lamports, max file size) | → [`lib/constants.ts`](../../lib/constants.ts) |
| `constants/adFormats.ts`, `slotDurations.ts`, `fileSignatures.ts` | → [`lib/constants.ts`](../../lib/constants.ts) |
| `utils/pricing.ts` (platform fee, total cost, net revenue) | → [`lib/pricing.ts`](../../lib/pricing.ts) |
| `utils/solana-format.ts` (SOL ⇄ lamports) | → [`lib/format.ts`](../../lib/format.ts) |
| `utils/fileValidation.ts` (magic-number validation) | → [`lib/fileValidation.ts`](../../lib/fileValidation.ts) |

The adapted versions are Next.js-friendly (env via `process.env.NEXT_PUBLIC_*` instead of
`import.meta.env`). Once the Solana program and Pinata keys are live, the stubs in
[`lib/solana.ts`](../../lib/solana.ts) and [`lib/pinata.ts`](../../lib/pinata.ts) wire into these.

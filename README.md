# YieldFlow

YieldFlow is a retro-styled yield dashboard built for **DeFi Mullet Hackathon #1** on top of **LI.FI Earn** and **Composer**.

The product helps users:

- discover stablecoin vaults from LI.FI Earn
- compare APY, 30-day average, TVL, and deposit readiness
- prepare a Composer route for the selected vault
- approve and deposit from the browser wallet
- verify resulting positions through the Earn portfolio endpoint

## Stack

- React 19
- Vite
- Tailwind CSS v3
- Ethers v6
- LI.FI Earn Data API
- LI.FI Composer API

## Product Scope

Current MVP focus:

- stablecoin vault discovery
- same-chain deposit flow
- wallet connect and network switching
- exact-amount token approvals
- quote review before approval/deposit
- quote expiry guard
- portfolio verification after deposit

Current non-goals:

- custom vault contracts
- strategy execution logic
- unsupported manual route construction
- full multi-route comparison engine

## Architecture

YieldFlow uses two LI.FI layers:

- `Earn Data API` for vault discovery, chains, protocols, and portfolio positions
- `Composer` for executable deposit quotes and transaction status

The frontend does **not** send the LI.FI API key directly. Requests go through local proxy routes:

- `/api/earn/*`
- `/api/quest/*`

That keeps the key in server-side environment variables instead of browser code.

## Security Notes

YieldFlow is a frontend for LI.FI Earn and Composer. Vault execution risk primarily comes from LI.FI routing and the underlying DeFi protocols, but the app still applies several real-funds protections:

- wallet selection modal instead of blind direct injection flow
- friendly wallet rejection handling instead of raw RPC error dumps
- exact-amount approvals instead of unlimited approvals
- same-chain-only deposit flow for the current MVP
- local validation of quote shape before approval and deposit
- quote expiry window with forced re-quote
- explicit review confirmation before approval or deposit
- server-side API key handling through proxy routes

Important:

- test with small amounts first
- rotate the LI.FI key if it was ever exposed outside your private machine
- never commit `.env.local`

## Environment

Create a local env file:

```bash
cp .env.example .env.local
```

Set:

```bash
LIFI_API_KEY=your_lifi_api_key
```

`.env.local` is ignored by git.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run checks:

```bash
npm run lint
npm run build
```

## Recommended First Live Test

Fastest and safest first live test:

- network: `Base`
- token: `USDC`
- amount: `1 USDC`

Why this is the best first test:

- the current MVP is same-chain first
- the default explorer flow is already tuned around Base + USDC
- it reduces bridge complexity while you validate approvals, quote review, and deposit execution

If you want to use `USDT`, make sure you select a vault whose deposit token is actually `USDT` on the same chain. The app uses the selected vault’s underlying deposit token for the quote.

## Key Files

- [src/App.jsx](./src/App.jsx) — landing page, explorer layout, selected vault flow
- [src/components/VaultCard.jsx](./src/components/VaultCard.jsx) — vault grid cards
- [src/components/VaultDetailPanel.jsx](./src/components/VaultDetailPanel.jsx) — quote, review, approval, deposit flow
- [src/components/WalletModal.jsx](./src/components/WalletModal.jsx) — wallet selection UI
- [src/hooks/useDepositFlow.js](./src/hooks/useDepositFlow.js) — quote validation, approval, deposit, expiry handling
- [src/hooks/useWallet.js](./src/hooks/useWallet.js) — injected wallet discovery and connection state
- [src/lib/lifi.js](./src/lib/lifi.js) — frontend LI.FI API calls through local proxy routes
- [api/_utils/lifiProxy.js](./api/_utils/lifiProxy.js) — server-side LI.FI request proxy

## Demo Flow

1. Connect wallet
2. Switch to the vault’s network if needed
3. Choose a vault from the explorer
4. Enter a small amount
5. Prepare the quote
6. Review route details and confirm the checkbox
7. Approve token if required
8. Deposit
9. Verify the resulting position in Portfolio

## Status

This repo is an MVP built for hackathon judging and live demo execution. It is designed for small controlled real-funds tests, not for unattended high-value production use.

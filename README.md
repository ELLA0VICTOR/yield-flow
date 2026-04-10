# YieldFlow

YieldFlow is a stablecoin yield discovery and execution app built for **DeFi Mullet Hackathon #1** using **LI.FI Earn** and **LI.FI Composer**.

It helps users discover vaults, compare yield opportunities, deposit into a selected vault, verify the resulting position, and withdraw back to wallet from redeemable vaults through one clean interface.

## Links

- GitHub: [https://github.com/ELLA0VICTOR/yield-flow](https://github.com/ELLA0VICTOR/yield-flow)
- Track: `Yield Builder`
- Core integration: `LI.FI Earn Data API + LI.FI Composer`

## What YieldFlow Does

YieldFlow focuses on a simple end-to-end user flow:

1. Discover stablecoin vaults from LI.FI Earn
2. Compare APY, 30-day APY, TVL, protocol, and deposit readiness
3. Connect a wallet and prepare a Composer route automatically
4. Approve the exact token amount when needed
5. Deposit into the selected vault
6. Verify the resulting position
7. Withdraw back to wallet from redeemable vaults

The goal is not to build DeFi infrastructure from scratch. The goal is to build a clean, trustworthy product layer on top of LI.FI's infrastructure.

## Why This Project Exists

DeFi yield is still harder than it should be for normal users:

- vault discovery is fragmented
- cross-protocol comparison is inconsistent
- deposits often require protocol-specific UI knowledge
- execution can involve multiple hidden steps
- verification after deposit is not always obvious

YieldFlow reduces that friction by combining:

- vault discovery from `earn.li.fi`
- execution from `li.quest`
- a single retro-style UI for comparison, deposit, and verification

## Core Features

### 1. Vault Discovery

YieldFlow fetches normalized vault data from LI.FI Earn and surfaces:

- protocol
- chain
- underlying asset
- current APY
- 30-day APY
- TVL
- deposit readiness
- redeemability
- vault tags

### 2. Filterable Explorer

Users can filter by:

- chain
- asset
- minimum TVL
- sort order
- protocol
- search text

The explorer is paginated in the UI and designed for quick scanning.

### 3. Wallet-Aware Deposit Flow

The app supports injected EVM wallets through a wallet picker flow instead of hard-jumping straight into one provider.

Current UX includes:

- wallet selection modal
- network switch support
- friendly rejection messages
- exact-amount approvals
- route review confirmation
- quote expiry handling

### 4. Automatic Route Preparation

LI.FI Composer quotes are still required under the hood, but YieldFlow no longer makes users think about "preparing a quote" as a separate mental step.

Once the user enters an amount on the correct chain:

- the route prepares automatically
- the review details populate in the panel
- the user only needs to approve and deposit

### 5. Position Verification

YieldFlow first checks the official LI.FI portfolio endpoint.

If the LI.FI portfolio index has not caught up yet, YieldFlow can still surface a fallback position using the on-chain vault share balance already received by the wallet. That fallback is stored locally and shown inside the portfolio section so the user still sees a coherent "position" experience.

### 6. Withdraw Flow

For redeemable vaults, YieldFlow supports:

- vault-share approval when required
- same-chain redeem route preparation
- withdraw back to wallet
- post-withdraw portfolio refresh

## Product Scope

### In scope for the current MVP

- stablecoin vault discovery
- same-chain deposit flow
- wallet connect and network switching
- exact-amount approvals
- automatic route preparation
- deposit confirmation
- portfolio verification
- fallback position display when LI.FI indexing lags
- same-chain redeem / withdraw flow for redeemable vaults

### Not in scope right now

- custom vault contracts
- vault strategy logic
- custom routing engine
- protocol-native risk modeling
- advanced analytics dashboards
- multi-wallet portfolio aggregation
- full cross-chain user-controlled source-token selection UX

## Architecture

YieldFlow uses LI.FI in two layers:

### Earn Data API

Used for:

- vault discovery
- supported chains
- supported protocols
- portfolio positions

Base URL:

```text
https://earn.li.fi
```

### Composer

Used for:

- executable deposit routes
- executable withdraw routes
- transaction status for asynchronous flows

Base URL:

```text
https://li.quest
```

## Technical Stack

- React 19
- Vite
- JavaScript
- Tailwind CSS v3
- Ethers v6
- LI.FI Earn Data API
- LI.FI Composer API

## Security Approach

YieldFlow is a frontend on top of LI.FI and underlying DeFi protocols, but the app still enforces product-level safeguards:

- wallet selection modal instead of blind direct injection flow
- no raw RPC rejection dumps shown in the UI
- exact-amount approvals instead of unlimited approvals
- local validation of quote shape before signing
- route expiry window and stale-route handling
- explicit user confirmation before execution
- server-side API key proxying instead of exposing the LI.FI key in frontend requests

Important note:

Vault execution risk still comes from LI.FI routing and the underlying vault protocols. YieldFlow reduces UX mistakes and unsafe defaults, but it does not remove normal DeFi protocol risk.

## Repo Structure

```text
yield-flow/
|-- api/
|   |-- _utils/
|   |   `-- lifiProxy.js            # shared server-side LI.FI proxy helper
|   |-- earn/
|   |   |-- chains.js               # Vercel endpoint for Earn chains
|   |   |-- portfolio.js            # Vercel endpoint for Earn portfolio lookups
|   |   |-- protocols.js            # Vercel endpoint for Earn protocols
|   |   |-- vaults.js               # Vercel endpoint for Earn vaults
|   |   `-- [...path].js            # local/dev catch-all proxy path
|   `-- quest/
|       |-- chains.js               # Vercel endpoint for LI.FI chain metadata
|       |-- quote.js                # Vercel endpoint for Composer quote requests
|       |-- status.js               # Vercel endpoint for Composer status checks
|       `-- [...path].js            # local/dev catch-all proxy path
|-- public/
|   |-- favicon.svg                 # custom retro YieldFlow favicon
|   `-- icons.svg                   # app icon sprite
|-- src/
|   |-- assets/
|   |   `-- hero.png                # static visual asset
|   |-- components/
|   |   |-- FilterBar.jsx           # explorer filters and scan controls
|   |   |-- PortfolioLookup.jsx     # LI.FI portfolio + fallback position UI
|   |   |-- ToastNotice.jsx         # transient wallet / action notices
|   |   |-- VaultCard.jsx           # vault grid cards
|   |   |-- VaultDetailPanel.jsx    # deposit and withdraw studio
|   |   `-- WalletModal.jsx         # wallet picker modal
|   |-- hooks/
|   |   |-- useComposerQuote.js     # quote request state management
|   |   |-- useDepositFlow.js       # deposit route, approval, execution logic
|   |   |-- usePortfolioLookup.js   # portfolio lookup state
|   |   |-- useVaultExplorer.js     # reference data + vault loading
|   |   |-- useWallet.js            # injected wallet discovery and connection
|   |   `-- useWithdrawFlow.js      # withdraw route, approval, execution logic
|   |-- lib/
|   |   |-- constants.js            # content, nav, footer, and filter defaults
|   |   |-- errors.js               # friendly wallet / transaction error mapping
|   |   |-- evm.js                  # wallet provider and token helper functions
|   |   |-- formatters.js           # UI formatting helpers
|   |   |-- lifi.js                 # frontend calls to the proxy endpoints
|   |   `-- positions.js            # fallback position shaping and local storage
|   |-- App.jsx                     # main page layout and app-level flow
|   |-- index.css                   # retro design system and layout styles
|   `-- main.jsx                    # React entry point
|-- .env.example                    # environment variable template
|-- eslint.config.js                # lint configuration
|-- index.html                      # Vite HTML entry and favicon wiring
|-- package.json                    # scripts and dependencies
|-- postcss.config.js               # PostCSS config
|-- tailwind.config.js              # Tailwind v3 config
|-- vercel.json                     # production rewrites for LI.FI proxy endpoints
`-- vite.config.js                  # Vite config and local dev proxy
```

## Architecture by Layer

- `UI layer`: [src/App.jsx](./src/App.jsx) plus the components in [src/components](./src/components)
- `State and workflow layer`: the hooks in [src/hooks](./src/hooks)
- `Integration layer`: helpers in [src/lib/lifi.js](./src/lib/lifi.js), [src/lib/evm.js](./src/lib/evm.js), and [src/lib/positions.js](./src/lib/positions.js)
- `Server proxy layer`: the Vercel functions in [api](./api)

## Environment Setup

Create a local environment file:

```bash
cp .env.example .env.local
```

Set your LI.FI API key:

```bash
LIFI_API_KEY=your_lifi_api_key
```

`.env.local` is ignored by git and should never be committed.

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Run validation:

```bash
npm run lint
npm run build
```

## Recommended Demo Path

The safest first live demo path is:

- chain: `Base`
- token: `USDC`
- amount: `1 USDC`

Why:

- current MVP is same-chain first
- Base + USDC is the cleanest path in the app today
- it reduces cross-chain complexity while validating approvals, deposits, and withdrawals

## Current User Flow

### Deposit

1. Open the explorer
2. Select a vault
3. Connect wallet
4. Switch to the correct network if needed
5. Enter an amount
6. Let the route prepare automatically
7. Review the route details
8. Approve token if needed
9. Deposit
10. Scroll to portfolio and verify the resulting position

### Withdraw

1. Reopen the vault
2. Use the withdraw section
3. Enter the vault-share amount to redeem
4. Approve shares if needed
5. Withdraw back to wallet
6. Verify the updated position state

## Known Product Reality

During testing, LI.FI's portfolio endpoint may not immediately reflect some newly created positions for certain protocol/chain combinations. YieldFlow includes a local fallback position mechanism so the user can still verify receipt when the official portfolio index is delayed.

This is a product workaround, not a replacement for the official LI.FI portfolio endpoint.

## Important Files

- [src/App.jsx](./src/App.jsx) - landing page, explorer flow, portfolio flow, app-level state
- [src/components/VaultCard.jsx](./src/components/VaultCard.jsx) - vault grid cards
- [src/components/VaultDetailPanel.jsx](./src/components/VaultDetailPanel.jsx) - deposit and withdraw execution UI
- [src/components/PortfolioLookup.jsx](./src/components/PortfolioLookup.jsx) - portfolio UI, LI.FI positions, fallback positions
- [src/components/WalletModal.jsx](./src/components/WalletModal.jsx) - wallet picker modal
- [src/hooks/useDepositFlow.js](./src/hooks/useDepositFlow.js) - deposit route handling, approvals, confirmations
- [src/hooks/useWithdrawFlow.js](./src/hooks/useWithdrawFlow.js) - withdraw route handling, approvals, confirmations
- [src/hooks/useWallet.js](./src/hooks/useWallet.js) - wallet discovery and connection management
- [src/hooks/useVaultExplorer.js](./src/hooks/useVaultExplorer.js) - vault discovery and filtering
- [src/lib/lifi.js](./src/lib/lifi.js) - frontend LI.FI proxy calls
- [src/lib/positions.js](./src/lib/positions.js) - local fallback position storage and shaping
- [src/lib/evm.js](./src/lib/evm.js) - EVM wallet and token helpers
- [api/_utils/lifiProxy.js](./api/_utils/lifiProxy.js) - server-side LI.FI proxy

## Status

Current MVP status:

- vault discovery is working
- deposit is working
- withdraw is working
- wallet UX is working
- fallback verification is working
- build checks are passing

This means the core app is already in a real demo-ready state.

## What's Next

The main product build is not the blocker anymore. The biggest remaining work is submission quality:

- deploy the app cleanly
- do one more polished end-to-end demo recording
- take clean screenshots
- prepare the X post / thread
- make the README and repo presentation feel polished
- double-check the live demo path with tiny real amounts

Optional stretch improvements if time remains:

- add explorer/deposit micro-interactions
- add BaseScan / protocol links after deposit and withdraw
- improve chunk splitting to reduce bundle size
- add cross-chain source-token selection UX
- add protocol-specific explanation links

## Summary

YieldFlow is no longer just a mock explorer. It is now a working LI.FI Earn product with:

- vault discovery
- deposit execution
- withdraw execution
- wallet UX
- portfolio verification
- fallback proof for indexing delays

At this point, the project is in the "ship and polish" phase, not the "core build is missing" phase.

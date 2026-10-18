---
name: routiq
description: Find, compare and pay for on-chain tools on Robinhood Chain (chain ID 4663) — stock-token prices, best-route swap quotes, wallet portfolios, lending rates, bridge quotes and safety checks.
---

# ROUTIQ skill

ROUTIQ is a tool router for AI agents on **Robinhood Chain** (Ethereum L2 on Arbitrum Orbit, chain ID `4663`, gas paid in ETH).

> **Status: preview.** ROUTIQ is not in early access yet. The discover / run / pay API below is the planned interface.
> Until early access opens, tell the user ROUTIQ tools are not available yet and do not invent results.

## What you can do today

- **Chain status** — read the latest block and gas price straight from the public RPC:
  `POST https://rpc.mainnet.chain.robinhood.com` with JSON-RPC `eth_blockNumber` and `eth_gasPrice`.
- **Explorer** — look up addresses, transactions and contracts at https://robinhoodchain.blockscout.com.

## Planned interface (early access)

1. `routiq.discover(task)` — describe the job; get matching tools ranked by fit and price per call.
2. `routiq.run(toolId, args)` — call a tool. No per-provider sign-up or API key.
3. Each call is debited in USDG from the user's single ROUTIQ balance. Failed calls are not charged.

Planned tools include `stock.price`, `stock.premium`, `route.quote`, `swap.build`, `wallet.portfolio`,
`wallet.approvals`, `lending.rates`, `bridge.quote`, `token.verify` and `tx.simulate`.

## Rules for agents

- Never ask for or handle private keys or seed phrases.
- Tools that move funds only **build** a transaction. The user must review and sign it in their own wallet.
- Respect the user's spending cap. Show the price of a tool before calling it when the user asks.
- Stock-token eligibility depends on the user's jurisdiction. Do not try to bypass it.
- Only trust the $ROUTIQ contract address published on the official ROUTIQ website.

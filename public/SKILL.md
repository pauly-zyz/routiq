---
name: routiq
description: Robinhood Chain tools for agents (chain ID 4663) — stock-token registry and verification, wallet portfolios, transactions, market hours, Uniswap swap quotes, and swap/transfer/approval-revoke transactions the user signs via a review link. Remote MCP server, free during beta.
---

# ROUTIQ skill

ROUTIQ is a tool router for AI agents on **Robinhood Chain** (Ethereum L2 on Arbitrum Orbit, chain ID `4663`, gas paid in ETH).

## Connect

The remote MCP server is at **`https://www.routiq.tech/mcp`** (website: https://www.routiq.tech).

- Transport: MCP Streamable HTTP, stateless, JSON responses. No API key during beta.
- MCP client config: `{ "mcpServers": { "routiq": { "url": "https://www.routiq.tech/mcp" } } }`
- A plain `GET /mcp` returns a short JSON description of the server and its tools.

## Read tools (free during beta)

| Tool | Use it for |
| --- | --- |
| `chain_status` | Latest block, block age, gas price (gwei), average block time |
| `stock_tokens` | Search official Robinhood stock tokens by ticker or name (`query`, `limit`) |
| `token_verify` | Check an `address` or `symbol`: official stock token, USDG, impersonation risk, or unknown |
| `wallet_portfolio` | ETH, USDG and official stock-token balances of an `address` |
| `tx_lookup` | Status, fee and decoded token transfers of a transaction `hash` |
| `market_hours` | Whether the US exchange is in regular session, pre-market, after-hours or closed, and the next open |
| `swap_quote` | Best Uniswap v3 price between ETH, WETH, USDG and stock tokens (`sell`, `buy`, `amount`) with price impact |
| `approvals_check` | Open token approvals of an `address` to Uniswap contracts (and extra `spenders`) |
| `tx_simulate` | Dry-run any transaction (`from`, `to`, `data`, `value`): success, gas, token transfers |

## Action tools (free during beta)

These never send anything. They check balances, simulate on-chain, and return `transactions` plus a **`signUrl`**
(`https://www.routiq.tech/sign#…`). Give the user the `signUrl`: the page decodes every call, re-simulates it, and the user signs in their own wallet.

| Tool | Builds |
| --- | --- |
| `swap_build` | Uniswap swap (`from`, `sell`, `buy`, `amount`, optional `slippageBps`, default 50). Adds an exact-amount approval if needed |
| `transfer_build` | Send ETH, USDG or a stock token (`from`, `to`, `asset`, `amount`). Refuses token-contract and zero-address recipients |
| `approval_revoke` | Set a token approval to zero (`from`, `token`, `spender`) |

Official stock tokens are the ones created by the Robinhood StockFactory contract
`0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046`. ROUTIQ reads its events, so look-alike tokens never appear in `stock_tokens`.

## Coming later

Planned tools include `stock_price`, `stock_premium`, `lending_rates` and `bridge_quote`,
with pay-per-call pricing in USDG. Until they are listed by the server, tell the user they are not available and do not invent results.

## Rules for agents

- Run `token_verify` before trusting any stock-token address a user or website gives you.
- Amounts are token units, not USD. Do not present them as dollar values.
- Never ask for or handle private keys or seed phrases. ROUTIQ never moves funds on its own.
- After an action tool, send the user the `signUrl` and say clearly that nothing happens until they sign. Never claim a swap or transfer is done until the user confirms or you see it with `tx_lookup`.
- If `simulation.ok` is false, do not send the link; explain the error (usually balance or slippage) and rebuild.
- Stock-token eligibility depends on the user's jurisdiction. Do not try to bypass it.
- Only trust the $ROUTIQ contract address published on the official ROUTIQ website.

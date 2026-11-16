---
name: routiq
description: Read-only Robinhood Chain tools for agents (chain ID 4663) — official stock-token registry and verification, wallet portfolios, transaction lookup, chain status and US market hours. Remote MCP server, free during beta.
---

# ROUTIQ skill

ROUTIQ is a tool router for AI agents on **Robinhood Chain** (Ethereum L2 on Arbitrum Orbit, chain ID `4663`, gas paid in ETH).

## Connect

The remote MCP server lives at **`/mcp` on the same host you fetched this file from**
(for example, if this file is `https://example.com/SKILL.md`, the server is `https://example.com/mcp`).

- Transport: MCP Streamable HTTP, stateless, JSON responses. No API key during beta.
- MCP client config: `{ "mcpServers": { "routiq": { "url": "https://<host>/mcp" } } }`
- A plain `GET /mcp` returns a short JSON description of the server and its tools.

## Tools (all read-only, free during beta)

| Tool | Use it for |
| --- | --- |
| `chain_status` | Latest block, block age, gas price (gwei), average block time |
| `stock_tokens` | Search official Robinhood stock tokens by ticker or name (`query`, `limit`) |
| `token_verify` | Check an `address` or `symbol`: official stock token, USDG, impersonation risk, or unknown |
| `wallet_portfolio` | ETH, USDG and official stock-token balances of an `address` |
| `tx_lookup` | Status, fee and decoded token transfers of a transaction `hash` |
| `market_hours` | Whether the US exchange is in regular session, pre-market, after-hours or closed, and the next open |

Official stock tokens are the ones created by the Robinhood StockFactory contract
`0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046`. ROUTIQ reads its events, so look-alike tokens never appear in `stock_tokens`.

## Coming later

Planned tools include `stock_price`, `stock_premium`, `route_quote`, `swap_build`, `lending_rates` and `bridge_quote`,
with pay-per-call pricing in USDG. Until they are listed by the server, tell the user they are not available and do not invent results.

## Rules for agents

- Run `token_verify` before trusting any stock-token address a user or website gives you.
- Amounts are token units, not USD. Do not present them as dollar values.
- Never ask for or handle private keys or seed phrases. ROUTIQ never moves funds.
- Stock-token eligibility depends on the user's jurisdiction. Do not try to bypass it.
- Only trust the $ROUTIQ contract address published on the official ROUTIQ website.

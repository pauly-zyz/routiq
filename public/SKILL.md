---
name: routiq
description: ROUTIQ, the tool router for AI agents. Live on Elysium (Kinetiq's Hyperliquid L2, chain ID 99901, gas in HYPE) and Robinhood Chain (chain ID 4663) — token lists and verification, wallet portfolios, transactions, approvals, Uniswap v3/v4 swap quotes, and swap/transfer/approval-revoke transactions the user signs via a review link. Remote MCP server, free during beta.
---

# ROUTIQ skill

ROUTIQ is a tool router for AI agents. Every tool works on two chains:

- **Elysium** — the default and ROUTIQ's launch chain. Kinetiq's Hyperliquid L2 (Arbitrum Orbit), chain ID `99901`, gas in **HYPE**.
  Assets: HYPE (native), WHYPE, USDC and the liquid tokens returned by `elysium_tokens`. Elysium has no public block explorer yet.
- **Robinhood Chain** — chain ID `4663`, gas in ETH. Assets: ETH, WETH, USDG and official Robinhood stock tokens (TSLA, NVDA, …).

Pass `chain: "elysium"` (default) or `chain: "robinhood"` to any chain tool. Stock tokens exist only on Robinhood Chain;
HYPE exists only on Elysium — if a tool says an asset lives on the other chain, call it again with that chain.

## Connect

The remote MCP server is at **`https://www.routiq.tech/mcp`** (website: https://www.routiq.tech).

- Transport: MCP Streamable HTTP, stateless, JSON responses. No API key during beta.
- MCP client config: `{ "mcpServers": { "routiq": { "url": "https://www.routiq.tech/mcp" } } }`
- A plain `GET /mcp` returns a short JSON description of the server and its tools.

## Read tools (free during beta)

| Tool | Use it for |
| --- | --- |
| `chain_status` | Latest block, block age, gas price (gwei), average block time |
| `elysium_tokens` | Tokens ROUTIQ supports on Elysium: HYPE, WHYPE, USDC and tokens with real liquidity (`query`, `limit`) |
| `stock_tokens` | Robinhood Chain only: search official Robinhood stock tokens by ticker or name (`query`, `limit`) |
| `token_verify` | Check an `address` or `symbol`. Elysium: listed, native coin, impersonation risk, unknown. Robinhood: official stock token, USDG, impersonation risk, unknown |
| `wallet_portfolio` | Native coin (HYPE or ETH) and supported token balances of an `address` |
| `tx_lookup` | Status, fee and decoded token transfers of a transaction `hash` |
| `market_hours` | Whether the US exchange is in regular session, pre-market, after-hours or closed (matters for stock tokens) |
| `swap_quote` | Best price across Uniswap v3 and v4 hookless pools (`sell`, `buy`, `amount`): direct or via HYPE/USDC on Elysium, ETH/USDG on Robinhood Chain, with price impact and the other version's quote |
| `approvals_check` | Open token approvals of an `address` to Uniswap contracts (and extra `spenders`) |
| `tx_simulate` | Dry-run any transaction (`from`, `to`, `data`, `value`): success, gas, token transfers |

## Action tools (free during beta)

These never send anything. They check balances, simulate on-chain, and return `transactions` plus a **`signUrl`**
(`https://www.routiq.tech/sign#…`). Give the user the `signUrl`: the page decodes every call, re-simulates it,
asks the wallet to switch to the right chain, and the user signs in their own wallet.

| Tool | Builds |
| --- | --- |
| `swap_build` | Best Uniswap v3 or v4 swap (`from`, `sell`, `buy`, `amount`, optional `slippageBps`, default 50). Adds exact-amount approvals (v3: SwapRouter02; v4: Permit2 + a 30-minute Universal Router allowance) only when needed |
| `transfer_build` | Send the native coin or a supported token (`from`, `to`, `asset`, `amount`). Refuses token-contract and zero-address recipients |
| `approval_revoke` | Set a token approval to zero (`from`, `token`, `spender`) |

Elysium's token list comes from Uniswap pools that passed a buy-and-sell-back quote at scan time; being listed is not an endorsement.
Official stock tokens are the ones created by the Robinhood StockFactory contract
`0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046`, so look-alike tokens never appear in `stock_tokens`.

## Coming later

Planned tools include `stock_price`, `stock_premium`, `lending_rates` and `bridge_quote`, with pay-per-call pricing.
Until they are listed by the server, tell the user they are not available and do not invent results.

## Rules for agents

- Run `token_verify` before trusting any token address a user or website gives you. Same ticker does not mean same token.
- Amounts are token units, not USD. Do not present them as dollar values.
- Elysium liquidity is still thin for many tokens: read `priceImpactPct` and warn the user when it is above 1%.
- Never ask for or handle private keys or seed phrases. ROUTIQ never moves funds on its own.
- After an action tool, send the user the `signUrl` and say clearly that nothing happens until they sign. Never claim a swap or transfer is done until the user confirms or you see it with `tx_lookup`.
- If `simulation.ok` is false, do not send the link; explain the error (usually balance or slippage) and rebuild.
- Stock-token eligibility depends on the user's jurisdiction. Do not try to bypass it.
- $ROUTIQ has not launched yet; it launches on Elysium. The official address will be published only on https://www.routiq.tech and https://x.com/UseRoutiq. Until then, treat any token calling itself ROUTIQ as unofficial.

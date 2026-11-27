# ROUTIQ

ROUTIQ is a tool router for AI agents, **launching on Elysium** (Kinetiq's Hyperliquid L2, chain ID 99901, gas in HYPE).
Every MCP tool runs on **Elysium** (the default) and on **Robinhood Chain** (chain ID 4663, `chain: "robinhood"`).
An agent connects once, then discovers and calls on-chain tools — token lists and verification, wallets, transactions,
approvals, Uniswap v3/v4 swaps — through one MCP server.

This repo holds the website, the remote MCP server (`/mcp`) and the review-and-sign page (`/sign`), deployed together on Vercel.

## Stack

Same family as monid.ai:

- [Nuxt 4](https://nuxt.com) (Vue 3, TypeScript) with its Nitro server — site pages are prerendered, `/mcp` runs as a serverless function
- [Nuxt UI 4](https://ui.nuxt.com) components + [Tailwind CSS 4](https://tailwindcss.com)
- [Iconify](https://iconify.design) icons via `@nuxt/icon` (Lucide + Simple Icons, bundled locally)
- Self-hosted fonts from `@fontsource` (Inter, Space Grotesk, JetBrains Mono)
- MCP: official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) (Streamable HTTP, stateless) + [`viem`](https://viem.sh) for chain reads

## Run it

```bash
npm install          # .npmrc sets legacy-peer-deps (works around an npm peer-resolution bug)
npm run dev          # site on http://localhost:3000, MCP server on http://localhost:3000/mcp
npm run build        # what Vercel runs (see vercel.json) — site + serverless MCP function
npm run typecheck
```

Do not deploy with `npm run generate`: that produces a static site without the `/mcp` endpoint.

## MCP server

Endpoint: `https://www.routiq.tech/mcp` (Streamable HTTP, stateless, JSON responses, CORS open). A browser `GET` returns a short description.

All chain tools take an optional `chain`: `"elysium"` (default) or `"robinhood"`.

| Tool | What it returns |
| --- | --- |
| `chain_status` | Latest block, block age, gas price, average block time |
| `elysium_tokens` | HYPE, WHYPE, USDC and the liquid Elysium tokens from `server/data/elysium-tokens.json` |
| `stock_tokens` | Robinhood Chain: official Robinhood stock tokens matching a ticker or name |
| `token_verify` | Verdict for an address or ticker. Elysium: listed, native coin, impersonation risk, unknown. Robinhood: official, USDG, impersonation risk, unknown |
| `wallet_portfolio` | Native coin and supported token balances of an address (one Multicall3 call) |
| `tx_lookup` | Status, fee and decoded ERC-20 transfers of a transaction |
| `market_hours` | US exchange session and next open (holiday calendar 2026–2027) |
| `swap_quote` | Best route across Uniswap v3 (direct or via the chain's stablecoin/wrapped coin) and v4 (hookless pools, direct or via the native coin/stablecoin), with price impact |
| `swap_build` | v3: exact approval + SwapRouter02 `multicall(deadline, …)`. v4: exact approval to Permit2 + 30-min Permit2 allowance + Universal Router `V4_SWAP`. Simulated; returns `signUrl` |
| `transfer_build` | Native coin / ERC-20 transfer with safety checks, simulated; returns `signUrl` |
| `approvals_check` | Allowances to Uniswap SwapRouter02, Universal Router, Permit2, v4 PositionManager (+ custom) |
| `approval_revoke` | `approve(spender, 0)`, simulated; returns `signUrl` |
| `tx_simulate` | `eth_simulateV1` dry run of any call: status, gas, token + native transfers |

**Actions are non-custodial.** Action tools return unsigned transactions and a link to `/sign#<payload>` (base64url JSON in
the URL fragment, expires in 15 minutes). `/sign` never trusts text from the link: `server/api/sign/inspect.post.ts`
decodes each call and only accepts transfers/exact approvals of known tokens, revokes, short-lived Permit2 allowances to the
Universal Router, SwapRouter02 swaps whose recipient is the signer, and single-command `V4_SWAP` calls (exact-in, SETTLE_ALL,
TAKE_ALL — output always goes to the signer, hookless pools only), then re-simulates the whole sequence. Anything else is rejected with "Do not sign this".

**Where the data comes from**

- Everything is read from each chain's RPC (`server/utils/chain.ts` holds both configs and all Uniswap addresses).
  Blockscout's API blocks datacenter IPs, so it is not used. Elysium has no public explorer yet, so links are omitted there.
- Elysium: `server/data/elysium-v4-pools.json` (hookless v4 pools touching HYPE/WHYPE/USDC) and `server/data/elysium-tokens.json`
  (tokens whose buy-and-sell-back quote returns ≥ 90%, one per symbol). Rebuild both with `node scripts/scan-elysium.mjs`
  (reads ~130k pool events; pass a cached scan file to skip that).
- Robinhood Chain Uniswap v4 pools: `server/data/v4-pools.json` lists hookless pools with fee ≤ 1% between supported assets that had liquidity
  at scan time (434 of ~1.18M v4 pools). Refresh it with `node scripts/scan-v4-pools.mjs` (optionally pass a provider RPC URL).
- Official stock tokens = tokens created by the Robinhood StockFactory `0x4783C67b63dE2B358Ac5951a7D41F47A38F3C046`.
  `server/data/stock-tokens.json` is a snapshot of its events (212 tokens); at runtime the server reads newer factory events
  and caches the registry for 10 minutes.
- USDG address `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` comes from public developer docs; its name and 6 decimals were checked on-chain.

Try it locally:

```bash
curl -s localhost:3000/mcp -X POST -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"token_verify","arguments":{"symbol":"TSLA"}}}'
```

## Layout

| Path | What it holds |
| --- | --- |
| `app/pages/index.vue` | Page: list of sections in order |
| `app/components/` | One component per section (`HeroSection`, `ToolCatalog`, `PricingSection`, …) |
| `app/data/tools.ts` | Tool catalog shown on the site (live + planned) |
| `app/components/AgentConsole.vue` | Hero console: real tool calls to `/mcp` (presets + free-text input) |
| `app/composables/useRoutiqMcp.ts` | Browser helper that calls `/mcp` |
| `app/composables/useSite.ts` | **Edit before launch:** $ROUTIQ address on Elysium (empty until launch), social links, chain details |
| `server/routes/mcp.ts` | MCP HTTP endpoint (CORS, browser info page) |
| `server/api/chain.get.ts` | Block + gas for the site's live widgets (CDN-cached for 2 s) |
| `server/utils/mcpServer.ts` | Tool definitions |
| `server/utils/chain.ts` | Chain configs (Elysium, Robinhood Chain), viem clients, stock-token registry |
| `server/utils/marketHours.ts` | US market session logic |
| `server/utils/actions.ts` | Quotes, transaction builders, simulation, sign-link encoding and inspection |
| `server/api/sign/inspect.post.ts` | Decodes + simulates a sign link for `/sign` |
| `app/pages/sign.vue` | Review-and-sign page (wallet connect, eligibility check for stock tokens, sequential signing) |
| `public/SKILL.md` | Skill file agents read; points them to `/mcp` |

## Configuration

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Site URL for install commands, MCP URL and SEO tags. Defaults to `https://www.routiq.tech` |
| `NUXT_ELYSIUM_RPC_URL` | Server-side Elysium RPC for the MCP tools and `/api/chain` (default: the public Kinetiq RPC). Stays on the server |
| `NUXT_RPC_URL` | Server-side Robinhood Chain RPC. Use a provider endpoint (Alchemy, QuickNode, Dwellir) in production; the public RPC is rate limited. Stays on the server |
| `NUXT_PUBLIC_RPC_URL` | RPC suggested to wallets when they add Robinhood Chain (public; default is the official public RPC) |

## Before launch

- Set `SITE.tokenAddress` and `SITE.links` in `app/composables/useSite.ts`. Empty links show "Coming soon".
- The unscoped npm name `routiq` belongs to an unrelated project (a localhost tunnel tool). Publish a future CLI under
  your own scope (for example `@<your-org>/routiq`) and never tell users to `npm install routiq`.

## What is real vs. preview

- **Real:** the MCP server and its 13 tools on Elysium and Robinhood Chain, the `/sign` page, the hero console (every run is a real `/mcp` call),
  wallet connect and network switch, live block / gas on the site, the hosted `SKILL.md`.
- **Preview (labelled on the page):** planned tools and their prices, the balance card, and the CLI.

# ROUTIQ

ROUTIQ is a tool router for AI agents on **Robinhood Chain** (Ethereum L2 on Arbitrum Orbit, chain ID 4663).
An agent connects once, then discovers and calls on-chain tools — stock-token registry and verification,
wallets, transactions, market hours — through one MCP server.

This repo holds the website **and** the remote MCP server (`/mcp`), deployed together on Vercel.

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

| Tool | What it returns |
| --- | --- |
| `chain_status` | Latest block, block age, gas price, average block time |
| `stock_tokens` | Official Robinhood stock tokens matching a ticker or name |
| `token_verify` | Verdict for an address or ticker: official, USDG, impersonation risk, unknown |
| `wallet_portfolio` | ETH, USDG and official stock-token balances of an address (one Multicall3 call) |
| `tx_lookup` | Status, fee and decoded ERC-20 transfers of a transaction |
| `market_hours` | US exchange session and next open (holiday calendar 2026–2027) |

**Where the data comes from**

- Everything is read from the Robinhood Chain RPC. (Blockscout's API blocks datacenter IPs, so it is not used.)
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
| `app/composables/useSite.ts` | **Edit before launch:** token address, social links, chain details |
| `server/routes/mcp.ts` | MCP HTTP endpoint (CORS, browser info page) |
| `server/api/chain.get.ts` | Block + gas for the site's live widgets (CDN-cached for 2 s) |
| `server/utils/mcpServer.ts` | Tool definitions |
| `server/utils/chain.ts` | viem client, stock-token registry |
| `server/utils/marketHours.ts` | US market session logic |
| `public/SKILL.md` | Skill file agents read; points them to `/mcp` |

## Configuration

| Variable | Purpose |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | Site URL for install commands, MCP URL and SEO tags. Defaults to `https://www.routiq.tech` |
| `NUXT_RPC_URL` | Server-side RPC for the MCP tools and `/api/chain`. Use a provider endpoint (Alchemy, QuickNode, Dwellir) in production; the public RPC is rate limited. Stays on the server |
| `NUXT_PUBLIC_RPC_URL` | RPC suggested to wallets when they add Robinhood Chain (public; default is the official public RPC) |

## Before launch

- Set `SITE.tokenAddress` and `SITE.links` in `app/composables/useSite.ts`. Empty links show "Coming soon".
- The unscoped npm name `routiq` belongs to an unrelated project (a localhost tunnel tool). Publish a future CLI under
  your own scope (for example `@<your-org>/routiq`) and never tell users to `npm install routiq`.

## What is real vs. preview

- **Real:** the MCP server and its 6 tools, the hero console (every run is a real `/mcp` call),
  wallet connect and network switch, live block / gas on the site, the hosted `SKILL.md`.
- **Preview (labelled on the page):** planned tools and their prices, the balance card, and the CLI.

# ROUTIQ — website

ROUTIQ is a tool router for AI agents on **Robinhood Chain** (Ethereum L2 on Arbitrum Orbit, chain ID 4663).
An agent installs one skill, then discovers, compares and pays per call for on-chain tools — stock-token prices,
swap routes, wallets, DeFi and safety checks — from one USDG balance.

This repo holds the marketing site.

## Stack

Same family as monid.ai:

- [Nuxt 4](https://nuxt.com) (Vue 3, TypeScript) — static generation
- [Nuxt UI 4](https://ui.nuxt.com) components + [Tailwind CSS 4](https://tailwindcss.com)
- [Iconify](https://iconify.design) icons via `@nuxt/icon` (Lucide + Simple Icons, bundled locally)
- Self-hosted fonts from `@fontsource` (Inter, Space Grotesk, JetBrains Mono)

## Run it

```bash
npm install          # .npmrc sets legacy-peer-deps (works around an npm peer-resolution bug)
npm run dev          # http://localhost:3000
npm run generate     # static site in .output/public — deploy to Vercel, Netlify, Cloudflare Pages…
npm run typecheck
```

## Layout

| Path | What it holds |
| --- | --- |
| `app/pages/index.vue` | Page: list of sections in order |
| `app/components/` | One component per section (`HeroSection`, `ToolCatalog`, `PricingSection`, …) |
| `app/data/tools.ts` | Tool catalog (name, category, source, planned price, status) |
| `app/data/agentDemos.ts` | Scripted sessions shown in the hero agent console |
| `app/composables/useSite.ts` | **Edit before launch:** token address, social links, chain details |
| `app/composables/useChain.ts` | Live block / gas from the public RPC |
| `app/composables/useWallet.ts` | EIP-1193 wallet connect + add/switch to Robinhood Chain |
| `app/assets/css/main.css` | Theme tokens and effects (gradients, glass, border beam, reveal) |
| `public/SKILL.md` | The skill file agents read (`set up <site>/SKILL.md`) |

## Before launch

- Set `SITE.tokenAddress` and `SITE.links` in `app/composables/useSite.ts`. Empty links show "Coming soon".
- Set `NUXT_PUBLIC_SITE_URL` (e.g. `https://your-domain`) so the install command shows your domain during prerender.
- Use a provider RPC (Alchemy, QuickNode, Dwellir) via `NUXT_PUBLIC_RPC_URL` and make sure it allows browser (CORS) requests.
  The public RPC is rate limited. If it fails, the page shows "RPC unavailable" instead of numbers.
- Update `public/SKILL.md` when the real API, MCP URL and CLI are published.
- The unscoped npm name `routiq` belongs to an unrelated project (a localhost tunnel tool). Publish the CLI under
  your own scope (for example `@<your-org>/routiq`) and never tell users to `npm install routiq`.

## What is real vs. preview

- **Real:** wallet connect and network switch, live block / gas / measured block time, US market clock,
  the `chain.status` result in the agent console, the hosted `SKILL.md`.
- **Preview (labelled on the page):** the tool catalog and its prices, other agent console results,
  the balance card, MCP and CLI. These describe the planned product.

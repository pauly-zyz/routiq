# ROUTIQ — landing page

Landing page for ROUTIQ, a smart order router on **Robinhood Chain** (Arbitrum Orbit L2, chain ID 4663).
Dark theme with a violet-to-cyan gradient accent, Space Grotesk headings and an animated route network.

Plain HTML/CSS/JS, no build step.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Deploy by uploading the folder to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All sections and copy |
| `styles.css` | Design tokens at the top (`--accent` sets the brand colour) |
| `main.js` | `CONFIG` at the top: chain details, token address, social links |
| `assets/favicon.svg` | Logo mark |

## Before launch

- Set `CONFIG.tokenAddress` in `main.js` once the contract is deployed (the copy button appears automatically).
- Set `CONFIG.links` (X, Discord, GitHub). Empty links show "Coming soon".
- Point the "See how it routes", explorer and community links at real pages when ready.
- Replace the demo prices in `TOKENS` (`main.js`) with real quotes once the router is live.
- The SDK/MCP/REST snippets are an API preview; update them to match the real API.
- The public RPC (`rpc.mainnet.chain.robinhood.com`) is rate limited. For production, use a provider key (Alchemy, QuickNode, Dwellir) and check that it allows browser (CORS) requests. If the RPC fails, the page shows "RPC unavailable" instead of numbers.

## Sections

Floating nav · hero with interactive route preview · asset/venue marquee · routing diagram (follows the preview) · live network bento · product features · code tabs (SDK / MCP / REST) · roadmap · FAQ · CTA · footer.

## What works today

- Wallet connect for any EIP-1193 wallet (MetaMask, Rabby, Robinhood Wallet), with automatic switch/add of Robinhood Chain.
- Live block height and gas price from the public RPC, refreshed every 4 s and paused while the tab is hidden.
- Route preview widget: pick tokens and an amount; the split across venues, price impact and the diagram update. Prices are demo values, labelled as such. The network fee estimate uses the live gas price.
- Measured block time and a sparkline of block production, plus a US market open/closed clock (regular hours, holidays not included).
- Copy buttons, code tabs, FAQ accordion and mobile menu.
- All animation respects `prefers-reduced-motion`.

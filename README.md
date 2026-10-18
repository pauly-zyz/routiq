# ROUTIQ — landing page

Landing page for ROUTIQ, a best-price trade router on **Robinhood Chain** (Arbitrum Orbit L2, chain ID 4663).
Layout and visual language are modelled on monid.ai: light, flat, one accent colour, mono-font accents and scroll-reveal motion.

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
- Point the "Three ways" cards and the provider button at real pages.
- Replace the simulated terminal output with real quotes once the router is live.
- The public RPC (`rpc.mainnet.chain.robinhood.com`) is rate limited. For production, use a provider key (Alchemy, QuickNode, Dwellir) and check that it allows browser (CORS) requests. If the RPC fails, the page shows "RPC unavailable" instead of numbers.

## What works today

- Wallet connect for any EIP-1193 wallet (MetaMask, Rabby, Robinhood Wallet), with automatic switch/add of Robinhood Chain.
- Live block height and gas price from the public RPC, refreshed every 4 s and paused while the tab is hidden.
- Copy buttons, FAQ accordion, mobile menu, and an animated route preview.
- All animation respects `prefers-reduced-motion`.

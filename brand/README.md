# ROUTIQ brand assets

| File | Use | Size |
| --- | --- | --- |
| `routiq-logo-1024.png` | Token logo (DexScreener, wallets, socials) — 1:1 | 1024×1024 |
| `routiq-logo-500.png` | Smaller logo — 1:1 | 500×500 |
| `routiq-logo-animated-500.gif` | Animated logo (light packet travels the route) — 1:1 | 500×500 |
| `routiq-logo-mint-1024.png` | Alternative light-mint logo — 1:1 | 1024×1024 |
| `routiq-banner-1500x500.gif` | Animated header banner (DexScreener, X) — 3:1 | 1500×500 |
| `routiq-banner-1500x500.png` | Static banner fallback — 3:1 | 1500×500 |

Logo: HYPE mint `#97FCE4` on deep teal (`#0E2E28` → `#041210`) with an orbit halo for the Elysium launch (`?theme=dark`, default). `?theme=hype` renders the light-mint alternative, `?theme=classic` the original violet one.
Site + banner colours: HYPE mint `#97FCE4`, teal `#50D2C1`, deep teal `#2FB3A3`, background `#050B0A`.
Fonts: Space Grotesk (wordmark, headings), JetBrains Mono (labels).

## Rebuild

Everything is drawn in `source/render.html` (canvas, deterministic per frame, loops seamlessly).

```bash
npm install                     # fonts come from node_modules
cd brand/source
PW=$(npm root -g)/playwright node capture.cjs banner 1500 500 60 /tmp/f-banner
PW=$(npm root -g)/playwright node capture.cjs logo-anim 500 500 48 /tmp/f-logoanim
PW=$(npm root -g)/playwright node capture.cjs logo 1024 1024 1 /tmp/f-logo
python3 make_gif.py /tmp/f-banner ../routiq-banner-1500x500.gif 50 8
python3 make_gif.py /tmp/f-logoanim ../routiq-logo-animated-500.gif 42 6
```

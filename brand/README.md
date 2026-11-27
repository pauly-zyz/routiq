# ROUTIQ brand assets

| File | Use | Size |
| --- | --- | --- |
| `routiq-logo-1024.png` | Token logo (DexScreener, wallets, socials) — 1:1 | 1024×1024 |
| `routiq-logo-500.png` | Smaller logo — 1:1 | 500×500 |
| `routiq-logo-animated-500.gif` | Animated logo (light packet travels the route) — 1:1 | 500×500 |
| `routiq-banner-1500x500.gif` | Animated header banner (DexScreener, X) — 3:1 | 1500×500 |
| `routiq-banner-1500x500.png` | Static banner fallback — 3:1 | 1500×500 |

Colours: violet `#7C5CFF` → blue `#5E8BFF` → cyan `#38D9F5`, background `#06060B`.
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

# 🏴‍☠️ Pirate Vault — Chest Opening Simulator

A polished, **free, browser-only** chest-opening fan game with animated treasure chest, particle effects, synthesised sounds, 1× / 10× / 100× openings, a persistent collection and transparent drop math.

**Play:** https://brotesser8.github.io/hnkrspiel/pirate-vault/

## Important: no real Fortnite prizes

This is an **unofficial simulation**. The Pirate Shop Access Token and Solid Gold A$AP Rocky Skin shown here are fictional, locally simulated collectibles. They **cannot** be claimed, transferred to, or redeemed in Fortnite; this site is not associated with Epic Games or A$AP Rocky. No money, payments, in-app purchases, external logins, or item transfer features are present.

## Exact simulated odds

We choose **one uniformly random slot among 2,000 per chest**. The split is exactly:

| Outcome | Slots | Chance per chest |
|---|---:|---:|
| No event prize | 1,980 | 99.00% |
| Standard | 14 | 0.70% |
| Major | 4 | 0.20% |
| Supreme: Pirate Shop Access Token | 1 | 0.05% (1 in 2,000) |
| Supreme: Solid Gold A$AP Rocky Skin | 1 | 0.05% (1 in 2,000) |
| **Any event prize** | **20** | **1.00%** |

This precisely models **1% treasure × 10% Supreme × 50% each Supreme item**. Every roll is independently generated with `crypto.getRandomValues`. Rejection sampling avoids modulo bias. There is **no pity timer, guaranteed drop, or duplicate protection**. 2,000 rolls do *not* guarantee the token (chance to see ≥1 token is ~63.22%).

**Fortnite has not officially confirmed these drop probabilities.** These are community/leaker estimates adopted as **exact rules of this simulator**, not claims about the actual Fortnite backend. Example discussion: https://www.vice.com/en/article/fortnite-pirate-shop-token-chances-drop-rate/

## Run / test

The deployed **`index.html` is fully self-contained**, with its stylesheet and JavaScript embedded. No build step or backend required. Hosting on GitHub Pages is already configured for this repository. The downloadable ZIP also includes the modular `style.css`, `odds.js`, and `game.js` source files and tests. Start a local web server to test in a browser:

```sh
python3 -m http.server 8080
# visit http://localhost:8080/pirate-vault/
```

Automated unit tests (Node 18+):

```sh
node --test pirate-vault/tests/odds.test.cjs
```

The downloadable ZIP contains `tests/smoke.py` (Python Playwright) for a desktop/mobile smoke test. LocalStorage saves the collection on the current browser only. Reset from the right-hand panel clears it. There is no network sync or account data.

## Implementation

- Single-weight source-of-truth lookup table (`odds.js`) and crypto RNG. `Math.random` is used only for decorative particles, **never** rewards.
- Accessible buttons, responsive mobile layout, progress feedback, sound toggle, and `prefers-reduced-motion` support.
- Custom original SVG treasure-chest artwork, CSS animations, canvas particles. No Epic Games artwork or trademarks are represented as officially licensed.
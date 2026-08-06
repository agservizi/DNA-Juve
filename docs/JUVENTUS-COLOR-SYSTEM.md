# DNA Juve — Juventus-aligned color system

**Verified:** 2026-08-02  
**Sources:** Juventus Official Store and Juventus official identity pages.

## Source observations

- Juventus defines black and white stripes as the core of its identity.
- The official store CSS uses `#000000` and `#FFFFFF` as its dominant interface colors.
- The store exposes `#F0F0F0` as its base background and uses neutral greys for secondary information.
- The current Home Kit 2026/27 store campaign uses `#AF8F5C` as a metallic accent on black.
- Seasonal pink, yellow and campaign colors are not treated as permanent UI brand colors.

## Product tokens

| Token | Value | Use |
|---|---|---|
| `--juve-black` | `#000000` | primary canvas, navigation, footer |
| `--juve-white` | `#FFFFFF` | primary reverse text and stripe pattern |
| `--juve-surface` | `#F0F0F0` | reading and utility surfaces |
| `--juve-grey` | `#686868` | secondary text on white |
| `--juve-accent` | `#AF8F5C` | current official-store metallic accent on black |
| `--juve-accent-accessible` | `#765D32` | derived darker accent for normal text on light surfaces |

## Accessibility

| Pair | Contrast | Result |
|---|---:|---|
| white / black | 21.00:1 | WCAG AAA |
| gold / black | 6.91:1 | WCAG AA/AAA for large text |
| dark gold / surface | 5.45:1 | WCAG AA |
| body `#484944` / surface | 7.97:1 | WCAG AAA |

## Rules

1. Black and white remain dominant; the metallic accent never becomes a full-page background.
2. Use the official-store gold on black and the accessible darker derivative on light surfaces.
3. Status colors remain functional and must not be confused with brand accents.
4. Seasonal colors require a dated campaign context and cannot replace evergreen tokens.
5. The stripe motif is structural and sparse: footer edge, loading state or selected special feature only.

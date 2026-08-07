# Motion / immersion stack

| Layer | Library | Role |
| --- | --- | --- |
| Camera / scroll world | GSAP + ScrollTrigger + Lenis | Homepage spine, Pulse scrub, pins, clip reveals |
| UI chrome | Motion (`motion/react`) | Menu, route curtain, chapter panel |
| Ambient | R3F shader field (home only) | Optional scroll-linked field — no torus/sparkles |
| Optional media | Spline / Rive / Lottie | Only with real env URLs + cookie consent |
| Route continuity | View Transitions + `next-view-transitions` | Cover morph + magazine page-turn |

Do not stack decorative atmospheres. One voice: photography/type + cinema progress bus (`lib/cinema-spine.ts`).

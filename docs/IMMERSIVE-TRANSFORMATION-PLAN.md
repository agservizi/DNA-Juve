# DNA Juve — Immersive transformation master plan

**Status:** In execution  
**Strategy:** progressive strangler migration, Vite blue / Next.js green  
**Creative concept:** DNA // Black Frequency  

## Product thesis

DNA Juve translates Juventus culture into signal, rhythm, memory and participation. The experience is cinematic at thresholds and quiet during reading, forms, community composition and administration. Immersion enhances content; it never gates it.

## Information architecture

Primary domains: **Oggi**, **Storie**, **Matchday**, **Mercato**, **Community**, **My DNA**. Search, live status, theme/audio and account remain utilities. Existing indexed URLs stay stable or receive explicit aliases.

| Existing family | Target domain | Experience level |
|---|---|---|
| Home, specials | Oggi | Full/Lite/Static immersive |
| Article, category, tag, author, search, video, live | Storie | Calm editorial + local motion |
| Calendar, squad, ratings | Matchday | Immersive flagship + semantic DOM |
| Market news, tracker | Mercato | Optional 3D overview, DOM records |
| Forum, polls, predictions, fan content | Community | Task-focused, restrained motion |
| Reader area | My DNA | Personal visualization + conventional controls |
| Admin/CMS | Admin | Functional design system only |

## Technology ownership

| Technology | Exclusive responsibility |
|---|---|
| Next.js App Router | routing, RSC, metadata, caching, APIs and image delivery |
| GSAP | authored cinematic timelines |
| ScrollTrigger | scroll/timeline binding and section activation |
| Lenis | Full-mode smooth scroll; disabled for reduced motion/admin |
| Motion | UI state, gestures, menus, dialogs and local layout transitions |
| Three.js | low-level renderer, math, loaders and shaders |
| React Three Fiber | React scene lifecycle and Canvas ownership |
| Drei | audited scene helpers, environments, GLTF and adaptive DPR |
| Postprocessing | quality-tiered bloom/grading; maximum three desktop passes |
| Theatre.js | deterministic camera/light/object direction; Studio dev-only |
| Spline | isolated campaign prototype or authored source, never parallel above fold with full R3F |
| Rive | state-machine animations such as identity and live status |
| Lottie | light linear illustrations and confirmations, paused offscreen |
| View Transitions API | progressive shared media/title continuity |
| next-view-transitions | Next routing integration and graceful fallback |
| Draco | compatibility geometry compression where benchmarked beneficial |
| Meshopt | primary mesh/index optimization and progressive decode |

One engine owns each animated property. Cinematic scroll never competes with Motion or native transitions.

## Delivery waves

### P0 — Inventory and safety

- Map every public/admin route, Supabase table/RPC/Edge Function, storage bucket, environment variable and automation.
- Capture functional, SEO, visual, bundle and Core Web Vitals baselines.
- Treat database changes as additive until cutover.
- Preserve the current dirty Vite tree and deployable rollback artifact.
- Rotate any credentials that have appeared in tracked examples or history.

**Gate:** signed parity matrix and reproducible blue build.

### P1 — Green foundation

- Next.js App Router with strict TypeScript and route groups.
- Semantic tokens, accessible shell, error/loading/not-found boundaries and security headers.
- `@supabase/ssr` browser/server clients and cookie-based session refresh.
- Feature flags for experience mode and route-family rollout.

**Gate:** deployable Next preview with typecheck/build passing.

### P2 — Public read-only and SEO parity

- Migrate home, article, category, tag, author, search and legal/static routes.
- Server metadata, canonical links, JSON-LD, OpenGraph, robots, sitemap and RSS route handlers.
- Replace Vite proxies with server-only route handlers; no private API key may use `NEXT_PUBLIC_*`.

**Gate:** URL/content/meta/feed parity and crawler verification.

### P3 — Interactive product parity

- Comments, reactions, polls, forum, video, calendar, transfer tracking and reader state as isolated client islands.
- Preserve Supabase RLS as the final authorization boundary.
- Keep TanStack Query only for interactive/realtime state, avoiding duplicated server caching.

**Gate:** guest and authenticated golden flows pass against existing data.

### P4 — Authentication, reader area and PWA

- Email/password, OAuth, OTP, reset and callback using Supabase SSR.
- Bookmarks, history, preferences, gamification, reminders and push subscriptions.
- Remove hardcoded admin-email authorization; use verified DB roles/claims and server checks.

**Gate:** secure preview tests on desktop and real mobile device.

### P5 — Design-system rollout

- Adopt Black Frequency tokens and six-domain navigation.
- Rebuild Home/Oggi and Article as the vertical slice.
- Apply new components family-by-family; admin receives tokens and primitives without spectacle.

**Gate:** keyboard/focus/reduced-motion tests and functional parity.

### P6 — Immersive production pipeline

- Full/Lite/Static capability selector based on preference, WebGL2 and observed performance.
- One home R3F scene, then Matchday, then specials; never add a second scene before pipeline budgets pass.
- Blender/Spline master → prune/dedupe/weld/quantize → Meshopt/Draco benchmark → KTX2 textures → LOD0/1/2 → AVIF poster → immutable CDN manifest.
- Rive, Lottie, Theatre and sound contracts versioned; audio opt-in and muted by default.

**Gate:** semantic parity without canvas and context-loss recovery.

### P7 — Remaining domains

- Stories/live/video, Matchday/calendar/squad/ratings, Mercato/tracker, Community and My DNA.
- Simplify My DNA into Today, Library, Play, and Create & Settings while preserving deep links.

**Gate:** every current route and feature checked in the parity matrix.

### P8 — Quality engineering

- Unit: quality tier, reduced motion/save data, adapters and cleanup.
- Integration: Lenis/ScrollTrigger synchronization, focus/history, canvas disposal, audio persistence.
- Visual: 360, 390, 768, 1024, 1440 and 1920 px; DPR 1/2; Full/Lite/Static.
- Accessibility: axe, keyboard, NVDA/VoiceOver, 200% zoom and forced colors.
- Performance: Lighthouse CI, bundle analysis, Spector.js, heap/context checks and sustained thermal test.
- Cross-browser: current/previous Chrome, Safari, Firefox and Edge; iOS Safari and Android Chrome.

**Gate:** all budgets and golden flows pass.

### P9 — Deployment and retirement

- Immutable SHA deployments with preview/staging/production secrets.
- Blue-green canary at 5%, 25%, 50%, 100% with monitoring at every gate.
- Roll back immediately on auth/publishing, SEO/feed, 5xx or material CWV regression.
- Keep the Vite artifact and shared additive schema during the rollback window.

**Gate:** production telemetry stable before retiring Vite.

## Performance budgets

| Metric | Editorial | Immersive |
|---|---:|---:|
| Initial route JS | ≤170 KB | ≤230 KB shell; 3D deferred |
| Mobile/desktop hero poster | ≤180 KB | ≤320 KB |
| Initial GLB | none | ≤1.5 MB mobile / ≤3 MB desktop |
| Visible triangles | none | ≤150k mobile / ≤500k desktop |
| Draw calls | none | ≤60 mobile / ≤120 desktop |
| GPU texture memory | none | ≤64 MB mobile / ≤160 MB desktop |
| LCP p75 mobile | ≤2.5 s | ≤2.5 s with poster |
| INP p75 | ≤200 ms | ≤200 ms |
| CLS p75 | ≤0.1 | ≤0.1 |

Full targets stable 55–60 fps; Lite remains usable at ≥30 fps. Article, account and admin entry chunks must not contain Three/Spline/Theatre/Postprocessing.

## Accessibility contract

- Content and actions never exist only inside canvas.
- Skip link, landmarks, logical headings, visible focus and 44×44 px targets.
- Reduced motion disables smooth scrolling, pinning, scrub, parallax, camera travel and autoplay loops.
- Canvas is decorative/hidden from assistive technology unless paired with equivalent DOM controls and instructions.
- Sound is off by default with persistent visible control; meaningful audio/video receives captions or transcript.
- Route transitions preserve history, announce destination and restore focus.

## Rollback criteria

Rollback for broken authentication/admin publishing, canonical/feed regression, elevated 5xx, material CWV degradation, data corruption or inaccessible core journeys. Traffic returns to the Vite deployment; new features are disabled by flag; shared additive migrations are not destructively reversed during an incident.

## Current implementation state

- Parallel Next.js experience created in `experience/`.
- Immersive home vertical slice includes accessible semantic content, Lenis, GSAP/ScrollTrigger, Motion reduced-motion detection, R3F/Three/Drei/Postprocessing and View Transitions.
- Supabase browser boundary and 3D asset pipeline contract added.
- Theatre, Spline, Rive, Lottie, Draco and Meshopt are dependency/pipeline boundaries pending authored assets; they must not be added as decorative placeholders.

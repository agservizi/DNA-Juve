# ADR-001: Migrate Vite to Next.js with a strangler architecture

**Status:** Accepted  
**Date:** 2026-08-02  
**Deciders:** Product owner, technical lead, creative lead

## Context

DNA Juve contains dozens of public and administrative routes, a large browser-oriented Supabase integration, auth, PWA push, SEO feeds, automation and user changes already in progress. A simultaneous framework, TypeScript, UI, data and 3D rewrite would make failures difficult to isolate and rollback unsafe.

## Decision

Build a parallel Next.js App Router application, preserve the Vite deployment as blue, share the current Supabase schema under additive-only migration rules, and move route families behind explicit parity and quality gates.

## Options considered

| Option | Complexity | Rollback | Risk |
|---|---:|---:|---:|
| In-place big bang | High | Poor | Very high |
| Parallel strangler | Medium | Strong | Controlled |
| Keep Vite permanently | Low | Strong | Cannot meet the requested SSR/Next architecture |

## Consequences

- Existing functionality and uncommitted work remain protected.
- There is temporary duplication and a longer transition period.
- URLs, data contracts and RLS must remain compatible across both applications.
- Creative effects arrive after each domain reaches functional parity.

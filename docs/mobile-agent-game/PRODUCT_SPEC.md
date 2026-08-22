# Hermes3D settlement — bounded v1 product specification

Status: private synthetic-evidence prototype. Kanban remains execution authority; Git revisions and evidence remain acceptance authority.

## Purpose and loop

Turn company state into a spatial, glanceable projection without inventing productivity. Glance at World → inspect agent/worksite → issue an explicit idempotent assignment or reprioritization intent → observe only authoritative queued → running → review state → inspect evidence → accept/reject. This is not an idle game and has no currency, energy, loot, timers, or automatic completion.

## Bounded IA

Persistent roots are World, Agents, Build, Review. Each owns a protected contextual stack. Communications, skills, settings, museum, stream, and company builder stay outside v1 and retain current routes.

Read model v1 contains `observedAt`, `stale`, `mode`, agents, sites, tasks, blockers, review gates, and evidence references. Every item has a durable bounded ID, explicit status label + shape/icon, authority, and provenance. Commands are versioned, validated, atomically deduplicated, and never silently queued offline.

## Visual and interaction contract

An original warm working courtyard uses moss/stone/clay and distinct silhouettes. BUILDING IN PROGRESS is exposed framing/scaffold, not a fictional progress bar. Review is a physical gate; blockers are striped hazards with text/icon. Inspiration is principles only—no third-party assets or trade dress.

One Canvas/rAF owner; UI ≤10Hz; controls ≥48px; `100dvh`; safe-area dock; one sheet; portrait-first; short landscape supported; keyboard/reduced-motion/list alternative. Live mutation, joystick locomotion, PWA push, economy, and production activation are out of scope.

The `/office/game` slice proves only local fixture assignment and cannot mutate live systems. Source: `src/app/office/game/page.tsx` and `src/features/mobile-game/`.

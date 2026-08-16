# factory-pilot v0.1.0

**Date:** 2026-08-16
**Commit:** the accepted `main` commit (tag `factory-pilot-v0.1.0`).
**Ledger:** `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

## What shipped

Task 9 closes the Restaurant product end to end:

- **9A — Describe → Restaurant V3.** The Describe entry routes a restaurant
  requirement to the deterministic V3 composer (`composeProductRecipe` over the
  canonical restaurant intent/experience + Restaurant capability base),
  producing a V3 Draft with a stamped template origin and dual-surface previews;
  the non-restaurant V1 path stays byte-identical.
- **9B — V3 launch + verification.** The V3 bundle emits a `docker-compose.yml`
  + `Dockerfile` (`web` customer :3000, `api` merchant-manager :3001, shared
  state volume), and the verification queue dispatches V1/V3 strictly, running
  the V3 bundle's generated customer / merchant / shared-state journeys. The
  code canvas exposes a "Run verification" action with evidence steps.
- **9C — Restaurant acceptance harness.** A dedicated Playwright harness
  (`e2e/restaurant-v3.spec.ts`) drives Describe → V3 apply → Page/Data/
  Experience/Access edits → Publish → Compile → Verify → Preview → accessibility
  → cleanup, and passes in one environment-only real-model run.

## Evidence

- Typecheck: 29/29 packages.
- Tests: 29/29 tasks (all suites green).
- Build: 17/17 tasks.
- `verify:third-party` and `verify:source-studies`: pass.
- Guarded real-model acceptance: GREEN (3.2m), accessibility zero violations at
  desktop + 390px, cleanup empty.

No cloud deployment is claimed; deployment remains deferred.

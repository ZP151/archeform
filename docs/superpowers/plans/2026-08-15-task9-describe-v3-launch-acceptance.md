# Task 9 — Describe -> V3, V3 launch/verification, and acceptance harness plan

**Date:** 2026-08-15
**State:** Ready for writer
**Authority:** ADR-0023 (V3 Publish/Compilation/launch closure) + the 2026-08-15
PM direction to finish the "Describe -> polished dual-surface product -> verify ->
run -> cleanup" promise.

## Objective

Close the remaining three slices so the Describe entry, the template entry, and
the acceptance harness all converge on one runnable, verifiable Restaurant V3
product, then integrate `main` and release.

## Slice 9A — Describe -> Restaurant V3

Gap: the Describe path calls `composeProductDraft` (V1) for every product; the
Restaurant V3 `composeProductRecipe` exists but production never calls it.

Route the Describe path to `composeProductRecipe` when the composed product is a
Restaurant, producing a V3 Draft + Snapshot; the non-Restaurant V1 path stays
byte-identical.

- Intent/experience source: the canonical `restaurantOrderingProductIntent()` +
  `restaurantOrderingExperienceBrief()` (verified standard product data).
- Base draft: `composeDefaultCapabilityDraft({ profile: "restaurant-ordering" })`
  -> `createDraftRevision` (the Restaurant capability base, not the blank V1 base).
- Detection: a `productType` discriminator on the interpretation output (or the
  blueprint) is frozen as the routing signal; fallback is the canonical
  restaurant actor set.
- Output: store the composed V3 Draft (and one Snapshot V2) for the review,
  mirroring the template-instance path.

## Slice 9B — V3 launch + verification

Gap: the V3 bundle has a Node boot script but no `docker-compose.yml`
(required by `PreviewRunner`), and the verification queue accepts only
`ApplicationGraphV1`.

- Add a governed `docker-compose.yml` to the V3 bundle (product-target.ts) or a
  V3-native launch runner, so `PreviewRunner` can boot it.
- Extend the verification queue to strict V1/V3 dispatch (V3 -> the Restaurant
  verification plan) and run Customer/Merchant journeys + authorization denial +
  cleanup.

## Slice 9C — Restaurant acceptance harness

A new dedicated Restaurant harness covering: restaurant Describe with at most
one critical clarification; fifteen screens across two surfaces;
Page/Data/Experience/Access edits; immutable Publish + V3 Compile; Source
view/export; Verify, Preview, Customer/Merchant operations; accessibility at
390px and desktop; stop + cleanup; and one environment-only real-model run.

## Final — integrate `main` and release

The branch leads `main` by ~205 commits. Non-force integrate into `main`, run the
release gate on the exact `main` commit, push `main` and an annotated release
tag, and create a GitHub Release when authenticated tooling is available.

## Delivery

One reviewed commit/push per slice; local `HEAD` equals upstream; clean tree;
TDD RED/GREEN; full Control Plane, Worker, Compiler, Graph, Capabilities, and
Workbench suites; no-emit/build gates; Prettier + `git diff --check`; sensitive
scans; independent Sol review per slice.

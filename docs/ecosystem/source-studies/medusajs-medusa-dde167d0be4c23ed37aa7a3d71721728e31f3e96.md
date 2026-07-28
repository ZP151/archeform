---
repository: https://github.com/medusajs/medusa
commit: dde167d0be4c23ed37aa7a3d71721728e31f3e96
retrievedAt: 2026-07-29
license: MIT
paths:
  - README.md
  - LICENSE
excludedPaths: []
decision: reference-only
sourceCopied: false
---

# Medusa source study

## Purpose

Study commerce-provider and module-boundary patterns for a later optional
Medusa provider. The native Factory compiler remains the only v1 commerce
implementation and compiles its own catalog, cart, order, inventory, and
simulated-payment capabilities.

## Evidence and licence

The upstream [license at the pinned commit](https://raw.githubusercontent.com/medusajs/medusa/dde167d0be4c23ed37aa7a3d71721728e31f3e96/LICENSE)
is MIT. The [pinned repository tree](https://github.com/medusajs/medusa/tree/dde167d0be4c23ed37aa7a3d71721728e31f3e96)
is recorded only to make the research revision reproducible.

## Decision

No upstream source is copied in this slice. The study identifies patterns only;
Factory-owned implementations remain independently written and tested. Medusa
is neither installed nor compiled into the Factory runtime.

## Factory boundary

Any later Medusa integration must implement `RuntimeProviderV1`, consume an
immutable Published Revision, produce provider metadata and declared artifacts,
and pass a dedicated Simple Ecommerce provider acceptance suite. It cannot
become a Graph source, a required v1 dependency, or a reverse parser for
provider-owned applications.

## Verification and removal

`pnpm verify:source-studies` confirms this fixed reference-only record. The
record can be removed without migration or runtime cleanup because no Medusa
source, package, asset, or generated output is present in Factory Pilot.

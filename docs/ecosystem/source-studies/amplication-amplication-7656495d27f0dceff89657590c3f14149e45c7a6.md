---
repository: https://github.com/amplication/amplication
commit: 7656495d27f0dceff89657590c3f14149e45c7a6
retrievedAt: 2026-07-29
license: Apache-2.0 (outside ee/)
paths:
  - README.md
  - LICENSE
excludedPaths:
  - ee/**
decision: reference-only
sourceCopied: false
---

# Amplication source study

## Purpose

Study generator, plugin, template, and Git-sync boundary patterns for the
Factory-owned compiler and Graph-first Git export. This is not an integration
or a runtime dependency.

## Evidence and licence boundary

The upstream [license at the pinned commit](https://raw.githubusercontent.com/amplication/amplication/7656495d27f0dceff89657590c3f14149e45c7a6/LICENSE)
states that content outside `ee/` is Apache-2.0 and that `ee/` has its own
licence. The reviewed [repository tree](https://github.com/amplication/amplication/tree/7656495d27f0dceff89657590c3f14149e45c7a6)
contains that excluded directory.

## Decision

No upstream source is copied in this slice. The study identifies patterns only;
Factory-owned implementations remain independently written and tested. The
`ee/**` tree is permanently excluded from Factory source, build contexts,
artifacts, and runtime paths.

## Factory boundary

Factory owns Application Graph serialization, Published Revision hashing,
compiler inputs, and Git export/import. A later separately approved source
study would be required before copying a narrowly identified Apache-2.0
fragment; it must add its own attribution, tests, and removal path.

## Verification and removal

`pnpm verify:source-studies` confirms the immutable commit, reference-only
decision, no-copy declaration, and the `ee/**` exclusion. Removing this record
has no runtime effect because no Amplication package, source, or artifact is
part of this repository.

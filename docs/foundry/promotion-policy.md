# Foundry capability promotion policy

## Purpose

This policy defines the evidence a shared capability family must hold before
it may be promoted and counted as part of the Factory capability portfolio.
Promotion is a deterministic gate, not a judgement call: the capability
matrix reads the family manifest and its declared evidence record, and the
verdict is computed — nothing else may advance a family.

## Counted-family requirements

A family is *counted* only when every requirement below is met and verified
at the current version and digest:

| Requirement | Evidence |
| --- | --- |
| Immutable version and digest | The manifest digest is bound in the declared evidence record; a version or manifest change without a deliberate re-declaration fails the coverage self-check. |
| Licence and provenance | A declared licence (repo policy: MIT for first-party families) and provenance state; third-party provenance additionally requires a published source study. |
| Typed bindings and output slots | The manifest declares a binding contract, typed input schema, parameters, and output slots. |
| Fixtures | A verified fixture bound to the family digest. |
| Positive and fail-closed negative tests | A contract test with both directions: the family proves its intended behaviour and proves it fails closed on invalid input. |
| Two-Profile isolated evidence | Independent verifier profile locks from two different Profile Graphs, each binding the family's current digest to a passed verification run. |

A family that satisfies the manifest-side requirements but holds fewer than
two Profile locks is **quarantined** — it is real but not yet promoted.

## Verdicts

| Verdict | Meaning | Counted |
| --- | --- | --- |
| `eligible` | All requirements above hold at the current digest. | Yes |
| `partial` | Evidence present but incomplete in a recoverable way. | No |
| `quarantined` | Manifest requirements hold; two-Profile or provenance evidence missing or stale. | No |
| `rejected` | A manifest-side requirement fails (missing binding contract, unverified fixture/contract status, digest mismatch). | No |
| `missing-evidence` | No evidence record exists for a current family. | No |
| `stale-evidence` | The evidence record binds a different version or digest than the current family. | No |
| `duplicate-evidence` | More than one evidence record claims the same family key. | No |

Only `eligible` families count. The matrix never inflates: aliases,
historical versions, retired families, and records bound to non-current
digests are never counted.

## Promotion authority

- The deterministic capability matrix is the sole promotion authority; it is
  computed from the manifest and the declared evidence record alone.
- Adding or correcting evidence is a deliberate act: the declared record is
  a literal bound to a reviewed digest, and the coverage self-check fails on
  any drift.
- A manifest repair that changes a family's digest invalidates its evidence
  record until the record is re-declared — a family cannot be silently
  re-promoted under a new digest.
- Nothing else (process, tooling, external state) may claim a family is
  promoted when the matrix says otherwise.

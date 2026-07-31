# Live External Source Acquisition — implementation evidence

Updated: 2026-08-01

Status: `ready_for_qa`. This record covers fixed-reference source acquisition,
redacted source-study projection, and local CLI routing. It does not approve a
Candidate, Golden package, provider, dependency, source copy, Graph change, or
generated runtime.

## Scope

The implementation adds only the following locally executable path:

```text
strict batch request
  -> fixed-source client
  -> immutable quarantine evidence
  -> redacted batch receipt
  -> metadata-only source study
```

The path has no archive extraction, build, package installation, scanner
execution, Candidate creation, promotion, source-copy operation, Control Plane
route, Worker queue, Docker service, Application Graph read, or compiler input.

## TDD evidence

The following focused tests were written before their production changes and
observed RED for the intended missing behavior:

```text
pnpm --filter @factory/external-intake test -- --run test/evidence.test.ts
# RED: acquireSourceBatch is not a function

pnpm --filter @factory/external-intake test -- --run test/source-study.test.ts
# RED: source-study module did not exist

pnpm --filter @factory/intake-cli test -- --run test/cli.test.ts --testNamePattern "acquires a fixed source"
# RED: batch acquire/source-study command returned invalid-command
```

The GREEN verification then passed:

```text
pnpm --filter @factory/external-intake test
# 15 files, 395 tests passed

pnpm --filter @factory/intake-cli test
# 2 files, 57 tests passed

pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
pnpm --filter @factory/external-intake build
pnpm --filter @factory/intake-cli typecheck
pnpm --filter @factory/intake-cli lint
git diff --check
```

`@factory/intake-cli` resolves workspace dependency declarations from the
external-intake package build output. A direct CLI typecheck initially observed
the prior declaration output; building the dependency first made the new public
contract visible. The root Turbo `typecheck` task already declares this
dependency-build order through `^build`.

## Demonstrated boundaries

- A batch processes items independently. A fixed-commit mismatch blocks only
  the failing sibling; the valid sibling receives immutable snapshot and
  acquisition records.
- Batch input is shared with the existing strict intake wire contract. Duplicate
  IDs, sensitive keys, invalid request records, branches, noncanonical URLs,
  and unpinned retrieval are rejected before an acquisition can receive product
  authority.
- The CLI emits only opaque item IDs, terminal status, aggregate counts, stable
  failure codes, and canonical record digests. Its source-study output contains
  only fixed API version, acquisition/snapshot digests, classification, licence
  and notice counts, requested-module count, and status.
- Candidate, promotion, Graph, lock, compiler, generated-runtime, provider,
  and Workbench records are not created by either command.
- Source-study construction proves request/snapshot/acquisition parent binding
  and rejects mismatched parents. The returned object has no repository URL,
  requested ref, resolved commit, source path, licence text, source text,
  command, executable path, Candidate, Golden, Graph, or provider field.

## Guarded public smoke

One pre-approved fixed-reference Portfolio request was run with the production
CLI, no credentials, and a newly created run-owned quarantine directory. The
terminal batch result was `0 acquired`, `1 blocked` for opaque item
`ti-ext-cart-smoke`, with stable failure code `source-acquisition-failed`.

No repository URL, requested reference, resolved commit, source path, licence
text, archive bytes, tree listing, source text, or credentials were written to
this record. The exact run-owned quarantine directory was resolved beneath the
worktree, deleted after the terminal result, and verified absent. Therefore the
public smoke is **not passed** and does not replace deterministic fixture
evidence. It also did not create Candidate, Graph, compiler, or runtime state.

## Remaining gates

- Independent task review and QA must assess this `ready_for_qa` slice.
- A separately designed safe archive-materialization and real pinned-scanner
  slice is required before an acquired source can reach scanner, inventory,
  Candidate, or source-study enrichment stages.
- An explicit source-study record is required before any narrow, attributed
  Factory-owned port. Automated source copying remains prohibited.

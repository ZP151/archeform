# Bounded database identifiers acceptance

Status: accepted for bounded local delivery; normal branch commit/push follows.
No registered product definition is added.

## Scope and decision

Repair long generic application identifiers without changing logical Graph,
Prisma model or API names. Use the accepted ADR-0068 physical-name policy;
unsupported long columns and implicit many-to-many names fail early. No
historical Published or Compilation artifact is rewritten.

Base: `bbb1e23c68f05e3ae213ceaf167737eb0fe86779`.
Standing acceptance: independent `/root/identifier_adr_review`, yes, P0/P1 0/0,
Amended ADR SHA-256 `11580a2fcdae5e1fb8c6a94494905ce6c19809a10b37a7a6cc8457da071cd69c`.
The earlier proposal failed one allocator-contract finding; the first correction
covered both legacy Prisma and SQL naming streams. Full regression then exposed
unsafe names in all five normal fixtures. The accepted amendment permits six
specific physical mappings in fifteen database file instances, while preserving
all historical fixtures and every other byte. A strict test-only inverse must
recover the original complete ordered bundle digests; no golden was recaptured.

## Pre-change evidence

The controller rebuilt compiler dependencies and regenerated the exact original
long Publication ID on the base source. Pinned Prisma 6.19.3 validation exited 1
with four P1012 primary-key/index collisions across Principal and Session. The
new focused compiler test also fails before implementation: 60 pass, 1 fail,
missing the required explicit table mapping. This is a current reproduction.

Before source edits, the controller captured canonical, provider, interpretation
and complete ordered bundle hashes for all five delivered definitions in
`packages/compiler/test/fixtures/five-definition-baseline.json`, SHA-256
`421447a597e6593045b1fe317ed0c83e6469f5540c6156620d05af2503670ae5`.
Both the existing four-definition test and new five-definition test pass on
pre-change source (2/2). The fixture must not be regenerated after the repair.

The new `e2e/approval-long-identifier.spec.ts` collects successfully and reuses
the actual Publication journey with a unique `publication-review-acceptance`
prefix. Existing cases retain their short `batch` prefix. Collection is not
runtime acceptance.

## Local runtime preparation

Docker Desktop initially could not start because two inaccessible, zero-length
AF_UNIX socket endpoints blocked its Inference and Secrets services. The same
failure class is reported in Docker's [upstream issue 531](https://github.com/docker/desktop-feedback/issues/531).
The controller confirmed local backend errors and preserved only the affected
runtime directories under dated sibling names before recreating empty runtime
directories. No settings, credentials, images, volumes or container database
were reset. The engine subsequently responded as 29.6.2 with no running
containers. These host repairs are environment preparation, not product code.

Actual validation used an isolated task-owned Factory project, loopback
ports 13020/15180/15440/16380, blank model keys, and the existing authored
selection path. The controller owns source/image identity and exact teardown.

## Actual runtime evidence

The original long input now passes pinned Prisma 6.19.3 and actual PostgreSQL 16
migration: eight explicit maps, maximum 63 bytes, all maps present, zero
truncations, 26 unique relation names and 11 constraints. The isolated SQL
container was removed. See [SQL receipt](evidence/bounded-database-identifiers/postgres-probe.json).

The authored long-ID Publication run passes 1/1 in 4.5 minutes; ready time is
214,158 ms. It exercises immutable Publish/Compilation, generated preview,
same-record return/correction/resubmission/approval, reason persistence, API
restart, lost-response replay, concurrent edits and submitted-state denial.
Final record version is 7, with two decisions and eight audit events. Model
calls are zero. See [journey receipt](evidence/bounded-database-identifiers/publication-review/correction-journey.json).

Actual screenshots cover 390/768/1440 widths, two distinct authored records,
dark mode and unavailable-media fallback. Root visually inspected the 390px
two-record screen and 1440px approved history: cobalt color, photo, icons,
distinct titles and channels, status and decision details render correctly.
These preserve the approved UI; they do not establish ordinary-user success.

The tested worker's source hash was read inside its running container:
`2f47abd3a2b7816eb8abb031441f69929de19f5e254d4e696d06b11a9299d1f9`.
The validated-snapshot target hash is
`de163d09b2026b3e7bd91b700fffac32a4e217564913d9616e5fe966613c1605`;
the additional repair uses one validated Graph snapshot instead of rereading
the original getter. Its focused regression passes. Root regenerated the exact
tested Published input using the existing lifecycle canonical composition lock:
all 63 generated files have identical digest and byte size to the actual tested
Compilation. This supports reuse of the unchanged generated-runtime evidence,
accepted by independent review. See [artifact comparison](evidence/bounded-database-identifiers/final-source-artifact-equivalence.json).

The initial full compiler run had seven legacy comparison failures and one
validated-snapshot defect, not eight legacy failures. Both categories are
tracked separately.

## Final correction, regression and review

Review found two valid contribution SQL spellings bypassing preflight. The repair
now recognizes quoted/unquoted names and IF NOT EXISTS, while rejecting unknown
DDL forms. Focused regressions also preserve ordinary fields named `constraint`
and `unique`, and ignore keywords inside literals/comments during inspection.
The final target SHA-256 is
`f6fb7489563c31b256a529b860ecf1d8f3e9099705b1af7c9750cfb47e2c6250`.
These corrections inspect SQL without rewriting emitted statements.

Root used a separate base-plus-identifier snapshot, excluding the active numeric
work. Full compiler regression passes 814 tests in 48 files at the penultimate
hash. The final small classifier correction then passes all 101 affected tests
(83 database, 14 protected compatibility, four snapshot/identity) in that same
isolated snapshot, plus build; owner typecheck and formatting pass. The full run
is retained under the proportionate correction policy, not claimed as a new full
run at the final hash. See [verification receipt](evidence/bounded-database-identifiers/verification.json).

The strict inverse recovers the original five complete ordered bundle hashes
with exactly six mappings across fifteen database file instances. Twelve negative
guards reject extra or modified mappings, mismatched copies, misplaced tokens and
unrelated changes. Historical fixtures and all other outputs remain unchanged.

An independent long-input fixture was captured before the preflight changes.
Final regeneration has identical content and size for all 63 files. This chains
to the earlier actual-artifact comparison without relabeling either as a new
runtime run. See [preflight comparison](evidence/bounded-database-identifiers/preflight-output-equivalence.json).

Independent `/root/identifier_implementation_review` approves the final exact
hash, open P0/P1/P2 0/0/0, after inspecting ten actual images and the focused
corrections. Root accepts this bounded repair. Factory, SQL probe and Preview
containers/networks/volumes are absent; see [cleanup receipt](evidence/bounded-database-identifiers/runtime-cleanup.json).
The separate numeric fixture runtime is still active and belongs to the next
task. Numeric-domain and Training work continues under the long Goal.

Real-model selection, ordinary-user effort, hosted identity and cloud deployment
are outside this acceptance claim.

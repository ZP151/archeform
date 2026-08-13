# UI Registry Task 3 implementation plan

State: `delivered`.

Post-delivery base:
`0aeae1c0ba7afcb1f074329a30e51bb18c8aacfa`

> **For the assigned frontend writer:** inventory before creation, use
> test-driven development, and stop on any mismatch with the frozen shared
> manifest or ADR-0010. Do not edit outside the exact boundaries below.

**Goal:** establish the seven private UI/recipe packages and the exact reusable
Restaurant registry foundation consumed by the fifteen frozen screens.

**Architecture:** primitives and patterns compose generated UI source; screen,
experience, and product recipes reference stable registry keys. Selected source
is copyable into a generated app and does not require private monorepo packages
at runtime. Graph binding declarations are validated metadata, never server
authority.

**Model and owner:** one GPT-5.6-Terra frontend writer; `integration` owns the
shared contract.

**Contracts:** the frozen Restaurant shared manifest and accepted ADR-0010.
Refrozen shared-manifest formatted SHA-256:
`ffa017cf14cd911495d70d8cf490bb637b570057235d3d841657e0f7c732b732`.

**Exact write boundaries:**

- `docs/research/2026-08-12-archeform-ui-registry-reuse-inventory.md`
- `pnpm-lock.yaml`
- `packages/ui-primitives/{package.json,tsconfig.json,THIRD_PARTY_NOTICES.md}`
- `packages/ui-primitives/src/**`
- `packages/ui-primitives/test/**`
- `packages/ui-patterns/{package.json,tsconfig.json}`
- `packages/ui-patterns/src/**`
- `packages/ui-patterns/test/**`
- `packages/workbench-ui/{package.json,tsconfig.json}`
- `packages/workbench-ui/src/**`
- `packages/workbench-ui/test/**`
- `packages/generated-ui/{package.json,tsconfig.json}`
- `packages/generated-ui/src/**`
- `packages/generated-ui/test/**`
- `packages/screen-recipes/{package.json,tsconfig.json}`
- `packages/screen-recipes/src/**`
- `packages/screen-recipes/test/**`
- `packages/experience-recipes/{package.json,tsconfig.json}`
- `packages/experience-recipes/src/**`
- `packages/experience-recipes/test/**`
- `packages/product-recipes/{package.json,tsconfig.json}`
- `packages/product-recipes/src/**`
- `packages/product-recipes/test/**`

`pnpm-lock.yaml` is limited to the seven new workspace importers and references
to the exact already locked coordinates accepted by ADR-0010. Any other lock
diff stops the task.

The preserved inventory and 21 scaffolds may resume immediately for RED/source
work, but complete cross-package resolution cannot pass with the current local
state alone: the seven lockfile importers and local workspace links do not yet
exist. Exactly one bounded offline workspace reconciliation is authorized using
the already installed direct pnpm runtime. It may update `pnpm-lock.yaml` only
with the seven importers and references to already locked `lucide-react`
0.468.0, Vitest 2.1.9, React 19, and existing workspace coordinates, and may
create ignored local links. No network, package download, new coordinate,
version/resolution change, root workspace edit, or second install attempt is
authorized. Diff beyond that exact lock boundary stops the writer and returns
to PM.

## Task A — Reuse inventory and RED contract tests

Search in order: approved Archeform registries, recipes, Workbench assets,
generated-project templates, then pinned source studies. Record candidates,
reused source, parameterization, rejected candidates, and the two documented
functional gaps in the inventory artifact. Do not inspect or copy shadcn/ui or
import Radix.

Add focused RED tests for exact package/item versions, unique keys, source and
license ownership, schemas, slots/nesting, states, responsive variants, tokens,
accessibility metadata, fixtures, interaction contracts, duplicate detection,
all fifteen recipes, and the exact port manifest. Require rejection of unknown
keys/ports, wrong binding kind, missing states, near-duplicate style-only keys,
and source/runtime dependency escape.

## Task B — Implement primitives, patterns, and generated blocks

Create only the exact primitive, pattern, layout, state, and business-block
keys in the shared manifest. Reuse or parameterize inventory matches. New
source is permitted only for the recorded semantic gaps. Use English UI text,
semantic HTML, keyboard/focus contracts, reduced-motion behavior, responsive
variants, complete loading/empty/validation/error/confirmation/denial states,
and Fine Dining token requirements.

## Task C — Implement screen, experience, and product recipes

Create the exact fifteen screen recipes with their ordered `main` regions,
block IDs/types, and binding port schemas. Add `fine-dining` and
`restaurant-ordering` recipes. Validate the complete dependency closure and
that selected generated source is copyable without a private-package runtime
import. Actual browser pixel screenshots remain a Task 4/5 runtime gate;
Task 3 owns deterministic screenshot-state fixture declarations, not a new
browser dependency.

## Task D — GREEN and handoff

Run focused package suites, all seven package typechecks/builds/tests, affected
workspace tests, frozen install/lockfile equality, scoped Prettier, diff check,
exact-boundary containment, duplicate/source-provenance checks, generated-source
closure, accessibility/interaction fixture checks, and changed-hunk sensitive
scan. Record all counts and exact paths. Do not commit or push.

Pause for one independent code review and PM reconciliation, then
controller-only delivery. This ordinary deterministic component/recipe work
uses focused TDD, relevant package/full compatibility checks, and one code
review. It does not require a separate Terra QA/final-Sol loop unless a new
serialized/security issue emerges. A source/dependency or shared-key change
stops both Task 2 and Task 3.

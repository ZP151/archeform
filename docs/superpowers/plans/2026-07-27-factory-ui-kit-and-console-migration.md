# Factory UI Kit and Console migration plan

**Goal:** Replace Console-only presentation code with a canonical, versioned
Factory UI Kit that has one verified Console copy and one real generated-app
candidate distribution.

## Task 1: Build the canonical asset

Create `packages/ui-kit/factory-ui/1.0.0/` with manifest, token stylesheet,
component stylesheet, React primitive sources, fixtures, and focused tests.
Write a failing test for every primitive behavior and manifest/digest rule
before implementation.

## Task 2: Verify the Console copy

Write failing copy-verification tests, then materialize
`apps/console-next/components/factory-ui/` and its declared CSS from the
canonical asset. Remove direct Console imports of the previous preview
primitive set. The verifier must fail if either copy drifts.

## Task 3: Migrate Console workflow

Use only Factory UI Kit primitives in the project rail, workflow navigation,
definition editor, plan table, run evidence, notices, dialogs, and empty
states. Run visual, accessibility, and full fixture workflow evidence using a
production-style Console start so framework development overlays are absent.

## Task 4: Materialize generated-app candidates

Create the eight `ui.*@2.0.0` packages with canonical-source references,
digest locks, declarative adapters, fixtures, tests, and candidate trust
sidecars. Add Registry/Composer denial tests proving that none can be selected
until Golden promotion.

## Task 5: QA and live resumption

After both distributions pass copy, browser, and denial tests, run independent
QA/review. Only then resume the guarded real-model Definition -> plan ->
Executor -> generated-app smoke -> cleanup acceptance flow.

## Task 6: Read-only lineage DAG

After the Factory UI Kit Console copy is accepted, capture the exact
`@xyflow/react@12.11.2` lock closure under ADR-008. Add a Factory-owned
`lineage-dag` component that renders bounded Requirement -> Definition -> Plan
-> Run -> Evidence and component dependency relationships. It is read-only and
must not be introduced into generated-app packages without a separate profile
decision.

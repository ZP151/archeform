# Capability-composed guided creation acceptance

## Scope

This acceptance slice proves that a business user can make a bounded
capability decision before creating a new Factory Draft. It does not publish,
compile, call an AI provider, persist a raw brief, or permit arbitrary source
or Graph input.

## Verified behavior

- Every selected Profile starts from its trusted Factory Graph starter.
- Expense Approval and Simple Ecommerce may remove `core.audit`; Restaurant
  Ordering and Expense Approval may remove `core.notification`.
- Removing audit removes `audit.record`, matching Flow effects, and policy
  `audit` actions. Removing notification removes `notification.send` and any
  matching Flow effects.
- Unsupported or duplicate optional selections fail closed before Draft
  creation.
- Required profile capabilities are visible but locked in the Workbench.
- Restaurant keeps its audit capability locked; Ecommerce keeps its
  notification capability locked. This matches the profile catalog rather
  than presenting an unavailable option.
- The browser-safe Graph semantic validator rejects a composed invalid Graph
  before the Workbench can submit it; the Control Plane repeats validation
  before persistence.
- The Control Plane still owns the final Graph validation before it persists a
  mutable Draft.

## Evidence

```text
pnpm --filter @factory/capabilities test -- capability-registry.test.ts
19 tests passed

pnpm --filter @factory/workbench test -- guided-creation-drawer.test.ts guided-application.test.ts guided-creation-model.test.ts
8 tests passed

FACTORY_E2E_BASE_URL=http://127.0.0.1:15176 pnpm exec playwright test e2e/workbench.spec.ts --reporter=line
3 tests passed
```

The browser proof creates an Expense Draft with the Audit trail toggle turned
off, captures the Control Plane's persisted Draft response, and asserts that
the Graph contains neither `audit.record` nor any Flow effect that references
it. The same suite proves the default guided journey and the existing
edit/publish/compile journey.

## Local service isolation

The evidence run used the local Compose project `factory-pilot-acceptance`:

```text
Workbench:     http://127.0.0.1:15174
Control Plane: http://127.0.0.1:13000
PostgreSQL:    127.0.0.1:15432
Redis:         127.0.0.1:16379
```

No model credential, raw prompt, or raw model response was used or retained by
this acceptance slice.

# Golden Capability Assets Acceptance

## Acceptance scope

The initial Factory capability suite is accepted only when the following are
demonstrated for Expense Approval, Restaurant Ordering, and Simple Ecommerce:

- selected capabilities resolve to self-contained physical Golden asset packages
  whose complete manifests, SHA-256 digests, package-local adapters, fixtures,
  and contract evidence are verified;
- the composed Draft contains exact asset locks;
- each lock supports the selected composition Profile and covers the declared
  Factory operations;
- an omitted optional asset removes only its declared Graph contributions;
- a digest-tampered lock is rejected before publication;
- AI Graph Diffs cannot select assets or alter composition scope;
- generated output contains `capability-lock.json` with the Graph hash;
- the Workbench review exposes the locked asset key and version before Draft
  creation.

## Recorded verification

All commands below completed successfully on 2026-07-29 without a real-model
call. This is a component-asset acceptance slice, not the guarded real-model
acceptance gate for the three independently generated product profiles.

```text
pnpm test
pnpm typecheck
pnpm build
pnpm verify:third-party
pnpm verify:source-studies
pnpm exec prettier --check <changed paths>
git diff --check
```

An isolated Docker Compose project named `factory-pilot-assets-e2e` started
Workbench, Control Plane, Worker, PostgreSQL, and Redis on non-default local
ports. The browser regression suite passed against that isolated runtime:

```text
FACTORY_E2E_BASE_URL=http://127.0.0.1:15177 \
  pnpm exec playwright test e2e/workbench.spec.ts --reporter=line

3 passed
```

The suite covered guided Draft creation, removal of the optional audit asset,
the persisted Expense composition Profile and Golden locks, Draft editing,
publication, compilation, generated artifact inspection, revision history,
responsive editing, and light/dark themes. The isolated Compose project is
removed after acceptance, including its test-only volumes.

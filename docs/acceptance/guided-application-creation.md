# Guided application creation evidence

**Date:** 2026-07-29

## Scope

This evidence covers the first business-user creation layer. It starts with a
bounded accepted-profile choice and creates a mutable Application Graph Draft;
it does not publish, compile, invoke an AI provider, or persist a natural
language requirement.

## Deterministic Graph evidence

The Workbench unit suite proves that guided creation:

- clones an Expense approval starter without mutating it;
- creates a new, bounded Graph key from a product name and supplied nonce;
- applies the selected light or dark experience mode;
- rejects a blank name; and
- produces a Graph accepted by the shared semantic validator.

The browser bundle does not import the Node-only Graph hash entry point. The
Control Plane remains the validation boundary before a Draft is persisted.

## Browser evidence

Against the isolated local Workbench and Control Plane services:

1. Opened **New application**.
2. Chose **Expense approval** in the left-side drawer.
3. Entered a unique application name and reviewed its page, record, role, and
   flow counts.
4. Created the Draft.
5. Verified that the drawer closed only after the Control Plane response, Page
   Studio opened for the new Graph, the lifecycle remained **Draft**, and no
   Published control appeared.

The existing edit, publish, immutable compilation, artifact inspection, and
revision-history browser journey passed in the same run.

## Commands

```text
pnpm --filter @factory/workbench test
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench build
FACTORY_E2E_BASE_URL=http://127.0.0.1:15174 pnpm exec playwright test e2e/workbench.spec.ts --reporter=line
```

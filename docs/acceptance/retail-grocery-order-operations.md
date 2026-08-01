# Retail Counter and Grocery Pickup order-operations acceptance

**Date:** 2026-08-02
**Shared package:** `commerce.order-operations@1.1.0`

## Scope

This record accepts two local generated-prototype journeys that select the same
immutable shared package identity. It verifies Factory's ordinary Workbench
lifecycle: create a Draft, Publish an immutable revision, Compile it, start an
isolated Preview, operate the generated application, and stop the Preview.

## Accepted journeys

| Profile        | Local generated-application journey                                      | Terminal outcome                                |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| Retail Counter | Checkout and simulated payment, then cashier receipt issuance            | `receipt-issued`                                |
| Grocery Pickup | Checkout and simulated payment, then fulfilment pick, ready, and handoff | `paid -> picking -> pickup-ready -> handed-off` |

Each browser journey opened a generated application and asserted that it was
not the Puck studio. Each used its role-specific terminal operation, then
stopped its own Preview through the Control Plane. Cleanup assertions confirmed
that the exact generated artifact directory and the Preview's containers,
network, and volumes were absent.

## Reproducible verification

The dedicated local-stack browser acceptance command passed both profiles:

```powershell
pnpm exec playwright test e2e/generated-retail-grocery.spec.ts --workers=1 --reporter=line
```

Result: 2 of 2 tests passed in 3.4 minutes.

The deterministic compiler regression command also passed:

```powershell
pnpm --filter @factory/compiler test
```

Result: 13 files and 237 tests passed. Compiler Worker lint and typecheck, plus
focused Preview and queue regressions passed with the following commands:

```powershell
pnpm --filter @factory/compiler-worker lint
pnpm --filter @factory/compiler-worker typecheck
pnpm --filter @factory/compiler-worker test -- preview-runner.test.ts queued-preview-run.test.ts
```

The focused regression command covers the access-denied Preview Runner case.
Lint and typecheck passed; 2 focused test files and 51 tests passed.

## Explicit exclusions

This is accepted local generated-prototype evidence, not production readiness.
It excludes real payments, external identity, provider delivery, cloud
deployment, fleet management, and raw model or source data. This record does
not retain URLs, ephemeral identifiers, raw Graphs, credentials, prompts,
model responses, generated source, or package source content.

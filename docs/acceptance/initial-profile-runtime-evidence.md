# Initial profile runtime evidence

**Date:** 2026-07-29

## Current deterministic revalidation

The current committed compiler materialized a new isolated bundle for every
profile after the Graph Studio authoring slice. Each bundle contained **42**
tracked artifacts and was started with its own Compose project and non-default
host ports. The deterministic, credential-free journeys passed again:

| Profile             | Current runtime verification                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expense Approval    | Employee created and submitted an expense; manager approved it; finance read audit evidence; Web returned HTTP 200.                                                                       |
| Restaurant Ordering | Customer selected a seeded menu item, added it to a cart, paid, and kitchen advanced the order to `ready`; Web returned HTTP 200.                                                         |
| Simple Ecommerce    | Customer added a seeded product to a cart, paid, and an operator fulfilled it; stock changed from 20 to 19; operator capability-evidence access returned HTTP 403; Web returned HTTP 200. |

The generated browser journeys are now repository tests. With the three
environment-only generated-app URLs set, the following completed together:

```text
pnpm test:e2e -- generated-expense.spec.ts generated-restaurant.spec.ts generated-ecommerce.spec.ts
```

No real-model call was used for this deterministic revalidation. The guarded
real-model acceptance below remains a separate final gate.

## Current guarded real-model revalidation

One guarded OpenAI proposal was accepted for each of Expense Approval,
Restaurant Ordering, and Simple Ecommerce. Every proposal was applied only as
a new Draft, then published and compiled through the normal immutable path.
All three resulting compilations succeeded with 42 artifacts.

The persisted Graph snapshots contain the validated optional
`acceptance_note` field proposed by the model, while a database-level
non-sensitive check found zero persisted `brief` properties. No credentials,
raw briefs, or raw model responses were read back or recorded by this check.

## Scope

This record covers deterministic local runtime evidence and the guarded
real-model acceptance for each independently published profile.

## Common path

For each profile, the local Control Plane accepted a Draft, produced an
immutable Published Revision, queued it to the Worker, and recorded its
generated artifacts. Each resulting isolated Compose project built and started
its PostgreSQL, migration, Nest API, and Next.js Web services.

## Evidence

| Profile             | Generated runtime journey                                                                                                                                                          | Web result |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Expense Approval    | Employee created and submitted an expense; manager approved it; finance read audit evidence.                                                                                       | HTTP 200   |
| Restaurant Ordering | Customer selected a seeded menu item, added it to a cart, simulated payment, and kitchen progressed it to `ready`.                                                                 | HTTP 200   |
| Simple Ecommerce    | Customer added a seeded product to a cart, paid, and an operator fulfilled it; stock decreased by one. The operator was correctly denied access to capability evidence (HTTP 403). | HTTP 200   |

## Boundary checks

- Every generated project used an isolated Compose project name and non-default
  local ports.
- Generated artifacts contained Web, API, Prisma, Casbin, XState, tests, and
  documentation outputs.
- No real-model call, credential, raw prompt, or raw model response was used
  or recorded in this deterministic runtime evidence.

## Guarded real-model acceptance

Expense Approval, Restaurant Ordering, and Simple Ecommerce are independently
accepted.

- **Expense Approval:** one environment-only real OpenAI proposal produced a
  schema-valid Graph Diff that was applied only to a mutable Draft. Its
  resulting immutable revision compiled into 39 artifacts. The isolated
  generated runtime persisted the model-added optional receipt field, completed
  employee submission and manager approval, recorded five audit events and two
  capability events, and served its Web application with HTTP 200.
- **Restaurant Ordering:** one environment-only real OpenAI proposal produced
  a schema-valid Graph Diff that was applied only to a mutable Draft. Its
  resulting immutable revision compiled into 39 artifacts. The isolated
  generated runtime read seeded menu data, created a cart, added a menu item,
  completed simulated payment, advanced the kitchen flow to `ready`, recorded
  five audit events and four capability events, and served its Web application
  with HTTP 200.
- **Simple Ecommerce:** one environment-only real OpenAI proposal produced a
  schema-valid Graph Diff that was applied only to a mutable Draft. Its
  resulting immutable revision compiled into 39 artifacts. The isolated
  generated runtime read seeded catalog data, created a cart, completed
  simulated payment, decreased stock from 20 to 19, fulfilled the order, denied
  an operator access to capability evidence with HTTP 403, and served its Web
  application with HTTP 200.

Only the acceptance outcome, artifact count, and journey assertions are
recorded here. Credentials, raw briefs, and raw provider responses are neither
persisted nor included in this evidence.

## Automated browser evidence

- `pnpm test:e2e` against the isolated Workbench validates the Page and Flow
  authoring surfaces, light and dark themes, responsive Page Studio visibility,
  a Draft edit, publication, immutable compilation, and generated artifact
  visibility.
- With `FACTORY_GENERATED_E2E_URL` set to an isolated compiled Ecommerce Web
  application, the same suite validates a customer adding a seeded product to a
  cart and checking out, then an operator fulfilling the paid order.
- The final local run completed both browser tests successfully. This browser
  evidence complements the API-level role journeys above; it does not persist
  real-model input or output.

## Cleanup

Temporary Compose projects and volumes are removed after the verification gates
complete. Any host-side copied generated bundle is untracked and disposable.
The source of truth remains the Published Graph and its immutable artifact
record.

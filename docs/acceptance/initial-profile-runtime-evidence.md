# Initial profile runtime evidence

**Date:** 2026-07-29

## Scope

This record covers deterministic local runtime evidence for independently
published Graphs and the guarded real-model acceptance completed so far.
Restaurant Ordering and Simple Ecommerce still require their own guarded,
environment-only real OpenAI Graph-Diff runs before final acceptance.

## Common path

For each profile, the local Control Plane accepted a Draft, produced an
immutable Published Revision, queued it to the Worker, and recorded 39
generated artifacts. Each resulting isolated Compose project built and started
its PostgreSQL, migration, Nest API, and Next.js Web services.

## Evidence

| Profile | Generated runtime journey | Web result |
| --- | --- | --- |
| Expense Approval | Employee created and submitted an expense; manager approved it; finance read audit evidence. | HTTP 200 |
| Restaurant Ordering | Customer selected a seeded menu item, added it to a cart, simulated payment, and kitchen progressed it to `ready`. | HTTP 200 |
| Simple Ecommerce | Customer added a seeded product to a cart, paid, and an operator fulfilled it; stock decreased by one. The operator was correctly denied access to capability evidence (HTTP 403). | HTTP 200 |

## Boundary checks

- Every generated project used an isolated Compose project name and non-default
  local ports.
- Generated artifacts contained Web, API, Prisma, Casbin, XState, tests, and
  documentation outputs.
- No real-model call, credential, raw prompt, or raw model response was used
  or recorded in this deterministic runtime evidence.

## Guarded real-model acceptance

Expense Approval is independently accepted.

- The Control Plane received one real OpenAI proposal using only a local
  environment variable. The provider returned a schema-valid Graph Diff that
  was applied only to a mutable Draft.
- The resulting Draft revision 2 was published as immutable revision 1 and
  compiled successfully into 39 artifacts.
- Its isolated generated runtime persisted the model-added optional receipt
  field, completed the employee submit and manager approve journey, recorded
  five audit events and two capability events, and served its Web application
  with HTTP 200.
- Only the outcome, revisions, artifact count, and journey assertions are
  recorded here. No credential, raw brief, or raw provider response is stored.

Restaurant Ordering and Simple Ecommerce remain independently runnable from
their deterministic published Graphs. Their final real-model acceptance is
intentionally deferred to the next guarded call budget rather than replaced
with fixtures.

## Cleanup

All temporary Compose projects, volumes, and copied generated directories from
this verification are removed after the evidence has been captured. The source
of truth remains the Published Graph and its immutable artifact record.

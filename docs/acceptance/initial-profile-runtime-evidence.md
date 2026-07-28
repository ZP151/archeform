# Initial profile runtime evidence

**Date:** 2026-07-29

## Scope

This record covers deterministic local runtime evidence for independently
published Graphs. It does not constitute final profile acceptance: each
profile still requires its guarded, environment-only real OpenAI Graph-Diff
run before that status can be assigned.

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

## Cleanup

All temporary Compose projects, volumes, and copied generated directories from
this verification must be removed after the evidence has been captured. The
source of truth remains the Published Graph and its immutable artifact record.

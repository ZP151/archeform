# Inventory presentation: synthetic emitted-browser evidence

Date: 2026-09-24. This lane executes the public compiler's emitted React
workspace and emitted Inventory runtime in Chromium. Requests are routed to the
runtime's in-memory store by the test fixture. It is provider-free presentation
evidence, not the actual PostgreSQL/worker/lifecycle product acceptance. Records
are authored by test commands, never emitted seeds. No application server,
database, dependency junction or external service is created by this lane.

## Frozen source and verification

- `packages/compiler/src/inventory-operations-presentation.ts` SHA-256:
  `3a346ef3f1ad73369f407ad657f2da93589dd1be2910108c46dfb276f03c2244`.
- `packages/compiler/test/inventory-operations-presentation.test.ts` SHA-256:
  `749a90fffd475029f7e322b754415b847f935f2a5aee1b9c4229124b9c182f69`.
- Final command: `pnpm --filter @factory/compiler exec vitest run test/inventory-operations-presentation.test.ts`.
  13/13 passed; run started 06:04:50, duration 18.62 seconds. This includes strict
  TypeScript checking of the actual emitted TSX through a virtual compiler host,
  followed by browser interactions against the real emitted runtime.
- `pnpm --filter @factory/compiler typecheck` passed.
- Owned source/test Prettier check passed. Impeccable detector returned `[]`.

The initial public-bundle test failed because the generic workspace was emitted
(05:48:20). The first full browser pass was 11/13: two error-recovery assertions
found an inaccessible textarea label after input. A focused DOM repro confirmed
the label became `ReasonTeam supplies`. Separating label and textarea fixed the
association; 13/13 then passed at 06:02:25. The first image review requested plain
text list links and first-field focus when opening forms. Both corrections are
included in the frozen source and final passing run. Intermediate 06:03:34 also
passed 13/13 before the focus correction was added. No failed attempt is treated
as acceptance.

## Observations

- Empty-state Add item is in the first phone viewport. A lowercase SKU becomes
  uppercase, starts at zero each, and visible Receive stock records 10 each.
- Both authored name/SKU/quantity summaries fit before the fold at 390, 768 and
  1440 pixels with the complete workspace. Item text links retain 44-pixel hit
  areas. Phone detail exposes quantity, unit and Issue stock before the fold.
- Issue 3, linked correction -1 and a name-only update leave 6 cables, three
  immutable movements and the second SKU unchanged. Reload reads the saved state.
- Insufficient stock retains quantity/reason and adds no movement. Fractions,
  negative zero, exponent notation and excess quantities are rejected before send.
- A stale command stays blocked until the user refreshes, reviews the fresh
  proposed balance and explicitly confirms. Only then is a new key and version
  used. Refresh alone sends no command.
- A committed response is dropped. Retry sends byte-identical body/key and reads
  the original result; history has exactly one additional movement.
- Changing demo role clears history and form intent. A delayed stockkeeper
  history response cannot repopulate an observer view; observer sends no history
  request. Server authorization is separately covered by runtime acceptance.
- Literal wildcard-shaped search produces no results and supports clear filters.
  Item and history pages use bounded limit/offset reads.
- Dark-mode long names wrap, keyboard focus is visible, reduced-motion media is
  exercised, and no image/video or unexpected remote request is made.
- Opening each form focuses its first applicable field; movement inputs are
  revealed without animated scrolling before the test types into them.

## Images and reuse

The PNGs capture populated lists and details at 390/768/1440, empty/create/issue
input, desktop adjustment/result, no results, insufficient stock, stale intent,
uncertain retry and dark long-name states. These are the synthetic fixture above.
The root's first image review covered populated phone, detail phone, desktop
result and dark long names, followed by tablet, input and recovery states. Root
confirms the corrected phone list and input screenshots. Independent review
inspects eight representative images and closes new P0/P1/P2 0/0/0.

`inventory-operations-presentation@1.0.0` composes approved native control,
form-field, data-table, navigation and interaction-state patterns. Menu recipes
require price/availability/preparation bindings and do not implement this stock
balance/immutable-movement job. Directory/Task provide first-party navigation,
read protection and retry conventions. No source-study grants copying authority.
The descriptor records this semantic gap and exact local Lucide 0.468.0 icon and
ISC license digests; emitted third-party notice presence is asserted.

Actual PostgreSQL persistence, API restart replay, worker checks, immutable
Published/Compilation identities, delivery timings and ordinary-user success
remain outside this presentation lane. Tests close browser contexts and the
headless browser; no infrastructure cleanup was performed or required here.

## Compiler integration and acceptance

Root-owned `packages/compiler/src/index.ts` SHA-256 is
`a78462ec8cc470479236a41455a6d44d1ebcaf40d0dcc652e1ff4c8ca9605293`.
Only the exact admitted profile selects the private workspace/styles and local
icon notice. Default cobalt applies only without an explicit Graph design system.
All nine historical bundles remain byte-identical. Root passes 40 contract and
seven package-export checks; compiler build/typecheck pass. Independent source
checks pass 2/2 for strict emitted TSX and literal metadata escaping, retaining
the 13-case browser run without rewriting its screenshots. PM accepts this
bounded source/presentation slice; complete product acceptance remains Task 4.

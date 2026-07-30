# Task 4 report — Generated Restaurant Customer experience

Status: DONE

Commit message: `feat: generate restaurant customer experience`

## Delivered Customer runtime

- Replaced the Task 3 static Customer bridge with a profile-gated generated
  React runtime for opaque table-session entry, category/menu browsing and
  search, cart line creation and quantity updates, item and whole-order notes,
  submit plus full simulated payment, server-confirmed order status, current
  session history, and token-bound receipts.
- The generated browser uses only the frozen Customer endpoints:
  `POST /api/restaurant/table-sessions/resolve`, the category and item reads,
  token-bound history/status/receipt reads, line `POST`/`PATCH`, submit, and
  simulated payment. It emits no generic flow-event, cancellation, kitchen,
  reporting, merchant, arbitrary URL, or Graph-selected endpoint call.
- Every mutation sends the last server-confirmed `expectedVersion`. A bounded
  session command journal assigns one browser-generated idempotency key to a
  logical mutation and retains that key and payload across lost-response
  retries until the response is committed or a typed version conflict is
  reconciled through an authoritative status read. It rejects a changed payload
  while the logical command remains pending.
- Submit state is committed only after the submit response. Payment supports
  the bounded simulated `cash | card` contract, defaults safely to `cash`, and
  commits paid state and retires its logical key only after the follow-up status
  read succeeds.
- Only the Restaurant-generated Next proxy forwards the two bounded Customer
  headers and exposes PATCH for quantity updates. Expense Approval and Simple
  Ecommerce retain their original role/content-type-only GET/POST proxy.

## Session and projection boundary

- Entry accepts an opaque token only from `/table/:token`, exchanges it through
  the resolver, and stores only the active session scope in `sessionStorage`.
  The runtime does not log the token and does not accept a raw table, session,
  location, token digest, provider credential, component identifier, script,
  or endpoint from the Graph.
- Customer blocks reject Graph props/bindings that attempt to supply raw table
  or session authority. Other undeclared properties remain excluded by the
  existing bounded safe-prop projection.
- The runtime validates the complete Restaurant Profile before generation and
  verifies all five accepted Customer route templates are present. Generic
  Expense and Ecommerce page generation remains unchanged.
- Historical receipts rely on the accepted token-bound receipt endpoint for
  ownership, so a paid order in the current session history can be opened
  without trusting a client-owned table or session identifier.

## External gate remediation

- Lost-response submit and payment replays now prove one logical key, one
  pending journal entry, and no fresh key while the payload is unchanged.
- Concurrent same-slot preparation and command confirmation are serialized
  against the latest session journal. A double click converges on one key, and
  confirmation merges rather than overwriting or resurrecting another pending
  logical command.
- A typed `restaurant.order.version_conflict` payload is safely projected; the
  pending key remains when the status read fails and is retired only after the
  server status succeeds. Malformed conflicts do not trigger reconciliation.
- Payment selection covers both accepted values and rejects values outside the
  frozen simulated-payment enum.
- Proxy generation is explicitly profile-conditional, with regressions for
  both generic profiles and the Restaurant-only PATCH/header expansion.
- Canonical `tableSessionId`, `tableSessionToken`, Restaurant table, and
  Restaurant location authority names are rejected at the Customer projection
  boundary in addition to the short table/session forms.
- The browser journey now submits its menu query and asserts both the matching
  Margherita result and absence of the nonmatching Mushroom risotto result.

## Offline-read decision

No accepted fixed-version Workbox or QR source study exists. Task 4 therefore
adds no dependency, service worker, cache, QR library, third-party notice, or
offline-read claim. All Customer reads and every mutation remain online and
server-authoritative.

## Changed files

- `packages/compiler/src/restaurant-page-runtime.ts`
- `packages/compiler/test/restaurant-page-runtime.test.ts`
- `packages/compiler/src/page-runtime-projection.ts`
- `packages/compiler/src/index.ts`
- `e2e/generated-restaurant.spec.ts`
- `.superpowers/sdd/2026-07-30-restaurant-ordering-mvp/task-4-report.md`

No Graph, capability, API, Prisma, Merchant, Workbench, Docker, package
manifest, source-study, or third-party-notice path changed.

## TDD evidence

- Initial focused RED: 4/5 failed because raw table/session authority was
  accepted and the generated Web source was still the Task 3 shell.
- Focused GREEN after the bounded renderer: 5/5 passed.
- Receipt follow-up RED: 2/7 failed while the bounded modifier projector was
  absent. GREEN covers the 20-entry cap, the 50-character key bound, the
  100-character label/value bounds, and control-character rejection.
- Prisma Decimal RED: the resolved-session total normalization regression
  failed until the Customer parser accepted the real serialized numeric value
  and retained a finite numeric state.
- Historical receipt RED: client-side current-order rejection failed until
  receipt ownership was delegated to the token-bound server API.
- External-gate RED: four command-runtime cases failed before the generated
  command journal existed; two page-wiring cases failed before all mutations
  used it; and both generic-profile proxy cases failed while Restaurant headers
  and PATCH leaked into generic output.
- External-gate GREEN: lost-response submit/payment replay, stale-conflict
  reconciliation, concurrent command preparation/confirmation, canonical raw
  authority rejection, bounded payment selection, command wiring, and both
  generic proxy regressions pass. The generated page and command modules also
  pass a joint strict in-memory TypeScript check.
- Final focused Customer suite: 22/22 passed.

## Verification evidence

- `pnpm --filter @factory/compiler test`: 134/134 passed across five files.
- `pnpm --filter @factory/compiler typecheck`: passed.
- `pnpm --filter @factory/compiler lint`: passed with all files formatted.
- `pnpm --filter @factory/compiler build`: passed.
- Generated Customer TSX plus logical-command module strict in-memory
  typecheck and route-safety scan: passed.
- `git diff --check`: passed.
- `pnpm exec playwright test e2e/generated-restaurant.spec.ts --grep
  "customer"`: one Customer scenario discovered and skipped because
  `FACTORY_GENERATED_RESTAURANT_E2E_URL` and
  `FACTORY_GENERATED_RESTAURANT_TABLE_SESSION_TOKEN` were absent. Task 7 owns
  the isolated generated application/Docker prerequisite; no browser pass is
  claimed here.

## Acceptance status and remaining risks

- Customer route generation, opaque-session boundary, typed API usage, safe
  generated projection, retained logical mutation identity, authoritative 409
  reconciliation, `cash | card` payment selection, quantity/item-note/
  order-note/status/history/receipt behavior, generic-profile proxy isolation,
  submitted search behavior, and receipt modifier P2 bounds are satisfied by
  compiler evidence.
- Live browser execution, PostgreSQL behavior, Node 22 Compose startup, and the
  complete Customer-plus-Merchant journey remain Task 7 acceptance evidence.
- Local verification ran on Node 24.18.0 and emitted the expected engine
  warning; supported Node 22 release evidence is still required.

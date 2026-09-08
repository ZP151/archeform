---
title: "ADR-0041: Generated Restaurant Order Readability and Refresh"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags:
  ["architecture", "decision", "compiler", "restaurant", "generated-template"]
supersedes: ""
superseded_by: ""
---

# ADR-0041: Generated Restaurant Order Readability and Refresh

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This is a Tech Lead proposal only. It is not founder acceptance,
implementation authority, D1 acceptance, Product Publish, repository release,
or deployment authority. The founder must accept or reject it, directly or
through the exact standing independent-review policy in
`docs/tech-governance.md`; PM then records the decision and assigns work.

## Recommendation

**Keep** the current accepted Golden technology profile, Restaurant V3
compiler target, generated bundle identifiers, runtime state, API, UI catalog,
and local-preview topology. Correct only the generated customer order
presentation so `/orders` and `/orders/:orderId` expose readable item, payment,
total, and fulfilment information, plus a native `Refresh status` link that
reloads the current route from the authoritative server state.

This is a bounded generated-template correction. It adds no polling, client
state protocol, registry asset, provider call, dependency, public Graph/API
field, runtime state version, security boundary, or Compose service.

## Context

- **CTX-001**: D1.3 passed one prepared local customer-to-merchant case, but
  inspection found `/orders` visually concatenating raw values and retaining
  `paid` in the DOM after the kitchen advanced the same order to `ready`.
- **CTX-002**: The dependency-free generated product already serves
  `/orders`, `/orders/:orderId`, `GET /api/orders`, and
  `GET /api/orders/:orderId` from one file-backed state. A normal document GET
  renders the latest state; no polling or new endpoint is needed.
- **CTX-003**: Existing order records already contain `items[].name`,
  `items[].quantity`, integer-minor-unit `total`, `paymentStatus`, and the
  fulfilment lifecycle in `status` (`paid`, `accepted`, `preparing`, `ready`,
  `served`, or `cancelled`). Existing runtime settings hold the current
  three-letter currency code; the default is `USD`, and the manager API already
  permits valid alternatives. The missing behavior is presentation and
  explicit refresh, not data transport.
- **CTX-004**: The approved `active-order-list@1.0.0` asset has only
  `status`, `paymentStatus`, `priority`, and `total` ports and renders them as
  adjacent unlabeled values. It has no item or navigation port. This is the
  concrete reuse gap. Changing that shared asset would also change merchant
  output and its generated source digest; adding a near-duplicate asset is not
  justified.

## Current Accepted Golden Profile

The current profile remains accepted and is distinct from the proposed
presentation behavior:

- **CUR-001**: Node.js `>=22.11.0 <23`, pnpm `9.0.0`, and TypeScript
  `^5.7.2` with exact lock resolution `5.9.3`.
- **CUR-002**: Next.js `^15.1.0` / `15.5.22`, React and React DOM
  `^19.0.0` / `19.2.8`, Puck `^0.22.3` / `0.22.3`, and XYFlow
  `^12.3.6` / `12.11.2`.
- **CUR-003**: NestJS common/core/platform-express `^10.4.15` / `10.4.22`,
  Prisma CLI/client `^6.1.0` / `6.19.3`, BullMQ `^5.34.10` / `5.81.2`, and
  compiler-worker ioredis `^5.4.2` / `5.11.1`.
- **CUR-004**: Tracked runtime images remain `node:22-alpine`,
  `postgres:16-alpine`, and `redis:7-alpine`; these are floating-major tags.
  Docker Compose remains the isolated local topology.
- **CUR-005**: The Golden lifecycle remains mutable Draft -> immutable
  Published Graph -> immutable Compilation. The currently implemented Golden
  serialized contract remains `factory.application-graph/v1`; the accepted
  Restaurant path remains `factory.application-graph/v3` under ADR-0010 and
  ADR-0023.
- **CUR-006**: Generated Restaurant output remains
  `factory.restaurant-product-bundle/v1`, runtime schema version `1`, and a
  dependency-free Node.js bundle. The customer UI source remains the
  factory-authored `@factory/screen-recipes` version `0.1.0` selection with its
  existing registry keys, ports, provenance, license, and digest mechanism.

## Proposed Generated Customer Presentation Profile

- **PRO-001**: Keep `/orders`, `/orders/:orderId`, `GET /api/orders`, and
  `GET /api/orders/:orderId` unchanged. Render only server-returned fields that
  already exist in runtime state; do not derive or persist a second status.
- **PRO-002**: On both customer order routes, show labelled `Items`, `Payment`,
  `Total`, and `Fulfilment` values. Items use the existing name and quantity;
  total formats the existing integer minor units to two decimals prefixed by
  the current `state.settings.currency` code, for example `USD 14.00` or
  `SGD 14.00`; do not infer a currency symbol or introduce a currency table.
  A syntactically valid but otherwise unknown code remains its safely escaped
  code, and a missing or malformed code shows `Currency unavailable` rather
  than assuming USD. `simulated-paid` is shown as `Paid (simulated)`.
- **PRO-003**: Map existing fulfilment states to customer copy:
  `paid` -> `Order confirmed`, `accepted` -> `Accepted`, `preparing` ->
  `Preparing`, `ready` -> `Ready`, `served` -> `Served`, and `cancelled` ->
  `Cancelled`. Unknown values fail closed to `Status unavailable`; raw internal
  values are not presented as a fallback.
- **PRO-004**: `/orders` includes an `Order detail` link for each order and a
  `Refresh status` link to `/orders`. `/orders/:orderId` includes the same
  labelled information and a `Refresh status` link to its current encoded
  order route. An empty list shows `No orders yet`.
- **PRO-005**: `Refresh status` is an ordinary same-origin anchor. Native
  navigation performs a fresh document GET and reuses current server rendering.
  Do not add timers, polling, SSE, WebSockets, background fetch, mutation,
  client cache, or automatic provider/generation work.
- **PRO-006**: Reuse the current generated customer shell, fine-dining tokens,
  route matcher, server-side renderer, HTML escaping, and fixed route prefix.
  Keep `active-order-list@1.0.0` and every other registry asset unchanged. The
  customer target may add only the minimal target-local order composition that
  the recorded missing item/link ports require; it must not create a registry
  key or alter merchant rendering.

## Contracts, Ownership, and Serialized Integration

- **CON-001**: The Restaurant V3 compiler-target owner is the contract owner
  for this generated presentation. The frozen artifacts are
  `factory.restaurant-product-bundle/v1`, runtime schema version `1`, and the
  existing order HTTP/state shapes above.
- **CON-002**: Those artifacts are frozen enough for this presentation-only
  change because no frontend/backend contract writer is required. They are not
  authority for disjoint parallel writers to change generated UI and runtime
  data independently.
- **CON-003**: Generated templates and the end-to-end smoke remain serialized
  integration work. Expected implementation paths are
  `packages/compiler/src/targets/restaurant-v3/customer-target.ts`,
  `packages/compiler/src/targets/restaurant-v3/product-target.ts`,
  `packages/compiler/test/restaurant-customer-target.test.ts`, and
  `packages/compiler/test/restaurant-product-v3-target.test.ts`. The existing
  failing browser regression is `e2e/restaurant-orders.spec.ts` and remains
  integration-owner work.
- **CON-004**: No implementation is authorized by this proposal. PM must stop
  the slice if any writer needs `packages/generated-ui`,
  `packages/screen-recipes`, `packages/graph`, runtime API/state modules,
  manifests, `pnpm-lock.yaml`, or `infra/`.

## Impact

- **IMP-001**: Catalog impact is zero. No registry entry, key, port, recipe,
  capability, source origin, license notice, or source-study record changes.
- **IMP-002**: API/data compatibility is exact. Existing routes, envelopes,
  status values, order/item fields, integer-minor-unit money, runtime schema
  version, editable three-letter runtime currency setting, Graph versions,
  hashes, and immutable Published/Compilation records retain their current
  representations.
- **IMP-003**: Dependency, license, and supply-chain impact is zero. Package
  manifests, lockfile resolutions, Docker images, and generated imports remain
  unchanged. The generated product remains dependency-free.
- **IMP-004**: Security boundaries remain unchanged. The browser receives no
  provider credential or internal token; the refresh is read-only and
  same-origin; display values retain escaping; order identifiers use the fixed
  encoded route; merchant actions retain server-side role, policy,
  idempotency, and version checks.
- **IMP-005**: Operability adds no background work or failure mode. A customer
  explicitly reloads status, and the page reflects the same state already read
  by the generated server. Provider rerun, Docker, and Compose are unnecessary
  for focused acceptance.
- **IMP-006**: The change improves current and future compilations only.
  Existing immutable Compilation artifacts are not rewritten.

## Alternatives Considered

### Keep the current generated page

- **ALT-001**: Leave raw adjacent status, payment, priority, and total values
  and rely on API evidence for fulfilment.
- **ALT-002**: Reject because it failed the observed ordinary-customer
  readability and visible-status outcome.

### Change or duplicate the shared registry asset

- **ALT-003**: Add item/navigation ports to `active-order-list`, change its
  shared renderer, or create a customer-only near-duplicate.
- **ALT-004**: Reject for this slice because it changes catalog/source-digest
  scope or creates an unnecessary asset while target-local composition can use
  the existing order data and shell.

### Add automatic live updates

- **ALT-005**: Poll the order endpoint or add SSE/WebSocket notifications.
- **ALT-006**: Reject because the measured requirement is satisfied by an
  explicit refresh; automatic updates add runtime and operability contracts
  without evidence that they are necessary.

### Add a customer-view API projection

- **ALT-007**: Introduce new formatted fields or a new endpoint.
- **ALT-008**: Reject because the existing API already carries every required
  value and server-rendered presentation can format it without contract drift.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: After acceptance and PM assignment, retain the focused browser
  RED proving the generated `/orders` page lacks the required empty state,
  readable fields, refresh, and customer-visible `ready` state. Add focused
  compiler-target RED/GREEN coverage before changing target rendering.
- **MIG-002**: Apply the target-only presentation and CSS correction to newly
  produced customer-only and dual-surface bundles. Do not rewrite existing
  Published Graphs, Compilations, generated artifacts, or runtime state files.
- **ROL-001**: Roll back future output by reverting the four compiler target and
  focused-test paths. No Graph, API, database, state, or Compose rollback runs;
  immutable prior Compilations remain inspection evidence.
- **ABT-001**: Abort on any required new package, registry asset/key/port,
  copied source, Graph/API/state field, serialization version, provider call,
  runtime update channel, security-boundary change, Compose edit, or merchant
  presentation change.
- **ABT-002**: Abort if the real generated bundle cannot show the kitchen's
  latest state after one explicit refresh, if unknown status leaks raw data, or
  if safe escaping, deterministic generation, responsive layout, accessibility,
  or exact cleanup cannot be proven.
- **ABT-003**: There are no irreversible steps. A need for broader customer
  notification semantics returns to Tech Lead and PM as a separate decision.

## Consequences

### Positive

- **POS-001**: Customers can understand what they ordered, payment state,
  amount, and current fulfilment state without reading internal codes.
- **POS-002**: One explicit refresh closes the measured stale-DOM gap using the
  existing authoritative state and dependency-free runtime.
- **POS-003**: Registry, merchant, API, Graph, provider, security, and Compose
  scopes remain unchanged and rollback is source-only.

### Negative

- **NEG-001**: Status copy and currency-code plus two-decimal display formatting
  become explicit customer-target presentation rules that focused tests must
  preserve.
- **NEG-002**: Status is user-initiated rather than automatic; a future proven
  need for live updates would require another runtime/operability decision.
- **NEG-003**: Customer order composition remains target-local because the
  current shared asset lacks the required item and link ports.

## Measurable Verification Plan

- **VER-001**: Focused compiler tests assert deterministic customer-only and
  dual-surface bundles, exact labels/copy, item quantity, currency-code display
  `USD 14.00` from `1400` minor units, the existing `SGD` setting, safe
  preservation of another valid three-letter code without symbol guessing,
  encoded detail links, empty state, unknown status refusal, and no
  merchant/generated-registry output drift.
- **VER-002**: Run
  `pnpm --filter @factory/compiler exec vitest run test/restaurant-customer-target.test.ts test/restaurant-product-v3-target.test.ts`,
  then compiler typecheck and lint.
- **VER-003**: Run
  `node node_modules/@playwright/test/cli.js test e2e/restaurant-orders.spec.ts --workers=1 --retries=0`.
  Compile the authored immutable Restaurant V3 fixture, start real
  dependency-free customer and kitchen servers on loopback against one
  temporary state file, create/pay an order, advance it to `ready`, select
  `Refresh status`, and assert `Ready` in the customer DOM. Provider calls and
  Docker/Compose use must both be zero; cleanup must remove the temporary state.
- **VER-004**: In that browser test, assert `No orders yet`, item name, payment,
  total, fulfilment, detail/refresh links, no horizontal overflow, and zero
  WCAG A/AA axe violations at 390, 768, and 1440 pixels.
- **VER-005**: Run `node scripts/regression.mjs product` after focused GREEN.
  Record revision, environment, RED/GREEN result, elapsed time, provider-call
  count, DOM status result, responsive/accessibility result, cleanup, and
  highest-impact remaining defect in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`,
  `docs/adr/adr-0018-restaurant-v3-runtime-catalog-parity.md`, and
  `docs/adr/adr-0023-v3-publish-compilation-launch-closure.md`.
- **REF-003**: `docs/superpowers/plans/2026-09-07-consumer-generation-delivery.md`
  and `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.
- **REF-004**:
  `packages/compiler/src/targets/restaurant-v3/customer-target.ts`,
  `packages/compiler/src/targets/restaurant-v3/product-target.ts`, and
  `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`.
- **REF-005**: `packages/generated-ui/src/index.ts` and
  `packages/screen-recipes/src/index.ts` (reuse inventory only; unchanged).

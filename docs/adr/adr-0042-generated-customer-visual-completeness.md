---
title: "ADR-0042: Generated Restaurant Customer Visual Completeness"
status: "Proposed"
date: "2026-09-08"
authors: "Tech Lead"
tags:
  [
    "architecture",
    "decision",
    "compiler",
    "restaurant",
    "generated-template",
    "ui",
  ]
supersedes: ""
superseded_by: ""
---

# ADR-0042: Generated Restaurant Customer Visual Completeness

## Status

**Proposed** | Accepted | Rejected | Superseded | Deprecated

This Tech Lead proposal is not implementation authority, founder acceptance,
Product Publish, repository release, or deployment authority. The founder must
accept or reject it directly or through the standing independent-review policy
in `docs/tech-governance.md`; PM then records the decision and assigns work.

## Recommendation

**Keep** the current Golden technology profile and the accepted Restaurant V3
generated contracts. Complete the existing dependency-free customer target with
a target-local page reset, brand header, type hierarchy, padded content shell,
prominent order state, grouped order facts, and native anchor navigation that
marks the current route. Use the existing Fine Dining tokens, customer shell,
routes, labels, and order data. Do not add a package, icon, asset, registry port,
client framework, network resource, or runtime channel.

## Context

- **CTX-001**: Browser diagnosis of the generated 390 px order page observed
  one stylesheet loaded as HTTP `200 text/css`, the intended `rgb(255, 250, 242)`
  surface, zero failed requests, and zero page errors. UI resources did not fail
  to load.
- **CTX-002**: The visible weakness is generated composition: the browser keeps
  its default `8px` body margin, styles cover mostly the D1.4 order fragment,
  the shell header has little hierarchy, and none of the five navigation links
  exposes `aria-current="page"` or a current-route treatment.
- **CTX-003**: Reuse inspection found the approved `mobile-product-shell`,
  Restaurant customer screen recipes, `fine-dining` experience, and native
  generated routes sufficient. The approved `bottom-tab-navigation` pattern is
  button/tab semantics with Lucide placeholders; importing it would conflict
  with the current document-anchor routes. Existing Workbench navigation is a
  separate application surface. Pinned external source studies provide domain
  references, not an admitted customer-navigation visual source.
- **CTX-004**: `src/generated/fine-dining.mjs` is emitted with provenance and
  tokens, while the document loads `/customer/styles.css`. Current target CSS
  already reaches the intended warm surface through the same token names and
  fallback values. This is a local style-completeness gap, not a CDN, package,
  stylesheet, or runtime import failure.

## Current Accepted Golden Profile

- **CUR-001**: The exact Golden runtime and dependency coordinates remain those
  in `docs/tech-governance.md` and ADR-0041: Node.js `>=22.11.0 <23`, pnpm
  `9.0.0`, TypeScript `^5.7.2` locked `5.9.3`, Next.js `^15.1.0` locked
  `15.5.22`, React/React DOM `^19.0.0` locked `19.2.8`, and the listed current
  NestJS, Prisma, BullMQ, PostgreSQL, Redis, and Docker Compose coordinates.
- **CUR-002**: The lifecycle remains mutable Draft -> immutable Published Graph
  -> immutable Compilation. Compilers never consume a mutable Draft, and prior
  Compilation artifacts are never rewritten.
- **CUR-003**: Generated Restaurant output remains
  `factory.restaurant-product-bundle/v1`, runtime schema version `1`, and a
  dependency-free Node.js bundle. The accepted Restaurant path remains
  `factory.application-graph/v3` under ADR-0010 and ADR-0023.
- **CUR-004**: The customer UI remains factory-authored
  `@factory/screen-recipes` `0.1.0`, whose selected recipes are version `1.0.0`,
  and `@factory/experience-recipes` `0.1.0` with `fine-dining` version `1.0.0`.
  Registry keys, ports, source origins, licenses, and digests are unchanged.

## Proposed Generated Customer Profile

- **PRO-001**: Preserve the existing shell and Fine Dining light/dark token
  values. Add a complete target stylesheet reset for box sizing, body margin,
  minimum page height, inherited controls, and responsive media defaults. Use
  system sans for body copy and the existing serif stack for display headings;
  no remote font or asset request is permitted.
- **PRO-002**: Give the existing shell a full-width dark brand header and a
  bounded, padded content region. Keep all current English copy, landmarks,
  routes, actions, and server-rendered data. At mobile widths, content remains
  one column with no horizontal overflow; interactive targets remain at least
  `44px` high and keep visible focus.
- **PRO-003**: Retain the labelled `Items`, `Payment`, `Total`, and `Fulfilment`
  semantics accepted by ADR-0041. Emphasize the current fulfilment value and
  group payment/total facts so the order state is the first scannable business
  result. Do not derive a second state, change money/status formatting, or add
  decoration that communicates a state absent from authoritative data.
- **PRO-004**: Render the five existing native anchors from the current
  pathname. Set `aria-current="page"` only on the matching top-level route,
  including Menu for `/menu/:itemId`, Cart for `/checkout`, and Orders for
  `/orders/:orderId`, and give that link a visible selected treatment. Keep text
  labels large and persistent; do not add icons, tab-button behavior, client
  routing, or JavaScript state.
- **PRO-005**: Both customer-only and dual-surface compilations inherit the same
  customer application/CSS output through the existing target composition.
  Merchant output and every shared generated source remain byte-identical.

## Contracts, Ownership, and Compatibility

- **CON-001**: The Restaurant V3 compiler-target owner is contract owner.
  `factory.restaurant-product-bundle/v1`, runtime schema `1`, the existing
  customer route list, order HTTP/state shapes, and ADR-0041 presentation copy
  are frozen enough for this serialized presentation correction.
- **CON-002**: Implementation is limited to
  `packages/compiler/src/targets/restaurant-v3/customer-target.ts` and
  `packages/compiler/test/restaurant-customer-target.test.ts`. Root owns the
  serialized integration test `e2e/restaurant-orders.spec.ts` and PM documents.
  No disjoint frontend/backend writer wave is warranted; generated templates
  and end-to-end smoke remain serialized integration work.
- **CON-003**: API and data compatibility is exact: no Graph, API, route,
  request/response, order/state, identifier, serialization, persistence,
  permission, or immutable artifact representation changes.
- **CON-004**: Catalog impact is zero. `packages/ui-primitives`,
  `packages/ui-patterns`, `packages/generated-ui`, `packages/screen-recipes`,
  `packages/experience-recipes`, `packages/product-recipes`, Workbench assets,
  manifests, lockfile, licenses, and source-study records stay unchanged.
- **CON-005**: Expected changed generated files for newly compiled bundles are
  `src/customer/app.mjs`, `src/customer/styles.css`, and `src/server.mjs` only
  because the server embeds the exact stylesheet response literal. Server
  routing and behavior remain unchanged. In particular,
  `src/generated/customer-restaurant-ui.mjs`,
  `src/generated/fine-dining.mjs`, merchant files, runtime files, manifests,
  and their source digests must remain unchanged.

## Security and Operability Effects

- **SEC-001**: Existing escaping, encoded order routes, same-origin navigation,
  authorization, tenant, role, policy, concurrency, and idempotency controls are
  unchanged. `aria-current` is derived only from the already matched pathname.
- **SEC-002**: No credential, raw provider material, user-authored executable
  source, copied third-party code, external font/icon request, or new browser
  trust is introduced.
- **OPS-001**: There is no added polling, SSE, WebSocket, background fetch,
  client cache, service worker, provider call, process, port, Compose service,
  deployment, or cleanup responsibility. Existing explicit status refresh
  remains the sole freshness action.

## Alternatives Considered

- **ALT-001 — Keep the D1.4 styling**: rejected because resource delivery is
  healthy while the actual mobile result still fails the ordinary-user visual
  quality target.
- **ALT-002 — Import the approved bottom-tab pattern**: rejected because its
  button/tab interaction is incompatible with the current native document
  routes and would add icon semantics without improving the business journey.
- **ALT-003 — Add a UI framework, copied component set, remote font, or icons**:
  rejected because the scoped hierarchy and navigation gaps require none of
  them and each would expand dependency, provenance, license, and failure scope.
- **ALT-004 — Change a shared registry asset or Fine Dining recipe**: rejected
  because it would alter unrelated consumers and source digests. Target-local
  composition can satisfy this customer-only outcome.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: After decision acceptance and PM assignment, retain the focused
  failing checks for missing current navigation and incomplete reset/hierarchy,
  then change the two compiler paths. Root aligns the existing real generated
  browser acceptance and records evidence in the active ledger.
- **MIG-002**: Only new compilations receive the corrected customer output.
  Existing Published Graphs, Compilations, generated artifacts, runtime state,
  and previews are not mutated.
- **ROL-001**: Revert the two compiler paths and the corresponding integration
  assertions to restore future output. No database, Graph, catalog, lockfile,
  registry, runtime, Compose, or cloud rollback exists.
- **ABT-001**: Abort if implementation needs a new dependency, icon/font/image,
  registry key/port, copied source, shared recipe/source edit, public contract,
  merchant change, runtime transport, security-boundary change, or mutable
  Draft compilation.
- **ABT-002**: Abort acceptance if shared generated-source digests drift, more
  than one navigation item is current, nested Menu/Order routes select the wrong
  item, content overflows at target widths, focus/contrast regresses, or actual
  generated pages show a failed resource or page error.
- **ABT-003**: There are no irreversible steps and no release or deployment
  authority in this proposal.

## Consequences

### Positive

- **POS-001**: The generated mobile app reads as a deliberate Restaurant product
  while preserving the existing business and runtime behavior.
- **POS-002**: Current location and order status become immediately scannable
  with semantic, keyboard-accessible native navigation.
- **POS-003**: The change stays reversible and dependency-free, with no catalog,
  supply-chain, provider, API, runtime, or operability expansion.

### Negative

- **NEG-001**: The customer target owns more layout and typographic CSS that
  must be protected across customer-only and dual-surface generation.
- **NEG-002**: Native text navigation remains intentionally icon-free; a future
  cross-product navigation system requires a separate proven contract.
- **NEG-003**: Existing immutable compilations retain their earlier visual
  output and are not silently restyled.

## Measurable Verification Plan

- **VER-001**: Focused compiler tests first fail, then pass for deterministic
  generation, the bounded target stylesheet contract, exactly one
  `aria-current="page"`, and correct Home/Menu/Cart/Orders/Profile selection,
  including nested Menu and Order routes plus Checkout mapping to Cart. Browser
  computed-style evidence, rather than an exact unit-test mirror of each CSS
  declaration, verifies the visual geometry below.
- **VER-002**: The same tests compare generated file maps and prove that only
  `src/customer/app.mjs`, `src/customer/styles.css`, and the embedded stylesheet
  literal in `src/server.mjs` differ. Server behavior, shared generated sources,
  experience source/digest, API/state/seed runtime modules, merchant output,
  manifests, and deterministic repeat generation remain unchanged.
- **VER-003**: Run
  `pnpm --filter @factory/compiler exec vitest run test/restaurant-customer-target.test.ts`,
  compiler typecheck, lint, and build; require exit zero and exact counts in the
  active ledger.
- **VER-004**: Run
  `node node_modules/@playwright/test/cli.js test e2e/restaurant-orders.spec.ts --workers=1 --retries=0`.
  Require HTTP 200 stylesheet evidence, zero failed requests/page errors, one
  current navigation link per page, keyboard-visible focus, order status after
  explicit refresh, zero page mutations during read/refresh, no WCAG A/AA axe
  violations, and no horizontal overflow at 390, 768, and 1440 px.
- **VER-005**: Inspect fresh 390 px and 1440 px screenshots, then run
  `node scripts/regression.mjs product`. PM records revision, test/file counts,
  duration, visual result, resource result, provider/Docker use, cleanup, review,
  and the next product-effort gap in
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, and
  `docs/threat-model.md`.
- **REF-002**: `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`
  and `docs/adr/adr-0041-generated-restaurant-order-readability.md`.
- **REF-003**: `packages/generated-ui/src/index.ts`,
  `packages/ui-patterns/src/index.ts`, `packages/screen-recipes/src/index.ts`,
  and `packages/experience-recipes/src/index.ts` (reuse inventory only).
- **REF-004**: `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
  and `e2e/restaurant-orders.spec.ts`.
- **REF-005**:
  `docs/superpowers/ledgers/2026-09-07-consumer-generation-delivery.md`.

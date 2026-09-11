---
title: "ADR-0059: Generated Approval Decision History"
status: "Proposed"
date: "2026-09-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "approval", "audit"]
supersedes: ""
superseded_by: ""
---

# ADR-0059: Generated Approval Decision History

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the accepted Golden profile and add one compiler-private `approval-decision-history@1.0.0` interaction to future structural `approval-v1` applications. A role already declared with read/audit authority on the approval entity can open a compact Decision history and see persisted decisions related to readable business records. This proposal is not accepted and authorizes no implementation, Product Publish, Compilation, runtime, provider, Git, external resource, deployment, or release. Independent standing acceptance and a PM ledger record are required first.

## Context and verified reuse

- **CTX-001**: Generated approval applications persist audit evidence and expose it through `GET /api/audit`, but the browser never requests or displays it. Current E2E checks the API out of band, so an ordinary auditor cannot understand completed decisions in the application.
- **CUR-API-001**: The generated typed `AuditEvent` surface is `{ actor: string; action: string; entity: string; recordId: string; at: string }`. Prisma returns events ordered by `at` ascending; its serialized object can also carry an internal storage `id`, which the browser must ignore. `ApplicationRuntime.auditLog(role)` and the existing controller return 403 unless the selected server-resolved role has a declared `audit` action. Canonical Expense grants `finance` read/audit on `expense`; Purchase grants `procurement` read/audit on `purchase-request`.
- **CUR-API-002**: Approval transitions append the actual `submit`, `approve`, or `reject` event and the existing audit capability also appends internal action `record`. Decision history must select only the unique structural approval flow's `approve` and `reject` events for its entity; it must not present create, submit, record, capability, or unrelated-entity events as decisions.
- **REU-001**: Reuse in required order: existing `GET /api/audit` and `GET /api/:entity`; policy `can`; `requestHeaders`; `SafeUiError`/safe response messages; `fieldLabel`, `formatValue`, summary selection and Details; ADR-0055 scope-generation/race guards; ADR-0058 workspace/refresh styling; native `details`; exact registry keys `button`, `card`, `badge`, `loading-state`, `empty-state`, `error-state`; and existing `receipt-text`, `refresh-cw`, `circle-check`, `circle-x` icons. Registries, recipes, Workbench assets, generated templates, and pinned studies contain no role-safe record-related decision-history interaction. Add one factory-authored private module, not a dependency or public asset.

## Current and proposed Golden profiles

- **CUR-001**: The accepted profile remains Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`, Puck `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, compiler Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, `lucide-static` exactly `0.468.0`, Docker Compose, and implemented `factory.application-graph/v1`. Manifests, lockfile, and floating-major images remain authoritative.
- **CUR-002**: The currently accepted approval presentation is ADR-0056 `approval-workspace-presentation@1.0.0`. Frozen ADR-0058 proposes `1.1.0`; it is a required predecessor but is not silently treated as accepted by this proposal. Neither version displays audit history.
- **PRO-001**: After ADR-0058 acceptance and delivery, preserve its exact `approval-v1` behavior/styles and compose private `approval-decision-history@1.0.0`, ownership `factory-authored`, license `UNLICENSED`, with CSS sentinel `--approval-decision-history-version: 1`. Advance the private workspace descriptor to `approval-workspace-presentation@1.2.0` and sentinel `3` solely for the new slot. Keep every accepted package/version, Graph/API/data identifier, server route/response/error, persistence schema, capability, definition, family, topology, and lifecycle unchanged. Non-approval emitted bytes and approval server/database bytes remain exact.

## Frozen interaction and data contract

- **HIS-001 — Eligibility and placement**: From the same unique structural approval flow used by `approval-v1`, identify its entity and exact decision events `approve` and `reject`. Render one closed native `<details className='approval-decision-history'>` between workspace navigation and page content only when `can(role, entity, 'read')` and `can(role, entity, 'audit')` are both true. Summary text is `Decision history`; no new Graph page/navigation item or permission is added. Unauthorized roles render no panel and issue no audit request.
- **HIS-002 — Fetch and validation**: On first open and explicit Retry/Refresh, request existing `/api/audit` and `/api/${entity.key}` with existing role/session headers. Require arrays; accept an audit item only when all five CUR-API-001 fields are nonempty strings and `at` is a valid date, and a record only when it is a non-array object with nonempty string `id`. Any response failure or malformed item/payload produces only `Decision history is unavailable. Try again.` and a `Retry` button; never surface response bodies, stack details, or untrusted HTML.
- **HIS-003 — Decision selection**: Preserve server order and display only validated events whose entity equals the approval entity and whose action equals one of the exact approve/reject transitions. Render `No decisions yet.` when that filtered set is empty, including when create/submit/internal record events exist. Do not deduplicate distinct persisted approve/reject events or infer an outcome from current record status.
- **HIS-004 — Readable rows**: Each compact neutral row shows: exact humanized action with `circle-check` or `circle-x`; the recorded actor under label `Demo role`; and actual `at` through the existing safe datetime `<time dateTime>` formatter. Match `recordId` to the fetched readable record. When exactly one declared field has key `item` and string type and its value is nonempty, use that value as primary identity; otherwise use the first two populated existing summary fields with humanized labels and safe formatted values. Never invent currency, locale, user name, or identity.
- **HIS-005 — Missing identity and Details**: When a record cannot be matched or has no usable business summary, primary text is the exact Graph entity label plus `decision`; show `Record ID: <recordId>` only as secondary text. For matched records, keep ID and remaining declared values in the existing collapsed `Details` pattern. Never make an opaque ID the heading and never dump raw JSON.
- **HIS-006 — Async and role safety**: State phases are closed/idle, loading, success/empty, and error. One pending request per role/entity scope; Retry/Refresh cannot duplicate it. A monotonically increasing scope generation covers both audit and record requests. On role or approval-entity change, close immediately, clear events/records/error, invalidate pending responses, and render data only when its loaded scope equals the current scope. A late privileged response cannot repopulate another role's view. Closing within the same authorized scope may retain validated results until explicit Refresh.
- **HIS-007 — Presentation preservation**: Use ADR-0058 Graph-token surfaces, icon-only Refresh, focus, badge semantics, and 44 px controls. History rows are compact neutral rows, not tinted cards. A closed panel must not change the accepted 390 x 900 record/action bounds. Preserve all Graph copy and existing create/submit/approve/reject, finder, denial, loading/error, navigation, and responsive behavior except the declared new history panel.

## Compatibility, security, catalog, and operability

- **API-001**: This is a read-only browser consumer of two existing endpoints and exact existing fields. No Graph, Blueprint, API, schema, serialization, database, route, response, status, permission, capability, adapter, or identity contract changes. Historic Published Graphs and Compilations remain immutable.
- **SEC-001**: UI visibility is convenience, not authority; the server's existing audit/read checks remain decisive. Audit `actor` is a recorded selectable local demo role, never a verified person. The current audit endpoint is application-wide for an audit-authorized role; the panel conservatively filters to the structural approval entity and decision actions without claiming tenant, retention, legal-audit, or real-identity guarantees.
- **CAT-001**: Definition/family/public-catalog counts remain three/two/unchanged. The private descriptor records its reuse list, factory provenance and `UNLICENSED` license; it is not exported or registered publicly. No package, icon, dependency, lockfile, notice, supply-chain, provider, network, credential, Docker, or Compose change occurs.
- **OPS-001**: Existing persistence/reload, Preview health, cleanup, and rollback apply. Synthetic evidence retains no credentials or raw prompts/responses. The current audit event has no reason or record-value snapshot, so rows relate a decision to the current readable record identity and cannot claim decision-time field values. Large-history pagination remains deferred. Slice A is a useful visible outcome only; correction/resubmission (B) and uncertain-write recovery (C) require separate server/Graph contract decisions and cannot be claimed from history alone.

## Consequences and alternatives

- **POS-001**: Finance and Procurement can verify both real decisions after reload without leaving the generated application or reading API JSON.
- **NEG-001**: The panel joins two existing reads client-side; a record missing from the readable collection can provide only entity label and secondary record ID.
- **NEG-002**: Existing evidence identifies event, role, record ID and time, but cannot explain a decision or reconstruct the record as it existed when decided.
- **ALT-001 — Dump `/api/audit` JSON**: Rejected because internal record events, opaque IDs, and raw payloads do not communicate a business decision.
- **ALT-002 — Add an audit API, Graph page, or permission**: Rejected because current authority and fields are sufficient for this bounded surface; changing them would expand the contract/security slice.
- **ALT-003 — Put history on every record for every reader**: Rejected because requester/reviewer roles lack audit authority and client placement cannot grant it.
- **ALT-004 — Inline another large emitter string in `index.ts`**: Rejected because the stateful role-safe interaction has a distinct reusable contract. A small private module keeps `index.ts` as orchestration and avoids copying workspace or record presentation.

## Migration, ownership, rollback, and aborts

- **MIG-001**: After ADR-0058 delivery and recorded ADR-0059 acceptance, one serialized compiler writer owns exactly new `packages/compiler/src/approval-decision-history.ts`, existing `packages/compiler/src/approval-workspace-presentation.ts`, `packages/compiler/src/index.ts`, and `packages/compiler/test/composition-page-runtime.test.ts`. Root owns exact E2E/evidence paths `e2e/approval-presentation.ts`, `e2e/consumer-approval.spec.ts`, `e2e/consumer-purchase-request.spec.ts`, `packages/compiler/DESIGN.md`, and new `docs/acceptance/approval-decision-history.md`, plus ledger/status/Git. No other source path or writer is authorized.
- **CON-001**: Root/PM owns the frozen private panel contract. No frontend/backend request/response artifact changes, so disjoint backend work is unnecessary; generated-template integration and E2E remain serialized. B3 remains held and later rebases on the accepted post-ADR-0059 non-Task baseline.
- **ROL-001**: Remove the private module/slot/styles/tests and return the workspace descriptor/sentinel to accepted ADR-0058 values. No data migration or irreversible step exists; existing audit data and historic immutable artifacts remain unchanged.
- **ABT-001**: Abort on new permission/endpoint/schema/dependency/icon, audit request by an unauthorized role, displayed internal/non-decision event, raw JSON, opaque ID heading, invented identity/currency/locale, stale cross-role data, unsafe server error, ADR-0055/0058 regression, non-approval or approval-server byte drift, B/C behavior, or definition/family count change.

## Measurable verification

- **VER-001**: Start with focused failing tests. Run `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts`, `typecheck`, `build`, and `lint`. Prove descriptor/provenance/reuse/sentinel, strict eligibility, exact endpoint/headers, decision filtering, chronological output, readable Purchase/Expense identity fallback, safe time/actor labels, no raw JSON, empty/error/retry/refresh, request deduplication, scope invalidation, late-response rejection, unauthorized no-fetch/no-panel, ADR-0058 preservation, and byte-exact non-approval plus approval API/database files.
- **VER-002**: Extend existing provider-free Expense and Purchase lanes rather than add a duplicate smoke path. Before decisions, the declared auditor opens an empty panel. After two UI decisions and page reload, the auditor opens it and sees both matched business records, Approve/Reject, `Demo role: Manager`, and actual `<time>` values; requester and reviewer see no panel and direct audit requests remain 403. Hold audit/record responses, switch role, release them, and prove no stale history; force one safe error then Retry successfully.
- **VER-003**: At 390/768/1440 verify closed/open history, keyboard disclosure/retry/refresh, 44 px targets, no overflow, zero axe violations, compact neutral rows, visible icons, loaded CSS, exact ADR-0058 brand/navigation/action/badge styles, and unchanged closed-panel first-viewport bounds. One independent ordinary-iteration review covers code, access, actual images, both business outcomes and cleanup; add no per-component QA/release/audit gate.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`, `docs/delivery-policy.md`, ADR-0055, ADR-0056, ADR-0057, ADR-0058, `docs/superpowers/plans/2026-09-12-approval-decision-closure.md`, and the active consumer-delivery ledger.

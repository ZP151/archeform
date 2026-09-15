---
title: "ADR-0056: Generated Approval Workspace Presentation"
status: "Proposed"
date: "2026-09-11"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "generated-ui", "responsive"]
supersedes: ""
superseded_by: ""
---

# ADR-0056: Generated Approval Workspace Presentation

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the accepted Golden profile and replace only future `approval-v1` presentation with a private, factory-authored `approval-workspace-presentation@1.0.0` recipe. It emits a responsive workspace, compact business rows, and truthful Graph-derived copy while preserving ADR-0055 filtering and all server authority. This proposal authorizes no implementation, Product Publish, Compilation, runtime, provider call, Git action, deployment, release, or external resource. Independent standing acceptance and a PM ledger record are required first.

## Context and reuse decision

- **CTX-001**: The accepted B2 UI is functional but still resembles a sparse demo: horizontal navigation and large tinted cards consume space, especially at 390 px. Passing overflow and axe checks did not satisfy the founder's visual acceptance.
- **REU-001**: Reuse exact private assets in order: `@factory/ui-primitives@0.1.0` keys `button`, `input`, `label`, `select`, `card`, `badge`; `@factory/ui-patterns@0.1.0` keys `compact-sidebar-navigation`, `form-field`, `loading-state`, `empty-state`, `error-state`, `confirmation-state`, `denial-state`; existing generated `approval-v1` shell, filters, typed form, record `details`, and seven Lucide icons.
- **REU-002**: `merchant-workspace-shell`, `active-order-list`, Restaurant screen recipes, and Workbench editor/source filters have merchant or developer bindings and cannot be copied into consumer approvals. The pinned React Admin study would add another UI/data authority. No public registry asset or dependency is justified.
- **GAP-001**: No approved asset combines structural approval policy, exact Graph navigation labels, responsive sidebar/disclosure, B2 filter state, and mutation feedback. Add one private compiler recipe descriptor with key `approval-workspace-presentation`, version `1.0.0`, ownership `factory-authored`, license `UNLICENSED`, the reuse keys above, and the existing icon allowlist. It is not package-exported or added to a public catalog.

## Current and proposed Golden profiles

- **CUR-001**: The accepted profile remains Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`, Puck `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, compiler Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, `lucide-static` exactly `0.468.0`, Docker Compose, and implemented `factory.application-graph/v1`. Manifests, lockfile, and floating-major image tags retain their governed meanings.
- **CUR-002**: Current `approval-v1` uses a top header, horizontal route links, large two-column tinted cards at desktop, one-column cards on mobile, typed forms, and ADR-0055 client filtering. Draft -> immutable Published Graph -> immutable Compilation remains unchanged.
- **PRO-001**: The proposed profile has exactly the same versions, packages, assets, identifiers, services, topology, and lifecycle. Only newly compiled `approval-v1` page runtime markup/CSS and the new private recipe source differ; legacy/non-approval and Restaurant emitted bytes remain exact.

## Frozen presentation contract

- **PRS-001 — Shell**: At widths `>=900px`, render one workspace grid with a tinted token-derived sidebar and main content. Sidebar shows exact Graph application name, truthful `Demo role` native select, and every `projection.navigation` label unchanged as a link with current-page state. Main shows the exact active projected page title and blocks.
- **PRS-002 — Mobile navigation**: Below `900px`, hide the desktop sidebar navigation and show one native `<details>` disclosure closed by default. Its summary identifies navigation and the current page; one activation exposes every full, wrapping Graph navigation label as a link. Do not abbreviate, replace, or horizontally scroll labels. Keep the role control visible and labelled.
- **PRS-003 — Rows**: Render approval collections as one neutral surface with compact separated business rows, not independently tinted oversized cards. Status semantics affect only status icon/badge/accent, never the full row background. At 390 px, target two to three ordinary populated rows in the first viewport and the first permitted action at or above 650 CSS px for the accepted three-record fixture.
- **PRS-004 — Truthful summaries**: Preserve existing structural summary selection, exact Graph entity/page names, humanized declared field keys, declared values, workflow states, actions, and typed forms. `item` may remain the title only under the accepted unique exact-key/string rule. Unpromoted values and ID remain in collapsed Details. Never infer copy from definition identity, model text, or undeclared response data.
- **PRS-005 — Formatting**: Preserve safe date/datetime and boolean formatting. Numeric `amount` remains a labelled numeric value. Because V1 declares no currency code or locale for it, emit no `$`, `¥`, `€`, currency word, conversion, or locale-specific monetary formatting. Object values remain escaped React text, never HTML.
- **PRS-006 — Existing behavior**: Preserve ADR-0055 trimmed declared-field search, Graph-state filter, count, clear/no-match/no-data distinctions, role/entity/block reset, visible controls during loading/error, list-level mutation result, request race guards, pending deduplication, safe errors, transition validity, 403 denials, refresh, and persistence. The compact toolbar may rearrange controls but cannot rename or remove their accessible labels.
- **PRS-007 — Assets and CSS**: Use only `house`, `receipt-text`, `user-round`, `refresh-cw`, `clock`, `circle-check`, and `circle-x`; keep embedded sanitized SVG and existing notice behavior. All colour, spacing, type, radius, and elevation come from resolved Graph design tokens. Add the private recipe key/version as a deterministic markup/CSS sentinel so tests can prove the intended stylesheet loaded.

## Compatibility, security, catalog, and operability

- **API-001**: No Graph, API, schema, route, response, error, persistence, audit, queue, hash, adapter, capability, definition, workflow, authentication, tenant, or security-boundary change. Browser presentation grants no authority; server role/state checks remain decisive. Historic immutable artifacts are untouched.
- **CAT-001**: Public catalog counts stay unchanged. The private descriptor has factory-authored provenance, no copied source, package export, runtime registration, model selection, dependency, lockfile, notice, network, storage, credential, Docker, Compose, provider, or supply-chain effect.
- **OPS-001**: Operability and rollback are source-only. Actual acceptance uses synthetic data and must not persist credentials or raw prompts/responses. Full production identity, tenant isolation, hosting, and large-list pagination remain deferred and explicit.

## Consequences and alternatives

- **POS-001**: One reusable workspace makes current approval products denser, easier to navigate, and visibly closer to a real application without changing business behavior.
- **NEG-001**: A second private recipe module adds an emitter boundary and responsive visual snapshots to maintain; it remains limited to structural approvals.
- **ALT-001 — Restyle current cards only**: Rejected because it leaves the mobile navigation and workspace hierarchy unchanged.
- **ALT-002 — Copy Restaurant/Workbench assets**: Rejected because their data, route, and user semantics differ.
- **ALT-003 — Add a UI framework or React Admin**: Rejected because the required layout uses native elements and existing tokens; another dependency and authority add no needed function.
- **ALT-004 — Add a public recipe now**: Rejected because only the compiler page-runtime consumes this contract. Extract publicly after another runtime path proves stable ports.

## Migration, ownership, rollback, and aborts

- **MIG-001**: After recorded acceptance, one serialized compiler writer owns exactly new `packages/compiler/src/approval-workspace-presentation.ts`, existing `packages/compiler/src/index.ts`, and `packages/compiler/test/composition-page-runtime.test.ts`. The new module exports the frozen descriptor plus deterministic runtime-markup and CSS fragments; `index.ts` remains Graph/profile orchestration. No package-root export.
- **CON-001**: Root/PM owns this frozen private contract. No frontend/backend API artifact changes, so disjoint backend work is unnecessary. Root alone owns the design, E2E, evidence, plan/status/ledger, and Git paths. Generated template integration and end-to-end smoke remain serialized.
- **ROL-001**: Revert those three compiler paths and root-owned evidence changes; later Compilations return to ADR-0055 presentation. No data migration or irreversible step exists; prior Compilations remain immutable.
- **ABT-001**: Abort on package/public-registry/Graph/API/security/topology change, copied source, new icon, definition-specific branch, non-approval byte drift, hidden/truncated Graph navigation label, invented currency, lost B2 behavior, permission/state regression, unavailable first action below 650 px, fewer than two ordinary rows visible at 390 px, CSS/icon load failure, overflow, or accessibility regression.

## Measurable verification

- **VER-001**: Start with focused failing tests, then run `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts`, `typecheck`, `build`, and `lint`. Prove recipe key/version/provenance/reuse manifest, structural selection, exact Graph labels/values, currency-neutral formatting, all seven icons, B2 preservation, and byte-exact legacy/Restaurant output.
- **VER-002**: Build generated Expense and Purchase TypeScript. Extend the existing provider-free Purchase lane rather than create a parallel smoke path; retain create/submit/filter/approve/reject/reload/audit/403/state recovery.
- **VER-003**: Inspect actual 390/768/1440 screenshots. At desktop verify sidebar/content grid; below 900 verify disclosure closed then one-click full labels; at 390 verify two to three ordinary rows in the first viewport, first permitted action `y <= 650`, 44 px targets, no overflow, zero axe violations, and neutral row backgrounds with accent confined to status.
- **VER-004**: In the real generated Preview assert the stylesheet request succeeds, the recipe sentinel has non-default computed grid/spacing styles, and every displayed `.approval-icon svg` has nonzero bounds and rendered path geometry. Record screenshot/source hashes, exact Compilation/Preview identity, cleanup, limitations, and one independent implementation/evidence review in the active consumer ledger and the root-owned acceptance record.

## References

- **REF-001**: `docs/tech-governance.md`, `docs/threat-model.md`, ADR-0043, ADR-0053, ADR-0055.
- **REF-002**: `docs/research/2026-09-10-reusable-assembly-supply.md` and the current active consumer-delivery ledger.

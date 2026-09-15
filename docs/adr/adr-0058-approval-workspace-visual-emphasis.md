---
title: "ADR-0058: Approval Workspace Visual Emphasis"
status: "Proposed"
date: "2026-09-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "decision", "compiler", "generated-ui", "visual"]
supersedes: ""
superseded_by: ""
---

# ADR-0058: Approval Workspace Visual Emphasis

## Status and recommendation

**Proposed** | Accepted | Rejected | Superseded | Deprecated

Recommendation: **keep** the accepted Golden profile and refine only future structural `approval-v1` output through private `approval-workspace-presentation@1.1.0`. Strengthen Graph-token brand, selected-navigation, action, and status-badge emphasis; make approval refresh controls icon-only while retaining an exact accessible name. This proposal is not accepted and authorizes no source implementation, Product Publish, Compilation, runtime, provider, Git, external resource, deployment, or release. Independent standing acceptance and a PM ledger record are required first.

## Context and reuse decision

- **CTX-001**: The accepted ADR-0056 workspace fixed the sparse layout, mobile navigation, row density, CSS/icon delivery, and B2 record interaction. Founder feedback now identifies insufficient visual emphasis and redundant visible `Refresh` text. This is a presentation refinement, not a missing component or asset failure.
- **REU-001**: Reuse the existing private workspace shell, Graph design tokens, `@factory/ui-primitives@0.1.0` button/card/badge ports, compact-navigation pattern, and the accepted Lucide allowlist: `house`, `receipt-text`, `user-round`, `refresh-cw`, `clock`, `circle-check`, `circle-x`. No registry, recipe, Workbench, generated-project, or pinned source-study candidate supplies a smaller distinct solution; no copied source, dependency, icon, public key, or new asset is justified.
- **CTX-002**: ADR-0057 is accepted as a separate future Task experiment, but no B3 production source was written. Its later non-Task byte baseline must start from accepted ADR-0058 output. It cannot restore the current approval bytes or rewrite historic immutable Compilations.

## Current and proposed Golden profiles

- **CUR-001**: The accepted profile remains Node `>=22.11.0 <23`, pnpm `9.0.0`, TypeScript `^5.7.2` resolved `5.9.3`, Next `^15.1.0` resolved `15.5.22`, React/DOM `^19.0.0` resolved `19.2.8`, Puck `0.22.3`, XYFlow `12.11.2`, NestJS `10.4.22`, Prisma `6.19.3`, BullMQ `5.81.2`, ioredis `5.11.1`, PostgreSQL `16-alpine`, Redis `7-alpine`, compiler Casbin `5.51.1`, XState `5.32.5`, Zod `3.25.76`, `lucide-static` exactly `0.468.0`, Docker Compose, and implemented `factory.application-graph/v1`. Manifests, lockfile, and floating-major image tags retain their governed meanings.
- **CUR-002**: Private `approval-workspace-presentation@1.0.0` uses the seven local icons, a quiet 8% accent-mixed sidebar, surface-backed selected navigation, token-backed primary creation, plain enabled workflow buttons, semantic badges mixed at 8% positive, 12% pending, and 8% negative, and approval refresh buttons containing the refresh icon plus visible `Refresh` text.
- **PRO-001**: The proposed profile keeps every accepted package/version, public identifier, service, Graph/API/data contract, route, persistence behavior, compiler target, topology, and lifecycle. It changes only new `approval-v1` markup/CSS and private descriptor version to `1.1.0`; update its CSS sentinel from `--approval-workspace-version: 1` to `2`. Legacy, Restaurant, and other non-approval emitted bytes remain exact.

## Frozen presentation refinement

- **VIS-001 — Brand region**: At desktop, the full existing `.approval-workspace-sidebar`; below 900 px, its existing compact mobile application bar uses `background: var(--factory-accent)` and `color: var(--factory-accent-text)`. Application name, subtitle, receipt mark, demo-role label, and ordinary desktop navigation inherit that foreground; the role select retains Graph surface/text. Keep the exact current grid, height, padding, spacing, radius, and responsive geometry. Canvas, popup, cards, and record rows remain neutral Graph surfaces.
- **VIS-002 — Navigation and actions**: On the accent desktop sidebar, ordinary links use transparent background/border and `var(--factory-accent-text)`; their hover and `:focus-visible` states use `var(--factory-surface)` background/border with `var(--factory-accent)` foreground. The desktop `aria-current` link uses that same surface/accent pair, never accent-text on the light surface. The mobile popup remains `var(--factory-surface)` with ordinary, hover, and `:focus-visible` links using the surface/text pair plus the existing focus outline; its current link uses accent background/border plus accent-text. Preserve full Graph labels, wrapping, and 44 px targets. Exact primary creation controls and enabled record workflow buttons use accent background/border plus accent-text. Secondary controls, filters, Details, disabled controls, and destructive semantics retain their current roles; no inferred event meaning is added.
- **VIS-003 — Status badges**: Keep status color confined to badges/icons. Positive, pending, and negative badges use their existing Graph success, warning, and danger token respectively for the border and icon; each background becomes exactly an 18% mix of that semantic token with `var(--factory-surface)`, while text remains `var(--factory-text)`. Neutral remains surface/border/text. Rows remain neutral and compact.
- **VIS-004 — Refresh**: Every `approval-v1` refresh control becomes `<button className='approval-refresh' aria-label='Refresh' title='Refresh' ...><ApprovalIcon name='refresh-cw' /></button>` with no visible text node. Preserve its existing click/error path, loading disablement where already present, pending/deduplication behavior, focus visibility, disabled state, and 44 by 44 px target. Do not change non-approval refresh markup.
- **VIS-005 — Copy and density**: Preserve every Graph-derived application, page, entity, field, state, navigation, form, record, action, role, count, empty/error/result, and mutation string exactly. The only visible-copy removal is the factory literal `Refresh`, retained as the exact `aria-label` and `title`. Preserve ADR-0055 behavior, ADR-0056 responsive layout, at least two ordinary record summaries and the first permitted action ending at `y <= 650` at 390 x 900, and the prohibition on independently tinted oversized record cards.

## Compatibility, security, catalog, and operability

- **API-001**: No Graph, Blueprint, API, schema, serialization, capability, definition, workflow, policy, database, response/error, or identity contract changes. Browser styling grants no authority; server role/state enforcement, immutable Published Graph and immutable Compilation semantics remain decisive. Historic artifacts remain untouched.
- **CAT-001**: Definition/family/public-catalog counts remain exactly three/two/unchanged. `approval-workspace-presentation` retains factory-authored `UNLICENSED` provenance and its existing reuse/icon manifests; only its private version and sentinel advance. No license, notice, dependency, lockfile, supply-chain, provider, network, storage, credential, Docker, or Compose change occurs.
- **OPS-001**: Generated Preview serving, CSS loading, health, cleanup, and rollback procedures remain unchanged. Evidence uses synthetic data and retains no credentials or raw model prompts/responses. Business capability gaps reported after the presentation review require a separate product/contract decision.

## Consequences and alternatives

- **POS-001**: Existing approval applications gain clearer identity, current location, primary action, and status recognition without sacrificing density or requiring users to read a refresh label.
- **NEG-001**: Icon-only refresh depends on its tooltip/accessibility metadata and familiar symbol; focused keyboard and accessible-name evidence becomes required.
- **ALT-001 — Add a component or design library**: Rejected because the accepted native ports, tokens, and local icon already implement the requested change.
- **ALT-002 — Tint rows, cards, or canvas**: Rejected because repeated business-content tint weakens scan density and recreates the founder-rejected card treatment. The requested single high-contrast sidebar/mobile-app-bar brand region remains allowed by VIS-001.
- **ALT-003 — Hardcode a stronger palette**: Rejected because Graph theme tokens are the product authority and must survive custom themes/dark mode.
- **ALT-004 — Fold Task/B3 into this repair**: Rejected because Task is a separate business and contract experiment; no B3 production source exists to preserve or merge.

## Migration, ownership, rollback, and aborts

- **MIG-001**: After recorded acceptance, root is the sole writer for exact production paths `packages/compiler/src/approval-workspace-presentation.ts`, `packages/compiler/src/index.ts`, and `packages/compiler/test/composition-page-runtime.test.ts`; exact acceptance paths are `e2e/approval-presentation.ts`, `e2e/consumer-approval.spec.ts`, `e2e/consumer-purchase-request.spec.ts`, `packages/compiler/DESIGN.md`, and `docs/acceptance/approval-workspace-repair.md`. No other writer or path is authorized. Generated-template integration and E2E remain serialized.
- **CON-001**: Root/PM owns this frozen private presentation contract. No frontend/backend request, response, event, error, actor, authentication, or versioned data artifact changes, so disjoint API work is unnecessary. After this acceptance, the ADR-0057 implementation must rebase its non-Task byte fixture on the new accepted approval baseline before any B3 source write.
- **ROL-001**: Revert the exact manifest to `approval-workspace-presentation@1.0.0` source/tests/evidence. Later Compilations return to the current appearance; historic Compilations remain immutable. There is no data migration or irreversible step.
- **ABT-001**: Abort on a new dependency/icon/public asset, hardcoded color, non-approval byte drift, Graph-copy change beyond visible Refresh removal, changed action/state/role behavior, weakened disable/pending/denial handling, row/card tint, first-viewport regression, hidden/truncated navigation, CSS/icon failure, overflow, accessibility regression, or B3/business-contract change.

## Measurable verification

- **VER-001**: Start with focused failing compiler tests, then run `pnpm --filter @factory/compiler test -- composition-page-runtime.test.ts`, `typecheck`, `build`, and `lint`. Prove descriptor `1.1.0`, sentinel `2`, existing seven-icon/reuse manifest, exact icon-only Refresh markup/name/title and preserved disable/click paths, token-only brand/selected/action/badge rules, neutral rows, all Graph copy, and byte-exact non-approval fixtures.
- **VER-002**: Extend the shared browser helper and existing Expense/Purchase specs. In actual generated Preview at 390/768/1440, assert Refresh has accessible name and title, no visible text, nonzero SVG geometry, 44 px target, keyboard focus and retained disabled/pending behavior; compare computed desktop-sidebar/mobile-app-bar, ordinary/hover/focus/current navigation pairs on desktop and mobile popup, enabled-action, positive/pending/negative badge, neutral row/canvas, and resolved Graph-token colors. Retain CSS-disabled/icon-hidden negative controls, no overflow, zero axe violations, unchanged geometry/compact first-viewport bounds, and the existing business/finder/denial checks affected by the markup.
- **VER-003**: One independent ordinary-presentation review inspects actual Expense and Purchase before/after images plus focused source/business evidence. Reuse unaffected accepted evidence; do not add component-specific QA, release, or audit gates. Record exact source/image hashes, immutable runtime identities, cleanup, revised B3 baseline, and remaining business gaps in the active ledger and acceptance record.

## References

- **REF-001**: `AGENTS.md`, `docs/tech-governance.md`, `docs/threat-model.md`, `docs/delivery-policy.md`, ADR-0043, ADR-0055, ADR-0056, ADR-0057, `packages/compiler/DESIGN.md`, and the active consumer-delivery ledger.

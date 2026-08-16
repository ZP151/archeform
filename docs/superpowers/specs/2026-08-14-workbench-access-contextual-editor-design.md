# Workbench Access Contextual Editor Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Authority:** [ADR-0021](../../adr/adr-0021-generated-runtime-permission-actor-enforcement.md)
and [ADR-0022](../../adr/adr-0022-compiler-admission-permission-actor-additions.md)
**Base:** `a857df58c0e2d8b86782d24aee68be3c8f7dd166`

## Outcome

On the Restaurant template Draft (Graph V3), Builder -> Access renders the
declared roles and permissions plus one bounded write: add a team role. The
merchant enters a Graph-valid role key; saving appends the role and one bounded
permission (`table-session` -> `read`) as Draft r.7 and one active immutable
Snapshot V2, then both preview frames reflect the change from the strict
server response.

This is the Workbench surface that ADR-0021 (generic runtime enforcement) and
ADR-0022 (compiler admission of role/permission additions) unblocked. It edits
a mutable Draft only; it never compiles, publishes, or widens the compiler
boundary beyond what ADR-0022 already admitted.

## Existing architecture and gap

The V3 template Draft already has contextual editors for Page
(`template-page-workspace`), Data (`template-data-workspace`), and Experience
(`template-experience-workspace`). Each derives a current value from the Draft,
renders a bounded editor, and calls a controller method that appends a Draft
revision plus one Snapshot V2 through the Control Plane.

The Access surface (`state.activeSurface === "policy"`) always renders the
legacy V1 `PolicyCanvas` against the controller's V1 graph, even when a V3
template Draft is active. There is no V3 access editor, so a merchant cannot
add a role or permission to the Restaurant Draft even though the compiler and
generated runtime already enforce Graph-valid additions.

## Frozen contracts

### Admitted locations

Only these locations may change in this slice:

- `policy.roles`: append exactly one new role key. It must be a Graph key
  (`^[a-z][a-zA-Z0-9-]*$`, 1..128 characters), not already declared, and the
  four canonical roles (`customer`, `cashier`, `kitchen`, `manager`) must
  remain present.
- `policy.permissions`: append exactly one row
  `{ role: <newRoleKey>, resource: "table-session", actions: ["read"] }`.

The resulting Graph must still pass `assertApplicationGraphV3` and
`assertRestaurantDraftPreviewGraphClosure`.

### Negative space

Every other location — metadata, surfaces, pages, blocks, domain, relations,
seed data, seed scenarios, flows, journeys, field authorities, binding
policies, integration, experience, envelope — remains canonical. Removing a
canonical role or permission, editing a flow/journey transition, or any
resource/action drift beyond the single bounded grant fails closed.

### Authority validation

The Control Plane edit mirrors the compiler's ADR-0022 authority checks:

- role key is a declared Graph key 1..128 characters, unique among
  `policy.roles`, and does not remove any canonical role;
- the appended permission references a declared role and a Graph-key resource
  with exactly the bounded non-empty action set `["read"]`;
- the edit is a pure function of the current Draft and the bounded command, and
  a "restored" clone must deep-equal the input Graph (no hidden mutation).

## Security boundary

- The Published Graph remains the sole authority; this slice only appends a
  mutable Draft revision and a preview Snapshot V2.
- The role and permission are bounded and reference-checked before the Draft is
  persisted; the generated runtime enforces them generically (ADR-0021) and the
  compiler admits them (ADR-0022).
- No credential, raw prompt, raw response, or request body is logged or echoed.

## Exact implementation manifest

Control Plane:

1. `apps/control-plane/src/template/template-access-edit.ts`
2. `apps/control-plane/src/template/template.service.ts`
3. `apps/control-plane/src/template/template.controller.ts`
4. `apps/control-plane/test/template.service.test.ts`
5. `apps/control-plane/test/template.controller.test.ts`

Workbench:

6. `apps/workbench/lib/control-plane-client.ts`
7. `apps/workbench/hooks/use-workbench-controller.ts`
8. `apps/workbench/components/template-access-workspace.tsx`
9. `apps/workbench/components/workbench.tsx`
10. `apps/workbench/components/template-access-workspace.test.tsx`
11. `apps/workbench/lib/control-plane-client.test.ts`

No Graph, Capability, Recipe, schema, compiler, Prisma, lockfile, provider,
service, Docker, Compose, or deployment path is writable.

## Verification and delivery

Focused TDD RED/GREEN: a bounded role addition with its bounded permission is
admitted and enforced in the returned Draft; a duplicate, malformed, empty, or
undeclared role, a removal of a canonical role/permission, or any
flow/journey/field/binding drift fails closed with the fixed redacted error.
Full Control Plane and Workbench suites, Graph/Compiler/Capabilities regressions,
no-emit and build gates, direct Prettier and `git diff --check`, containment and
static scans. One independent Sol review; Terra and a separate final Sol release
review are not required unless review finds a stable-boundary/security P0/P1 or
the repair changes this contract. The exact delivery subject and governance
manifest are frozen in the executable plan.

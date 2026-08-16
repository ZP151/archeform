# Generated Runtime Graph-Valid Permission and Actor Enforcement Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0021](../../adr/adr-0021-generated-runtime-permission-actor-enforcement.md)
**Base:** `a513618287c1c45816c90f61836d96a39b45baed`

## Outcome

Make the generated Restaurant runtime authorize every state-changing endpoint
against the exact Published Graph `policy.permissions`, `flows`, `journeys`
step actors, and `fieldAuthorities`/`bindingPolicies`, instead of the current
fixed capability-flag booleans. This is the prerequisite that unblocks the
Workbench Access and Workflow contextual editors.

## Existing architecture and gap

`runtime-api.ts`'s `apiModule(plan)` already has generic predicates
(`permission(role, resource, action)`, `transition(...)`, `writableField(...)`)
but evaluates them **at compile time** and serializes only the resulting fixed
booleans (`runtimePolicy`, `merchantPolicy`) into the generated source. The
generated handler then checks hard-coded role names
(`principalRole === "manager"`, `"kitchen"`, `"cashier"`, `"customer"`) plus
those booleans.

Gap: a Graph-valid permission or actor added through a future editor has no
generic runtime predicate to enforce it; the endpoint checks remain hard-coded
to the four fixed roles and the fixed operation set.

## Frozen contracts

### Runtime authorization data

`apiModule` serializes into the generated source, as frozen plain data:

- `permissions`: the exact `plan.policy.permissions` rows
  `{role, resource, actions}`;
- `roles`: the exact `plan.policy.roles` list;
- `flows`: the exact `plan.flows` transitions
  `{flowKey, from, event, to, roles}`;
- `fieldAuthorities`: the exact `plan.fieldAuthorities` rows;
- `bindingPolicies`: the exact `plan.bindingPolicies` rows.

### Runtime predicates

The generated source defines, over that data:

```js
const permission = (role, resource, action) =>
  permissions.some(
    (e) =>
      e.role === role && e.resource === resource && e.actions.includes(action),
  );
const transition = (flowKey, from, event, to, role) =>
  flows.some(
    (f) =>
      f.flowKey === flowKey &&
      f.transitions.some(
        (t) =>
          t.from === from &&
          t.event === event &&
          t.to === to &&
          t.roles.includes(role),
      ),
  );
const writableField = (pageId, entityKey, fieldKey) =>
  fieldAuthorities.some(
    (e) =>
      e.entityKey === entityKey &&
      e.fieldKey === fieldKey &&
      e.authority === "client",
  ) &&
  bindingPolicies.some(
    (e) =>
      e.pageId === pageId &&
      e.kind === "domain-field" &&
      e.entityKey === entityKey &&
      e.fieldKey === fieldKey &&
      e.access === "write" &&
      e.authority === "client",
  );
```

### Endpoint authorization

Each state-changing endpoint replaces its hard-coded role/flag check with the
generic predicate over its `(resource, action)`:

- customer cart add/update/delete -> `order-line` create/update/delete;
- checkout -> `order` submit + pay plus the two `restaurant-order`
  flow-transition requests;
- profile update -> the three `restaurant-principal` client field writes;
- merchant catalog/settings/availability writes -> `menu-item` and
  `restaurant-location` field writes plus manager role;
- order cancel/pay/accept/start-preparing/mark-ready -> the exact
  `order`/`restaurant-order` transition predicates;
- table activate/close/expire -> `table-session` actions;
- inventory adjustment -> the `restaurant-inventory-ledger` transition plus
  the `record-manager-adjustment` permission.

The principal remains nonspoofable: `createRestaurantApiHandler(store,
principalRole)` may only adopt a role present in the emitted `roles`; an unknown
or undeclared role fails closed.

## Security boundary

- The Published Graph remains the sole authority; the runtime evaluates only the
  emitted frozen plan data.
- Every endpoint denies by default; an operation without an exact Graph
  permission or transition fails with the fixed redacted `Request denied.`.
- No credential, raw prompt, raw response, or request body is logged or echoed.
- The nonspoofable startup-principal model is unchanged.

## Exact implementation manifest

1. `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
2. `packages/compiler/test/restaurant-customer-runtime.test.ts`
3. `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`

The cross-surface target tests are unchanged; the generic predicates preserve
canonical and r.6 authorization behavior, so those suites pass without
modification and are covered by the full-suite gate.

No fixture, Graph, Capability, Recipe, schema, facade, package, lockfile,
Control Plane, worker, Publish, provider, service, Docker, Compose, or
deployment path is writable.

## Verification and delivery

Focused TDD RED/GREEN: an added Graph permission or actor becomes enforceable
and a removed one fails closed; role spoofing and unknown resource/action
reject; canonical and r.6 generated customer/merchant/cross-surface journeys
still pass. Full Compiler, Graph, and Capabilities suites; no-emit and build
gates; direct Prettier and `git diff --check`; containment and static scans.
One independent Sol review; Terra and a separate final Sol release review are
not required unless review finds a stable-boundary/security P0/P1 or the repair
changes this contract. The exact delivery subject and governance manifest are
frozen in the executable plan.

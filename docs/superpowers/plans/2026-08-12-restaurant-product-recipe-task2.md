# Restaurant Product Recipe Task 2 implementation plan

> **For the assigned backend writer:** use test-driven development and stop on
> any mismatch with the frozen shared manifest. Do not edit outside the exact
> paths below.

**Goal:** compose one deterministic `restaurant-ordering` Product Recipe and a
valid `factory.application-graph/v3` with the exact fifteen-screen Restaurant
semantics.

**Architecture:** validate and retain the existing Golden capability
composition as the base. Add a deterministic product layer with its own frozen
contract tests that maps the validated legacy Restaurant Graph into the V3
page, field-authority, journey, Policy, and binding contract. The legacy V1
profile validator and bytes remain unchanged; no provider/model output owns
deterministic semantics.

**Model and owner:** one GPT-5.6-Sol backend writer; `integration` owns the
shared contract.

**Contract:**
`docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`.

**Exact write paths:**

- `packages/capabilities/src/commerce/product-recipe.ts`
- `packages/capabilities/src/restaurant/product-recipe.ts`
- `packages/capabilities/src/restaurant/product-graph.ts`
- `packages/capabilities/src/capability-catalogue.ts`
- `packages/capabilities/src/plan-alternatives.ts`
- `packages/capabilities/src/product-composer.ts`
- `packages/capabilities/src/index.ts`
- `packages/capabilities/test/restaurant-product-recipe.test.ts`
- `packages/capabilities/test/restaurant-product-composition.test.ts`
- `packages/capabilities/test/product-composer.test.ts`
- `packages/capabilities/test/restaurant-product-fixture.ts`

## Task A — Capture the contract in RED tests

Add focused tests that require the exact two surfaces, fifteen pages/routes,
recipes/regions/block IDs, role and capability selection, entity additions,
field-authority complement, three flows, seven V3 journeys, transition Policy
grants, and every exact Domain/Flow/Policy binding. Require rejection for one
mutated key, authority, target, actor, discontinuous step, missing binding
policy, and provider/model override. Confirm the focused suite fails before
production edits and record the RED command/output summary.

## Task B — Implement deterministic recipe and V3 composition

Implement the published `restaurant-ordering` Product Recipe and deterministic
Graph builder. Reuse the selected Golden locks and existing Restaurant entity,
relation, role, flow, seed, and capability vocabulary. Apply only the additions
and explicit legacy mapping in the shared manifest. Assign manager to both
legacy table-session expiry transitions and add exact event permissions; do not
weaken V3 validation or broaden unrelated roles.

Parse the result through `assertProductRecipe` and
`assertApplicationGraphV3`, compute its canonical V3 hash, and return fresh
data without mutating catalogue/profile inputs.

## Task C — Integrate the deterministic selector

Teach the capability catalogue, alternatives, and product composer to select
the Restaurant recipe only for the approved Restaurant intent. Preserve all
existing non-Restaurant behavior and ordering. Provider/model proposals may
select an eligible key but cannot supply or override pages, fields,
authorities, journeys, policies, seed scenarios, or bindings.

## Task D — GREEN and handoff

Run the focused Task 2 suites, full `@factory/capabilities` tests, full
`@factory/graph` tests, both package typechecks/builds, scoped Prettier, diff
check, exact-path containment, browser-safe import checks, deterministic
repeat/hash equality, and changed-hunk sensitive scan. Record all counts and
the exact changed paths. Do not commit or push.

Pause for one independent Sol task review, fresh provider/model/network/
service/Docker/Compose-free Terra QA, independent Sol release review, PM
acceptance, and controller-only delivery. Task 2 completion does not authorize
Task 4/5.

# Restaurant V3 Runtime Catalog Parity Design

**Date:** 2026-08-14
**State:** Accepted; ready for writer; not implemented or delivered
**Decision:** [ADR-0018](../../adr/adr-0018-restaurant-v3-runtime-catalog-parity.md)
**Base:** `97b6dbdb6176ca26af6d7fa2b71dad6bbc692e19`

## Outcome

D0 removes one concrete product-truth mismatch inside the existing pure
Restaurant V3 compiler: generated customer and merchant catalog state comes
from the admitted Graph seed and its exact scenario mirror instead of unrelated
hard-coded dishes.

The proof compiles both the canonical Restaurant fixture and a strict synthetic
Published r.6-family fixture containing:

```text
Maison Aurelia private dining -> Maison Rivage
customer-menu: Menu -> Seasonal Menu
customer-home: home-hero, home-categories, home-items
            -> home-items, home-hero, home-categories
Margherita pizza -> Heirloom tomato pizza (seed and scenario)
light -> dark
```

Only the runtime catalog is newly bound in D0. Customer and merchant generated
tests prove the same initialized state/API returns `Heirloom tomato pizza` and
integer USD minor price `1400`. The test does not claim Product Publish,
Control Plane/worker compilation, Workbench launch, or complete generated
title/order/theme rendering.

## Existing architecture and gap

- `assertRestaurantProductCompilationInput` already strict-copies the exact
  Published wrapper, adapts Graph V3, verifies graph hash and Composition Lock,
  checks the full Restaurant page/recipe/binding/journey structure, and emits
  one redacted boundary error.
- The function additionally pins one canonical whole-Graph hash. Therefore
  every delivered contextual value change fails production target admission.
- `planRestaurantProduct` already retains Domain, scenarios, policy,
  authorities, bindings, pages, and experience as frozen plain data.
- `renderRestaurantCustomerRuntime(plan)` ignores that seed and renders two
  unrelated static catalog items. The product target then shares that runtime
  between customer and merchant entry points.
- `customer-target.ts`, `merchant-target.ts`, and `product-target.ts` generated
  journey sources refer to the unrelated record IDs, so all three must move
  with the runtime seed.

No new canonical Graph import is necessary. The existing hash pin remains the
negative-space oracle after the exact allowed values are normalized.

## Frozen allowed-delta algorithm

Operate only on the strict copied and Graph-V3-validated value. Never re-read
the caller object.

1. Verify the current Graph hash equals its Published envelope and the
   Composition Lock is canonical for that hash.
2. Run the existing complete Restaurant structural, page/recipe, binding,
   journey, authority, and surface checks.
3. Validate the five allowed value families and catalog seed invariants.
4. Clone the Graph.
5. Restore only:
   - `metadata.name = "Maison Aurelia private dining"`;
   - `customer-menu.title = "Menu"`;
   - Customer Home page block order and its one `main` region order to
     `home-hero`, `home-categories`, `home-items`;
   - both mirrored Margherita names to `Margherita pizza`; and
   - `experience.theme.mode = "light"`.
6. Require `hashApplicationGraphV3(normalized)` to equal
   `sha256:13656b65e143d14dc0c812a7b955240527644506eb4d2518a4b2ed277e3caa23`.

The Home candidate orders must already be equal, duplicate-free permutations
of the exact three IDs. Normalization never repairs an invalid candidate; it
only removes allowed value variation after every local invariant passes.

This makes every unlisted difference fail through the final hash comparison,
including a changed application/workspace ID, another page title, block content,
surface/navigation order, entity/index/relation, policy, flow, journey,
authority, binding, integration, seed record/value, scenario, theme token,
locale, or array order.

## Strict seed and scenario admission

### Mirror and identity

- `domain.seedData` is present.
- `seedScenarios` contains exactly one scenario with key
  `fine-dining-service`.
- Scenario records and seed records have the same length. At every index,
  scenario `entityKey === seed.entity` and scenario `values` is deeply equal to
  the complete seed `values` object.
- Entity/id pairs are unique. Require exactly one canonical `mains` category,
  exactly one `margherita-pizza`, and exactly one `mushroom-risotto` menu item;
  D0 admits no added or removed category/menu-item record.
- Every admitted menu item's `categoryKey` resolves exactly one admitted
  category.

### Graph schema and authority

Require one `menu-category` and one `menu-item` entity definition. Their fields
and required flags remain exactly:

```text
menu-category: name/string, sortOrder/integer, active/boolean
menu-item: categoryKey/string, name/string, description/text, price/decimal,
           available/boolean, stock/integer, preparationMinutes/integer,
           imageUrl/url
```

Menu-item field authorities are exact: `stock` is server-owned and the other
seven are client-owned. The candidate's complete 135-binding multiset must
still equal the accepted `restaurantScreenRecipes` contract. This includes:

```text
name/description/price: Customer Home/Menu/Dish read; Merchant table write
available: Customer Home/Menu/Dish read; Merchant Dashboard read;
           Merchant table and availability write
stock: Merchant table read
preparationMinutes: Merchant table write
imageUrl: Customer Home/Menu read
categoryKey: no visual binding
```

Manager must retain `menu-item:update`. These assertions do not grant the
generated browser new authority; runtime mutation continues to recheck the
validated plan and trusted startup principal.

### Value bounds

Validate primitive values without coercion:

| Value                         | Rule                                                  |
| ----------------------------- | ----------------------------------------------------- |
| entity, record, category keys | existing Graph key, 1..128                            |
| category/item name            | trimmed, 1..120, no C0/DEL; editable Margherita min 2 |
| description                   | trimmed, 1..1000, no C0/DEL                           |
| available, category active    | primitive boolean                                     |
| stock                         | integer 0..10000                                      |
| preparationMinutes            | integer 1..1440                                       |
| category sortOrder            | integer 0..10000                                      |
| imageUrl                      | trimmed 1..2048, no controls, accepted safe URL rule  |

The accepted safe URL rule is the existing generated-UI behavior: a value
starts with `/`, `#`, or `?`, or its ASCII-lowercase form starts with `http://`
or `https://`. D0's canonical normalized-hash gate still makes the two current
root-relative image paths immutable.

## Money representation

Graph `menu-item.price` is a JavaScript number in USD major units. Admission is
exactly:

```ts
function restaurantPriceMinor(price: unknown): number {
  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 100_000 ||
    Number(price.toFixed(2)) !== price
  ) {
    throw new Error("Restaurant product compilation input is invalid.");
  }
  const minor = Math.round(price * 100);
  if (!Number.isInteger(minor) || minor < 0 || minor > 10_000_000) {
    throw new Error("Restaurant product compilation input is invalid.");
  }
  return minor;
}
```

The equality check occurs before multiplication. The compiler does not admit
`1.001` and round it to `100`; it rejects it. Valid examples include `0 -> 0`,
`14 -> 1400`, `14.5 -> 1450`, and `14.25 -> 1425`.

## Generated catalog

Keep `RestaurantRuntimeSourceV1` and
`renderRestaurantCustomerRuntime(plan)` unchanged as public interfaces. Add
private plain-data extraction inside `runtime-api.ts`:

```ts
type RestaurantRuntimeCatalogItemV1 = {
  readonly id: string;
  readonly version: 1;
  readonly categoryKey: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly available: boolean;
  readonly stock: number;
  readonly preparationMinutes: number;
  readonly imageUrl: string;
};

function restaurantRuntimeCatalog(
  plan: RestaurantProductPlanV1,
): readonly RestaurantRuntimeCatalogItemV1[];
```

Extraction preserves the `domain.seedData` menu-item order. It reads only the
fully admitted plan and emits a JSON serialization into `seed.mjs`; no value is
concatenated as JavaScript syntax. Every row begins at version `1`.

The existing state store receives that catalog once on first initialization.
Customer and merchant servers over one state path therefore share the same
record IDs, versions, catalog queries/mutations, availability, stock, and audit
behavior. Restart continues to read the stored state rather than silently
reseeding.

## Error and hostile-input boundary

- `copyStrictPlainData` remains the sole caller-object capture. Dense standard
  arrays and own enumerable data properties are required recursively.
- Accessors, inherited/non-enumerable/symbol properties, array subclasses,
  proxies/reflection failures, cycles, functions, symbols, iterators,
  `toString`, `valueOf`, and `toJSON` fail before caller behavior can influence
  accepted data.
- All new catalog and normalization helpers consume the captured Graph only.
- Every failure uses the existing fixed compilation-input error. No log,
  generated diagnostic, snapshot, or assertion message contains input values.

## Exact implementation manifest

One writer owns exactly these ten paths:

1. `packages/compiler/src/targets/restaurant-v3/contracts.ts`
2. `packages/compiler/src/targets/restaurant-v3/runtime-api.ts`
3. `packages/compiler/src/targets/restaurant-v3/customer-target.ts`
4. `packages/compiler/src/targets/restaurant-v3/merchant-target.ts`
5. `packages/compiler/src/targets/restaurant-v3/product-target.ts`
6. `packages/compiler/test/restaurant-v3-contract.test.ts`
7. `packages/compiler/test/restaurant-customer-runtime.test.ts`
8. `packages/compiler/test/restaurant-merchant-v3-runtime.test.ts`
9. `packages/compiler/test/restaurant-customer-target.test.ts`
10. `packages/compiler/test/restaurant-product-v3-target.test.ts`

No fixture, Graph, Capability, Recipe, compiler facade/index, package,
lockfile, worker, Control Plane, Workbench, service, Docker, or Compose path is
writable. Tests build their r.6 candidate by cloning the existing fixture in
test code, changing only the five allowed families, recomputing its V3 hash,
and rebuilding the Composition Lock through existing imports.

## Verification and delivery

Use focused RED/GREEN for contract admission, catalog extraction/money bounds,
generated customer/merchant IDs, and cross-surface shared state. Then run full
Compiler, Graph, and Capabilities suites; no-emit and build for all three;
generated Node journeys; direct Prettier on exact ten; diff, containment,
sensitive/static scans; and one independent Sol intended-vs-implemented review.

This ordinary compiler correction needs no Terra or separate final Sol review
unless independent review finds a stable-boundary/security P0/P1 or a repair
requires changing this frozen contract. PM/controller alone owns exact-sixteen
delivery with subject
`fix(compiler): bind restaurant runtime catalog to graph seed`.

## Stop conditions and deferrals

STOP for an eleventh path, new canonical-source import, another accepted delta,
generic seed/scenario shape, another currency or implicit rounding, Graph/
Capability/Recipe/schema/facade change, runtime state/API version change,
package/lock/dependency, browser/Control Plane/worker/Publish/PreviewRunner,
service/network/provider, Docker/Compose, or deployment.

Page-title, block-order, and theme values are admitted because they are already
part of the delivered r.6 family, but D0 proves runtime parity only for catalog
seed data. Their generated visual parity, V3 lifecycle integration, runnable
Workbench launch, options/categories beyond catalog references, visible money
formatting, and every further Data edit remain separately deferred.

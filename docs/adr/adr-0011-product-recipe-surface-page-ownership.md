---
title: "ADR-0011: Product Recipe Surface Page Ownership"
status: "Accepted"
date: "2026-08-12"
authors: "Archeform Tech Lead"
tags: ["architecture", "graph", "product-recipe", "serialization"]
supersedes: ""
superseded_by: ""
---

# ADR-0011: Product Recipe Surface Page Ownership

## Status

Proposed | **Accepted** | Rejected | Superseded | Deprecated

Recommendation: **migrate** Product Recipe surface ownership through additive
versioned contracts while **keeping** Product Recipe V1 unchanged.

Founder acceptance is recorded below. PM may freeze and assign the single
serialized-contract prerequisite described by this ADR; Task 2 and Task 3 do
not resume until that prerequisite is accepted, delivered, and reconciled at
local/upstream equality.

## Founder Decision Record

- **Decision:** Accepted
- **Date:** 2026-08-14
- **Source:** founder chat
- **Exact response:** `参考以下总结，若符合项目目标，则持续接受而迭代。`
- **PM reconciliation:** The referenced summary matches the repository evidence
  and project goal: keep Product Recipe V1 immutable, add explicit V2 surface
  ownership, deliver that serialized prerequisite first, and then continue the
  already accepted Restaurant vertical slice. This response therefore accepts
  ADR-0011 and authorizes ordinary in-scope iteration under the prospective
  process boundary below.

Founder reapproval is not required for ordinary P1 or reversible implementation
choices inside the accepted Restaurant scope. It remains required for a product
scope change, irreversible architecture, external credentials or authority,
cloud/deployment action, or a surviving load-bearing issue. Heavy task gates are
reserved for serialized contracts, security boundaries, and final release.
Ordinary deterministic component/page work uses TDD plus one independent review.
Repair caps constrain real-model or otherwise high-cost reruns, not ordinary
local fixes.

## Context

- **CTX-001**: The accepted Golden runtime, immutable Application Graph V1/V2,
  delivered Application Graph V3, and accepted ADR-0010 remain unchanged.
- **CTX-002**: `factory.product-recipe/v1` embeds
  `factory.application-surface/v1`. Its validator derives the complete owner
  set of a surface from `entryPageKey` plus visible
  `navigation.items[].pageKey`, then rejects every `screens[]` entry outside
  that derived set.
- **CTX-003**: Frozen `factory.restaurant-task2-task3-contract/v1` requires
  `customer-dish-detail`, `customer-checkout`, and
  `customer-order-detail` to be owned by `customer-mobile`, but intentionally
  excludes those journey destinations from the exact five-item bottom-tab
  navigation.
- **CTX-004**: Adding hidden or duplicate navigation items would make
  navigation metadata dishonest and violate the frozen product contract.
  Inferring ownership from routes or journeys would make ownership contextual
  and non-deterministic.
- **CTX-005**: This mismatch activated the shared-contract stop rule before
  Task 2 wrote any capability path. Task 3 stopped with only its reuse
  inventory and package/test scaffolds. Both tasks are planned and blocked.
- **CTX-006**: Product Recipe identifiers, schemas, and serialization are
  stable contracts under `docs/tech-governance.md`; an additive version
  requires explicit founder acceptance.

## Decision

- **DEC-001**: Keep `factory.product-recipe/v1`,
  `factory.application-surface/v1`, `productRecipeSchema`,
  `applicationSurfaceSchema`, `ProductRecipeV1`, `ApplicationSurfaceV1`, and
  `assertProductRecipe` byte- and behavior-compatible. Existing V1 input must
  retain the same acceptance and rejection behavior.
- **DEC-002**: Add `factory.application-surface/v2` with the V1 fields plus one
  required `ownedPageKeys: string[]` field. The field is non-empty, bounded,
  ordered, and unique. It declares every page owned by that surface.
- **DEC-003**: Add `factory.product-recipe/v2`. It retains the V1 recipe fields,
  continues to use `factory.screen-intent/v1`, and requires only
  `factory.application-surface/v2` entries in `surfaces`.
- **DEC-004**: In V2, `navigation.items` means visible navigation only. Every
  `entryPageKey` and navigation `pageKey` must occur in the same surface's
  `ownedPageKeys`, but an owned page need not be a visible navigation item.
  No hidden-navigation flag or inferred navigation entry is permitted.
- **DEC-005**: Every V2 screen key must occur in exactly one surface's
  `ownedPageKeys`. Unknown owned keys, missing owners, duplicate keys within a
  surface, cross-surface ownership, entry/navigation keys outside ownership,
  and extra fields fail closed.
- **DEC-006**: Add strict V2 parsing and version dispatch without compatibility
  guessing. A V1-to-V2 Draft adapter may derive `ownedPageKeys` only as the
  ordered de-duplicated V1 owner set—entry first, followed by visible
  navigation—because V1 contains no other ownership fact. It never rewrites or
  republishes V1 bytes.
- **DEC-007**: Product Recipe ownership remains descriptive metadata. It grants
  no tenant, actor, Policy, transition, revision, idempotency, payment,
  inventory, or server authority. Graph V3 and server-side checks remain the
  authority for executable behavior.
- **DEC-008**: The serialized prerequisite is integration-owned and must be
  delivered before PM amends/refreezes the Restaurant shared manifest or
  reactivates Task 2 and Task 3.

## Proposed Contract

```ts
type ApplicationSurfaceV2 = Omit<ApplicationSurfaceV1, "apiVersion"> & {
  apiVersion: "factory.application-surface/v2";
  ownedPageKeys: string[];
};

type ProductRecipeV2 = Omit<ProductRecipeV1, "apiVersion" | "surfaces"> & {
  apiVersion: "factory.product-recipe/v2";
  surfaces: ApplicationSurfaceV2[];
};
```

The accepted public API is frozen as follows:

```ts
export const applicationSurfaceV2Schema: z.ZodType<ApplicationSurfaceV2>;
export const productRecipeV2Schema: z.ZodType<ProductRecipeV2>;

export type VersionedProductRecipe = ProductRecipeV1 | ProductRecipeV2;

export function assertProductRecipeV2(input: unknown): ProductRecipeV2;
export function assertVersionedProductRecipe(
  input: unknown,
): VersionedProductRecipe;
export function hashProductRecipeV2(input: unknown): Sha256Digest;
export function adaptProductRecipeV1DraftToV2(input: unknown): ProductRecipeV2;
```

`ownedPageKeys` is `z.array(graphKeySchema).min(1).max(100)` and is unique in
declared order. `assertProductRecipe` remains the V1-only function with its
existing signature and behavior. The versioned assertion dispatches only the
two exact identifiers; it never guesses. The Draft adapter accepts only V1,
returns fresh V2 data, and derives each ownership array as the ordered,
de-duplicated sequence `entryPageKey` followed by visible navigation targets.
No V2-to-V1 function or implicit down-conversion is added.

The Restaurant customer surface would own all eight customer page keys while
its visible bottom-tab items remain exactly `customer-home`, `customer-menu`,
`customer-cart`, `customer-orders`, and `customer-profile`. The merchant
surface owns its seven pages and retains its exact seven-item sidebar.

## Consequences

### Positive

- **POS-001**: Surface membership and visible navigation become independent,
  explicit, deterministic facts.
- **POS-002**: The exact fifteen-screen Restaurant manifest becomes valid
  without dishonest navigation metadata or a product-specific exception.
- **POS-003**: V1 bytes, parser behavior, consumers, and immutable evidence are
  preserved.
- **POS-004**: Generic validation rejects ambiguous or cross-surface ownership
  before composition or UI registry admission.

### Negative

- **NEG-001**: The repository carries another Product Recipe and Application
  Surface version plus version dispatch and adapter tests.
- **NEG-002**: V2 producers must maintain an explicit ownership list in
  addition to screen and navigation arrays.
- **NEG-003**: Task 2 and Task 3 remain stopped until the founder decision and a
  separately reviewed, accepted, delivered prerequisite complete.
- **NEG-004**: A V1-to-V2 adapter cannot recover non-navigation-owned pages
  that V1 never represented; producers must add those only in a new V2 Draft.

## Alternatives Considered

### Change Product Recipe V1 in place

- **ALT-001**: Add ownership to the existing V1 surface or reinterpret its
  navigation array.
- **ALT-002**: **Rejection reason**: this changes a stable serialized contract
  and existing V1 validation semantics without a version boundary.

### Add hidden or duplicate navigation items

- **ALT-003**: Put detail and checkout pages into navigation with a hidden flag
  or duplicate tab entries solely to satisfy ownership.
- **ALT-004**: **Rejection reason**: navigation would stop representing the
  exact visible product navigation, and V1 has no accepted hidden-item field.

### Infer ownership from journeys, routes, or recipe keys

- **ALT-005**: Resolve a screen owner indirectly from Graph journeys, routes,
  or naming conventions.
- **ALT-006**: **Rejection reason**: standalone Product Recipe validation would
  depend on external context or conventions and could assign different owners
  in different adapters.

### Put `surfaceKey` on each Screen Intent

- **ALT-007**: Add an owner reference to a new Screen Intent version instead of
  enumerating owned pages on each surface.
- **ALT-008**: **Rejection reason**: the required distinction is a surface
  concern; versioning Screen Intent would widen the migration and duplicate a
  surface's membership definition across screen records.

### Reduce the Restaurant screen contract

- **ALT-009**: Merge or remove Dish Detail, Checkout, or Order Detail.
- **ALT-010**: **Rejection reason**: it breaks the approved fifteen-screen
  product outcome instead of correcting the generic ownership model.

## API, Data, and Operational Effects

- **API-001**: Only Graph package Product Recipe parsing/export APIs change;
  no Control Plane route, database, ORM, queue, provider, compiler target,
  generated template, Docker, or Compose topology is added by this decision.
- **DAT-001**: V2 is additive. There is no in-place persisted-data migration,
  and Published V1/V2/V3 Graph bytes and hashes remain unchanged.
- **ADP-001**: Node and browser exports must expose identical V2 schemas,
  types, assertions, and explicit version dispatch without Node-only imports.
- **CAT-001**: Capability and UI catalogues may consume V2 only after the
  prerequisite is delivered and PM refreezes their shared manifest.
- **LIC-001**: No dependency, copied source, license, provenance, or supply-chain
  coordinate changes. ADR-0010 restrictions remain controlling.
- **SEC-001**: All public V2 boundaries must use strict recursive own-data
  validation and reject inherited, accessor, symbol-keyed, non-enumerable,
  non-plain, duplicate, extra, cyclic, and over-depth input. Ordinary objects,
  arrays, accessors, subclasses, and instance methods must never be invoked.
  JavaScript cannot identify a `Proxy` without potentially invoking a reflection
  meta-trap; therefore Proxy trap non-invocation is not promised. Every
  reflection/trap exception must be caught at the public boundary and converted
  to a fixed no-echo validation failure, with no raw exception escaping.
- **SEC-002**: Recursive Product Recipe V2 boundary copying has a maximum depth
  of 64: root depth is 0, depth 64 is valid, and descent to depth 65 is rejected
  before recursion. This bound preserves valid recipe shapes, prevents stack
  exhaustion, and does not reject repeated acyclic aliases.
- **SEC-003**: The recursive boundary has a global maximum array length of 100.
  After `Array.isArray` identifies an array, the public boundary enters its
  caught reflection region, reads the own `length` data descriptor at most once
  without invoking a value getter, and requires a nonnegative integer no greater
  than 100. Only then may it inspect the prototype, own keys, numeric
  descriptors, or slots. Array and Proxy reflection may invoke meta-traps under
  SEC-001, but every exception is caught and redacted. Over-limit input returns
  the fixed root validation issue without inspecting keys or numeric slots.
- **OPS-001**: No runtime service or deployment step is required. Failure is a
  deterministic validation error before product composition.

## Implementation Notes

- **IMP-001**: After founder acceptance, PM must create a separate serialized
  prerequisite ledger and plan. Prospective scope is limited to
  `packages/graph/src/product-recipe.ts`, Node/browser export files, and focused
  Product Recipe tests; any required path expansion returns to PM.
- **IMP-002**: TDD must first prove the frozen Restaurant customer ownership
  plus exact five-item navigation is RED against V1 and that all V1 vectors
  remain unchanged.
- **IMP-003**: GREEN must cover exact V2 positive vectors, V1 parity, explicit
  V1-to-V2 adaptation, strict version dispatch, ownership completeness and
  uniqueness, entry/navigation subsets, cross-surface rejection, hostile input,
  browser parity, declarations, and deterministic fresh-output behavior.
- **IMP-004**: The prerequisite requires independent Sol task review,
  provider-free Terra QA, independent Sol release review, PM acceptance, exact
  controller delivery, and local/upstream equality before Task 2/Task 3 resume.
- **IMP-005**: `applicationSurfaceV2Schema` and `productRecipeV2Schema` are
  frozen top-level public boundaries. Their fixed redacted structural failure is
  intentionally rooted at path `[]`; composing either schema as a nested Zod
  consumer can therefore lose an outer path prefix. This nonblocking
  composability debt must be designed, tested, and closed before either public
  schema is embedded inside another Zod schema. Current top-level assertions,
  hashes, dispatch, adapter, Node/browser exports, and Restaurant use do not
  depend on nested composition.
- **IMP-006**: The two top-level public schemas retain Zod-compatible method
  signatures for `parse`, `safeParse`, `parseAsync`, `safeParseAsync`, and
  `spa`, but do not inspect, dereference, or use the optional `params` argument.
  Their structural failure contract is always the fixed explicit message at
  root path `[]`; caller `path` and `errorMap` behavior is not promised for
  these five methods. A hostile or revoked `params` Proxy must receive zero
  property reads/traps and must not cause a raw escape.

## Migration, Rollback, and Abort Conditions

- **MIG-001**: New Restaurant work targets Product Recipe V2. Existing V1
  recipes remain V1 unless explicitly adapted into a new mutable Draft input.
- **ROL-001**: Before delivery, rollback is deletion of the additive V2
  implementation paths. After delivery, consumers can remain on V1; no V1
  artifact needs reversal.
- **ABT-001**: Stop if any V1 schema, accepted vector, parser result, export,
  byte representation, or consumer must change.
- **ABT-002**: Stop if V2 requires a hidden navigation convention, route-based
  inference, product-specific exception, new dependency, persistence change,
  compiler target, runtime service, or path outside the PM-frozen prerequisite.
- **ABT-003**: Stop if an ordinary hostile getter/instance method can be invoked,
  a reflection/trap exception or hostile material can escape a public boundary,
  the depth or array-length bound is not enforced before descent/slot
  inspection, optional parse parameters are dereferenced, or ownership is not
  complete, unique, and deterministic. Proxy meta-trap invocation itself is the
  documented JavaScript feasibility exception in SEC-001, not a relaxation of
  fail-closed behavior.
- **ABT-004**: Stop and close IMP-005 before using either V2 public schema as a
  nested Zod consumer; this prerequisite does not authorize silently losing a
  consumer's outer diagnostic path.
- **IRR-001**: No irreversible step is authorized by this proposal. Commit,
  push, Publish, release, deployment, and Task 2/Task 3 resumption remain
  separate gated actions.

## Verification

- **VER-001**: `pnpm --filter @factory/graph exec vitest run test/product-recipe.test.ts`
- **VER-002**: `pnpm --filter @factory/graph test`
- **VER-003**: `pnpm --filter @factory/graph typecheck`
- **VER-004**: `pnpm --filter @factory/graph build`
- **VER-005**: `pnpm exec prettier --check <PM-frozen-prerequisite-paths>` and
  `git diff --check -- <PM-frozen-prerequisite-paths>`
- **VER-006**: Exact-path containment, Node/browser export equality,
  declaration emission, banned-import scan, changed-hunk sensitive-material
  scan, and V1 fixture/hash pins must pass and be recorded in the active PM
  ledger.

## Accepted Implementation Authority

The exact prerequisite contract, four-path writer manifest, error vocabulary,
TDD matrix, review/QA/release gates, and controller delivery sequence are frozen
in:

- `docs/superpowers/ledgers/2026-08-14-product-recipe-v2-prerequisite.md`
- `docs/superpowers/plans/2026-08-14-product-recipe-v2-prerequisite.md`

Exactly one GPT-5.6-Sol integration writer may implement that prerequisite. No
Task 2 or Task 3 writer is authorized before prerequisite delivery equality.

## Historical Founder Decision Prompt

> 是否接受 ADR-0011：保留 `factory.product-recipe/v1` 和
> `factory.application-surface/v1` 完全不变，并新增
> `factory.product-recipe/v2` / `factory.application-surface/v2`，用显式
> `ownedPageKeys` 将页面归属与可见导航分离；接受后仅授权 PM 冻结并交付一个
> 序列化前置任务，Task 2/3 在该前置任务交付前继续阻塞。请明确回复：`接受`
> 或 `拒绝`。

## References

- **REF-001**: `docs/tech-governance.md`
- **REF-002**: `docs/threat-model.md`
- **REF-003**: `docs/adr/adr-0010-restaurant-product-graph-v3-and-ui-registry-boundary.md`
- **REF-004**: `docs/superpowers/ledgers/2026-08-12-application-graph-v3-prerequisite.md`
- **REF-005**: `docs/superpowers/specs/2026-08-12-restaurant-task2-task3-key-binding-contract.md`
- **REF-006**: `packages/graph/src/product-recipe.ts`
- **REF-007**: `packages/graph/test/product-recipe.test.ts`
- **REF-008**: PM evidence is recorded in
  `docs/superpowers/ledgers/2026-08-10-prompt-to-polished-restaurant-product.md`.

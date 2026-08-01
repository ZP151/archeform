# Money and Pricing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a locked `commerce.money-pricing@1.0.0` Golden capability that
compiles deterministic price snapshots, promotion/tax allocation, and simulated
refund allocation into Restaurant Ordering and Simple Ecommerce.

**Architecture:** Keep money semantics Factory-owned and deterministic. A
versioned capability package declares typed Graph bindings and only declared
compiler contribution slots; compiler-owned target layout renders the package
template into generated Nest/Prisma code. The generated server calculates all
amounts from validated catalog data and immutable snapshots; client unit-price
or promotion inputs never become authoritative.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS generated targets, Prisma,
PostgreSQL, Playwright, Docker Compose.

## Global Constraints

- Work only from a Published Graph plus immutable composition lock.
- New behavior starts with focused failing tests.
- Currency amounts use decimal-string minor units; no JavaScript floating-point
  money values enter Graph, API, persistence, or generated artifacts.
- Do not install or integrate `big.js`, `dinero.js`, Stripe, or any real
  payment provider in this plan.
- Keep all credentials, raw prompts, and raw model responses out of code,
  fixtures, artifacts, logs, and reports.
- Existing locks and historical package versions remain replayable; do not edit
  a released package directory.
- A capability is accepted only after two isolated generated-application
  journeys and cleanup evidence pass.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `packages/capabilities/src/money/pricing.ts` | Factory-owned amount parsing, rounding, price quote, tax, promotion, and refund allocation rules. |
| `packages/capabilities/test/money-pricing.test.ts` | Pure money rule, invalid input, and deterministic allocation evidence. |
| `packages/capabilities/src/assets/commerce/money-pricing-v1-0-0.ts` | In-memory typed manifest registered with the asset catalogue. |
| `packages/capabilities/assets/commerce.money-pricing/1.0.0/` | Physical immutable package manifest, declarative adapter, template, fixture, and contract evidence. |
| `packages/capabilities/src/assets/index.ts` | Registers the new Golden version without replacing historical assets. |
| `packages/capabilities/src/index.ts` | Adds validated profile bindings and composition recipes for Restaurant/Ecommerce. |
| `packages/compiler/src/index.ts` | Validates the locked money contribution and emits generated persistence/API outputs. |
| `packages/compiler/test/money-pricing-runtime.test.ts` | Verifies generated price snapshot behavior and compiler failure modes. |
| `e2e/generated-restaurant.spec.ts` | Proves Restaurant price/promotion/tax journey against an isolated generated app. |
| `e2e/generated-ecommerce.spec.ts` | Proves Ecommerce price/promotion/tax/refund journey against an isolated generated app. |

### Task 1: Establish Factory money primitives

**Files:**
- Create: `packages/capabilities/src/money/pricing.ts`
- Create: `packages/capabilities/test/money-pricing.test.ts`
- Modify: `packages/capabilities/src/index.ts`

**Interfaces:**
- Produces `parseMoneyAmount`, `quotePrice`, and `allocateRefund` from
  `packages/capabilities/src/money/pricing.ts`.
- `MoneyAmountV1` is `{ readonly minor: string; readonly currency: string }`.
- `PriceQuoteInputV1` supplies line unit amounts, quantity, percentage/fixed
  promotions, and tax basis points; `PriceQuoteV1` supplies immutable subtotal,
  discount, tax, total, and line allocations.

- [ ] **Step 1: Write the failing money tests**

```ts
import { describe, expect, it } from "vitest";
import { allocateRefund, quotePrice } from "../src/money/pricing.js";

describe("Factory money pricing", () => {
  it("uses integer minor units for a discounted, taxed order", () => {
    expect(
      quotePrice({
        currency: "USD",
        lines: [{ key: "tea", unitMinor: "199", quantity: 3 }],
        promotions: [{ key: "welcome", kind: "percent", basisPoints: 1000 }],
        taxBasisPoints: 850,
      }),
    ).toMatchObject({ subtotalMinor: "597", discountMinor: "60", taxMinor: "46", totalMinor: "583" });
  });

  it("rejects a floating-point amount, mixed currency, and over-refund", () => {
    expect(() => quotePrice({ currency: "USD", lines: [{ key: "tea", unitMinor: "1.99", quantity: 1 }], promotions: [], taxBasisPoints: 0 })).toThrow("minor");
    expect(() => allocateRefund({ capturedMinor: "100", requestedMinor: "101", currency: "USD" })).toThrow("refund");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm --filter @factory/capabilities test -- test/money-pricing.test.ts`

Expected: FAIL because the money module does not exist.

- [ ] **Step 3: Implement the deterministic primitives**

```ts
export interface MoneyAmountV1 { readonly minor: string; readonly currency: string; }

export function quotePrice(input: PriceQuoteInputV1): PriceQuoteV1 {
  const subtotal = input.lines.reduce((sum, line) => sum + parseMinor(line.unitMinor) * line.quantity, 0n);
  const discount = calculateBoundedDiscount(subtotal, input.promotions);
  const taxable = subtotal - discount;
  const tax = roundHalfUp(taxable * BigInt(input.taxBasisPoints), 10_000n);
  return freezeQuote(input.currency, subtotal, discount, tax);
}
```

Implement `parseMinor` with `/^-?(0|[1-9][0-9]*)$/`, reject negative unit
prices and quantities below one, require uppercase ISO-shaped currency codes,
and use `bigint` only internally. Implement allocation with deterministic
largest-remainder ordering by declared line key.

- [ ] **Step 4: Run the focused test and package checks**

Run: `pnpm --filter @factory/capabilities test -- test/money-pricing.test.ts && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint`

Expected: PASS.

- [ ] **Step 5: Commit the primitive contract**

```bash
git add packages/capabilities/src/money/pricing.ts packages/capabilities/test/money-pricing.test.ts packages/capabilities/src/index.ts
git commit -m "feat: add deterministic money pricing primitives"
```

### Task 2: Release the physical Money capability package

**Files:**
- Create: `packages/capabilities/src/assets/commerce/money-pricing-v1-0-0.ts`
- Create: `packages/capabilities/assets/commerce.money-pricing/1.0.0/component.json`
- Create: `packages/capabilities/assets/commerce.money-pricing/1.0.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.money-pricing/1.0.0/templates/api/capability-module.ts.tpl`
- Create: `packages/capabilities/assets/commerce.money-pricing/1.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.money-pricing/1.0.0/tests/contract.json`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Interfaces:**
- Provides `money.price-quote/v1`, `money.price-snapshot/v1`, and
  `money.refund-allocation/v1`.
- Requires `commerce.catalog-item/v1` and `commerce.order-operation/v1`.
- Declares output slots `api.runtime`, `database.schema`,
  `database.migration`, `flow.effect`, and `test.fixture`.

- [ ] **Step 1: Write the failing package-integrity test**

```ts
it("resolves the immutable money-pricing package and verifies its files", () => {
  const asset = resolveCapabilityAssetLock({
    key: "commerce.money-pricing",
    version: "1.0.0",
    manifestDigest: expect.any(String),
    packageRoot: "packages/capabilities/assets/commerce.money-pricing/1.0.0",
  });
  expect(verifyCapabilityAssetPackage(asset, repositoryRoot)).toEqual([]);
});
```

- [ ] **Step 2: Run the failing package test**

Run: `pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts`

Expected: FAIL because `commerce.money-pricing` is absent.

- [ ] **Step 3: Create the manifest and declarative adapter**

`component.json` must declare explicit `orderEntity`, `orderLineEntity`,
`catalogEntity`, `customerRole`, and `merchantRole` graph-symbol parameters.
The adapter may only target `api/src/capabilities/commerce.money-pricing.ts`,
`api/prisma/fragments/money-pricing.prisma`, and its matching migration fragment.
Generate SHA-256 values with the existing capability-manifest helpers and copy
the exact values into the TypeScript asset and JSON manifest.

- [ ] **Step 4: Register and verify the package**

Run: `pnpm --filter @factory/capabilities test -- test/capability-registry.test.ts && pnpm --filter @factory/capabilities build`

Expected: PASS; a changed fixture, manifest, template, or undeclared target
fails package verification.

- [ ] **Step 5: Commit the Golden package**

```bash
git add packages/capabilities/src/assets packages/capabilities/assets/commerce.money-pricing packages/capabilities/test/capability-registry.test.ts
git commit -m "feat: add locked money pricing capability package"
```

### Task 3: Compose Money into two Profile Graphs

**Files:**
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/money-pricing-profile.test.ts`
- Modify: `packages/capabilities/test/commercial-profile-composition.test.ts`

**Interfaces:**
- Restaurant binds menu item, order, order line, cashier role, customer role,
  and table-session flow.
- Ecommerce binds catalog item, order, order line, merchant role, shopper role,
  and checkout flow.
- `createCapabilityCompositionLock` must capture the same Money package key,
  version, digest, and package root in both Drafts.

- [ ] **Step 1: Write failing composition tests**

```ts
it("locks the same money package for Restaurant and Ecommerce with distinct bindings", () => {
  const restaurant = composeDefaultCapabilityDraft({ profile: "restaurant-ordering" }).graph;
  const ecommerce = composeDefaultCapabilityDraft({ profile: "simple-ecommerce" }).graph;
  expect(lockedPackage(restaurant, "commerce.money-pricing")).toEqual(
    expect.objectContaining({ version: "1.0.0" }),
  );
  expect(bindingsFor(restaurant, "commerce.money-pricing")).not.toEqual(
    bindingsFor(ecommerce, "commerce.money-pricing"),
  );
});
```

- [ ] **Step 2: Run the failing composition tests**

Run: `pnpm --filter @factory/capabilities test -- test/money-pricing-profile.test.ts`

Expected: FAIL because neither starter selects the new lock.

- [ ] **Step 3: Add only validated recipe bindings**

Add the new selection to the Restaurant and Ecommerce recipe arrays in
`packages/capabilities/src/index.ts`. Reuse existing graph entities/roles; do
not add a profile-name switch to the compiler. Assert the selected inputs exist
and use the capability's declared symbol types.

- [ ] **Step 4: Run composition and historical-lock regressions**

Run: `pnpm --filter @factory/capabilities test -- test/money-pricing-profile.test.ts test/commercial-profile-composition.test.ts`

Expected: PASS; invalid/missing binding and historical profiles without the
new lock retain their prior behavior.

- [ ] **Step 5: Commit the cross-profile recipe change**

```bash
git add packages/capabilities/src/index.ts packages/capabilities/test/money-pricing-profile.test.ts packages/capabilities/test/commercial-profile-composition.test.ts
git commit -m "feat: compose money pricing across commerce profiles"
```

### Task 4: Compile authoritative price snapshots

**Files:**
- Modify: `packages/compiler/src/index.ts`
- Create: `packages/compiler/test/money-pricing-runtime.test.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`

**Interfaces:**
- `resolveMoneyPricingContribution(input)` returns a validated locked package
  contribution or throws before output materialization.
- Generated API exports `quoteOrderPrice` and `allocateOrderRefund`, accepting
  only product identifiers, quantities, and declared promotion IDs.
- Generated Prisma projection stores `PriceSnapshot` and `PriceAllocation` with
  decimal-string minor fields and currency code.

- [ ] **Step 1: Write the failing compiler tests**

```ts
it("emits an authoritative price-snapshot path from the locked Money package", () => {
  const files = filesForPublishedEcommerce();
  expect(files["api/src/capabilities/commerce.money-pricing.ts"]).toContain("quoteOrderPrice");
  expect(files["api/prisma/schema.prisma"]).toContain("model PriceSnapshot");
});

it("rejects a money package contribution outside its declared slot", () => {
  expect(() => generateApplicationBundle(tamperedMoneyLock)).toThrow("contribution");
});
```

- [ ] **Step 2: Run the failing compiler test**

Run: `pnpm --filter @factory/compiler test -- test/money-pricing-runtime.test.ts`

Expected: FAIL because no Money package contribution is resolved.

- [ ] **Step 3: Implement locked contribution resolution and generated code**

Use existing `resolveTargetContributions` and `loadCapabilityAssetContributions`
paths. Validate the Money package interface/version from the composition lock,
render only its declared template/contributions, and derive catalog price on
the generated server. Persist a snapshot before simulated capture; never read
a client-supplied total or unit price.

- [ ] **Step 4: Run compiler verification**

Run: `pnpm --filter @factory/compiler test -- test/money-pricing-runtime.test.ts test/composition-compilation.test.ts && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler build`

Expected: PASS; missing/digest-mismatched/out-of-slot Money contributions fail
before generated output.

- [ ] **Step 5: Commit compiler support**

```bash
git add packages/compiler/src/index.ts packages/compiler/test/money-pricing-runtime.test.ts packages/compiler/test/composition-compilation.test.ts
git commit -m "feat: compile authoritative money price snapshots"
```

### Task 5: Prove isolated Restaurant and Ecommerce journeys

**Files:**
- Modify: `e2e/generated-restaurant.spec.ts`
- Modify: `e2e/generated-ecommerce.spec.ts`
- Modify: `apps/compiler-worker/test/queued-preview-run.test.ts`

**Interfaces:**
- Each test creates a separate Published Graph, immutable composition lock,
  artifact directory, and Compose project.
- Restaurant journey: menu modifier -> quote -> declared promotion/tax ->
  simulated payment -> immutable receipt.
- Ecommerce journey: catalog item -> quote -> checkout -> partial simulated
  refund allocation -> merchant-visible audit record.

- [ ] **Step 1: Write failing generated-app journey assertions**

```ts
await expect(page.getByText("Price snapshot")).toContainText("USD");
await expect(page.getByText("Promotion applied")).toBeVisible();
await expect(page.getByRole("button", { name: "Pay" })).toBeEnabled();
```

Add a direct API attempt that submits an altered total and assert a validation
error plus unchanged order/audit state.

- [ ] **Step 2: Run each journey and verify it fails**

Run: `pnpm test:e2e -- --grep "money pricing"`

Expected: FAIL because current generated apps do not emit the price snapshot
surface or authoritative endpoint.

- [ ] **Step 3: Implement the smallest generated UI projection**

Use existing PageModel blocks and generated API contracts. Display server-returned
snapshot totals and promotion/tax labels; do not add profile-specific React
code, client calculation, or a raw package-config editor.

- [ ] **Step 4: Run isolated Docker E2E and cleanup evidence**

Run: `pnpm test:e2e -- --grep "money pricing"`

Expected: PASS for both applications; their Compose projects, networks, and
volumes are removed by the test cleanup path.

- [ ] **Step 5: Commit generated-product evidence**

```bash
git add e2e/generated-restaurant.spec.ts e2e/generated-ecommerce.spec.ts apps/compiler-worker/test/queued-preview-run.test.ts
git commit -m "test: prove money pricing across generated commerce apps"
```

### Task 6: Release review for Money

**Files:**
- Create: `docs/acceptance/money-pricing-cross-profile.md`
- Modify: `docs/project-status.md`

- [ ] **Step 1: Record only verified evidence**

Document exact package key/version/digest, Profile locks, test commands,
isolated Compose journey IDs, cleanup proof, and any untested real-provider
scope. Do not record raw Graph-Diff prompts/responses or credentials.

- [ ] **Step 2: Run release gates**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm verify:third-party && pnpm verify:source-studies && git diff --check`

Expected: PASS.

- [ ] **Step 3: Run the guarded AI acceptance**

Run the repository's existing guarded real-model Graph-Diff acceptance command
for one Restaurant or Ecommerce Published Graph, reading the key only from
local environment. Assert only the redacted result and validated Graph diff;
do not persist the raw prompt, response, or credential.

- [ ] **Step 4: Commit release evidence**

```bash
git add docs/acceptance/money-pricing-cross-profile.md docs/project-status.md
git commit -m "docs: record money pricing acceptance evidence"
```

# PageModel-generated Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile every supported published `PageModel` route and block into a standalone responsive Next.js application instead of a generic record screen.

**Architecture:** A pure Compiler projection validates the bounded page-block vocabulary and creates a `factory.generated-page-runtime/v1` document. The generated Next.js application contains Factory-owned React components that render that document, with root/catch-all route entry points and no Puck runtime dependency. Existing generated API endpoints, PolicyModel enforcement, FlowModel transitions, and capability handlers remain the only data/action backends.

**Tech Stack:** TypeScript, Next.js, React, Vitest, Playwright, Docker Compose.

## Global Constraints

- `ApplicationGraphV1` remains the sole business source of truth.
- Only `hero`, `form`, `collection`, `catalog`, `cart`, `queue`, and `checkout` are executable v1 page blocks.
- Generated Web packages never import Puck, React Flow, editor source, model output, arbitrary URLs, or arbitrary source code.
- A published Graph with an unsupported block, missing entity binding, or missing required Factory capability fails before an output bundle is returned.
- Generated applications stay responsive, light/dark-aware, keyboard accessible, and role/policy constrained.
- Use fixture-based deterministic verification only; no real model call belongs to this slice.

---

## File map

| File                                                     | Responsibility                                                        |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/compiler/src/page-runtime-projection.ts`       | Validates and derives the bounded page-runtime projection.            |
| `packages/compiler/test/page-runtime-projection.test.ts` | Tests projection determinism and fail-closed validation.              |
| `packages/compiler/src/index.ts`                         | Emits page-runtime source, root/catch-all routes, and responsive CSS. |
| `packages/compiler/test/compilation-plan.test.ts`        | Verifies emitted generated-Web structure and source boundaries.       |
| `e2e/generated-expense.spec.ts`                          | Exercises collection → form → approval route journey.                 |
| `e2e/generated-restaurant.spec.ts`                       | Exercises menu → cart → kitchen route journey.                        |
| `e2e/generated-ecommerce.spec.ts`                        | Exercises catalog → checkout/orders route journey.                    |
| `docs/acceptance/page-model-generated-web.md`            | Records generated-app and isolated browser evidence.                  |

### Task 1: Define a deterministic generated page-runtime projection

**Files:**

- Create: `packages/compiler/src/page-runtime-projection.ts`
- Create: `packages/compiler/test/page-runtime-projection.test.ts`

**Consumes:** A semantically valid `ApplicationGraphV1`.

**Produces:** `createGeneratedPageRuntimeProjection(graph)` and `GeneratedPageRuntimeProjectionV1`.

- [ ] **Step 1: Write failing projection tests**

```ts
const projection = createGeneratedPageRuntimeProjection(
  composeProfileDraft({ profile: "restaurant-ordering" }).graph,
);
expect(projection.apiVersion).toBe("factory.generated-page-runtime/v1");
expect(projection.pages.map((page) => page.route)).toEqual([
  "/menu",
  "/cart",
  "/kitchen",
]);
expect(() =>
  createGeneratedPageRuntimeProjection(unsupportedBlockGraph),
).toThrow("Unsupported PageModel block");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @factory/compiler test -- page-runtime-projection.test.ts`

Expected: FAIL because the projection module does not exist.

- [ ] **Step 3: Implement the bounded projection**

```ts
export function createGeneratedPageRuntimeProjection(
  graph: ApplicationGraphV1,
): GeneratedPageRuntimeProjectionV1 {
  return {
    apiVersion: "factory.generated-page-runtime/v1",
    applicationName: graph.metadata.name,
    themeMode: graph.experience.theme.mode,
    pages: graph.page.pages.map(projectPage),
    navigation: graph.page.navigation.map(projectNavigation),
  };
}
```

Validate block types, entity requirements, and Factory capability requirements before producing the projection. Copy only safe string props (`title`, `eyebrow`, `heading`) and never preserve executable values.

- [ ] **Step 4: Run focused projection tests**

Run: `pnpm --filter @factory/compiler test -- page-runtime-projection.test.ts`

Expected: PASS, including root fallback and missing capability rejection.

- [ ] **Step 5: Commit the projection boundary**

```bash
git add packages/compiler/src/page-runtime-projection.ts packages/compiler/test/page-runtime-projection.test.ts
git commit -m "feat: derive generated page runtime projection"
```

### Task 2: Render published page routes with Factory-owned components

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** `GeneratedPageRuntimeProjectionV1` from Task 1.

**Produces:** `web/app/page-runtime.tsx`, root and catch-all page entrypoints, and generated responsive styles.

- [ ] **Step 1: Write failing generated-source tests**

```ts
expect(files["web/app/page-runtime.tsx"]).toContain(
  "factory.generated-page-runtime/v1",
);
expect(files["web/app/[...path]/page.tsx"]).toContain("GeneratedApplication");
expect(files["web/app/page-runtime.tsx"]).toContain("CollectionBlock");
expect(files["web/app/page-runtime.tsx"]).not.toContain("@puckeditor/core");
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts`

Expected: FAIL because the bundle has only the generic page client.

- [ ] **Step 3: Emit the page runtime and route entrypoints**

```ts
{ path: "web/app/page-runtime.tsx", content: renderPageRuntime(graph) },
{ path: "web/app/page.tsx", content: renderRootPage() },
{ path: "web/app/[...path]/page.tsx", content: renderCatchAllPage() },
```

The runtime must render ordered PageModel blocks, resolve the active declared route, and use only generated API proxy calls. `collection` exposes a derived same-entity form route; `form`, `catalog`, `cart`, `queue`, and `checkout` preserve their bounded existing workflows. No generic all-entity sidebar is emitted.

- [ ] **Step 4: Run Compiler tests and generated Web build**

Run: `pnpm --filter @factory/compiler test && pnpm --filter @factory/compiler build`

Expected: PASS, and a materialized generated Web project builds with Next.js.

- [ ] **Step 5: Commit generated Web rendering**

```bash
git add packages/compiler/src/index.ts packages/compiler/test/compilation-plan.test.ts
git commit -m "feat: render PageModel blocks in generated web apps"
```

### Task 3: Prove profile journeys follow their designed routes

**Files:**

- Modify: `e2e/generated-expense.spec.ts`
- Modify: `e2e/generated-restaurant.spec.ts`
- Modify: `e2e/generated-ecommerce.spec.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`

**Consumes:** Generated source from Task 2.

**Produces:** Browser evidence that the three independent profiles use their published PageModel pages while retaining role journeys.

- [ ] **Step 1: Write failing route-aware browser assertions**

```ts
await page.getByRole("link", { name: "New expense" }).click();
await expect(page).toHaveURL(/\/expenses\/new$/);
await page.getByRole("link", { name: "Kitchen" }).click();
await expect(page).toHaveURL(/\/kitchen$/);
```

- [ ] **Step 2: Run against current generated applications**

Run: `pnpm exec playwright test e2e/generated-expense.spec.ts e2e/generated-restaurant.spec.ts e2e/generated-ecommerce.spec.ts --reporter=line`

Expected: FAIL before Task 2 generated applications are rematerialized because the generic client does not expose the designed route sequence.

- [ ] **Step 3: Update journeys and source-level profile coverage**

Assert the Expense form route, Restaurant menu/cart/kitchen pages, and Ecommerce catalog/checkout/orders pages each emit their declared block types. Keep the existing API actions, role switches, and state assertions.

- [ ] **Step 4: Materialize and run isolated generated profile browsers**

Run the three profile apps under distinct Compose project names and non-default ports. Set only the generated-app URL variables, run the three Playwright journeys, and remove all named projects, volumes, and temporary artifacts.

- [ ] **Step 5: Commit route-aware profile proof**

```bash
git add e2e packages/compiler/test/profile-compilation.test.ts
git commit -m "test: prove generated profile page routes"
```

### Task 4: Record acceptance and release the PageModel projection

**Files:**

- Create: `docs/acceptance/page-model-generated-web.md`
- Modify: `docs/roadmap.md`

**Consumes:** Tasks 1–3.

**Produces:** Reproducible evidence that the visual PageModel affects each generated application independently.

- [ ] **Step 1: Record generated bundle and route evidence**

Document the exact selected Graph block routes, compiler output checks, isolated ports/projects, browser journey totals, and cleanup result. Do not record credentials, raw model input, or raw model output.

- [ ] **Step 2: Run release gates**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm verify:third-party
pnpm verify:source-studies
pnpm exec prettier --check docs/acceptance/page-model-generated-web.md docs/roadmap.md
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Obtain review, commit, and push**

Run:

```bash
git add docs/acceptance/page-model-generated-web.md docs/roadmap.md
git commit -m "docs: accept PageModel generated web projection"
git push origin main
```

## Self-review

- The PageModel remains data; no editor, external component registry, or raw source is included in generated applications.
- Every supported v1 block has a constrained visual and behavior projection.
- Route behavior, compiler rejection, generated Next build, and all three independent profile browser journeys are verified.

# Application Graph Ecosystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the specified open-source ecosystem without allowing any third-party editor, generator, runtime, or repository to replace Factory Pilot's Application Graph.

**Architecture:** Direct dependencies are pinned and consumed through Factory-owned adapters or compilers. Optional authoring and runtime products appear only behind contracts and conformance fixtures. Any copied source requires an immutable source-study record and a focused Factory-owned wrapper; reference-only projects never enter the runtime.

**Tech Stack:** pnpm, Turborepo, Next.js, NestJS, Puck, React Flow, XState, Prisma, node-casbin, Vitest, Docker Compose.

## Global Constraints

- Keep `ApplicationGraphV1` as the source of truth.
- Preserve Draft -> Publish -> immutable Compilation.
- Pin published package versions and retain third-party notices.
- Do not copy source without a source-study record and compatible licence evidence.
- Exclude Amplication `ee/` and all Vendure source/runtime from Factory packages.
- Read real-model credentials only from local environment variables; never persist or report raw prompts, responses, or credentials.
- Use deterministic fixtures in CI; reserve guarded real-model calls for profile acceptance.

---

### Task 1: Establish third-party inventory and notice enforcement

**Files:**

- Create: `docs/third-party-notices.md`
- Create: `docs/ecosystem/source-studies/README.md`
- Modify: `package.json`
- Test: `scripts/verify-third-party-notices.mjs`

**Interfaces:**

- Consumes: dependency manifests in each `apps/*/package.json` and `packages/*/package.json`.
- Produces: `verify-third-party-notices` script that exits non-zero when an adopted direct dependency has no inventory entry.

- [ ] **Step 1: Write the failing inventory test**

```ts
expect(readNoticeKeys()).toContain("@puckeditor/core");
expect(readNoticeKeys()).toContain("@xyflow/react");
expect(readNoticeKeys()).toContain("xstate");
expect(readNoticeKeys()).toContain("prisma");
expect(readNoticeKeys()).toContain("casbin");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run scripts/verify-third-party-notices.test.ts`

Expected: failure because the notices inventory does not exist.

- [ ] **Step 3: Add the inventory and verifier**

```ts
const required = [
  "@puckeditor/core",
  "@xyflow/react",
  "xstate",
  "prisma",
  "casbin",
];
const missing = required.filter((key) => !noticeKeys.has(key));
if (missing.length > 0)
  throw new Error(`Missing third-party notices: ${missing.join(", ")}`);
```

- [ ] **Step 4: Run the verifier**

Run: `pnpm verify:third-party`

Expected: success and no credential content in the generated output.

- [ ] **Step 5: Commit**

```bash
git add docs/third-party-notices.md docs/ecosystem/source-studies/README.md package.json scripts
git commit -m "docs: record direct ecosystem dependencies"
```

### Task 2: Complete direct-toolchain conformance tests

**Files:**

- Modify: `packages/adapters/test/graph-editor-adapters.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `packages/graph/test/application-graph.test.ts`

**Interfaces:**

- Consumes: `pageModelToPuckDocument`, `puckDocumentToPageModel`, `flowModelToReactFlow`, `generateApplicationBundle`, and `validateApplicationGraph`.
- Produces: conformance tests proving that direct integrations project Graph data without owning it.

- [ ] **Step 1: Write failing isolation tests**

```ts
expect(puckDocumentToPageModel(puckDocument)).toEqual(graph.page);
expect(flowModelToReactFlow(graph.flow).edges).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      data: expect.objectContaining({ event: "submit" }),
    }),
  ]),
);
expect(() => validateApplicationGraph(persistedPuckDocument)).toThrow();
```

- [ ] **Step 2: Run focused tests**

Run: `pnpm --filter @factory/adapters test && pnpm --filter @factory/graph test`

Expected: failure until the invalid persisted external format is explicitly rejected.

- [ ] **Step 3: Implement only the Graph-first validation and adapters needed**

```ts
export function assertApplicationGraphInput(
  input: unknown,
): ApplicationGraphV1 {
  return ApplicationGraphV1Schema.parse(input);
}
```

- [ ] **Step 4: Re-run focused and workspace tests**

Run: `pnpm --filter @factory/adapters test && pnpm --filter @factory/graph test && pnpm test`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters packages/compiler packages/graph
git commit -m "test: enforce Graph-first ecosystem adapters"
```

### Task 3: Build authoring-adapter contracts before adding Blockly, BPMN, or GrapesJS

**Files:**

- Create: `packages/adapters/src/authoring-contract.ts`
- Create: `packages/adapters/test/authoring-contract.test.ts`
- Create: `docs/ecosystem/contracts/authoring-adapter-v1.md`

**Interfaces:**

- Produces: `AuthoringAdapterV1<TDocument>` with `exportGraph` and `importGraph` methods that operate on declared Graph fragments.

- [ ] **Step 1: Write failing contract tests**

```ts
expect(() =>
  adapter.importGraph({
    kind: "script",
    code: "fetch('https://example.test')",
  }),
).toThrow("Unsupported authoring document");
expect(adapter.exportGraph(flowModel)).toEqual(
  expect.objectContaining({ apiVersion: "factory.authoring-adapter/v1" }),
);
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @factory/adapters test -- authoring-contract.test.ts`

Expected: failure because no contract exists.

- [ ] **Step 3: Implement the constrained contract**

```ts
export interface AuthoringAdapterV1<TDocument> {
  readonly key: string;
  exportGraph(fragment: PageModel | FlowModel): TDocument;
  importGraph(document: unknown): PageModel | FlowModel;
}
```

- [ ] **Step 4: Verify rejection and round trips**

Run: `pnpm --filter @factory/adapters test`

Expected: both valid round trips and invalid executable document rejection pass.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters docs/ecosystem/contracts
git commit -m "feat: define constrained authoring adapter contract"
```

### Task 4: Add provider-contract conformance harness

**Files:**

- Create: `packages/adapters/src/provider-contract.ts`
- Create: `packages/adapters/test/provider-contract.test.ts`
- Create: `docs/ecosystem/contracts/runtime-provider-v1.md`

**Interfaces:**

- Produces: `RuntimeProviderV1` with provider metadata, a Graph-to-provider projection, fixture execution, and teardown.

- [ ] **Step 1: Write a failing fixture-provider test**

```ts
const result = await fixtureProvider.compile(publishedGraph);
expect(result.providerKey).toBe("fixture-native");
expect(result.graphHash).toBe(hashApplicationGraph(publishedGraph));
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @factory/adapters test -- provider-contract.test.ts`

Expected: failure because the provider contract does not exist.

- [ ] **Step 3: Implement the contract and fixture provider**

```ts
export interface RuntimeProviderV1 {
  readonly key: string;
  readonly version: string;
  compile(graph: ApplicationGraphV1): Promise<ProviderCompilationResult>;
  teardown(result: ProviderCompilationResult): Promise<void>;
}
```

- [ ] **Step 4: Run adapter tests**

Run: `pnpm --filter @factory/adapters test`

Expected: fixture provider tests pass without an Appwrite, Medusa, or OpenFGA service.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters docs/ecosystem/contracts
git commit -m "feat: add replaceable runtime provider contract"
```

### Task 5: Create the Amplication and Medusa source-study records

**Files:**

- Create: `docs/ecosystem/source-studies/amplication-amplication-7656495d27f0dceff89657590c3f14149e45c7a6.md`
- Create: `docs/ecosystem/source-studies/medusajs-medusa-dde167d0be4c23ed37aa7a3d71721728e31f3e96.md`
- Modify: `docs/third-party-notices.md`

**Interfaces:**

- Consumes: immutable upstream commit SHAs and authoritative licence files.
- Produces: zero-or-more approved source fragments; until then, research-only records.

- [ ] **Step 1: Create failing study-completeness assertions**

```ts
expect(study.commit).toMatch(/^[0-9a-f]{40}$/);
expect(study.paths.every((path) => !path.startsWith("ee/"))).toBe(true);
expect(study.decision).toBe("reference-only");
```

- [ ] **Step 2: Run the study verifier**

Run: `pnpm verify:source-studies`

Expected: failure until both exact immutable studies exist.

- [ ] **Step 3: Record exact commits and legal decisions**

```md
## Decision

No upstream source is copied in this slice. The study identifies patterns only;
Factory-owned implementations remain independently written and tested.
```

- [ ] **Step 4: Run the verifier**

Run: `pnpm verify:source-studies`

Expected: success, with no snapshot or third-party source added to runtime paths.

- [ ] **Step 5: Commit**

```bash
git add docs/ecosystem docs/third-party-notices.md scripts
git commit -m "docs: record ecosystem source studies"
```

### Task 6: Add the OpenFGA provider only after an independently accepted profile

**Files:**

- Create: `packages/adapters/src/openfga-provider.ts`
- Create: `packages/adapters/test/openfga-provider.test.ts`
- Modify: `docs/roadmap.md`

**Interfaces:**

- Consumes: `RuntimeProviderV1`, a Published Graph, capability contracts, and a provider-specific fixture.
- Produces: provider compilation metadata without changing Graph semantics.

- [ ] **Step 1: Write a failing OpenFGA conformance test**

```ts
await expect(openFgaProvider.compile(publishedGraph)).resolves.toEqual(
  expect.objectContaining({ graphHash: hashApplicationGraph(publishedGraph) }),
);
await expect(
  openFgaProvider.compile(mutableDraft as ApplicationGraphV1),
).rejects.toThrow("Published revision required");
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm --filter @factory/adapters test -- openfga-provider.test.ts`

Expected: failure until that provider adapter exists.

- [ ] **Step 3: Implement the minimal optional adapter**

```ts
export const openFgaProvider: RuntimeProviderV1 = {
  key: "openfga",
  version: "1",
  async compile(graph) {
    return compileFixtureProjection(graph);
  },
  async teardown(result) {
    await destroyFixtureProjection(result);
  },
};
```

- [ ] **Step 4: Run profile and provider tests**

Run: `pnpm test && pnpm --filter @factory/capabilities test`

Expected: existing native profiles remain green without the optional provider.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters packages/capabilities docs/roadmap.md
git commit -m "feat: add optional OpenFGA contract adapter"
```

### Task 7: Add Appwrite and Medusa provider contracts in separate reviewable slices

**Files:**

- Create: `packages/adapters/src/appwrite-provider.ts`
- Create: `packages/adapters/test/appwrite-provider.test.ts`
- Create: `packages/adapters/src/medusa-provider.ts`
- Create: `packages/adapters/test/medusa-provider.test.ts`
- Modify: `docs/ecosystem/open-source-adoption.md`

**Interfaces:**

- Consumes: `RuntimeProviderV1`, Published Graph capability requirements, and
  provider-specific fixtures.
- Produces: optional Appwrite and Medusa projections that remain replaceable by
  the native compiler and do not read provider-owned applications back into a
  Factory Graph.

- [ ] **Step 1: Write failing Appwrite and Medusa fixture tests**

```ts
for (const provider of [appwriteProvider, medusaProvider]) {
  await expect(provider.compile(publishedGraph)).resolves.toEqual(
    expect.objectContaining({
      graphHash: hashApplicationGraph(publishedGraph),
    }),
  );
}
```

- [ ] **Step 2: Run the focused tests**

Run: `pnpm --filter @factory/adapters test -- appwrite-provider.test.ts medusa-provider.test.ts`

Expected: failure because neither provider adapter exists.

- [ ] **Step 3: Implement fixture-only projections**

```ts
export const appwriteProvider = createFixtureRuntimeProvider({
  key: "appwrite",
  version: "1",
});
export const medusaProvider = createFixtureRuntimeProvider({
  key: "medusa",
  version: "1",
});
```

- [ ] **Step 4: Verify provider isolation**

Run: `pnpm --filter @factory/adapters test && pnpm --filter @factory/capabilities test`

Expected: provider tests pass without Appwrite or Medusa services, and all
native-profile compilation tests remain green.

- [ ] **Step 5: Commit**

```bash
git add packages/adapters docs/ecosystem/open-source-adoption.md
git commit -m "feat: add optional Appwrite and Medusa contracts"
```

## Spec coverage review

- Direct integrations: Tasks 1 and 2.
- Blockly, BPMN, and GrapesJS authoring path: Task 3.
- Appwrite, OpenFGA, and Medusa provider isolation: Tasks 4 and 6.
- Amplication study and `ee/` exclusion: Task 5.
- Vendure GPL exclusion: global constraints, adoption register, and no Task 6 implementation for Vendure.
- Licence/provenance enforcement: Tasks 1 and 5.

No whole-repository copy is approved by this plan. Any later request to copy an
upstream fragment starts a new source-study task with exact paths, commit,
licence decision, notice, tests, and explicit review.

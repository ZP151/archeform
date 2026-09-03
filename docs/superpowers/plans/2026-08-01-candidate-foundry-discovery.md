# Candidate Foundry Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Factory Pilot discover, triage, and safely expose external
capability supply without letting sources, Candidates, or Provider metadata
cross into an Application Graph, Golden lock, compiler, or generated runtime.

**Architecture:** Extend the quarantine-only `@factory/external-intake` package
with canonical Discovery Records, deterministic triage, bounded batch creation,
and source-free Candidate port scaffolds. The local Intake CLI owns fixture and
GitHub metadata discovery. `@factory/portfolio-public`, the Control Plane, and
the Workbench Home receive only a redacted capability-supply aggregate.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, Next.js, existing Factory
External Intake file store, existing GitHub metadata fetch boundary.

## Global Constraints

- Keep credentials in local environment files only; never render, persist,
  commit, log, or report credentials or raw AI data.
- Preserve Draft -> Publish -> immutable Compilation. Candidate and discovery
  records are never Graph data and can never compile.
- Add no source copying, dependency installation, Provider activation, Golden
  promotion, or generated-runtime behavior.
- Discovery and intake are quarantine tooling only. Do not import
  `@factory/external-intake` from Graph, capabilities, compiler, generated
  runtime, Control Plane, or Worker runtime.
- Use fixture-first tests. Live GitHub discovery is manually invoked only and
  reads a token solely from `FACTORY_GITHUB_READ_TOKEN` when present.
- Public summaries must exclude URLs, raw source metadata, module paths,
  source text, scan output, credentials, prompts, and responses.

---

## File structure

| Path                                                                                                                                                   | Responsibility                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `packages/external-intake/src/discovery.ts`                                                                                                            | Discovery schemas, immutable-record validation, deterministic scoring, batch conversion, and public-safe aggregation inputs. |
| `packages/external-intake/src/discovery-scaffold.ts`                                                                                                   | Declarative candidate port scaffold generated from verified Candidate evidence; contains no source body or executable code.  |
| `packages/external-intake/src/index.ts`                                                                                                                | Quarantine-only exports for Discovery contracts and scaffold APIs.                                                           |
| `packages/external-intake/test/discovery.test.ts`                                                                                                      | Contract, ordering, score, blocker, cap, duplicate, and redaction tests.                                                     |
| `packages/external-intake/test/discovery-scaffold.test.ts`                                                                                             | Scaffold determinism and source-free boundary tests.                                                                         |
| `apps/intake-cli/src/github-discovery-client.ts`                                                                                                       | GitHub public-metadata adapter, restricted to the existing API-host token fetch.                                             |
| `apps/intake-cli/src/main.ts`                                                                                                                          | New bounded discovery commands and context-specific redacted CLI output.                                                     |
| `apps/intake-cli/test/discovery-cli.test.ts`                                                                                                           | Fixture discovery, safe output, and invalid command tests.                                                                   |
| `packages/portfolio-public/src/summary.ts`                                                                                                             | Static source-free Capability Supply Queue projection.                                                                       |
| `packages/portfolio-public/test/summary.test.ts`                                                                                                       | Projection schema and source-redaction tests.                                                                                |
| `apps/control-plane/src/portfolio/portfolio-summary.service.ts`                                                                                        | Adds public supply projection to Workspace Portfolio Summary.                                                                |
| `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`                                                                                   | Verifies summary shape and source-free response.                                                                             |
| `apps/workbench/lib/control-plane-client.ts`                                                                                                           | Strict parsing for the supply projection.                                                                                    |
| `apps/workbench/lib/portfolio-summary.ts`                                                                                                              | Converts safe supply records into Home view model.                                                                           |
| `apps/workbench/components/workbench-home.tsx`                                                                                                         | Read-only Capability Supply Queue card.                                                                                      |
| `apps/workbench/lib/control-plane-client.test.ts`, `apps/workbench/lib/portfolio-summary.test.ts`, `apps/workbench/components/workbench-home.test.tsx` | Parser, mapping, and rendered UI evidence.                                                                                   |

## Shared interfaces

```ts
export const capabilityFamilyKeys = [
  "identity",
  "catalog",
  "commerce-transaction",
  "inventory",
  "availability",
  "queue",
  "payment",
  "fulfillment",
  "notification",
  "document",
  "search",
  "analytics",
  "integration",
] as const;

export type DiscoveryRecordV1 = {
  readonly apiVersion: "factory.discovery-record/v1";
  readonly id: string;
  readonly discoveredAt: string;
  readonly sourceKind: "repository" | "package" | "template" | "provider";
  readonly sourceHost: "github" | "npm" | "artifact-hub" | "official-provider";
  readonly immutableReference: {
    readonly canonicalIdentifier: string;
    readonly resolvedVersionOrCommit: string;
    readonly integrity?: `sha256:${string}`;
  };
  readonly declaredLicense: string | null;
  readonly familyHints: readonly CapabilityFamilyKey[];
  readonly profileHints: readonly FactoryProfile[];
  readonly reuseMode: DiscoveryReuseModeV1;
  readonly triage: {
    readonly score: number;
    readonly status: "eligible" | "blocked" | "reference-only";
    readonly gateCategories: readonly DiscoveryGateCategoryV1[];
  };
  readonly metadataDigest: `sha256:${string}`;
};

export type CandidateFoundryScaffoldV1 = {
  readonly apiVersion: "factory.candidate-foundry-scaffold/v1";
  readonly candidate: { readonly id: string; readonly version: string };
  readonly mode:
    "direct-dependency" | "provider-adapter" | "selective-source-copy";
  readonly targetCapability: string;
  readonly sourcePortPlan?: CandidatePortPlanV1;
  readonly requiredArtifacts: readonly [
    "manifest",
    "fixture",
    "adapter",
    "conformance-plan",
  ];
};
```

`FactoryProfile` is imported from `@factory/capabilities`; its values remain
the five registered Profile IDs. `canonicalIdentifier` is quarantine-only and
must not appear in `CapabilitySupplySummaryV1`, Control Plane responses, or
Workbench state.

### Task 1: Discovery contract and deterministic triage

**Files:**

- Create: `packages/external-intake/src/discovery.ts`
- Create: `packages/external-intake/test/discovery.test.ts`
- Modify: `packages/external-intake/src/index.ts`

**Interfaces:**

- Consumes: `canonicalRecordDigest`, `parseIntakeRequest`, and
  `ExternalIntakeBatchV1` from existing External Intake contracts.
- Produces: `parseDiscoveryRecord`, `triageDiscoveryRecord`,
  `createDiscoveryIntakeBatch`, `summarizeDiscoveryRecords`, and the public
  Discovery Record types.

- [ ] **Step 1: Write the failing Discovery contract tests**

```ts
it("creates the same eligible discovery record and digest from equivalent metadata", () => {
  const first = createDiscoveryRecord(fixtureRepository);
  const second = createDiscoveryRecord(structuredClone(fixtureRepository));
  expect(first).toEqual(second);
  expect(first.triage).toMatchObject({ status: "eligible" });
  expect(first.metadataDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
});

it("blocks a floating reference without preventing an eligible sibling", () => {
  const result = triageDiscoveryRecords([
    fixtureFloatingRef,
    fixtureRepository,
  ]);
  expect(result.byId["floating-source"]?.triage.status).toBe("blocked");
  expect(result.byId["eligible-source"]?.triage.status).toBe("eligible");
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @factory/external-intake test -- test/discovery.test.ts`

Expected: FAIL because `discovery.ts` exports do not exist.

- [ ] **Step 3: Implement the strict schemas and triage functions**

```ts
export function triageDiscoveryRecord(
  input: DiscoveryRecordInputV1,
): DiscoveryRecordV1 {
  const parsed = discoveryInputSchema.parse(input);
  const gateCategories = blockedGateCategories(parsed);
  const status =
    gateCategories.length > 0
      ? "blocked"
      : parsed.reuseMode === "reference-only"
        ? "reference-only"
        : "eligible";
  return Object.freeze({
    ...normaliseDiscoveryInput(parsed),
    triage: Object.freeze({
      score: scoreDiscovery(parsed, status),
      status,
      gateCategories,
    }),
    metadataDigest: canonicalRecordDigest(
      normaliseDiscoveryDigestInput(parsed),
    ),
  });
}
```

The implementation must reject floating refs, duplicate family/profile hints,
unsafe identifiers, unsupported host/mode combinations, unknown license
classes for executable modes, and any source-shaped arbitrary field.

- [ ] **Step 4: Add ordering, duplicate, and 1,000-item cap tests**

```ts
it("sorts eligible records by score then id and caps a batch at one thousand", () => {
  const batch = createDiscoveryIntakeBatch(records);
  expect(batch.requests).toHaveLength(1000);
  expect(batch.requests.map((entry) => entry.source.portfolioRecord)).toEqual(
    expectedSortedIds,
  );
});

it("rejects two records that name the same canonical identity", () => {
  expect(() => createDiscoveryIntakeBatch([first, duplicate])).toThrow(
    "Discovery canonical identity is duplicated.",
  );
});
```

- [ ] **Step 5: Run the focused test to verify GREEN**

Run: `pnpm --filter @factory/external-intake test -- test/discovery.test.ts`

Expected: PASS with every discovery contract test green.

- [ ] **Step 6: Commit the bounded contract slice**

```bash
git add packages/external-intake/src/discovery.ts \
  packages/external-intake/src/index.ts \
  packages/external-intake/test/discovery.test.ts
git commit -m "feat(intake): add deterministic discovery triage"
```

### Task 2: Quarantined Candidate Foundry scaffold

**Files:**

- Create: `packages/external-intake/src/discovery-scaffold.ts`
- Create: `packages/external-intake/test/discovery-scaffold.test.ts`
- Modify: `packages/external-intake/src/index.ts`

**Interfaces:**

- Consumes: an evidenced `CandidateProposalV1` and existing
  `createCandidatePortPlan`.
- Produces: `createCandidateFoundryScaffold` returning
  `CandidateFoundryScaffoldV1` only.

- [ ] **Step 1: Write the failing scaffold tests**

```ts
it("creates a source-free deterministic selective-port scaffold", () => {
  const scaffold = createCandidateFoundryScaffold({
    portfolio,
    sourceId,
    candidate,
  });
  expect(scaffold).toMatchObject({
    apiVersion: "factory.candidate-foundry-scaffold/v1",
    mode: "selective-source-copy",
    targetCapability: candidate.proposedFactoryKey,
  });
  expect(JSON.stringify(scaffold)).not.toMatch(
    /sourceText|repositoryUrl|secret|token/i,
  );
});

it("rejects a Candidate whose evidence module is not safe for a source port", () => {
  expect(() => createCandidateFoundryScaffold(unsafeModuleInput)).toThrow(
    "Candidate port plan selected module is absent from completed safe evidence.",
  );
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @factory/external-intake test -- test/discovery-scaffold.test.ts`

Expected: FAIL because the Foundry scaffold export does not exist.

- [ ] **Step 3: Implement the declarative scaffold only**

```ts
export function createCandidateFoundryScaffold(
  input: CreateCandidateFoundryScaffoldInputV1,
): CandidateFoundryScaffoldV1 {
  const portPlan = createCandidatePortPlan(input);
  return Object.freeze({
    apiVersion: "factory.candidate-foundry-scaffold/v1",
    candidate: Object.freeze({ ...portPlan.candidate }),
    mode: portPlan.reuseMode,
    targetCapability: portPlan.targetCapability,
    ...(portPlan.reuseMode === "selective-source-copy"
      ? { sourcePortPlan: portPlan }
      : {}),
    requiredArtifacts: Object.freeze([
      "manifest",
      "fixture",
      "adapter",
      "conformance-plan",
    ]),
  });
}
```

Do not create a package path, write files, include source body, select a
Golden asset, or add an executable contribution.

- [ ] **Step 4: Add negative boundary tests**

```ts
it.each(["graph", "assetLocks", "compiler", "runtime", "provider"])(
  "does not emit a %s authority field",
  (forbidden) => expect(JSON.stringify(scaffold)).not.toContain(forbidden),
);
```

- [ ] **Step 5: Run the focused test to verify GREEN**

Run: `pnpm --filter @factory/external-intake test -- test/discovery-scaffold.test.ts`

Expected: PASS with all source-free scaffold tests green.

- [ ] **Step 6: Commit the scaffold slice**

```bash
git add packages/external-intake/src/discovery-scaffold.ts \
  packages/external-intake/src/index.ts \
  packages/external-intake/test/discovery-scaffold.test.ts
git commit -m "feat(intake): scaffold quarantined candidate ports"
```

### Task 3: Fixture and GitHub metadata discovery through Intake CLI

**Files:**

- Create: `apps/intake-cli/src/github-discovery-client.ts`
- Create: `apps/intake-cli/test/discovery-cli.test.ts`
- Modify: `apps/intake-cli/src/main.ts`
- Modify: `apps/intake-cli/test/github-source-client.test.ts`

**Interfaces:**

- Consumes: `createEnvironmentGitHubSourceClient` token-host restriction and
  the Task 1 discovery contract.
- Produces: `discovery fixture --file <local-json>` and
  `discovery github --family <family-key>` read-only commands.

- [ ] **Step 1: Write failing CLI output tests**

```ts
it("prints only opaque discovery counts and gate categories for a fixture run", async () => {
  const result = await runIntakeCli(
    ["discovery", "fixture", "--file", "fixtures/discovery.json"],
    options,
  );
  expect(result).toBe(0);
  expect(stdout()).toContain('"eligible":1');
  expect(stdout()).not.toMatch(
    /github\.com|canonicalIdentifier|token|sourceText/i,
  );
});

it("rejects an unregistered family before it invokes GitHub", async () => {
  await expect(
    runIntakeCli(["discovery", "github", "--family", "unknown"], options),
  ).resolves.toBe(2);
  expect(fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @factory/intake-cli test -- test/discovery-cli.test.ts`

Expected: FAIL because the discovery commands and output context are absent.

- [ ] **Step 3: Implement a bounded discovery client and commands**

```ts
const githubDiscoveryQueries: Readonly<Record<CapabilityFamilyKey, string>> = {
  identity: "topic:identity language:TypeScript archived:false",
  catalog: "topic:catalog language:TypeScript archived:false",
  // Every remaining family has a Factory-owned fixed query string.
};

if (args[0] === "discovery" && args[1] === "fixture" && args[2] === "--file") {
  result = discoveryOutput(
    createDiscoveryRecords(localJson(args[3], options.cwd)),
  );
  outputContext = "discovery";
}
```

The GitHub client must use the existing API-host-only token fetch, accept no
caller-provided query or URL, reject pagination beyond a fixed page limit, and
return normalised metadata only. Add a dedicated `discovery` redaction context
that permits IDs, counts, stages, family keys, and gate categories only.

- [ ] **Step 4: Add host, pagination, and redaction tests**

```ts
it("never forwards the configured GitHub token to a non-API URL", async () => {
  await client.discover("catalog");
  expect(nonApiRequest.headers.get("authorization")).toBeNull();
});

it("returns a redacted blocked receipt when one repository result is malformed", async () => {
  const output = await fixtureDiscoveryWithMalformedSibling();
  expect(output.blocked).toBe(1);
  expect(output.eligible).toBe(1);
});
```

- [ ] **Step 5: Run the CLI and client tests to verify GREEN**

Run: `pnpm --filter @factory/intake-cli test -- test/discovery-cli.test.ts test/github-source-client.test.ts`

Expected: PASS without any live network request.

- [ ] **Step 6: Commit the CLI slice**

```bash
git add apps/intake-cli/src/github-discovery-client.ts \
  apps/intake-cli/src/main.ts \
  apps/intake-cli/test/discovery-cli.test.ts \
  apps/intake-cli/test/github-source-client.test.ts
git commit -m "feat(intake-cli): discover quarantined capability sources"
```

### Task 4: Source-free Capability Supply Queue contract and API

**Files:**

- Modify: `packages/portfolio-public/src/summary.ts`
- Modify: `packages/portfolio-public/test/summary.test.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`

**Interfaces:**

- Consumes: Factory-owned static safe supply records from Portfolio Public.
- Produces: `CapabilitySupplySummaryV1` nested in
  `WorkspacePortfolioSummaryV1` as `supply`.

- [ ] **Step 1: Write failing Portfolio Public and Control Plane tests**

```ts
expect(portfolioPublicSummary.supply).toEqual({
  apiVersion: "factory.capability-supply-summary/v1",
  families: expect.arrayContaining([
    expect.objectContaining({
      key: "commerce-transaction",
      profiles: [
        "restaurant-ordering",
        "simple-ecommerce",
        "retail-counter",
        "grocery-pickup",
      ],
    }),
  ]),
});
expect(JSON.stringify(portfolioPublicSummary.supply)).not.toMatch(
  /url|path|source|token|prompt|response/i,
);
```

- [ ] **Step 2: Run the focused tests to verify RED**

Run: `pnpm --filter @factory/portfolio-public test -- test/summary.test.ts; pnpm --filter @factory/control-plane test -- test/portfolio-summary.service.test.ts`

Expected: FAIL because `supply` is absent from both contracts.

- [ ] **Step 3: Implement the fixed safe projection**

```ts
export type CapabilitySupplySummaryV1 = {
  readonly apiVersion: "factory.capability-supply-summary/v1";
  readonly families: readonly {
    readonly key: CapabilityFamilyKey;
    readonly profiles: readonly FactoryProfile[];
    readonly discovery: number;
    readonly quarantined: number;
    readonly blocked: number;
    readonly action: CapabilitySupplyActionV1;
  }[];
};
```

Populate it from known Factory family/profile mappings and aggregate counts
only. Do not import External Intake into the Control Plane.

- [ ] **Step 4: Add malformed and source-shaped response rejection tests**

```ts
expect(() =>
  workspacePortfolioSummary({
    ...valid,
    supply: { families: [{ key: "catalog", canonicalIdentifier: "blocked" }] },
  }),
).toThrow("Control Plane Capability supply is invalid.");
```

- [ ] **Step 5: Run the focused tests to verify GREEN**

Run: `pnpm --filter @factory/portfolio-public test -- test/summary.test.ts; pnpm --filter @factory/control-plane test -- test/portfolio-summary.service.test.ts`

Expected: PASS with source-free summary assertions green.

- [ ] **Step 6: Commit the public projection slice**

```bash
git add packages/portfolio-public/src/summary.ts \
  packages/portfolio-public/test/summary.test.ts \
  apps/control-plane/src/portfolio/portfolio-summary.service.ts \
  apps/control-plane/src/portfolio/portfolio-summary.service.test.ts
git commit -m "feat(portfolio): expose capability supply summary"
```

### Task 5: Workbench Home Capability Supply Queue

**Files:**

- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/portfolio-summary.ts`
- Modify: `apps/workbench/lib/portfolio-summary.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`

**Interfaces:**

- Consumes: Task 4 `supply` payload only.
- Produces: a read-only Home panel with Factory family, affected Profiles,
  counts, and fixed next-action label.

- [ ] **Step 1: Write failing parser and rendering tests**

```tsx
it("renders the capability supply queue without source-origin data", () => {
  render(<WorkbenchHome {...props} portfolioSummary={summaryWithSupply} />);
  expect(
    screen.getByRole("heading", { name: "Capability supply" }),
  ).toBeVisible();
  expect(screen.getByText("commerce-transaction")).toBeVisible();
  expect(screen.getByText("evidence required")).toBeVisible();
  expect(
    screen.queryByText(/github|http|sha256|path/i),
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @factory/workbench test -- lib/control-plane-client.test.ts lib/portfolio-summary.test.ts components/workbench-home.test.tsx`

Expected: FAIL because the Workbench parser and Home model do not know `supply`.

- [ ] **Step 3: Add strict client parsing and Home mapping**

```ts
const supply = parseCapabilitySupply(record.supply);
return {
  apiVersion: "factory.workspace-portfolio-summary/v1",
  profiles,
  readiness,
  capabilities,
  intake,
  supply,
  compilations,
};
```

Accept only the Task 4 API version, family-key allowlist, registered Profile
IDs, non-negative count fields, and six fixed action labels. Reject unknown
keys and all source-shaped fields.

- [ ] **Step 4: Render the compact read-only panel**

```tsx
<section aria-labelledby="home-capability-supply" style={sectionStyle}>
  <h2 id="home-capability-supply">Capability supply</h2>
  {portfolio.supply.map((family) => (
    <article key={family.key} aria-label={`${family.key} supply`}>
      <strong>{family.key}</strong>
      <span>{family.action}</span>
      <span>{family.profiles.join(" · ")}</span>
    </article>
  ))}
</section>
```

The panel must have no button, network trigger, URL, source name, or code
viewer. Follow existing light and dark token styles rather than adding a new
design system.

- [ ] **Step 5: Run focused parser and UI tests to verify GREEN**

Run: `pnpm --filter @factory/workbench test -- lib/control-plane-client.test.ts lib/portfolio-summary.test.ts components/workbench-home.test.tsx`

Expected: PASS with malformed payload rejection and safe rendering tests green.

- [ ] **Step 6: Run typecheck, lint, and commit**

Run: `pnpm --filter @factory/workbench typecheck; pnpm --filter @factory/workbench lint`

Expected: PASS.

```bash
git add apps/workbench/lib/control-plane-client.ts \
  apps/workbench/lib/control-plane-client.test.ts \
  apps/workbench/lib/portfolio-summary.ts \
  apps/workbench/lib/portfolio-summary.test.ts \
  apps/workbench/components/workbench-home.tsx \
  apps/workbench/components/workbench-home.test.tsx
git commit -m "feat(workbench): show capability supply queue"
```

### Task 6: Boundary regression and release evidence

**Files:**

- Modify: `packages/external-intake/test/release-boundary.test.ts`
- Modify: `docs/project-status.md`

**Interfaces:**

- Consumes: all prior tasks.
- Produces: proof that Discovery and Candidate scaffolding remain
  quarantine-only, plus truthful capability-supply status.

- [ ] **Step 1: Write failing release-boundary assertions**

```ts
it("permits Discovery imports only in quarantine tooling and public-safe aggregate code", () => {
  expect(forbiddenRuntimeImports()).toEqual([]);
  expect(generatedApplicationReferences()).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm --filter @factory/external-intake test -- test/release-boundary.test.ts`

Expected: FAIL until the boundary scanner recognises the new quarantine-only
Discovery files and rejects the prohibited runtime import paths.

- [ ] **Step 3: Update the boundary allowlist and truthful project status**

Add only the new quarantine paths to the release-boundary fixture. Update
project status with actual focused/full verification commands, the safe Home
projection, and the fact that no Candidate is Golden or executable.

- [ ] **Step 4: Run focused gates to verify GREEN**

Run: `pnpm --filter @factory/external-intake test -- test/release-boundary.test.ts; pnpm --filter @factory/external-intake typecheck; pnpm --filter @factory/intake-cli typecheck; pnpm --filter @factory/portfolio-public typecheck; pnpm --filter @factory/control-plane typecheck; pnpm --filter @factory/workbench typecheck`

Expected: PASS.

- [ ] **Step 5: Run the full workspace regression**

Run: `pnpm test`

Expected: exit 0. Record whether Turbo executed or replayed each relevant task;
do not treat cached output as generated-application release acceptance.

- [ ] **Step 6: Commit the verification and status slice**

```bash
git add packages/external-intake/test/release-boundary.test.ts docs/project-status.md
git commit -m "test(intake): enforce candidate foundry boundary"
```

## Plan self-review

- **Spec coverage:** Tasks 1–3 implement Discovery, triage, bounded batches,
  fixture/GitHub adapter, and declarative Candidate scaffolds. Tasks 4–5 expose
  only safe aggregate capability supply on the Home. Task 6 protects the
  quarantine boundary and records evidence.
- **No placeholders:** every task names paths, functions, test behavior,
  commands, and commits. No source copying, automatic Golden promotion, or
  runtime integration is hidden in a later step.
- **Type consistency:** Task 1 defines `DiscoveryRecordV1`; Task 2 consumes
  existing `CandidateProposalV1` / `CandidatePortPlanV1`; Tasks 4–5 project a
  new source-free `CapabilitySupplySummaryV1` without importing External Intake
  into product runtime paths.

## Execution handoff

Plan saved to
`docs/superpowers/plans/2026-08-01-candidate-foundry-discovery.md`.

Default execution mode is **inline, task-by-task**, because this slice changes
shared contracts and the current session owns the active integration context.
Independent task review follows each task; only Tasks 1–3 may overlap after
their shared contract is frozen.

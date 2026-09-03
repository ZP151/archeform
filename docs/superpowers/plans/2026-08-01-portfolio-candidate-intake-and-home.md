# Portfolio Candidate Intake and Workspace Portfolio Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Turn verified external Portfolio evidence into a non-promoting Candidate proposal and expose safe Profile, capability, source-intake, and compilation summaries on Workbench Home.

**Architecture:** @factory/external-intake owns deterministic Candidate-proposal construction from exact Portfolio metadata and completed evidence. A new @factory/portfolio-public package publishes only fixed safe counts and labels; External Intake verifies it against the internal Portfolio. The NestJS Control Plane consumes that public package, never @factory/external-intake, to expose a read-only aggregate summary. Workbench Home renders that typed summary beside existing applications. No raw source content, Candidate artifact, credential, AI payload, Provider configuration, or mutable Graph is returned to the browser.

**Tech Stack:** TypeScript, Zod, Vitest, NestJS, Prisma, Next.js, React, Lucide, pnpm/Turborepo.

## Global Constraints

- The Application Graph is the source of truth; external repositories are never Graph, compiler, or generated-runtime inputs.
- Preserve Draft -> Publish -> immutable Compilation. A Candidate cannot mutate a Draft or compile an application.
- Keep credentials, raw prompts, raw model responses, and raw downloaded source out of records, logs, browser state, fixtures, artifacts, screenshots, and documentation.
- Candidate artifacts remain declarative and use only candidate.observe, candidate.project, and candidate.validate effects.
- Do not copy external source, add a Git submodule, add a Provider runtime, or promote a Candidate to Golden in this plan.
- Code, tests, UI text, and documentation are English.

---

## File structure

- packages/external-intake/src/portfolio.ts: strict Portfolio schema and exact intake-request/batch construction.
- packages/external-intake/src/portfolio-candidate-proposal.ts: deterministic transformation from accepted Portfolio evidence into CandidateProposalV1.
- packages/external-intake/src/index.ts: public export boundary.
- packages/external-intake/src/api.ts: repository-local Candidate proposal creation operation.
- packages/external-intake/test/portfolio-candidate-proposal.test.ts: determinism, privacy, and rejection coverage.
- packages/portfolio-public/src/index.ts: source-free Portfolio summary public API.
- packages/portfolio-public/src/summary.ts: fixed counts and safe class labels only.
- packages/portfolio-public/test/summary.test.ts: no-source, no-URL, and exact-count contract.
- packages/external-intake/test/portfolio-public-summary.test.ts: verifies public counts against the full intake-only Portfolio.
- apps/control-plane/src/portfolio/portfolio-summary.service.ts: browser-safe summary derivation.
- apps/control-plane/src/portfolio/portfolio-summary.controller.ts: read-only Workspace endpoint.
- apps/control-plane/src/portfolio/portfolio.module.ts: NestJS module boundary.
- apps/control-plane/src/portfolio/portfolio-summary.service.test.ts: typed count and privacy tests.
- apps/control-plane/test/portfolio-summary.controller.test.ts: HTTP lifecycle tests.
- apps/workbench/lib/control-plane-client.ts: typed summary client.
- apps/workbench/lib/portfolio-summary.ts: Home view model.
- apps/workbench/lib/portfolio-summary.test.ts: view-model tests.
- apps/workbench/components/workbench-home.tsx: Portfolio Intelligence panels.
- apps/workbench/components/workbench-home.test.tsx: visible-state and action tests.
- apps/workbench/components/workbench.tsx: summary fetch and refresh wiring.
- docs/project-status.md: one current evidence snapshot after implementation.

## Task 1: Derive a Candidate proposal from exact Portfolio evidence

**Files:**

- Create: packages/external-intake/src/portfolio-candidate-proposal.ts
- Modify: packages/external-intake/src/portfolio.ts
- Modify: packages/external-intake/src/index.ts
- Test: packages/external-intake/test/portfolio-candidate-proposal.test.ts

**Interfaces:**

- Consumes: ExternalPortfolioV1, IntakeJobV1, CompletedEvidenceRefV1, an
  exact Intake request reference, ExternalIntakeStore, StoredRecordRef, and
  CandidateProposalV1.
- Produces: createPortfolioCandidateProposal(input: PortfolioCandidateProposalInputV1): CandidateProposalV1.
- Invariant: identity and artifacts are a pure function of canonical source metadata plus exact evidence references.

- [ ] **Step 1: Write the failing deterministic proposal test**

```ts
const proposal = createPortfolioCandidateProposal({
  portfolio,
  sourceId: "medusa",
  createdAt: "2026-08-01T00:00:00.000Z",
  producerVersion: "1.0.0",
  snapshot,
  acquisition,
  evidenceJob,
  completedEvidence,
});

expect(proposal).toMatchObject({
  apiVersion: "factory.candidate-proposal/v1",
  proposedFactoryKey: "candidate.commerce.medusa-provider",
  proposedClassification: "provider-adapter",
});
expect(proposal.artifacts.adapter.effects).toEqual([
  "candidate.observe",
  "candidate.project",
  "candidate.validate",
]);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: pnpm --filter @factory/external-intake exec vitest run test/portfolio-candidate-proposal.test.ts

Expected: FAIL with an import or missing-function error for createPortfolioCandidateProposal.

- [ ] **Step 3: Define the narrow input and constructor**

```ts
export interface PortfolioCandidateProposalInputV1 {
  readonly portfolio: ExternalPortfolioV1;
  readonly sourceId: string;
  readonly createdAt: string;
  readonly producerVersion: string;
  readonly request: StoredRecordRef;
  readonly store: ExternalIntakeStore;
  readonly snapshot: StoredRecordRef;
  readonly acquisition: StoredRecordRef;
  readonly evidenceJob: IntakeJobV1;
  readonly completedEvidence: CompletedEvidenceRefV1;
}

export function createPortfolioCandidateProposal(
  input: PortfolioCandidateProposalInputV1,
): CandidateProposalV1;
```

Resolve exactly one Portfolio source; reject architecture-only and excluded
sources; require the persisted Intake request's Portfolio record, repository,
fixed reference, and classification, plus the evidence job's snapshot and
acquisition references, to agree with it. CandidateRegistryV1 remains the
only final verifier of completed evidence before storage. Derive the candidate
key from an allowlisted, Factory-authored source blueprint in portfolio.ts. Do
not derive a key, schema, effect, file path, URL, or executable text from an
upstream snapshot.

- [ ] **Step 4: Produce bounded declarative artifacts**

```ts
const artifacts = {
  manifest: {
    apiVersion: "factory.candidate-manifest/v1",
    id,
    version: "0.1.0",
    proposedFactoryKey,
    inputSchema,
    outputSchema,
    effects: ["candidate.observe", "candidate.project", "candidate.validate"],
  },
  fixture: {
    apiVersion: "factory.candidate-fixture/v1",
    id,
    input,
    expectedOutput,
  },
  adapter: {
    apiVersion: "factory.candidate-adapter/v1",
    id,
    projection,
    effects,
  },
  conformancePlan: {
    apiVersion: "factory.candidate-conformance-plan/v1",
    cases,
  },
};
```

Use only Factory-authored safe scalar fields. Select only modules already
accepted by evidenceJob.snapshotView; never invent a module path.

- [ ] **Step 5: Add fail-closed tests**

```ts
expect(() => createPortfolioCandidateProposal(policyOnlyInput)).toThrow(
  "policy-only",
);
expect(() => createPortfolioCandidateProposal(mismatchedEvidenceInput)).toThrow(
  "does not match",
);
expect(JSON.stringify(proposal)).not.toMatch(
  /https?:\/\/|token|password|secret/iu,
);
```

Cover policy-only source, source/evidence mismatch, invalid completed evidence,
unsupported source without a blueprint, duplicate identity, and repeated
deterministic construction.

- [ ] **Step 6: Export and verify**

Run: pnpm --filter @factory/external-intake test

Expected: PASS, including acquisition, Candidate Registry, and new
portfolio-proposal tests.

- [ ] **Step 7: Commit**

```bash
git add packages/external-intake/src/portfolio.ts packages/external-intake/src/portfolio-candidate-proposal.ts packages/external-intake/src/index.ts packages/external-intake/test/portfolio-candidate-proposal.test.ts
git commit -m "feat: derive candidates from portfolio evidence"
```

## Task 2: Store the proposal in Candidate Registry without promotion

**Files:**

- Modify: packages/external-intake/src/api.ts
- Modify: packages/external-intake/test/api.test.ts
- Modify: packages/external-intake/test/portfolio-candidate-proposal.test.ts

**Interfaces:**

- Consumes: PortfolioCandidateProposalInputV1 without a caller-supplied Store;
  the repository-local API injects its own ExternalIntakeStore before
  construction.
- Produces: portfolioCandidateCreate(input): Promise<StoredCandidateRefV1>.
- Invariant: the returned status is quarantined and no Golden asset, Graph, compiler, or Provider registry changes.

- [ ] **Step 1: Write the failing API integration test**

```ts
const ref = await api.portfolioCandidateCreate(input);
expect(ref.status).toBe("quarantined");
await expect(api.candidateList({ status: "quarantined" })).resolves.toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      proposedFactoryKey: "candidate.commerce.medusa-provider",
    }),
  ]),
);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: pnpm --filter @factory/external-intake exec vitest run test/api.test.ts test/portfolio-candidate-proposal.test.ts

Expected: FAIL until portfolioCandidateCreate exists.

- [ ] **Step 3: Expose one narrow repository-local API operation**

```ts
portfolioCandidateCreate(
  input: PortfolioCandidateProposalInputV1,
): Promise<StoredCandidateRefV1>;
```

The implementation injects its own Store, then calls
createPortfolioCandidateProposal and the existing CandidateRegistryV1.create.
It accepts no caller-supplied Candidate artifact or Store.

- [ ] **Step 4: Add non-promotion and privacy tests**

```ts
expect(await api.candidateVerify(ref)).toMatchObject({ valid: true });
expect(() =>
  getCapabilityAsset("candidate.commerce.medusa-provider"),
).toThrow();
expect(serializedCandidate).not.toContain("raw-source");
```

Use accepted quarantine fixtures. Assert no capability asset registry,
Application Graph, compiler, or Provider registry changes after creation.

- [ ] **Step 5: Run package checks**

Run: pnpm --filter @factory/external-intake test; pnpm --filter @factory/external-intake typecheck; pnpm --filter @factory/external-intake lint; pnpm --filter @factory/external-intake build

Expected: all commands pass.

- [ ] **Step 6: Commit**

```bash
git add packages/external-intake/src/api.ts packages/external-intake/test/api.test.ts packages/external-intake/test/portfolio-candidate-proposal.test.ts
git commit -m "feat: create quarantined portfolio candidates"
```

## Task 3: Create a source-free Portfolio public projection and Workspace summary

**Files:**

- Create: packages/portfolio-public/package.json
- Create: packages/portfolio-public/tsconfig.json
- Create: packages/portfolio-public/src/index.ts
- Create: packages/portfolio-public/src/summary.ts
- Create: packages/portfolio-public/test/summary.test.ts
- Create: packages/external-intake/test/portfolio-public-summary.test.ts
- Create: apps/control-plane/src/portfolio/portfolio-summary.service.ts
- Create: apps/control-plane/src/portfolio/portfolio-summary.controller.ts
- Create: apps/control-plane/src/portfolio/portfolio.module.ts
- Modify: apps/control-plane/src/app.module.ts
- Test: apps/control-plane/src/portfolio/portfolio-summary.service.test.ts
- Test: apps/control-plane/test/portfolio-summary.controller.test.ts

**Interfaces:**

- Consumes: local Profile descriptors, Golden asset metadata, source-free Portfolio counts, Candidate summaries, and compilation records.
- Produces: WorkspacePortfolioSummaryV1 through GET /workspaces/:workspaceId/portfolio-summary.
- Invariant: @factory/portfolio-public has no dependency on @factory/external-intake and response contains counts, labels, statuses, and timestamps only.

- [ ] **Step 1: Write failing service tests**

```ts
expect(summary).toEqual({
  apiVersion: "factory.workspace-portfolio-summary/v1",
  profiles: expect.arrayContaining([
    expect.objectContaining({
      profile: "restaurant-ordering",
      requiredPackages: 13,
    }),
  ]),
  capabilities: expect.objectContaining({ golden: expect.any(Number) }),
  intake: expect.objectContaining({ portfolioSources: 43 }),
  compilations: expect.objectContaining({ failed: expect.any(Number) }),
});
```

Write public-package tests before implementation:

```ts
expect(portfolioPublicSummary).toEqual({
  apiVersion: "factory.portfolio-public-summary/v1",
  sourceCounts: {
    total: 43,
    intakeEligible: 19,
    directDependency: 1,
    selectiveSource: 11,
    provider: 7,
    policyOnly: 24,
  },
  scenarioCount: 108,
});
expect(JSON.stringify(portfolioPublicSummary)).not.toMatch(
  /https?:\/\/|\.git|sha256:|token|secret|password/iu,
);
```

- [ ] **Step 2: Run the focused service tests and verify failure**

Run: pnpm --filter @factory/control-plane exec vitest run src/portfolio/portfolio-summary.service.test.ts

Expected: FAIL because the public projection and
WorkspacePortfolioSummaryService are absent.

- [ ] **Step 3: Define the source-free public package and DTO**

```ts
export interface PortfolioPublicSummaryV1 {
  readonly apiVersion: "factory.portfolio-public-summary/v1";
  readonly scenarioCount: number;
  readonly sourceCounts: {
    readonly total: number;
    readonly intakeEligible: number;
    readonly directDependency: number;
    readonly selectiveSource: number;
    readonly provider: number;
    readonly policyOnly: number;
  };
}

export const portfolioPublicSummary: PortfolioPublicSummaryV1;
```

The public package contains no source record, URL, fixed reference, evidence
digest, source path, Candidate artifact, or import from External Intake. Add an
External Intake test that loads the full Portfolio and proves its classified
counts equal the public projection.

- [ ] **Step 4: Define the Workspace DTO and aggregation service**

```ts
export interface WorkspacePortfolioSummaryV1 {
  readonly apiVersion: "factory.workspace-portfolio-summary/v1";
  readonly profiles: readonly ProfilePortfolioSummaryV1[];
  readonly capabilities: CapabilityPortfolioCountsV1;
  readonly intake: IntakePortfolioCountsV1;
  readonly compilations: CompilationPortfolioCountsV1;
}

export class WorkspacePortfolioSummaryService {
  async get(workspaceId: string): Promise<WorkspacePortfolioSummaryV1>;
}
```

Read application and compilation counts through Prisma. Read profile and Golden
asset metadata through Factory packages, and import only
@factory/portfolio-public for source statistics. Represent unavailable Candidate
counts as a numeric zero, not a fabricated Candidate record.

- [ ] **Step 5: Add the read-only controller and privacy boundary**

```ts
@Get("workspaces/:workspaceId/portfolio-summary")
getPortfolioSummary(@Param("workspaceId") workspaceId: string) {
  return this.service.get(workspaceId);
}
```

Return 404 for an unknown workspace. Do not import @factory/external-intake or
read quarantine storage. Do not provide source URLs, source paths,
Candidate IDs, evidence digests, artifact bodies, raw errors, or query filters.

- [ ] **Step 6: Add controller privacy and lifecycle tests**

```ts
expect(JSON.stringify(response.body)).not.toMatch(
  /https?:\/\/|artifact|prompt|response|token|secret|password/iu,
);
expect(response.status).toBe(200);
```

Use published and failed compilation fixtures. Assert no Draft, Published
Revision, Compilation, or Candidate record is created. Assert the Control Plane
package manifest does not contain @factory/external-intake.

- [ ] **Step 7: Run package and Control Plane verification**

Run: pnpm --filter @factory/portfolio-public test; pnpm --filter @factory/portfolio-public typecheck; pnpm --filter @factory/external-intake test; pnpm --filter @factory/control-plane test; pnpm --filter @factory/control-plane typecheck; pnpm --filter @factory/control-plane lint; pnpm --filter @factory/control-plane build

Expected: all commands pass.

- [ ] **Step 8: Commit**

```bash
git add packages/portfolio-public packages/external-intake/test/portfolio-public-summary.test.ts apps/control-plane/src/portfolio apps/control-plane/src/app.module.ts apps/control-plane/test/portfolio-summary.controller.test.ts
git commit -m "feat: expose safe workspace portfolio summary"
```

## Task 4: Render Portfolio Intelligence on Workbench Home

**Files:**

- Modify: apps/workbench/lib/control-plane-client.ts
- Create: apps/workbench/lib/portfolio-summary.ts
- Create: apps/workbench/lib/portfolio-summary.test.ts
- Modify: apps/workbench/components/workbench-home.tsx
- Modify: apps/workbench/components/workbench-home.test.tsx
- Modify: apps/workbench/components/workbench.tsx

**Interfaces:**

- Consumes: WorkspacePortfolioSummaryV1.
- Produces: Profile catalog, Capability coverage, Source intake, and Compilation health panels.
- Invariant: existing create, open, compile, and stale-refresh ordering behavior remains unchanged.

- [ ] **Step 1: Write failing Home tests**

```tsx
expect(container.textContent).toContain("Capability coverage");
expect(container.textContent).toContain("Source intake");
expect(container.textContent).toContain("Compilation health");
expect(container.textContent).toContain("Restaurant ordering");
expect(container.textContent).not.toContain("https://github.com");
```

- [ ] **Step 2: Run the focused Workbench tests and verify failure**

Run: pnpm --filter @factory/workbench exec vitest run components/workbench-home.test.tsx lib/portfolio-summary.test.ts

Expected: FAIL because the summary client and panels are absent.

- [ ] **Step 3: Add typed client and view model**

```ts
export async function getWorkspacePortfolioSummary(
  controlPlaneUrl: string,
  workspaceId: string,
): Promise<WorkspacePortfolioSummaryV1>;

export function toPortfolioHomeModel(
  summary: WorkspacePortfolioSummaryV1,
): PortfolioHomeModel;
```

Parse only the exact API version and safe scalar fields. On a fetch failure,
render a compact unavailable state without rendering server error bodies.

- [ ] **Step 4: Render concise responsive panels**

Use icon-first counts, status dots, and short labels. Profile catalog shows
recipes and application counts. Capability coverage shows Golden, Candidate,
Provider, and Gap counts. Source intake shows eligible, quarantined, and
blocked counts. Compilation health shows queued, succeeded, and failed counts.

- [ ] **Step 5: Preserve theme and accessibility behavior**

Assert semantic classes and existing CSS variables rather than hard-coded
light-only backgrounds. Preserve keyboard accessibility and existing Home aria
labels.

- [ ] **Step 6: Run Workbench verification**

Run: pnpm --filter @factory/workbench test; pnpm --filter @factory/workbench typecheck; pnpm --filter @factory/workbench lint; pnpm --filter @factory/workbench build

Expected: all commands pass.

- [ ] **Step 7: Commit**

```bash
git add apps/workbench/lib/control-plane-client.ts apps/workbench/lib/portfolio-summary.ts apps/workbench/lib/portfolio-summary.test.ts apps/workbench/components/workbench-home.tsx apps/workbench/components/workbench-home.test.tsx apps/workbench/components/workbench.tsx
git commit -m "feat: show portfolio intelligence on home"
```

## Task 5: Verify vertical boundaries and record live status

**Files:**

- Modify: docs/project-status.md
- Modify: packages/external-intake/test/release-boundary.test.ts
- Modify: apps/control-plane/test/portfolio-summary.controller.test.ts
- Modify: apps/workbench/components/workbench-home.test.tsx

**Interfaces:**

- Consumes: Tasks 1 through 4.
- Produces: read-only boundary proof and a single accurate project-status snapshot.
- Invariant: a Portfolio source may create a quarantined Candidate only.

- [ ] **Step 1: Add release-boundary regression assertions**

```ts
expect(forbiddenRuntimeImports).toEqual([]);
expect(portfolioCandidateResult.status).toBe("quarantined");
expect(goldenRegistryKeys).not.toContain("candidate.commerce.medusa-provider");
```

- [ ] **Step 2: Run focused cross-package verification**

Run: pnpm --filter @factory/external-intake test; pnpm --filter @factory/control-plane test; pnpm --filter @factory/workbench test

Expected: all tests pass and no package outside intake tooling consumes a
quarantine source or Candidate artifact as execution input.

- [ ] **Step 3: Replace stale duplicate status content with one evidence snapshot**

Document exact Profile count, physical asset count, Candidate state count,
deliberate exclusions, Home panels, remaining Restaurant gaps, and the next
capability-package project. Do not claim source copying, Golden promotion, a
live Provider, or one hundred supported Profiles.

- [ ] **Step 4: Run full repository verification**

Run: pnpm test

Expected: all Turbo test tasks pass.

- [ ] **Step 5: Check diff hygiene and commit**

```bash
git diff --check
git add docs/project-status.md packages/external-intake/test/release-boundary.test.ts apps/control-plane/test/portfolio-summary.controller.test.ts apps/workbench/components/workbench-home.test.tsx
git commit -m "docs: record portfolio intelligence evidence"
```

## Task 6: Prepare reusable order amendment as the follow-on capability project

**Files:**

- Create: docs/superpowers/specs/2026-08-01-order-amendment-capability-design.md
- Create: docs/superpowers/plans/2026-08-01-order-amendment-capability.md
- Modify: docs/roadmap.md

**Interfaces:**

- Consumes: published Graph owner-aware field bindings, generic transaction kernel, and catalog/cart/inventory/order package contracts.
- Produces: approved commerce.order-amendment/v1 package boundary.
- Invariant: merchant changes are versioned, authorised, audited, outbox-backed, inventory-compensated, and report-consistent.

- [ ] **Step 1: Record supported commands**

  add-line, remove-line, set-quantity, set-configuration, cancel-unpaid-order

For each command define precondition, expected version, inventory delta,
recalculated total, audit event, outbox event, and report effect.

- [ ] **Step 2: Record exact exclusions**

  split settlement, external payment capture, refund, discount engine,
  membership wallet, source copying, and Provider activation

- [ ] **Step 3: Map generated-journey proofs**

Name the package root, manifest, adapter, template, fixtures, tests, compiler
projection, generated Prisma runtime, and Restaurant, Ecommerce, Retail Counter,
and Grocery Pickup journeys.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-08-01-order-amendment-capability-design.md docs/superpowers/plans/2026-08-01-order-amendment-capability.md docs/roadmap.md
git commit -m "docs: plan reusable order amendment capability"
```

## Final verification checklist

- [ ] pnpm --filter @factory/external-intake test
- [ ] pnpm --filter @factory/external-intake typecheck
- [ ] pnpm --filter @factory/control-plane test
- [ ] pnpm --filter @factory/workbench test
- [ ] pnpm test
- [ ] git diff --check
- [ ] Candidate construction is deterministic and fail-closed.
- [ ] Candidate creation stays quarantined and cannot affect Graph, Golden assets, compiler, or generated runtime.
- [ ] Browser responses and Workbench state contain no source bytes, raw source URL, evidence blob, credential, raw prompt, or raw model response.
- [ ] Home exposes all four portfolio panels without removing create, open, or compile actions.

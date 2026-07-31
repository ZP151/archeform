# Profile Readiness and Candidate Port Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development`
> or `executing-plans` to implement this plan task-by-task. Steps use checkbox
> syntax for tracking.

**Goal:** Make the Workbench show truthful per-Profile capability readiness and
make the external intake pipeline produce deterministic, non-promoting plans
for reusable source fragments.

**Architecture:** Profile readiness is Factory-owned static portfolio metadata
derived from registered Profile recipes and known capability maturity. The
Control Plane exposes only source-free readiness facts. Candidate port plans
remain inside `@factory/external-intake`, link immutable evidence to one safe
source module, and never write a Golden package, mutate a Graph, or expose
source contents to the Workbench.

**Tech Stack:** TypeScript, Zod, NestJS, React/Next.js, Vitest.

## Global Constraints

- Application Graph remains the source of truth; generated targets consume a
  Published Revision and immutable Composition Lock only.
- No raw source, repository URL, credential, prompt, response, scanner output,
  arbitrary code, or provider configuration reaches the Control Plane or
  Workbench.
- New behaviour begins with a focused failing Vitest test.
- External source data stays quarantined. A port plan is not a Candidate
  promotion, component package, dependency installation, source copy, or
  provider activation.
- A missing, policy-only, incompatible, or unsafe module must fail closed.

---

### Task 1: Add Factory-owned Profile readiness metadata

**Files:**

- Create: `packages/capabilities/src/profile-readiness.ts`
- Modify: `packages/capabilities/src/index.ts`
- Create: `packages/capabilities/test/profile-readiness.test.ts`

**Consumes:** `FactoryProfile`, `getProfileComposition`, and the registered
current capability assets.

**Produces:**

```ts
export type ProfileCapabilityReadinessV1 =
  "available" | "partial" | "planned" | "provider-required";

export interface ProfileReadinessV1 {
  readonly apiVersion: "factory.profile-readiness/v1";
  readonly profile: FactoryProfile;
  readonly label: string;
  readonly generatedTargets: readonly (
    "simulator" | "web" | "api" | "database" | "tests" | "docs"
  )[];
  readonly capabilities: readonly {
    readonly key: string;
    readonly status: ProfileCapabilityReadinessV1;
  }[];
}

export function listProfileReadiness(): readonly ProfileReadinessV1[];
```

- [ ] **Step 1: Write the failing readiness test**

```ts
it("reports Restaurant order operations as partial without claiming provider features", () => {
  const restaurant = listProfileReadiness().find(
    ({ profile }) => profile === "restaurant-ordering",
  );
  expect(restaurant?.capabilities).toEqual(
    expect.arrayContaining([
      { key: "commerce.catalog", status: "available" },
      { key: "commerce.order-amendment", status: "planned" },
      { key: "identity.member", status: "provider-required" },
    ]),
  );
  expect(restaurant?.generatedTargets).toEqual([
    "simulator",
    "web",
    "api",
    "database",
    "tests",
    "docs",
  ]);
});
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
pnpm --filter @factory/capabilities test -- --run profile-readiness
```

Expected: failure because `listProfileReadiness` is not exported.

- [ ] **Step 3: Implement static, immutable readiness records**

Implement all five registered Profile recipes. Derive `label` from the Profile
composition, freeze every record and return only Factory capability keys and
four allowed readiness states. Restaurant must identify catalog, cart, order,
inventory, table-session, kitchen, cashier, reporting and audit as available;
transaction and amendment as partial/planned; membership, payment, print,
realtime and delivery as provider-required or planned. Ecommerce, Retail and
Grocery must not claim Restaurant-only components. Expense Approval must not
claim commerce operations.

- [ ] **Step 4: Verify and commit**

Run:

```powershell
pnpm --filter @factory/capabilities test -- --run profile-readiness
pnpm --filter @factory/capabilities typecheck
pnpm --filter @factory/capabilities lint
git add packages/capabilities/src/profile-readiness.ts packages/capabilities/src/index.ts packages/capabilities/test/profile-readiness.test.ts
git commit -m "feat: expose profile capability readiness"
```

### Task 2: Expose source-free readiness through the Control Plane and Home

**Files:**

- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.ts`
- Modify: `apps/control-plane/src/portfolio/portfolio-summary.service.test.ts`
- Modify: `apps/control-plane/test/portfolio-summary.controller.test.ts`
- Modify: `apps/workbench/lib/control-plane-client.ts`
- Modify: `apps/workbench/lib/control-plane-client.test.ts`
- Modify: `apps/workbench/lib/portfolio-summary.ts`
- Modify: `apps/workbench/lib/portfolio-summary.test.ts`
- Modify: `apps/workbench/components/workbench-home.tsx`
- Modify: `apps/workbench/components/workbench-home.test.tsx`

**Consumes:** `listProfileReadiness` only; no Control Plane module may import
`@factory/external-intake`.

**Produces:** a `readiness` array added to
`factory.workspace-portfolio-summary/v1` and compact Home cards with available,
partial, planned and provider-required counts per Profile.

- [ ] **Step 1: Write failing service and client parsing tests**

Extend the existing Summary service test to require a Restaurant readiness
record with no URL/source/evidence fields. Extend the client test to reject
unknown readiness status and to drop unexpected source-shaped fields.

- [ ] **Step 2: Verify the focused tests fail**

Run:

```powershell
pnpm --filter @factory/control-plane test -- --run portfolio-summary
pnpm --filter @factory/workbench test -- --run portfolio-summary control-plane-client
```

Expected: summary has no `readiness` field and client parser lacks validation.

- [ ] **Step 3: Add strict summary/client projections**

Add only the values defined in Task 1. The client parser accepts exactly the
six generated target values and four readiness states; it rejects any source,
digest, URL, path, prompt, credential, or unknown key through explicit safe
projection. Keep compilation counts unchanged.

- [ ] **Step 4: Write the failing Home rendering test**

Require the Home to render a `Profile readiness` section containing Restaurant
and Ecommerce cards, their capability counts, and no repository URLs.

- [ ] **Step 5: Implement concise readiness cards and verify**

Render icon-led readiness chips under the existing Profile cards. The UI must
not render raw capability metadata or descriptive paragraphs. It may show
compact `Available`, `Partial`, `Planned`, and `Provider` counters and a
generated-target count.

Run:

```powershell
pnpm --filter @factory/control-plane test -- --run portfolio-summary
pnpm --filter @factory/control-plane typecheck
pnpm --filter @factory/workbench test -- --run portfolio-summary control-plane-client workbench-home
pnpm --filter @factory/workbench typecheck
pnpm --filter @factory/workbench lint
```

- [ ] **Step 6: Commit**

```powershell
git add apps/control-plane apps/workbench
git commit -m "feat: show profile readiness on Workbench Home"
```

### Task 3: Generate quarantined Candidate port plans

**Files:**

- Create: `packages/external-intake/src/candidate-port-plan.ts`
- Modify: `packages/external-intake/src/index.ts`
- Create: `packages/external-intake/test/candidate-port-plan.test.ts`

**Consumes:** `ExternalPortfolioV1`, immutable request/snapshot/acquisition
record references, completed evidence, and a current `CandidateProposalV1`.

**Produces:**

```ts
export type CandidatePortReuseModeV1 =
  "direct-dependency" | "provider-adapter" | "selective-source-copy";

export interface CandidatePortPlanV1 {
  readonly apiVersion: "factory.candidate-port-plan/v1";
  readonly candidate: { readonly id: string; readonly version: string };
  readonly reuseMode: CandidatePortReuseModeV1;
  readonly targetCapability: string;
  readonly selectedModule: {
    readonly path: string;
    readonly symbol?: string;
    readonly digest: string;
  };
  readonly requiredEvidence: readonly (
    | "license"
    | "notice"
    | "sbom"
    | "secret-scan"
    | "sast"
    | "vulnerability-scan"
    | "conformance"
    | "removal-test"
  )[];
}
```

- [ ] **Step 1: Write a failing selective-source plan test**

Use the existing source-study Candidate fixture. Assert deterministic output,
the selected `(path, symbol, digest)` from the Candidate, expected evidence
requirements, and no source URL, source content, Graph, credential, prompt,
or runtime activation field.

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
pnpm --filter @factory/external-intake test -- --run candidate-port-plan
```

Expected: module does not exist.

- [ ] **Step 3: Implement strict port-plan creation**

Map `source-fragment` to `selective-source-copy`, `dependency` to
`direct-dependency`, and `provider-adapter` to `provider-adapter`. Reject a
policy-only Portfolio source, mismatched Candidate source identity, a Candidate
with no selected module, a module path outside the completed evidence
inventory, or an unexpected Candidate classification. Construct all required
evidence requirements in deterministic order.

- [ ] **Step 4: Add and verify failure-path tests**

Require a failure for missing evidence, altered module digest, unsafe source
classification, duplicated module selection, and any candidate-like input
containing a credential-shaped value. The implementation must make no store
write and must not create a package path.

- [ ] **Step 5: Run full package verification and commit**

```powershell
pnpm --filter @factory/external-intake test
pnpm --filter @factory/external-intake typecheck
pnpm --filter @factory/external-intake lint
git add packages/external-intake
git commit -m "feat: plan quarantined candidate ports"
```

### Task 4: Integrate the next operations-kernel plan

**Files:**

- Modify: `docs/superpowers/plans/2026-08-01-cross-profile-transaction-and-capability-acquisition.md`
- Modify: `docs/project-status.md`

**Consumes:** accepted Task 1 through Task 3 evidence.

**Produces:** one current source of truth that makes `commerce.transaction`
the next generated-runtime slice and records readiness/source-port work as
complete preparation, not business capability completion.

- [ ] **Step 1: Update plan status only after the verification commands pass**

Record the exact completed task names, commit identifiers, command outcomes
and limitations. Do not claim that a Candidate port plan has copied, installed,
or promoted external source.

- [ ] **Step 2: Check and commit documentation**

```powershell
pnpm exec prettier --check docs/project-status.md docs/superpowers/plans/2026-08-01-cross-profile-transaction-and-capability-acquisition.md docs/superpowers/plans/2026-08-01-profile-readiness-and-candidate-port-plan.md
git diff --check
git add docs/project-status.md docs/superpowers/plans
git commit -m "docs: record portfolio readiness iteration"
```

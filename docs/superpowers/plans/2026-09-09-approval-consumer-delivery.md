# Approval Consumer Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task. Root owns Git and the active PM ledger.

**Goal:** Deliver a semantically supported approval application from Describe to a verified local app without a plan, Diff, editor, or release handoff, then measure its actual submit/decision/result usability.

**Architecture:** Reuse the validated Requirement/Blueprint, deterministic standard composition, and existing V1 immutable release lifecycle. Extend only the Workbench consumer bridge and its existing delivery surface; retain the Restaurant path and manual opt-out. H1 remains a separate proposed hosted decision.

**Tech Stack:** Existing Node 22, pnpm 9, Next.js 15, React 19, TypeScript, Vitest and Playwright; no dependency, Graph/API, catalog, compiler or identity change in D2.1.

## Global constraints

- Implementation starts only after exact ADR-0048 standing acceptance is recorded in the active ledger.
- Work only in `.worktrees/consumer-delivery`, parent `2c2815c0c21723c563e83f56c054491300681608`; preserve other worktrees.
- English code, tests, UI and documentation. Never record credentials or raw provider material.
- Preserve Draft -> Publish -> immutable Compilation and exact request/application/revision binding.
- Local fixture roles are a demo of role permissions; do not claim authenticated users, per-record requester privacy or hosted availability.
- Preserve material clarification, manual review, Restaurant copy and recovery behavior. No provider retries or cloud actions are introduced.
- Reuse current registry/recipe assets and `ConsumerDelivery`; parameterizing copy does not justify a new UI asset.
- One serialized lifecycle writer; root may write only the separate browser fixture/evidence paths after the interface is frozen. Spark is unavailable, so root handles bounded fixture work.

## D2.1: automatic approval delivery

**Implementation ownership:** `apps/workbench/lib/product-journey/consumer-family.ts` (tested through the existing hook suite); `use-consumer-generation.ts` and its test; `apps/workbench/hooks/use-workbench-controller.ts` and its test; `apps/workbench/components/workbench-home.tsx` and its test; `apps/workbench/components/journey/requirement-composer.tsx` for the family-neutral manual opt-out label. No compiler/API changes.

**Root evidence ownership:** `apps/workbench/test/consumer-generation-fixture.ts`, new `apps/workbench/e2e/consumer-approval.pw.ts`, affected existing consumer browser selectors, new `e2e/consumer-approval.spec.ts`, this plan, active ledger and product status. Expand paths only when a concrete affected assertion needs it.

**Frozen local interface proposed for ADR-0048:**

```ts
type ConsumerFamily = "restaurant-ordering" | "approval";
function consumerFamilyFor(journey: ProductJourneyController): ConsumerFamily | null;
// ConsumerGenerationController retains all existing fields and adds:
readonly family: ConsumerFamily | null;
// Existing apply contract is unchanged; V1 now returns its exact fresh target.
applyComposedProduct(options?: { readonly resetJourney?: boolean }): Promise<ReleaseTarget | null>;
```

- [x] Record exact accepted ADR-0048 hash, independent verdict and write manifest. The ADR determines final eligibility; the predicate must match the real current standard plan rather than demand a capability absent from the approved catalog.
- [x] Add focused failing tests using the existing complete Expense fixture and actual `planProductAlternatives`. Require a unique complete submit/approve/reject workflow, a distinct requester/reviewer, corresponding grants and form/queue/result page intents; reject missing or ambiguous semantics, unrelated workflows and outstanding material questions. Titles and requirement IDs do not confer eligibility.

```ts
expect(consumerFamilyFor(completeExpenseJourney)).toBe("approval");
expect(consumerFamilyFor(missingReviewerReadJourney)).toBeNull();
expect(consumerFamilyFor(appointmentJourney)).toBeNull();
expect(consumerFamilyFor(ambiguousApprovalJourney)).toBeNull();
```

- [x] Run the focused tests RED, then implement the predicate and family-preserving consumer state. Select only the existing exact standard alternative once; retain the family after journey reset so approval delivery never becomes Restaurant copy.
- [x] Add controller regressions that adopt an exact applied V1 ID/revision and reject another application, a newer server revision, a late bootstrap, a superseding open/new request and unmount. Return `null` after failure without publishing or opening a stale editor. Preserve initial bootstrap retry behavior and existing manual navigation.

```ts
expect(await controller.applyComposedProduct({ resetJourney: false })).toEqual({
  applicationGraphId: "approval-application",
  draftRevisionId: "draft-approval-r2",
});
expect(await supersededApply).toBeNull();
```

- [x] Implement exact V1 adoption without invalidating its own consumer token; reuse release target shape and existing lifecycle. Keep manual apply's Page Studio navigation, while automatic apply remains on the consumer delivery surface.
- [x] Parameterize existing delivery heading/status/disclosure by family. Approval copy describes a local demo with selectable roles and role checks. Keep local app/retry links, semantic region and existing styles/icons. The opt-out label must describe both supported families.
- [x] Run affected Vitest tests and Workbench typecheck; fix only demonstrated in-scope defects.
- [x] Root extends the existing browser fixture with actual Expense interpretation/standard plan and a V1 applied/opened draft. Prove exactly one ordered lifecycle and no technical handoffs, family-correct local disclosure, manual opt-out, late/mismatched draft refusal, and no false ready link. Reuse existing Restaurant recovery cases.

```ts
await expect(
  page.getByRole("region", { name: "Approval delivery" }),
).toBeVisible();
await expect(page.getByRole("button", { name: "Apply to Draft" })).toHaveCount(
  0,
);
await expect(
  page.getByRole("link", { name: "Open local app" }),
).toHaveAttribute("href", "http://127.0.0.1:3210");
expect(fixture.selectedAlternativeKeys).toEqual(["standard"]);
```

- [x] Run deterministic browser regressions with zero retries at 390/768/1440 px and existing axe checks. Provider-free fixtures establish orchestration only.
- [x] Run the affected Workbench package checks and one independent review. Escalate to the full contract sequence only if implementation changes a shared or security boundary; do not rerun unrelated worker restart or Restaurant menu suites.
- [ ] Root accepts the bounded slice, records evidence and commits/pushes only reviewed paths; verify exact remote tip equality. No main integration or repository release.

## Actual business acceptance and the next usability correction

- [x] Before a live request, freeze two separate acceptance lanes: (A) deterministic complete Expense interpretation through real composition/compile/runtime; (B) one real supported Expense request, with zero developer choices and at most one consolidated material clarification. Record each first outcome, elapsed time, questions and rescue separately; never combine them into a success rate.
- [x] In the generated app, create and submit two synthetic requests as requester, approve one and reject one as reviewer, then read both results as requester. Attempt an unauthorized requester decision and require denial without state change. This proves selectable demo role behavior, not private real-user authentication.
- [x] Capture only synthetic business screens at 390/768/1440 px, never raw interpretation/provider material. Record form feedback, readable business fields, actionable state transitions and mobile layout issues.
- [x] The current compiler renders generic records as raw JSON, offers event buttons without current-state filtering and clears forms without success feedback. Treat these as D2.2 product gaps. Ask Tech Lead for a bounded reuse-first generated-presentation decision before changing compiler templates; preserve API authorization and immutable lifecycle. Do not describe D2 as mature merely because D2.1 opens a link.

## H1 and goal tracking

- [x] Complete ADR-0047 with a concrete recommended invited-user hosted path, identity/storage/isolation/rollback boundaries and exact external prerequisites.
- [ ] Present only actual external choices requiring founder input. No scaffold-only work to simulate progress, invented account, cloud provision, spend or deployment.
- [x] Update the product scorecard with D2 results and remaining requester privacy/hosted/usability gaps. Prioritize useful first results and fewer user steps ahead of template counts and repeated audits.

## D2.2: make the generated approval journey usable

D2.1 reached a verified local app, but its real form failed to create a request.
The generated calendar-only date is incompatible with the existing Prisma
DateTime input; the same payload with UTC-midnight ISO succeeds. Keep D2.1
business acceptance pending and fix the existing generated client before
claiming delivery. A separate direct API role journey passed and is not a UI
success. The existing generic form/list screenshots confirm the usability gap.

- [x] Record exact revised ADR-0049 standing acceptance and the single compiler
      writer's three-path manifest, with root's serialized actual runtime harness.
- [x] Freeze legacy Appointment and hand-built non-approval bundle digests before
      source changes. Add failing focused emitted-control, payload, action and
      feedback checks; preserve Restaurant output.
- [x] Reuse existing dynamic form/record components and seven pinned Lucide
      assets. Use typed controls, valid UTC date serialization, declared-field
      record cards, visible statuses and only permitted current-state actions.
- [x] Prove safe failures, retained failed input, duplicate-submit prevention,
      success feedback, empty state, visible text with decorative icons, keyboard
      focus and 44px mobile controls. Keep selectable roles explicitly a demo.
- [x] Run affected compiler tests/types and byte-preservation/notice checks, then
      the existing isolated emitted Expense browser harness with zero retries.
- [x] Root updates the real consumer runtime harness after compiler source freeze.
      Require two UI-created requests, submit, approve/reject, requester results
      after reload, direct-role denial, mobile screenshots and exact cleanup.
- [ ] Obtain one independent in-contract review, resolve demonstrated findings,
      update scorecard and deliver the integrated bounded D2.1/D2.2 commit/push.
      Real-model interpretation and hosted results remain separate lanes.

## Next measured slice: D2.3 first-request coverage

D2.1/D2.2 local acceptance is established by the two real-runtime browser lanes
and the independent review in the active ledger. It does not close the ten-case
D2 exit criterion or H1 external usability. The immediate next slice follows the
separate real-provider result rather than adding unrelated UI or audit work:

1. Preserve the first real-provider outcome, questions, time and any technical
   handoff. Convert a demonstrated failure into a provider-free focused case
   before any repair; no repeated unchanged paid samples.
2. Add ten structured approval cases covering coarse intent, complete expense,
   missing reviewer rights, ambiguous workflow, required fields, duplicate
   submission, rejected result, unsupported withdrawal, external identity and
   requester privacy. Mark unsupported contracts explicitly; do not present
   them as implemented or add shared contracts silently.
3. Reuse the existing semantic eligibility, definition and generated UI. Make
   safe defaults deterministic only within accepted contracts; ask only a
   material unresolved business question. New interpretation/schema/provider
   or identity behavior requires one consolidated technology decision.
4. Run focused regressions and the affected real business journey once after a
   correction. Track useful first-result success, question count, handoffs and
   completion time separately from test count or catalog size.
5. Continue H1 only after the exact proposed hosted decision and external
   resources are accepted. Proceed with provider-free business work while
   those choices are pending. Appointment follows approval coverage; scaling
   template counts must follow measured reuse and success.

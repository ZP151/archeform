# Calculated requests and iteration engineering plan

> Execute with the local subagent-driven-development workflow. The controller
> owns service processes, evidence, acceptance decisions and Git delivery.

**Goal:** Assemble a locally usable Equipment procurement approval application
from reviewed data, with server-owned quantity-times-unit-price totals, without
changing the six accepted products. Then deliver a detailed engineering plan
for faster, lower-effort definition admission and runtime iteration.

**Authority:** The accepted scale roadmap and current user Goal authorize the
product direction. ADR-0070 was accepted through the independent exact-hash
standing-acceptance verdict recorded in the PM ledger before implementation. That decision, the
technology policy and threat model govern every implementation step below.

**Base:** `436484fc71f63adf11e8f48938bc5983ac42ca41`, isolated
`codex/consumer-delivery-roadmap`. Six locally accepted definitions, three
demonstrated families; no cloud or production-identity claim.

## Frozen result and exclusions

The Equipment job is an item request with positive integer quantity, positive
estimated unit price, automatically derived total and justification. A requester
can save, submit, correct a returned request and resubmit; reviewers decide it;
an auditor can inspect retained decisions. Both operands can change during
correction. Zero/free equipment, currency settlement, rounding, payment,
inventory and supplier execution are outside this bounded job and must not be
silently inferred. No fake date or category is added to satisfy an old selector.

Calculation is a closed, versioned field descriptor, not an expression language.
The exact accepted ADR defines parsing, arithmetic, representability, writable
fields, transaction ordering, trusted records, replay, reads and UI behavior.
Existing fields without the descriptor retain byte-identical output.

## 0. Baseline and authority

- [x] Record the clean six-definition base and isolated worktree.
- [x] Reproduce and fix the stale five-key independent CLI expectation; retain
      RED/GREEN output. The full independent CLI now passes all 16 cases.
- [x] Capture `packages/compiler/test/fixtures/six-definition-baseline.json`
      before production edits, SHA-256
      `b88e5c9f21907b382d09b877b2208e90aab087b12bd2b365d7aa94cf48ec62e8`.
      Preserve historical four/five-definition snapshots and identifier inverse.
- [x] Add current-byte comparison to the compatibility helper and pass all 15
      compatibility tests. Never recapture this new snapshot after source edits.
- [x] Write product design and proposed ADR-0070.
- [x] Record the independent standing verdict, exact ADR hash and authorization.

## 1. Closed contract, exact arithmetic and trusted authoring

**Serialized owner:** strongest assigned Graph/platform implementer.
**Paths:** `packages/graph/src/{model,product-blueprint,index,browser,
application-graph-adapter}.ts`, new `calculated-request-total.ts`, focused Graph
tests; `packages/adapters/src/requirements/{openai-interpreter,
definition-family-registry}.ts`, `packages/adapters/src/ai.ts` and their focused
tests; `packages/capabilities/src/product-composer.ts` and its focused tests.
Do not edit the six catalogue rows, compiler, worker, evidence or Git state.

- [x] First add failing exact-math/schema tests. Exercise decimal examples,
      scientific notation, domain declarations, Int32 boundaries, precision
      loss, overflow, malformed/capped trusted encodings and hostile shapes.
- [x] Implement the strict optional descriptor and reusable first-party exact
      decimal helper. Export only the focused typed contracts consumers need.
- [x] Validate Blueprint and Graph reference/type/seed rules; retain unknown
      outer Graph-key behavior and reject malformed recognized descriptors.
- [x] Reject V2 conversion and untrusted AI Graph-diff authoring of calculations.
- [x] Extend strict provider field variants and null normalization; guidance
      emits calculations only for an explicit quantity-times-price requirement.
- [x] Include calculation relationships in normalized semantic fingerprints;
      preserve all old canonical/provider projections.
- [x] Compose the complete Approval profile with copied descriptors/domains and
      coherent `12`, `125.5`, `1506` seed values; reject unsupported profiles or
      incompatible bounds. Existing composer paths remain unchanged.
- [x] Run focused Graph, provider, definition-data and composer tests plus their
      typechecks/builds. Record exact exports and evidence for the next owner.

## 2. Conditional generated runtime, presentation and verifier

**Serialized owner:** strongest assigned compiler/runtime implementer, after
Task 1 freezes exports. **Paths:** new compiler-private calculated helper;
`packages/compiler/src/{index,approval-numeric-domain,
approval-mutation-contract,approval-workspace-presentation,
approval-decision-history}.ts`, relevant target dispatch only if needed;
`apps/compiler-worker/src/verifier/verification-graph-plan.ts`; focused compiler
and worker tests. Root retains protected snapshots and service ownership.

- [x] Add failing emitted-runtime tests for server-owned totals, exact products,
      partial corrections, no-side-effect denials, tampering and replay.
- [x] Select calculated identity v3 structurally before numeric identity v2;
      enforce complete Approval support and the coherent seed witness.
- [x] Emit shared calculation logic only for the new profile. Reject caller
      output keys. Recompute and persist the complete triple atomically; verify
      actual store-returned records before commit. Preserve request primitives.
- [x] Enforce trusted decimal equality before lossy numeric projection across
      transitions, receipts, list/detail and matched history. Preserve historical
      receipt responses, version conflicts and permitted repair of an old total.
- [x] Compose existing input/form/state/card/summary assets with a labelled
      native read-only output and exact unsaved preview; serialize operands only.
      Preserve the accepted visual language, icons and 44 px touch controls.
- [x] Reuse one complete seed row for generated business tests and worker
      verifier requests. Execute prerequisites and omit the required output from
      caller bodies. Unsupported targets fail before artifact acceptance.
- [x] Run focused generated-runtime, selector, worker-probe and determinism
      checks plus all 15 protected compatibility cases and relevant typechecks.

## 3. Integrated shared capability acceptance

**Controller:** Root. **Review sequence:** one integrated task review,
independent Terra QA and Sol release review, with scoped fixes/rechecks. No new
gate for each helper, field, screenshot or documentation change.

- [x] Exercise actual generated PostgreSQL/Prisma create/update, trusted
      corruption denial, post-write rollback, simultaneous versions, original
      receipt replay and process-restart persistence with bounded local data.
- [x] Exercise the real Published Graph verifier/probe executor and immutable
      compilation twice. Hashes and ordered files must agree.
- [x] Run the repository shared-contract gate once: format, lint, typecheck,
      tests and build. An existing failure must be resolved or honestly scoped;
      do not replace it with a narrower green check.
- [x] Record focused failures/repairs, exact commands and independent verdicts
      in `docs/acceptance/calculated-request-totals.md` and the PM ledger.
- [x] Clean exact owned runtime resources. Commit/push this accepted capability
      normally and verify remote equality before data admission.

## 4. Equipment data admission and complete consumer acceptance

**Owner:** ordinary definition-data task after shared acceptance.
**Paths:** `packages/adapters/src/requirements/definitions/product-definitions.v1.json`,
focused definition tests, `scripts/verify-product-definition-data.mjs`,
`e2e/helpers/approval-definition-batch.ts`, its batch spec and narrowly necessary
reusable acceptance bindings. No new product-key runtime branches or new assets.

- [x] Add the distinct reviewed definition and safe supported/clarification
      selection examples. Update the independent CLI exact inventory to seven.
- [x] Prove authored selection and distinct semantic fingerprint, not a renamed
      Purchase amount. Run the full independent CLI and focused admission tests.
- [x] Drive actual Draft -> Publish -> Compilation -> verified local Preview.
      Record every attempt and measured ready time against 300,000 ms.
- [x] Complete two distinct item requests; change both quantity and unit price
      through the return/correction/resubmit/approval journey. Check all summary,
      detail and history labels/values, justification and decision reasons.
- [x] Cover invalid client no-fetch, forged total API rejection, state/role
      denial, stale/conflicting correction, retry and restart persistence.
- [x] Visually inspect actual screenshots at 390/768/1440, dark mode and media
      failure. Confirm visible output, retained visual richness, no overflow,
      accessible labels/focus/touch targets and useful loading/error recovery.
- [x] Use one independent ordinary product review, reusing shared evidence.
      Count seven definitions only after all applicable outcomes pass. Families
      remain three. Retain fixture-provider/real-model/production limitations.

## 5. Detailed iteration engineering plan and bounded cleanup

**Owner:** Root after local product acceptance; independent review reuses the
ordinary admission review where practical. **Paths:** new engineering plan,
current status, roadmap, authoring guide and PM ledger. No broad source rewrite.

- [x] Establish observed costs: repeated inventory lists, compiler module size,
      catalogue data duplication/limits, Docker cache context, runtime setup,
      evidence/ledger size, test lanes and repair/review duplication.
- [x] Rank concrete changes by ordinary-user effort and admission lead time.
      State affected paths, owners, prerequisites, acceptance metrics, rollback
      and required authority for every proposed contract/operability change.
- [x] Prefer current scripts, owned-resource leases, parameterized journeys and
      registries. Separate one-time shared family work from data-only admission;
      keep security/transaction/immutable-output checks at shared boundaries.
- [x] Define short, medium and scale-out stages: dependable seven-product
      baseline; cheaper varied batches; Appointment interval/capacity family;
      larger searchable definitions and consented real-user/model evidence.
- [x] Identify redundant work to remove now versus structural changes requiring
      a later accepted task. Do not delete immutable goldens or useful evidence.
- [x] Update current status/counts and roadmap, record actual outcomes and limits,
      and prepare the reviewed delivery.

Controller must finish normal commit/push, verify remote equality and a clean
consumer worktree, and only then mark the long Goal complete. Delivery verification
is reported after creating this commit; a green package test is insufficient.

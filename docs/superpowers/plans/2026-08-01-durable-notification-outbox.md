# Durable Notification Outbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile a version-locked, durable notification outbox into generated
applications and prove it in Expense Approval and Simple Ecommerce.

**Architecture:** `core.notification@1.1.0` remains a declarative capability
asset. The Compiler recognizes the selected locked asset and generates a
transactional `NotificationOutbox` persistence model, narrow store operations,
and an explicit local worker drain surface. The Graph declares only an effect,
role, and template symbol; the generated application owns recipient selection,
dedupe, retry, and fixture transport.

**Tech Stack:** TypeScript, Vitest, Prisma-generated source templates, NestJS
generated API, `@factory/capabilities`, `@factory/compiler`, Docker Compose
generated projects.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation; compiler input is a
  published Graph plus verified composition lock only.
- Preserve all `core.notification@1.0.0` and `1.0.1` assets unchanged.
- Add no external queue, provider SDK, credential, URL, webhook, or network
  delivery capability.
- A package may contribute only declared output slots and verified digests.
- Local notification delivery is deterministic with at most three attempts.
- Never persist raw AI prompts/responses or credentials.

---

### Task 1: Register the immutable durable notification package

**Files:**

- Create: `packages/capabilities/assets/core.notification/1.1.0/component.json`
- Create: `packages/capabilities/assets/core.notification/1.1.0/adapter.json`
- Create: `packages/capabilities/assets/core.notification/1.1.0/fixtures/default.json`
- Create: `packages/capabilities/assets/core.notification/1.1.0/tests/contract.json`
- Create: `packages/capabilities/assets/core.notification/1.1.0/templates/api/capability-module.ts.tpl`
- Create: `packages/capabilities/src/assets/core/notification-v1-1-0.ts`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Consumes:** Existing manifest loader, `CapabilityAssetV1`, composition
resolver, and immutable asset locks.

**Produces:** A Golden `core.notification@1.1.0` lock with the
`api.runtime`, `api.persistence`, `api.worker`, `test.fixture`, and
`flow.effect` output slots; it provides `notification.outbox/v1`.

- [ ] **Step 1: Write the failing registry tests**

  Add a test that resolves current `core.notification` to version `1.1.0`,
  asserts its `notification.outbox/v1` provider contract and all five output
  slots, and rejects a manifest that declares `api.worker` without the same
  slot in its adapter. Add a test that an historical lock for `1.0.1` still
  resolves to the historical asset.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts`

  Expected: failure because `notificationAssetV1_1_0` and the `api.worker`
  slot do not exist.

- [ ] **Step 3: Extend the contract and add the package**

  Add `api.persistence` and `api.worker` to `CapabilityOutputSlot`. Create
  physical package files whose manifest and adapter agree on every declared
  template, parameter, slot, and digest. The manifest must require
  `recipientRole`, accept optional `template`, retain `notification.send`, and
  declare no external provider. Register `notificationAssetV1_1_0` as the
  current notification asset while retaining prior assets in `capabilityAssets`.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts`

  Expected: PASS with the new version selected and historical locks replayable.

- [ ] **Step 5: Commit the package boundary**

  ```bash
  git add packages/capabilities
  git commit -m "feat: add durable notification capability package"
  ```

### Task 2: Generate outbox storage and transaction-safe runtime primitives

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Create: `packages/compiler/test/notification-outbox-runtime.test.ts`

**Consumes:** The selected `core.notification@1.1.0` asset, generated
`RecordStore`, generated Prisma schema, and generic effect dispatcher.

**Produces:** `NotificationOutboxEntry`, `RecordStore.enqueueNotification`,
`claimDueNotifications`, `markNotificationDelivered`,
`recordNotificationFailure`, a Prisma `NotificationOutbox` model, and an
in-memory equivalent.

- [ ] **Step 1: Write failing compilation and generated-runtime tests**

  Assert that a published Expense bundle locked to `1.1.0` emits
  `NotificationOutbox` in both Prisma schema targets and a generated runtime
  with outbox methods. Materialize the generated runtime, perform an Expense
  transition with `notification.send`, and assert exactly one pending outbox
  entry carrying the declared recipient role and no client-provided message.
  Add a control test proving a bundle locked to `1.0.1` emits neither outbox
  schema nor worker source.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts notification-outbox-runtime.test.ts`

  Expected: failure because the generated schemas and runtime have no outbox
  model or methods.

- [ ] **Step 3: Implement minimal compiler output**

  In `generateApplicationBundle`, detect the verified `notification.outbox/v1`
  contribution. Add generated types and store methods only when the locked
  package is present. Emit the Prisma model with a unique `dedupeKey`, status,
  attempt count, availability, delivery timestamp, and safe error string.
  Extend in-memory and Prisma stores so the domain mutation and enqueue run
  through the existing `inTransaction` boundary. Generate the intent solely
  from locked package parameters plus effect context.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `pnpm --filter @factory/compiler test -- compilation-plan.test.ts notification-outbox-runtime.test.ts`

  Expected: PASS; historical notification compilation remains free of new
  output.

- [ ] **Step 5: Commit generated persistence support**

  ```bash
  git add packages/compiler/src/index.ts packages/compiler/test
  git commit -m "feat: compile durable notification outbox storage"
  ```

### Task 3: Add deterministic local worker delivery and fail-closed retries

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/notification-outbox-runtime.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`

**Consumes:** Generated outbox store primitives from Task 2.

**Produces:** A generated local worker module and bounded fixture transport
with deterministic retry, terminal failure, and idempotent delivery behavior.

- [ ] **Step 1: Write failing worker tests**

  In the materialized generated runtime test, configure the fixture transport
  to fail once, drain the worker twice, and assert `pending -> pending ->
delivered` with two attempts. Configure three failures and assert terminal
  `failed`. Drain an already delivered record twice and assert the transport
  receives one delivery only. Assert generated API files contain no route that
  accepts an arbitrary recipient, body, URL, or provider.

- [ ] **Step 2: Run the focused worker test to verify it fails**

  Run: `pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts`

  Expected: failure because the generated worker, fixture transport, and
  retry-state transitions do not exist.

- [ ] **Step 3: Implement the worker and retry rule**

  Generate `api/src/notification-outbox-worker.ts` only for the locked package.
  The worker claims due pending records, calls a local injectable fixture
  transport, marks success delivered, and schedules the first two failures at
  deterministic timestamps. On the third failure, mark the record failed with
  a bounded error code. The worker must not call a network API or read an
  environment credential.

- [ ] **Step 4: Run the focused worker test to verify it passes**

  Run: `pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts`

  Expected: PASS for transient retry, terminal failure, delivery idempotency,
  and client-input rejection.

- [ ] **Step 5: Commit deterministic delivery behavior**

  ```bash
  git add packages/compiler/src/index.ts packages/compiler/test
  git commit -m "feat: generate local notification outbox worker"
  ```

### Task 4: Prove shared package behavior in Expense and Ecommerce

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/compiler/test/notification-outbox-runtime.test.ts`
- Modify: `packages/compiler/test/profile-compilation.test.ts`
- Modify: `docs/project-status.md`
- Create: `docs/acceptance/durable-notification-outbox.md`

**Consumes:** The new current asset and compiler-generated runtime/worker.

**Produces:** Profile locks with the same `1.1.1` package digest, validated
profile-specific role/template bindings, and deterministic cross-profile
runtime evidence.

- [ ] **Step 1: Write failing cross-profile tests**

  Compose Expense Approval and Simple Ecommerce. Assert both selected locks
  contain equal notification version and digest, while their Graph bindings
  use their own declared roles and templates. Materialize both generated
  runtimes: transition an Expense approval outcome and an Ecommerce payment or
  fulfilment outcome, drain workers, and assert delivered entries have the
  correct profile-specific recipient role. Add a negative composition test
  that rejects a missing `recipientRole` binding.

- [ ] **Step 2: Run the focused cross-profile tests to verify they fail**

  Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts && pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts profile-compilation.test.ts`

  Expected: failure because recipes do not select or validate `1.1.0` bindings.

- [ ] **Step 3: Update profile recipes and acceptance evidence**

  Update only the mutable profile recipe selections so new Drafts select
  `1.1.1` and declare profile-local valid recipient role/template parameters.
  Do not alter a historical composition lock. Record the two-profile
  acceptance commands, generated behavior, and cleanup requirements in the
  acceptance document; update project status with the exact delivery slice.

- [ ] **Step 4: Run the focused cross-profile tests to verify they pass**

  Run: `pnpm --filter @factory/capabilities test -- capability-registry.test.ts && pnpm --filter @factory/compiler test -- notification-outbox-runtime.test.ts profile-compilation.test.ts`

  Expected: PASS with the same immutable notification asset selected by both
  profiles and differing only in validated bindings.

- [ ] **Step 5: Commit two-profile evidence**

  ```bash
  git add packages/capabilities packages/compiler/test docs
  git commit -m "test: prove notification outbox across profiles"
  ```

### Task 6: Correct template bindings through a new immutable package version

**Must complete before Task 4 resumes.**

**Files:**

- Create: `packages/capabilities/assets/core.notification/1.1.1/**`
- Create: `packages/capabilities/src/assets/core/notification-v1-1-1.ts`
- Modify: `packages/capabilities/src/assets/contract.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/src/composition.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/test/composition-contract.test.ts`
- Modify: `packages/graph/src/model.ts`
- Modify: `packages/graph/test/application-graph.test.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `packages/compiler/test/notification-outbox-runtime.test.ts`

**Consumes:** Immutable `core.notification@1.1.0`, the frozen outbox contract,
and the existing strict composition resolver.

**Produces:** A new Golden `core.notification@1.1.1` asset whose optional
`template` parameter is a closed declared enum. The resolver accepts only
`expense.approval-outcome` or `ecommerce.order-outcome`; the compiler carries a
validated template into the generated outbox. Historical `1.1.0` behavior
remains replayable with a null template.

- [ ] **Step 1: Write failing contract and compiler tests**

  Assert that a composition using `1.1.1` accepts each declared template enum,
  rejects an undeclared string, and rejects a string bound to a non-enum
  parameter. Assert that an outbox generated from an accepted `1.1.1` lock
  contains the exact locked template, while a replayed `1.1.0` lock still
  contains `null`. Add Graph schema coverage accepting only a safe
  identifier-shaped literal binding and rejecting text, URLs, paths, and
  executable/object-shaped values.

- [ ] **Step 2: Run focused tests to verify they fail**

  Run:

  ```bash
  pnpm --filter @factory/capabilities test -- capability-registry.test.ts composition-contract.test.ts
  pnpm --filter @factory/compiler test -- compilation-plan.test.ts notification-outbox-runtime.test.ts
  ```

  Expected: failure because string enum bindings are not part of the strict
  composition contract and no `1.1.1` asset exists.

- [ ] **Step 3: Implement the versioned correction**

  Add a strict `enum` parameter form with an exact `values` allowlist; do not
  add a general free-form string binding. Extend the Graph binding scalar only
  with a safe identifier-shaped literal; package composition validation must
  still reject every identifier not declared by the selected enum parameter.
  Create physical `1.1.1` package assets, a new immutable digest, and register
  it as the current notification asset. Extend the compiler to use the already
  validated enum binding. It must still generate `null` for any verified
  historical `1.1.0` lock.

- [ ] **Step 4: Run focused tests to verify they pass**

  Re-run the focused commands from Step 2. Expected: PASS for positive and
  negative binding validation, new generated template propagation, and
  historical replay.

- [ ] **Step 5: Commit the immutable correction**

  ```bash
  git add packages/capabilities packages/compiler
  git commit -m "feat: version notification template bindings"
  ```

### Task 5: Run release gates and publish evidence

**Files:**

- Modify: `docs/acceptance/durable-notification-outbox.md`

**Consumes:** Completed package, compiler, and cross-profile tests.

**Produces:** Fresh reproducible release-gate evidence and a pushed history.

- [ ] **Step 1: Run package and compiler verification**

  Run:

  ```bash
  pnpm --filter @factory/capabilities test
  pnpm --filter @factory/compiler test
  pnpm --filter @factory/capabilities typecheck
  pnpm --filter @factory/compiler typecheck
  pnpm --filter @factory/capabilities lint
  pnpm --filter @factory/compiler lint
  ```

  Expected: every command exits zero.

- [ ] **Step 2: Run repository gates and generated-output checks**

  Run:

  ```bash
  pnpm test
  pnpm typecheck
  pnpm lint
  pnpm build
  pnpm verify:third-party
  pnpm verify:source-studies
  git diff --check
  ```

  Expected: every scoped gate exits zero. If the known unrelated root format
  baseline remains non-zero, record the exact unrelated paths and run Prettier
  against every changed path instead of claiming a clean root format gate.

- [ ] **Step 3: Run isolated generated-profile evidence**

  Publish and compile both profile Graphs, run their isolated Compose previews,
  execute role-aware notification journeys, confirm worker drain output, stop
  previews, and confirm zero generated Compose resources remain. Run one
  guarded real OpenAI Graph-Diff through an environment-only credential after
  deterministic evidence is green. Persist only safe acceptance status.

- [ ] **Step 4: Record exact evidence**

  Add exit status, test counts, compilation identifiers, safe worker results,
  cleanup outcome, and guarded-model status to the acceptance document. Do not
  add credentials, raw prompts, raw responses, fixture secrets, or environment
  values.

- [ ] **Step 5: Commit and push verified evidence**

  ```bash
  git add docs/acceptance/durable-notification-outbox.md
  git commit -m "docs: record notification outbox acceptance"
  git push origin main
  ```

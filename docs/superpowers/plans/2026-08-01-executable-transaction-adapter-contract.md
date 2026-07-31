# Executable Transaction Adapter Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected `commerce.transaction@1.0.0` compiler
output with a lock-governed `commerce.transaction@2.0.0` executor that runs
the same idempotent, atomic commerce transition in generated generic and
Restaurant applications.

**Architecture:** `commerce.transaction@2.0.0` owns a
`factory.transaction-executor/v1` executable contribution with digest-covered
runtime, schema, migration, and journey sources. The compiler resolves that
contribution only from an immutable Published composition lock, merges its
schema/migration into active generated Prisma files, and injects the generated
executor into both generic and Restaurant controller paths. Fixture and Prisma
stores share command semantics; the latter owns the database transaction.

**Tech Stack:** TypeScript, Vitest, Zod, NestJS-generated API, Prisma,
PostgreSQL, pnpm.

## Global Constraints

- Preserve Draft -> Publish -> immutable Compilation. Only the verified
  Published composition lock authorizes an executor.
- Keep `commerce.transaction@1.0.0` unchanged and historical. Do not mutate
  its bytes, digest, or old locks.
- New component package code is Factory-owned. No external source, credential,
  raw AI prompt, or provider runtime may enter the executor.
- Controllers must not directly mutate commerce records, run commerce effects,
  append audit records, or append outbox events after the executor is enabled.
- A valid package identity includes key, version, package root, manifest digest,
  contribution digest, declared binding, output slot, namespace, and target.
- `commerce.transaction` remains `partial` until the full four-Profile
  generated behavioural matrix passes.

---

## File Map

| Path | Responsibility |
| --- | --- |
| `packages/capabilities/src/node.ts` | Validates safe executable targets, including `api.runtime`. |
| `packages/capabilities/assets/commerce.transaction/2.0.0/` | Immutable physical package: manifest, declarative adapter, executor, schema, migration, fixture, journey, contract evidence. |
| `packages/capabilities/src/assets/commerce/transaction-v2-0-0.ts` | Registers the exact V2 manifest in the Golden asset registry. |
| `packages/capabilities/src/index.ts` | Migrates the four Commerce recipes to the V2 lock and declared bindings. |
| `packages/compiler/src/commerce-transaction-runtime.ts` | Resolves the verified V2 contributions and renders/adapts their bounded parameters. |
| `packages/compiler/src/index.ts` | Merges selected schema/migration content and injects the executor into generic targets. |
| `packages/compiler/src/restaurant-runtime.ts` | Routes Restaurant command execution through the same executor contract. |
| `packages/compiler/test/*transaction*` | Proves actual generated runtime semantics, not source-string presence. |

---

### Task 1: Remove the disconnected V1 compiler output

**Files:**

- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/commerce-transaction-runtime.ts`
- Modify: `packages/compiler/test/commerce-transaction-runtime.test.ts`
- Modify: `docs/acceptance/commerce-transaction-v1.md`

**Consumes:** The reviewed finding that commit `47dcd00` emitted a runtime and
Prisma fragment that no generated controller or schema consumed.

**Produces:** A compiler that does not emit or claim an atomic transaction
boundary for `commerce.transaction@1.0.0`; historical generic/Restaurant
outputs retain their pre-transaction behaviour until V2 is selected.

- [ ] **Step 1: Write a failing regression that forbids disconnected output**

```ts
it("does not emit a transaction runtime for a 1.0.0 lock", () => {
  const bundle = generateApplicationBundle(inputFor("simple-ecommerce"));
  expect(filePaths(bundle)).not.toContain(
    "api/src/capabilities/commerce-transaction-executor.ts",
  );
  expect(fileContent(bundle, "api/src/main.ts")).not.toContain(
    "CommerceTransactionExecutor",
  );
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts`

Expected: FAIL because the current V1 compiler branch emits disconnected
transaction files or references.

- [ ] **Step 3: Remove V1-specific emission and acceptance claims**

Delete the `commerceTransactionEnabled` V1 output path. Retain generic
capability-template compilation and old lock replay. Rewrite the V1 acceptance
document as a rejected implementation record that links to ADR-0009; it must
not say that an atomic runtime is accepted.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts`

Expected: PASS; a `1.0.0` lock cannot cause a disconnected executor, schema,
migration, or journey to be emitted.

- [ ] **Step 5: Run compiler regression and commit**

Run: `pnpm --filter @factory/compiler test && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint && pnpm --filter @factory/compiler build`

Expected: PASS.

```bash
git add packages/compiler docs/acceptance/commerce-transaction-v1.md
git commit -m "fix: remove disconnected transaction compiler output"
```

### Task 2: Publish the immutable executable V2 package

**Files:**

- Modify: `packages/capabilities/src/node.ts`
- Modify: `packages/capabilities/src/assets/index.ts`
- Modify: `packages/capabilities/src/assets/commerce/index.ts`
- Create: `packages/capabilities/src/assets/commerce/transaction-v2-0-0.ts`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/component.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/adapter.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/templates/api/commerce-transaction-executor.ts.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/templates/database/commerce-transaction.prisma.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/templates/database/commerce-transaction.sql.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/templates/test/commerce-transaction.journey.ts.tpl`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/fixtures/default.json`
- Create: `packages/capabilities/assets/commerce.transaction/2.0.0/tests/contract.json`
- Create: `packages/capabilities/test/commerce-transaction-executor-package.test.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`

**Consumes:** ADR-0009 and the existing `CapabilityExecutableContributionV1`
validation mechanism.

**Produces:** A Golden `commerce.transaction@2.0.0` package that declares the
four digest-covered executable contributions under
`factory.transaction-executor/v1`. `1.0.0` remains byte-identical.

- [ ] **Step 1: Write failing package tests**

```ts
it("registers V2 with one verified executor and active target contributions", () => {
  const asset = getCapabilityAsset("commerce.transaction", "2.0.0");
  expect(asset.manifest.executableContributions).toEqual([
    expect.objectContaining({
      id: "commerce-transaction-executor",
      outputSlot: "api.runtime",
      target: "api/src/capabilities/commerce-transaction-executor.ts",
      targetRuntimeInterfaceVersion: "factory.transaction-executor/v1",
      mergeProtocol: "replace-file",
    }),
    expect.objectContaining({
      id: "commerce-transaction-schema",
      outputSlot: "database.schema",
      mergeProtocol: "append-fragment",
    }),
    expect.objectContaining({
      id: "commerce-transaction-migration",
      outputSlot: "database.migration",
      mergeProtocol: "append-fragment",
    }),
    expect.objectContaining({
      id: "commerce-transaction-journey",
      outputSlot: "test.journey",
    }),
  ]);
});

it("rejects an api.runtime executable contribution outside api/src/capabilities", () => {
  expect(() => validateCapabilityAsset(tamperedRuntimeTarget)).toThrow(
    "outside 'api.runtime'",
  );
});
```

- [ ] **Step 2: Run package tests to verify RED**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-executor-package.test.ts capability-registry.test.ts`

Expected: FAIL because V2 is absent and `api.runtime` is not a permitted
executable-contribution target.

- [ ] **Step 3: Create V2 without altering V1**

Add the `api.runtime: ["api/src/capabilities/"]` safe prefix to the
executable contribution validator. V2 declares exactly four contributions,
with safe paths, non-duplicated targets, V2-only digests, `append-fragment`
for schema/migration, and the current typed bindings:
`aggregateEntity`, `transactionFlow`, and `actorRole`. Its executor template
exports `CommerceTransactionExecutorV1` and accepts no arbitrary code, path,
URL, or untyped Graph lookup.

The Prisma fragment defines a receipt with unique scope/key and immutable
completed outcome fields, aggregate version state, inventory movement, audit,
and outbox records. The SQL template gives the same uniqueness and foreign-key
semantics. The journey template imports the generated executor and asserts a
real result, never `expect(value).toEqual(value)`.

- [ ] **Step 4: Verify physical-package integrity**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-executor-package.test.ts capability-registry.test.ts`

Expected: PASS; manifest, adapter, template, fixture, and contract digests
match physical bytes and every target passes the safe-prefix validator.

- [ ] **Step 5: Run capabilities regression and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build`

Expected: PASS.

```bash
git add packages/capabilities
git commit -m "feat: add executable commerce transaction package"
```

### Task 3: Migrate four Commerce recipes to V2 without changing readiness

**Files:**

- Modify: `packages/capabilities/src/index.ts`
- Modify: `packages/capabilities/test/commerce-transaction-profile-composition.test.ts`
- Modify: `packages/capabilities/test/composition-contract.test.ts`
- Modify: `packages/capabilities/test/capability-registry.test.ts`
- Modify: `packages/capabilities/test/profile-readiness.test.ts`

**Consumes:** The verified V2 package manifest and its immutable digest.

**Produces:** Restaurant Ordering, Simple Ecommerce, Retail Counter, and
Grocery Pickup resolve exact V2 locks; readiness is still `partial` until
Task 5 compiler evidence exists.

- [ ] **Step 1: Write failing lock migration tests**

```ts
it.each(commerceProfiles)("%s selects the exact V2 transaction lock", (profile) => {
  const selection = transactionSelection(composeDefaultCapabilityDraft({ profile }).graph);
  expect(selection.lock).toEqual(getCapabilityAsset("commerce.transaction", "2.0.0").manifest);
});

it.each(commerceProfiles)("%s remains partial before compilation evidence", (profile) => {
  expect(profileReadiness(profile, "commerce.transaction")).toBe("partial");
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts profile-readiness.test.ts`

Expected: FAIL because each profile selects V1.

- [ ] **Step 3: Upgrade only the current recipe locks**

Change four recipe selections to `commerce.transaction@2.0.0` and preserve
their existing Graph-symbol bindings and deterministic Retail/Grocery remap.
Do not make a readiness state `available` and do not mutate historical V1
selections held by saved snapshots.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `pnpm --filter @factory/capabilities test -- commerce-transaction-profile-composition.test.ts profile-readiness.test.ts composition-contract.test.ts`

Expected: PASS; selections include V2 full lock identity and unrelated
duplicate readiness overrides remain fail closed.

- [ ] **Step 5: Run capabilities regression and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/capabilities typecheck && pnpm --filter @factory/capabilities lint && pnpm --filter @factory/capabilities build`

Expected: PASS.

```bash
git add packages/capabilities
git commit -m "feat: migrate commerce profiles to transaction executor"
```

### Task 4: Compile and inject the locked executor into both runtime paths

**Files:**

- Modify: `packages/compiler/src/commerce-transaction-runtime.ts`
- Modify: `packages/compiler/src/index.ts`
- Modify: `packages/compiler/src/restaurant-runtime.ts`
- Modify: `packages/compiler/test/commerce-transaction-runtime.test.ts`
- Modify: `packages/compiler/test/compilation-plan.test.ts`
- Modify: `packages/compiler/test/composition-compilation.test.ts`

**Consumes:** A Published lock containing exact V2 contribution digests and
the four bound Graph symbols.

**Produces:** A generated executor module imported by the generic and
Restaurant controller/runtime paths; its schema and migration are merged into
the active generated Prisma chain, and its journey source imports that module.

- [ ] **Step 1: Write behavioural tests before renderer changes**

```ts
it.each(commerceProfiles)("%s runs its generated transition through the executor", async (profile) => {
  const bundle = generateApplicationBundle(inputFor(profile));
  const runtime = await importGeneratedExecutor(bundle);
  await expect(runtime.execute(command("submit-1"))).resolves.toMatchObject({ replayed: false });
  await expect(runtime.execute(command("submit-1"))).resolves.toMatchObject({ replayed: true });
  await expect(runtime.execute(command("submit-1", { note: "changed" }))).rejects.toThrow("idempotency");
});

it("rolls back receipt, aggregate, movement, audit, and outbox when an effect fails", async () => {
  const executor = fixtureExecutor({ failAt: "append-audit" });
  await expect(executor.execute(command("rollback"))).rejects.toThrow("audit");
  await expect(executor.inspect()).resolves.toEqual({ receipts: 0, aggregates: 0, movements: 0, audits: 0, outbox: 0 });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts compilation-plan.test.ts`

Expected: FAIL because generated controllers and Restaurant commands do not
yet import the V2 executor.

- [ ] **Step 3: Resolve only exact V2 executable contributions**

Read contributions through the Capabilities resolver, require
`factory.transaction-executor/v1`, and reject absent, duplicate, wrong-target,
wrong-digest, V1, or undeclared contribution sets. Render their bounded
parameters from lock bindings. Do not hardcode a parallel executor/schema or
select from a Profile name.

- [ ] **Step 4: Join the executor to the active generated project**

Merge the selected schema fragment into both active `schema.prisma` outputs;
append the selected SQL to the active migration; place the runtime source at
its declared API target; and place its journey at its declared test target.
Generated generic `ApplicationRuntime` and Restaurant command service receive
one injected `CommerceTransactionExecutorV1`. For a selected commerce
transition, they construct a bounded command with actor, scope, payload digest,
bound aggregate, expected version, event, and idempotency key, then call only
`executor.execute`.

- [ ] **Step 5: Implement equivalent fixture and Prisma semantics**

The fixture adapter owns isolated copied state and commits it only after all
effects complete. The Prisma adapter calls `prisma.$transaction`, claims the
unique receipt atomically, performs a conditional aggregate-version update,
persists movement/audit/outbox, and finalizes exactly one immutable outcome.
Equal completed payload replays; changed payload rejects; a concurrent pending
receipt returns a typed `in-progress` result or a controlled re-read; no raw
unique constraint error escapes.

- [ ] **Step 6: Compile generated TypeScript and run behaviour matrix**

Run: `pnpm --filter @factory/compiler test -- commerce-transaction-runtime.test.ts compilation-plan.test.ts composition-compilation.test.ts`

Expected: PASS for four profiles, replay, changed-payload rejection, concurrent
duplicate handling, stale-version rejection, rollback, active schema/migration
merging, controller import, and generated-project TypeScript compile.

- [ ] **Step 7: Run full compiler regression and commit**

Run: `pnpm --filter @factory/compiler test && pnpm --filter @factory/compiler typecheck && pnpm --filter @factory/compiler lint && pnpm --filter @factory/compiler build`

Expected: PASS.

```bash
git add packages/compiler
git commit -m "feat: execute commerce transitions through locked adapter"
```

### Task 5: Record acceptance evidence and surface truthful readiness

**Files:**

- Modify: `docs/acceptance/commerce-transaction-v1.md`
- Modify: `docs/project-status.md`
- Modify: `packages/capabilities/src/profile-readiness.ts`
- Modify: `packages/capabilities/test/profile-readiness.test.ts`

**Consumes:** Passing V2 package, lock, compiler, generated TypeScript, and
four-Profile behaviour evidence.

**Produces:** A source-free status that calls `commerce.transaction` available
only for profiles with verified V2 compilation evidence. The record retains
simulated-payment and provider exclusions.

- [ ] **Step 1: Write a failing readiness/evidence test**

```ts
it("does not mark a V2 lock available without immutable compiler evidence", () => {
  expect(resolveTransactionReadiness(v2Lock, undefined)).toBe("partial");
});

it("marks a V2 lock available only with matching four-profile evidence", () => {
  expect(resolveTransactionReadiness(v2Lock, acceptedEvidence)).toBe("available");
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `pnpm --filter @factory/capabilities test -- profile-readiness.test.ts`

Expected: FAIL because readiness is not yet tied to V2 immutable evidence.

- [ ] **Step 3: Add closed evidence-based readiness**

Accept only matching lock identity, contribution digests, schema/migration
hashes, generated-project typecheck result, and all required four-profile
journey results. Missing, unknown, partial, or malformed evidence resolves to
`partial`; it cannot become available through a mutable Draft or package
selection alone.

- [ ] **Step 4: Record bounded acceptance claims**

Document exact command names, pass state, lock/contribution digests, generated
artifact hashes, and the four test journeys. Keep real payment, identity,
provider deployment, refunds, tax, printer, delivery, reservations, realtime,
offline, cloud operation, and production observability explicitly unaccepted.

- [ ] **Step 5: Run release verification and commit**

Run: `pnpm --filter @factory/capabilities test && pnpm --filter @factory/compiler test && pnpm test && git diff --check`

Expected: PASS. Record only bounded test evidence; never record credentials,
raw AI prompts, responses, or source bytes.

```bash
git add docs packages/capabilities
git commit -m "docs: record executable transaction acceptance"
```

## Self-Review

- **Spec coverage:** Task 1 removes the reviewed false implementation. Task 2
  creates an immutable executable asset. Task 3 migrates recipes without a
  premature status change. Task 4 wires the asset into every actual execution
  path and proves real transactional behaviour. Task 5 only then exposes
  availability and acceptance evidence.
- **Placeholder scan:** No task contains an unbounded source import, Profile
  name selection, arbitrary code execution, generic “appropriate validation”,
  or unsupported production-completeness claim.
- **Type consistency:** `factory.transaction-executor/v1` is the sole runtime
  interface version. `CommerceTransactionExecutorV1` is injected by generic
  and Restaurant paths; `commerce.transaction@2.0.0` is the only version that
  can authorize it.

## Execution Handoff

Execute Tasks 1–5 serially with a fresh implementation worker and independent
review after each task. The failed `47dcd00` implementation must not be merged
to `main` as acceptance evidence; Task 1 removes its disconnected behaviour
before V2 is introduced.

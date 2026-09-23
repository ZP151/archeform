import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  durableDeliveryFixture,
  durableTaskTitle,
  loadDurableHarness,
  persistDurableEvidence,
} from "./helpers/durable-delivery-fixture";

test("same-app immutable delivery retains writes through failed readiness, rollback and separate restore", async ({
  page,
  request,
}, testInfo) => {
  const startedAt = Date.now();
  test.setTimeout(900_000);
  const {
    checkCompatibility,
    createRehearsal,
    manifestFor,
    safeCode,
    checkHttpStatus,
  } = await loadDurableHarness();
  let fixture;
  let harness;
  try {
    fixture = await durableDeliveryFixture();
    const incompatible = structuredClone(fixture.b);
    incompatible.files.find(
      (file) => file.path === "database/prisma/schema.prisma",
    )!.content += "\n// incompatible fixture\n";
    incompatible.manifest = manifestFor(incompatible.files);
    expect(() =>
      checkCompatibility(fixture.a, incompatible, fixture.pageId),
    ).toThrow("delivery.compatibility_database");
    harness = await createRehearsal(fixture, { startedAt });
  } catch (error) {
    const evidence = (error as { evidence?: unknown }).evidence ?? {
      runId: fixture?.runId ?? null,
      failure: safeCode(error),
      cleanup: "not-allocated",
      phases: [
        {
          phase: "fixture-preparation",
          outcome: safeCode(error),
          durationMs: Date.now() - startedAt,
        },
      ],
    };
    await persistDurableEvidence(testInfo, evidence);
    console.log(`DURABLE_DELIVERY_EVIDENCE ${JSON.stringify(evidence)}`);
    throw new Error(safeCode(error));
  }
  async function phase<T>(label: string, action: () => Promise<T>): Promise<T> {
    harness.evidence.currentPhase = label;
    await persistDurableEvidence(testInfo, harness.evidence, false);
    try {
      return await harness.phase(label, action);
    } finally {
      await persistDurableEvidence(testInfo, harness.evidence, false);
    }
  }
  const headers = { "x-factory-fixture-session": "fixture-session-member" };
  const values = (title: string) => ({
    title,
    description: "Synthetic delivery rehearsal",
    assignee: "Local team",
    dueDate: "2026-10-01T00:00:00.000Z",
    priority: "medium",
  });
  async function create(base: string, title: string, key = randomUUID()) {
    const response = await request.post(`${base}/api/task`, {
      headers: { ...headers, "x-factory-idempotency-key": key },
      data: { values: values(title) },
    });
    await checkHttpStatus(response, 201, harness.evidence, "create-task");
    return response.json();
  }
  async function read(
    base: string,
    record: { id: string; version: number; title: string },
  ) {
    const response = await request.get(`${base}/api/task/${record.id}`, {
      headers,
      timeout: 3000,
    });
    await checkHttpStatus(response, 200, harness.evidence, "read-task");
    expect(await response.json()).toMatchObject(record);
  }
  async function rendered(base: string, title: string) {
    await page.goto(`${base}${fixture.pagePath}`, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible({ timeout: 5000 });
  }
  const probe =
    (title: string, record?: { id: string; version: number; title: string }) =>
    async (
      urls: { api: string; web: string },
      signal: AbortSignal,
      remaining: number,
    ) => {
      const probePage = await page.context().newPage();
      const cancel = () => {
        void probePage.close().catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        if (record) {
          const response = await fetch(`${urls.api}/api/task/${record.id}`, {
            headers,
            signal,
            redirect: "error",
          });
          await checkHttpStatus(response, 200, harness.evidence, "read-task");
          expect(await response.json()).toMatchObject(record);
        }
        await probePage.goto(`${urls.web}${fixture.pagePath}`, {
          waitUntil: "domcontentloaded",
          timeout: Math.min(10000, remaining),
        });
        await expect(
          probePage.getByRole("heading", { name: title, exact: true }),
        ).toBeVisible({ timeout: Math.min(5000, remaining) });
        return !signal.aborted;
      } finally {
        signal.removeEventListener("abort", cancel);
        await probePage.close();
      }
    };
  let failure: unknown;
  async function capture(label: string, title: string, recordTitle: string) {
    await rendered(harness.gateway.url, title);
    await expect(durableTaskTitle(page, recordTitle)).toBeVisible();
    const path = testInfo.outputPath(`${label}.png`);
    await page.screenshot({ path });
    await testInfo.attach(label, { path, contentType: "image/png" });
  }
  try {
    await phase("serve-a", async () => {
      expect(await harness.ready("a", probe(fixture.aTitle))).toBe(true);
      await harness.openGateway();
    });
    const base = harness.gateway.url;
    await phase("a-gateway-page", () => rendered(base, fixture.aTitle));
    const replayKey = randomUUID();
    const baseline = await phase("a-baseline-snapshot", () =>
      harness.snapshot("a"),
    );
    const first = await phase("a-create-first", async () => {
      const record = await create(base, "Created under A", replayKey);
      expect(record.version).toBe(0);
      await read(base, record);
      return record;
    });
    const another = await phase("a-create-second", async () => {
      const record = await create(base, "Second task under A");
      expect(record.id).not.toBe(first.id);
      await read(base, record);
      return record;
    });
    await phase("a-correction", async () => {
      const aCorrection = await request.patch(
        `${base}/api/task/${another.id}`,
        {
          headers: { ...headers, "x-factory-idempotency-key": randomUUID() },
          data: { expectedVersion: 0, values: values("Corrected under A") },
        },
      );
      await checkHttpStatus(aCorrection, 200, harness.evidence, "correct-task");
      expect(await aCorrection.json()).toMatchObject({
        id: another.id,
        title: "Corrected under A",
        version: 1,
      });
    });
    const aChanged = await phase("a-transition", async () => {
      const aAction = await request.post(
        `${base}/api/task/${another.id}/events/start`,
        {
          headers: { ...headers, "x-factory-idempotency-key": randomUUID() },
          data: { expectedVersion: 1 },
        },
      );
      await checkHttpStatus(aAction, 200, harness.evidence, "start-task");
      const aChanged = await aAction.json();
      expect(aChanged).toMatchObject({
        id: another.id,
        title: "Corrected under A",
        version: 2,
        status: "in-progress",
      });
      await read(base, aChanged);
      return aChanged;
    });
    const startEffects =
      fixture.a.graph.flow.flows
        .flatMap((flow) => flow.transitions)
        .find((transition) => transition.event === "start")?.effects?.length ??
      0;
    const initialFacts = await phase("a-history-snapshot", async () => {
      const initialFacts = await harness.snapshot("a");
      expect(initialFacts.receipt.count).toBe(baseline.receipt.count + 4);
      expect(initialFacts.audit.count).toBe(baseline.audit.count + 4);
      expect(initialFacts.capability.count).toBe(
        baseline.capability.count + startEffects,
      );
      return initialFacts;
    });
    await phase("a-capture", () =>
      capture("revision-a", fixture.aTitle, first.title),
    );
    await phase("failed-readiness-retains-a", async () => {
      await harness.startCandidate(false);
      expect(
        await harness.failedReadiness(
          async (urls: { api: string; web: string }, signal: AbortSignal) => {
            const record = await fetch(`${urls.api}/api/task/${first.id}`, {
              headers,
              signal,
              redirect: "error",
            });
            await checkHttpStatus(record, 200, harness.evidence, "read-task");
            expect(await record.json()).toMatchObject(first);
            const response = await fetch(`${urls.web}${fixture.pagePath}`, {
              signal: AbortSignal.any([signal, AbortSignal.timeout(700)]),
              redirect: "error",
            });
            return (
              response.ok && (await response.text()).includes(fixture.bTitle)
            );
          },
        ),
      ).toBe(false);
      expect(await harness.snapshot("a")).toEqual(initialFacts);
      expect(harness.gateway.selected).toBe("a");
      await rendered(base, fixture.aTitle);
      const retained = await create(
        base,
        "A remains writable after candidate failure",
      );
      await read(base, retained);
      await harness.removeCandidate();
    });
    const factsBeforeB = await phase("a-retained-snapshot", async () => {
      const factsBeforeB = await harness.snapshot("a");
      expect(factsBeforeB.audit.count).toBe(initialFacts.audit.count + 1);
      expect(factsBeforeB.receipt.count).toBe(initialFacts.receipt.count + 1);
      expect(factsBeforeB.capability).toEqual(initialFacts.capability);
      return factsBeforeB;
    });
    await phase("switch-b", async () => {
      await harness.startCandidate();
      expect(await harness.ready("b", probe(fixture.bTitle, first))).toBe(true);
      await harness.switchTo("b", probe(fixture.bTitle, first));
      await rendered(base, fixture.bTitle);
      await read(base, first);
      await read(base, aChanged);
      expect(await harness.snapshot("b")).toEqual(factsBeforeB);
      await capture("revision-b", fixture.bTitle, first.title);
    });
    const second = await phase("b-create", () =>
      create(base, "Created under B"),
    );
    const corrected = await phase("b-correction", async () => {
      const correction = await request.patch(`${base}/api/task/${second.id}`, {
        headers: { ...headers, "x-factory-idempotency-key": randomUUID() },
        data: { expectedVersion: 0, values: values("Corrected under B") },
      });
      await checkHttpStatus(correction, 200, harness.evidence, "correct-task");
      const corrected = await correction.json();
      expect(corrected).toMatchObject({
        id: second.id,
        version: 1,
        title: "Corrected under B",
      });
      await read(base, corrected);
      return corrected;
    });
    const factsAfterB = await phase("b-history-snapshot", async () => {
      const factsAfterB = await harness.snapshot("b");
      expect(factsAfterB.audit.count).toBe(factsBeforeB.audit.count + 2);
      expect(factsAfterB.receipt.count).toBe(factsBeforeB.receipt.count + 2);
      expect(factsAfterB.capability).toEqual(factsBeforeB.capability);
      return factsAfterB;
    });
    await phase("postgres-restart", async () => {
      await harness.restartDatabase();
      expect(await harness.ready("b", probe(fixture.bTitle, corrected))).toBe(
        true,
      );
      await read(base, first);
      await read(base, aChanged);
      await read(base, corrected);
      expect(await harness.snapshot("b")).toEqual(factsAfterB);
    });
    await phase("backup", async () => {
      const backup = await harness.backup();
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/);
    });
    await phase("retained-image-rollback", async () => {
      await harness.rollback(probe(fixture.aTitle, corrected));
      await rendered(base, fixture.aTitle);
      await read(base, first);
      await read(base, corrected);
      await read(base, aChanged);
      expect(await harness.snapshot("a")).toEqual(factsAfterB);
      await capture("rollback-a", fixture.aTitle, corrected.title);
      expect(await create(base, "Created under A", replayKey)).toEqual(first);
      expect(await harness.snapshot("a")).toEqual(factsAfterB);
      const action = await request.post(
        `${base}/api/task/${corrected.id}/events/start`,
        {
          headers: { ...headers, "x-factory-idempotency-key": randomUUID() },
          data: { expectedVersion: 1 },
        },
      );
      await checkHttpStatus(action, 200, harness.evidence, "start-task");
      expect(await action.json()).toMatchObject({
        id: corrected.id,
        version: 2,
        status: "in-progress",
      });
    });
    const mainFacts = await phase("rollback-history-snapshot", async () => {
      const mainFacts = await harness.snapshot("a");
      expect(mainFacts.audit.count).toBe(factsAfterB.audit.count + 1);
      expect(mainFacts.receipt.count).toBe(factsAfterB.receipt.count + 1);
      expect(mainFacts.capability.count).toBe(
        factsAfterB.capability.count + startEffects,
      );
      return mainFacts;
    });
    await phase("separate-restore", async () => {
      const restored = await harness.restore();
      expect(
        await harness.ready("restore", probe(fixture.aTitle, corrected)),
      ).toBe(true);
      await read(restored.web, first);
      await read(restored.web, corrected);
      await read(restored.web, aChanged);
      expect(await harness.snapshot("restore")).toEqual(factsAfterB);
      expect(await create(restored.web, "Created under A", replayKey)).toEqual(
        first,
      );
      expect(await harness.snapshot("restore")).toEqual(factsAfterB);
      const action = await request.post(
        `${restored.web}/api/task/${corrected.id}/events/start`,
        {
          headers: { ...headers, "x-factory-idempotency-key": randomUUID() },
          data: { expectedVersion: 1 },
        },
      );
      await checkHttpStatus(action, 200, harness.evidence, "start-task");
      expect(await action.json()).toMatchObject({
        id: corrected.id,
        version: 2,
        status: "in-progress",
      });
      expect(await harness.snapshot("a")).toEqual(mainFacts);
      expect(harness.gateway.selected).toBe("a");
      await rendered(base, fixture.aTitle);
      const restoredFacts = await harness.snapshot("restore");
      expect(restoredFacts.audit.count).toBe(factsAfterB.audit.count + 1);
      expect(restoredFacts.receipt.count).toBe(factsAfterB.receipt.count + 1);
      expect(restoredFacts.capability.count).toBe(
        factsAfterB.capability.count + startEffects,
      );
    });
    harness.evidence.persistence = {
      initialFacts,
      factsBeforeB,
      factsAfterB,
      mainFacts,
      records: [first, aChanged, corrected].map(({ id, version, status }) => ({
        id,
        version,
        status,
      })),
    };
  } catch (error) {
    failure = error;
  } finally {
    if (failure && page.url().startsWith(`${harness.gateway?.url}/`)) {
      try {
        const path = testInfo.outputPath("failure.png");
        await page.screenshot({ path, timeout: 5000 });
        await testInfo.attach("failure", { path, contentType: "image/png" });
        harness.evidence.failureScreenshot = "failure.png";
      } catch {
        harness.evidence.failureScreenshot = null;
      }
    }
    let cleanupFailure: unknown;
    try {
      await harness.close();
    } catch (error) {
      cleanupFailure = error;
    }
    harness.evidence.failure = failure ? safeCode(failure) : null;
    harness.evidence.cleanupFailure = cleanupFailure
      ? safeCode(cleanupFailure)
      : null;
    await persistDurableEvidence(testInfo, harness.evidence);
    console.log(
      `DURABLE_DELIVERY_EVIDENCE ${JSON.stringify(harness.evidence)}`,
    );
    if (cleanupFailure) throw new Error("delivery.cleanup_required");
  }
  if (failure) throw new Error(safeCode(failure));
});

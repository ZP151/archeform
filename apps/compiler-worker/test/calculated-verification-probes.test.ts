import { createRequire } from "node:module";
import { posix } from "node:path";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { ModuleKind, transpileModule } from "typescript";
import { describe, expect, it } from "vitest";
import { calculatedInput } from "../../../packages/compiler/test/fixtures/approval-calculated-total.js";
import { generateApplicationBundle } from "../../../packages/compiler/src/index.js";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import {
  runIdempotencyProbe,
  runRoleJourneyProbe,
} from "../src/verifier/probes.js";
import type { IdempotencyJourneyFixture } from "../src/verifier/role-journey.js";

function fixture(failCreate = false) {
  const input = calculatedInput();
  const entity = input.graph.domain.entities[0]!.key;
  Object.assign(input.graph.domain.seedData![0]!.values, {
    quantity: 3,
    unitPrice: 0.07,
    total: 0.21,
  });
  input.compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(input.graph),
    selections: input.compositionLock.packages,
  });
  const profile = deriveVerificationProfile(input.graph, input.compositionLock);
  const files = generateApplicationBundle(input).files;
  const cache = new Map<string, any>();
  const runtimeRequire = createRequire(
    new URL("../../../packages/compiler/package.json", import.meta.url),
  );
  const load = (path: string): any => {
    if (cache.has(path)) return cache.get(path);
    const file = files.find((entry) => entry.path === path)!;
    const exports: any = {};
    cache.set(path, exports);
    new Function(
      "require",
      "exports",
      transpileModule(file.content, {
        compilerOptions: { module: ModuleKind.CommonJS, target: 99 },
      }).outputText,
    )((name: string) => {
      if (!name.startsWith(".")) return runtimeRequire(name);
      const relative = posix.normalize(posix.join(posix.dirname(path), name));
      return load(
        files.some((entry) => entry.path === relative)
          ? relative
          : relative.replace(/\.js$/, ".ts"),
      );
    }, exports);
    return exports;
  };
  const { ApplicationRuntime, InMemoryRecordStore } = load(
    "api/src/application-runtime.ts",
  );
  const store = new InMemoryRecordStore();
  const calls: {
    method: string;
    path: string;
    key: string;
    body: any;
    status: number;
  }[] = [];
  const env = new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-calculated-probe",
    rootDirectory: "calculated-probe",
    composeProjectName: "factory-preview-calculated-probe",
    artifacts: [
      { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
      { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
    ],
    operationTimeoutMs: 1000,
    startPreviewRun: async () => ({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    }),
    stopPreviewRun: async () => undefined,
    fetch: async (url, init) => {
      const path = new URL(String(url)).pathname;
      const parts = path.split("/");
      const method = String(init?.method);
      const headers = new Headers(init?.headers);
      const session = headers.get("x-factory-fixture-session") ?? "";
      const role = session.replace("fixture-session-", "");
      const key = headers.get("x-factory-idempotency-key") ?? "";
      const body = JSON.parse(String(init?.body));
      const operation =
        method === "PATCH"
          ? "update"
          : parts[4] === "events"
            ? parts[5]
            : "create";
      const call = { method, path, key, body, status: 0 };
      calls.push(call);
      if (failCreate && operation === "create") {
        call.status = 503;
        return new Response("{}", { status: 503 });
      }
      try {
        const result = await new ApplicationRuntime(store).approvalCommand(
          role,
          session,
          parts[2],
          parts[3],
          operation,
          key,
          body,
        );
        call.status = result.status;
        return new Response(JSON.stringify(result.body), {
          status: result.status,
        });
      } catch (error) {
        const rejected = error as { status: number; body: unknown };
        call.status = rejected.status;
        return new Response(JSON.stringify(rejected.body), {
          status: rejected.status,
        });
      }
    },
  });
  return { profile, store, calls, env, entity };
}

describe("calculated approval through bounded verification probes", () => {
  it.each([false, true])(
    "executes real correction and optional receipt replay (%s)",
    async (replay) => {
      const { profile, store, calls, env, entity } = fixture();
      await env.boot();
      try {
        const id = entity + "-update";
        const journey = profile.journeys[id]!;
        const entry = profile.stepPlan.find((step) => step.stepId === id)!;
        const context = {
          entry,
          environment: env,
          signal: new AbortController().signal,
        };
        const result = replay
          ? await runIdempotencyProbe(
              context,
              {
                ...journey,
                idempotencyKey: journey.headers![0]!.value,
                expectedVersion: 2,
                replayExpectation: "stored-success",
              } as IdempotencyJourneyFixture,
              profile.apiRegistry,
            )
          : await runRoleJourneyProbe(context, journey, profile.apiRegistry);
        expect(result.status).toBe("passed");
        expect(calls.map((call) => call.status)).toEqual(
          replay ? [201, 200, 200, 200, 200] : [201, 200, 200, 200],
        );
        const writes = calls.filter((call) => call.body.values);
        for (const call of writes) {
          expect(call.body.values).toMatchObject({
            quantity: 3,
            unitPrice: 0.07,
          });
          expect(call.body.values).not.toHaveProperty("total");
        }
        expect(
          (await store.list(entity)).find(
            (row: any) => row.id !== "sample-" + entity,
          ),
        ).toMatchObject({
          quantity: 3,
          unitPrice: 0.07,
          total: 0.21,
          version: 3,
        });
        expect(await store.listAudit()).toHaveLength(4);
        if (replay) expect(calls[3]).toEqual(calls[4]);
        expect(JSON.stringify(result)).not.toContain(calls[0]!.key);
      } finally {
        await env.cleanup();
      }
    },
  );

  it("stops before correction when the actual create prerequisite fails", async () => {
    const { profile, store, calls, env, entity } = fixture(true);
    await env.boot();
    try {
      const id = entity + "-update";
      const result = await runRoleJourneyProbe(
        {
          entry: profile.stepPlan.find((step) => step.stepId === id)!,
          environment: env,
          signal: new AbortController().signal,
        },
        profile.journeys[id]!,
        profile.apiRegistry,
      );
      expect(result).toMatchObject({
        status: "failed",
        failureCode: "role-journey.chain_unexpected",
        httpStatus: 503,
      });
      expect(calls).toHaveLength(1);
      expect(await store.listAudit()).toHaveLength(0);
    } finally {
      await env.cleanup();
    }
  });
});

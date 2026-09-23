import { describe, expect, it } from "vitest";
import { selectContentDirectoryProfile } from "@factory/compiler";
import { contentDirectoryInput } from "../../../packages/compiler/test/fixtures/content-directory.js";
import {
  loadDirectoryRuntime,
  directoryPrismaHarness,
} from "../../../packages/compiler/test/fixtures/content-directory-runtime.js";
import { deriveVerificationProfile } from "../src/verifier/verification-graph-plan.js";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";
import {
  runRoleJourneyProbe,
  runIdempotencyProbe,
  runAuthorizationDenialProbe,
} from "../src/verifier/probes.js";

function environment(fetch: typeof globalThis.fetch, timeout = 1000) {
  return new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-directory-probe",
    rootDirectory: "directory-probe",
    composeProjectName: "factory-preview-directory-probe",
    artifacts: [
      { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
      { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
    ],
    operationTimeoutMs: timeout,
    startPreviewRun: async () => ({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    }),
    stopPreviewRun: async () => undefined,
    fetch,
  });
}
const row = {
  id: "probe-record",
  title: "Useful guide",
  summary: "A concise summary",
  category: "Guides",
  status: "listed",
  version: 0,
};
const list = (records: unknown[]) => ({
  apiVersion: "factory.generated.directory-list/v1",
  records,
  offset: 0,
  limit: 20,
  hasMore: false,
});
describe("exact Directory verification", () => {
  it("consumes the same public root selector and rejects missing/stale/malformed witnesses", () => {
    const input = contentDirectoryInput();
    expect(
      selectContentDirectoryProfile(input.graph, input.compositionLock)?.key,
    ).toBe("content-directory");
    for (const mutate of [
      (value: any) => {
        value.compositionLock = undefined;
      },
      (value: any) => {
        value.compositionLock.applicationGraphChecksum =
          "sha256:" + "0".repeat(64);
      },
      (value: any) => {
        value.compositionLock.packages[0].lock.manifestDigest =
          "sha256:" + "0".repeat(64);
      },
      (value: any) => {
        value.compositionLock.packages[0].bindings = {};
      },
    ]) {
      const altered = structuredClone(input);
      mutate(altered);
      expect(() =>
        deriveVerificationProfile(altered.graph, altered.compositionLock),
      ).toThrow();
    }
  });
  it("executes all derived journeys through emitted controller and bounded probe path", async () => {
    const input = contentDirectoryInput(),
      profile = deriveVerificationProfile(input.graph, input.compositionLock);
    expect(
      profile.stepPlan.some(
        (step) => step.stepId === "directory-reader-hidden-list",
      ),
    ).toBe(true);
    const db = directoryPrismaHarness(),
      emitted = loadDirectoryRuntime(db.client),
      controller = new (emitted.load("api/src/main.ts").GeneratedController)();
    const calls: any[] = [];
    const env = environment(async (url, init) => {
      const parsed = new URL(String(url)),
        parts = parsed.pathname.split("/").filter(Boolean),
        method = init?.method ?? "GET",
        headers = Object.fromEntries(new Headers(init?.headers).entries()),
        request = { headers, originalUrl: parsed.pathname + parsed.search };
      try {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        const result =
          method === "GET"
            ? parts[2]
              ? await controller.read(parts[1], parts[2], request)
              : await controller.list(parts[1], request)
            : method === "PATCH"
              ? await controller.correct(parts[1], parts[2], body, request)
              : parts[3] === "events"
                ? await controller.transition(
                    parts[1],
                    parts[2],
                    parts[4],
                    body,
                    request,
                  )
                : await controller.create(parts[1], body, request);
        const status = method === "POST" && !parts[2] ? 201 : 200;
        calls.push({ method, status });
        return new Response(JSON.stringify(result), { status });
      } catch (error: any) {
        calls.push({ method, status: error.status });
        return new Response(JSON.stringify(error.body), {
          status: error.status,
        });
      }
    });
    await env.boot();
    try {
      for (const entry of profile.stepPlan) {
        if (entry.kind === "migration" || entry.kind === "health") continue;
        const journey = profile.journeys[entry.stepId]!,
          context = {
            entry,
            environment: env,
            signal: new AbortController().signal,
          };
        const result =
          entry.kind === "idempotency"
            ? await runIdempotencyProbe(
                context,
                journey as any,
                profile.apiRegistry,
              )
            : entry.kind === "authorization-denial"
              ? await runAuthorizationDenialProbe(
                  context,
                  journey,
                  profile.apiRegistry,
                )
              : await runRoleJourneyProbe(
                  context,
                  journey,
                  profile.apiRegistry,
                );
        expect(result, entry.stepId).toMatchObject({ status: "passed" });
        expect(JSON.stringify(result)).not.toContain("Verifier resource");
        expect(JSON.stringify(result)).not.toContain("fixture-session");
      }
      expect(calls.some((call) => call.status === 404)).toBe(true);
      expect(calls.some((call) => call.status === 409)).toBe(true);
      expect(calls.some((call) => call.status === 403)).toBe(true);
    } finally {
      await env.cleanup();
    }
  });
  it.each([
    [
      "listed present",
      list([row]),
      { kind: "list", listedOnly: true, presence: "present" },
      true,
    ],
    [
      "hidden absent",
      list([]),
      { kind: "list", listedOnly: true, presence: "absent" },
      true,
    ],
    [
      "unproven absence beyond first page",
      { ...list([]), hasMore: true },
      { kind: "list", listedOnly: true, presence: "absent" },
      false,
    ],
    [
      "hidden leaked",
      list([{ ...row, status: "hidden" }]),
      { kind: "list", listedOnly: true, presence: "absent" },
      false,
    ],
    [
      "curator hidden",
      list([{ ...row, status: "hidden" }]),
      { kind: "list", listedOnly: false, presence: "present" },
      true,
    ],
    [
      "wrong envelope",
      { ...list([]), apiVersion: "legacy" },
      { kind: "list", listedOnly: true, presence: "absent" },
      false,
    ],
    [
      "list exposes body",
      list([{ ...row, body: "secret" }]),
      { kind: "list", listedOnly: true, presence: "present" },
      false,
    ],
    [
      "partial page",
      { ...list([row]), limit: 100 },
      { kind: "list", listedOnly: true, presence: "present" },
      false,
    ],
    [
      "detail",
      { ...row, body: "Useful plain text" },
      { kind: "detail", listedOnly: true, presence: "present" },
      true,
    ],
    [
      "Unicode maximum detail",
      { ...row, body: "界".repeat(12000) },
      { kind: "detail", listedOnly: true, presence: "present" },
      true,
    ],
    [
      "hidden detail",
      { ...row, status: "hidden", body: "Hidden text" },
      { kind: "detail", listedOnly: true, presence: "present" },
      false,
    ],
  ] as const)(
    "matches only complete bounded %s without exposing records",
    async (_name, body, read, matches) => {
      const env = environment(
        async () => new Response(JSON.stringify(body), { status: 200 }),
      );
      await env.boot();
      try {
        const result = await env.request("GET", "/api/resource", "api", {
          directoryRead: { ...read, recordId: "probe-record" },
        } as any);
        expect(result).toMatchObject({ directoryReadMatches: matches });
        expect(JSON.stringify(result)).not.toContain("Useful");
        expect(Object.keys(result).sort()).toEqual([
          "directoryReadMatches",
          "durationMs",
          "ok",
          "status",
        ]);
      } finally {
        await env.cleanup();
      }
    },
  );
  it.each(["oversize", "malformed", "timeout"] as const)(
    "fails closed on %s streaming bodies",
    async (kind) => {
      let cancelled = false;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          if (kind === "oversize") controller.enqueue(new Uint8Array(65537));
          else if (kind === "malformed") {
            controller.enqueue(new TextEncoder().encode("{"));
            controller.close();
          }
        },
        cancel() {
          cancelled = true;
        },
      });
      const env = environment(
        async () => new Response(body, { status: 200 }),
        20,
      );
      await env.boot();
      try {
        const result = await env.request("GET", "/api/resource", "api", {
          directoryRead: {
            kind: "list",
            listedOnly: true,
            presence: "absent",
            recordId: "probe-record",
          },
        } as any);
        expect(result).toMatchObject({ directoryReadMatches: false });
        if (kind !== "malformed") expect(cancelled).toBe(true);
      } finally {
        await env.cleanup();
      }
    },
  );
  it("fails a derived read probe on a visibility mismatch instead of accepting HTTP 200", async () => {
    const input = contentDirectoryInput(),
      profile = deriveVerificationProfile(input.graph, input.compositionLock),
      entry = profile.stepPlan.find(
        (item) => item.stepId === "directory-reader-hidden-list",
      )!;
    const env = environment(
      async (_url, init) =>
        new Response(
          JSON.stringify(
            init?.method === "POST"
              ? { id: "probe-record" }
              : list([{ ...row, status: "hidden" }]),
          ),
          { status: init?.method === "POST" ? 201 : 200 },
        ),
    );
    await env.boot();
    try {
      const result = await runRoleJourneyProbe(
        { entry, environment: env, signal: new AbortController().signal },
        profile.journeys[entry.stepId]!,
        profile.apiRegistry,
      );
      expect(result).toMatchObject({ status: "failed" });
      expect(JSON.stringify(result)).toContain("directory.read_mismatch");
      expect(JSON.stringify(result)).not.toContain("Useful guide");
    } finally {
      await env.cleanup();
    }
  });
  it("keeps ordinary probes body-free and rejects directory reads on mutation routes", async () => {
    let reads = 0;
    const env = environment(
      async () =>
        ({
          status: 200,
          ok: true,
          get body() {
            reads++;
            throw Error("body accessed");
          },
        }) as unknown as Response,
    );
    await env.boot();
    try {
      expect(await env.request("GET", "/api/resource", "api")).toMatchObject({
        status: 200,
      });
      expect(reads).toBe(0);
      await expect(
        env.request("POST", "/api/resource", "api", {
          directoryRead: {
            kind: "list",
            listedOnly: true,
            presence: "present",
            recordId: "probe-record",
          },
        }),
      ).rejects.toThrow();
    } finally {
      await env.cleanup();
    }
  });
});

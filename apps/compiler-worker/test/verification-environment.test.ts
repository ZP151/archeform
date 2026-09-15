import { describe, expect, it, vi } from "vitest";
import { VerificationEnvironment } from "../src/verifier/verification-environment.js";

function environment() {
  const fetch = vi.fn(async () => new Response("{}", { status: 201 }));
  const env = new VerificationEnvironment({
    artifactRoot: "generated",
    previewRunId: "preview-verify-01h3k6f",
    rootDirectory: "expense-approval-published-expense-approval",
    composeProjectName: "factory-preview-preview-verify-01h3k6f",
    artifacts: [
      { path: "docker-compose.yml", digest: "sha256:deadbeef", sizeBytes: 5 },
      { path: "api/package.json", digest: "sha256:deadbeef", sizeBytes: 5 },
    ],
    operationTimeoutMs: 1000,
    startPreviewRun: vi.fn(async () => ({
      webPort: 3000,
      apiPort: 3001,
      previewUrl: "http://127.0.0.1:3000",
    })),
    stopPreviewRun: vi.fn(async () => undefined),
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { env, fetch };
}

describe("bounded declared values envelopes", () => {
  it.each([
    ["POST", '{"amount":42,"enabled":true}'],
    ["POST", '{ "values": { "amount":42,"notes":"Safe fixture" } }'],
    ["PATCH", '{"expectedVersion":0,"values":{"amount":42}}'],
    ["PATCH", '{"values":{"amount":42},"expectedVersion":9007199254740991}'],
  ] as const)("forwards %s bodies byte for byte: %s", async (method, body) => {
    const { env, fetch } = environment();
    await env.boot();
    await env.request(method, "/api/expense", "api", { body });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method, body });
  });
  it.each([
    { values: {} },
    { values: null },
    { values: [] },
    { values: { notes: null } },
    { values: { notes: { secret: "hostile-payload" } } },
    { values: { notes: ["hostile-payload"] } },
    { values: { notes: "x".repeat(201) } },
    { values: { "invalid key": 1 } },
    {
      values: Object.fromEntries(
        Array.from({ length: 17 }, (_, i) => ["k" + i, i]),
      ),
    },
    { values: { amount: 1 }, extra: true },
    { expectedVersion: -1, values: { amount: 1 } },
    { expectedVersion: 0.5, values: { amount: 1 } },
    { expectedVersion: 9007199254740992, values: { amount: 1 } },
    { expectedVersion: "0", values: { amount: 1 } },
    { expectedVersion: null, values: { amount: 1 } },
    { expectedVersion: 0, values: { amount: 1 }, extra: true },
    { values: { a: "x".repeat(200), b: "x".repeat(200), c: "x".repeat(120) } },
  ])("rejects unsupported structures before fetching", async (value) => {
    const { env, fetch } = environment();
    await env.boot();
    const body = JSON.stringify(value);
    await expect(
      env.request("PATCH", "/api/expense", "api", { body }),
    ).rejects.toThrow();
    try {
      await env.request("PATCH", "/api/expense", "api", { body });
    } catch (error) {
      expect(String(error)).not.toContain(body);
      expect(String(error)).not.toContain("hostile-payload");
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

import { expect, test } from "@playwright/test";
import {
  customerRequestsGuard,
  customerRequestsApiUrl,
  customerRequestsCleanupPlan,
  customerRequestsFailure,
  customerRequestsHistorySummary,
} from "./customer-requests";

const environment = {
  authorized: "1",
  isolated: "1",
  factoryProject: "factory-t10-customer-requests",
  controlPlane: "http://127.0.0.1:3101",
  workbench: "http://127.0.0.1:3102",
};
const preview = {
  id: "preview-customer-requests-test",
  compilationId: "compilation-customer-test",
  composeProjectName: "factory-preview-preview-customer-requests-test",
};

test("Customer Requests actual execution requires explicit isolated local authorization", () => {
  expect(customerRequestsGuard(environment)).toBe(
    "factory-t10-customer-requests",
  );
  for (const change of [
    { authorized: undefined },
    { isolated: "0" },
    { factoryProject: "factory-main" },
    { controlPlane: "https://example.com" },
    { workbench: "http://user:secret@127.0.0.1:3102" },
    { workbench: "http://127.0.0.1:3102/path" },
    { controlPlane: "http://127.0.0.1:3101?token=private" },
    { controlPlane: "http://127.0.0.1:65536" },
  ])
    expect(() =>
      customerRequestsGuard({ ...environment, ...change }),
    ).toThrow();
});

test("Customer Requests API rejects escaped origins and paths before transport", () => {
  expect(
    customerRequestsApiUrl(
      "http://127.0.0.1:4100",
      "/api/customer-request/a/history?limit=50",
    ),
  ).toBe("http://127.0.0.1:4100/api/customer-request/a/history?limit=50");
  for (const path of [
    "//example.com/api/customer-request",
    "/other",
    "/api/../private",
    "/api/customer-request#secret",
    "/api/customer-request/../../private",
    "/api/customer-request/%2e%2e/private",
  ])
    expect(() =>
      customerRequestsApiUrl("http://127.0.0.1:4100", path),
    ).toThrow();
  expect(() =>
    customerRequestsApiUrl("http://example.com", "/api/customer-request"),
  ).toThrow();
});

test("Customer Requests cleanup plans require exact observed compilation and preview ownership", () => {
  expect(
    customerRequestsCleanupPlan(
      preview,
      "compilation-customer-test",
      environment.factoryProject,
    ),
  ).toEqual({
    compilationId: "compilation-customer-test",
    previewRunId: "preview-customer-requests-test",
    composeProjectName: "factory-preview-preview-customer-requests-test",
    factoryProject: "factory-t10-customer-requests",
    artifactPath: "/artifacts/.preview-runs/preview-customer-requests-test",
  });
  for (const input of [
    { ...preview, id: "../preview-test" },
    { ...preview, composeProjectName: "factory-preview-preview-other" },
    { ...preview, compilationId: "another-compilation" },
  ])
    expect(() =>
      customerRequestsCleanupPlan(
        input,
        "compilation-customer-test",
        environment.factoryProject,
      ),
    ).toThrow();
  expect(() =>
    customerRequestsCleanupPlan(preview, preview.compilationId, "factory-main"),
  ).toThrow();
});

test("Customer Requests history evidence keeps counts and digests while rejecting broken version chains", () => {
  const rows = [
    {
      id: "event-2",
      request: "request-1",
      requestVersion: 1,
      action: "reply",
      message: "private fixture text",
    },
    {
      id: "event-1",
      request: "request-1",
      requestVersion: 0,
      action: "create",
      afterDescription: "private fixture text",
    },
  ];
  const result = customerRequestsHistorySummary("request-1", 1, rows);
  expect(result).toMatchObject({
    version: 1,
    events: 2,
    actions: ["create", "reply"],
  });
  expect(result.recordDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
  expect(result.historyDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
  expect(JSON.stringify(result)).not.toContain("private");
  for (const bad of [
    rows.slice(0, 1),
    [...rows, rows[0]],
    [rows[0], { ...rows[1], request: "foreign" }],
    [rows[0], { ...rows[1], id: "event-2" }],
    [rows[0], { ...rows[1], action: "private text" }],
  ])
    expect(() => customerRequestsHistorySummary("request-1", 1, bad)).toThrow();
});

test("Customer Requests failure packets discard raw errors and foreign stack paths", () => {
  const result = customerRequestsFailure({
    message: "private",
    matcherResult: { name: "toEqual", actual: "private" },
    stack:
      "Error private\n    at check (C:\\repo\\e2e\\customer-requests.spec.ts:123:9)",
  });
  expect(result).toEqual({
    assertion: "toEqual",
    location: { file: "e2e/customer-requests.spec.ts", line: 123, column: 9 },
  });
  expect(JSON.stringify(result)).not.toContain("private");
  expect(
    customerRequestsFailure({
      stack: "at private (/private/token:12:9)",
      matcherResult: { name: "private" },
    }),
  ).toEqual({ assertion: "unknown", location: null });
});

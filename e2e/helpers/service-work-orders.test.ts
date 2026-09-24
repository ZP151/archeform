import { expect, test } from "@playwright/test";
import {
  workOrdersGuard,
  workOrdersApiUrl,
  workOrdersFactRequest,
  parseWorkOrdersFacts,
  workOrdersFailure,
  workOrdersPhase,
  workOrdersCleanup,
} from "./service-work-orders";

const owned = {
  id: "preview-work-orders-test",
  composeProjectName: "factory-preview-preview-work-orders-test",
};
const environment = {
  isolated: "1",
  factoryProject: "factory-t10-work-orders",
  controlPlane: "http://127.0.0.1:3101",
  workbench: "http://127.0.0.1:3102",
};
const facts = {
  orders: 1,
  history: 2,
  audit: 2,
  receipts: 2,
  records: [{ version: 1, history: 2, audit: 2, receipts: 2 }],
};

test("Work Orders guard rejects nonisolated, remote, credential-bearing and path-bearing origins", () => {
  expect(workOrdersGuard(environment)).toBe("factory-t10-work-orders");
  for (const bad of [
    { isolated: "0" },
    { factoryProject: "factory-main" },
    { controlPlane: "https://example.com" },
    { workbench: "http://user:secret@127.0.0.1:3102" },
    { workbench: "http://127.0.0.1:3102/private" },
    { controlPlane: "http://127.0.0.1:3101?token=private" },
  ])
    expect(() => workOrdersGuard({ ...environment, ...bad })).toThrow(
      "Invalid isolated Work Orders environment.",
    );
});
test("Work Orders API URL stays on the exact owned HTTP origin without redirects or credentials", () => {
  expect(
    workOrdersApiUrl("http://127.0.0.1:4100", "/api/work-order/a/history"),
  ).toBe("http://127.0.0.1:4100/api/work-order/a/history");
  for (const path of [
    "//example.com/api/work-order",
    "http://user:secret@127.0.0.1:4100/api/work-order",
    "/other",
    "/api/../private",
    "/api/work-order#secret",
  ])
    expect(() => workOrdersApiUrl("http://127.0.0.1:4100", path)).toThrow();
  expect(() =>
    workOrdersApiUrl("http://example.com", "/api/work-order"),
  ).toThrow();
});
test("Work Orders facts require exact Preview ownership and bounded unique IDs before Docker access", () => {
  expect(workOrdersFactRequest(owned, ["order-1"])).toEqual(["order-1"]);
  for (const bad of [
    { ...owned, composeProjectName: "factory-preview-preview-other" },
    { ...owned, id: "../preview-x" },
  ])
    expect(() => workOrdersFactRequest(bad, [])).toThrow();
  for (const ids of [
    ["';private"],
    ["x".repeat(65)],
    ["same", "same"],
    Array.from({ length: 5 }, (_, i) => "order-" + i),
  ])
    expect(() => workOrdersFactRequest(owned, ids)).toThrow();
});
test("Work Orders observation accepts counts only and rejects secret-bearing or malformed payloads", () => {
  expect(parseWorkOrdersFacts(JSON.stringify(facts), 1)).toEqual(facts);
  for (const input of [
    { ...facts, raw: "private" },
    { ...facts, orders: -1 },
    { ...facts, receipts: 1.5 },
    { ...facts, history: 10001 },
    { ...facts, records: [{ ...facts.records[0], body: "private" }] },
    { ...facts, records: [{ ...facts.records[0], version: 2147483648 }] },
    { ...facts, records: [] },
  ])
    expect(() => parseWorkOrdersFacts(JSON.stringify(input), 1)).toThrow(
      "Invalid bounded Work Orders facts.",
    );
  for (const text of [
    "private",
    " ".repeat(4097),
    JSON.stringify(facts).replace('"orders":1', '"orders":-0'),
  ])
    expect(() => parseWorkOrdersFacts(text, 1)).toThrow();
});
test("Work Orders diagnostics never retain raw errors, actual payloads or unrecognized paths", () => {
  const result = workOrdersFailure({
    message: "private",
    matcherResult: { name: "toEqual", actual: "private" },
    stack:
      "Error private\n    at fixture (C:\\repo\\e2e\\service-work-orders.spec.ts:123:9)",
  });
  expect(result).toEqual({
    assertion: "toEqual",
    location: { file: "e2e/service-work-orders.spec.ts", line: 123, column: 9 },
  });
  expect(JSON.stringify(result)).not.toContain("private");
  expect(
    workOrdersFailure({
      stack: "at file (/private/token:12:9)",
      matcherResult: { name: "private" },
    }),
  ).toEqual({ assertion: "unknown", location: null });
});
test("Work Orders phase evidence permits only fixed phases and UUID attempts", () => {
  const attempt = "11111111-1111-4111-8111-111111111111";
  expect(workOrdersPhase(attempt, "restart-replay")).toEqual({
    event: "work-orders.acceptance.phase",
    attempt,
    phase: "restart-replay",
  });
  expect(() => workOrdersPhase(attempt, "private")).toThrow();
  expect(() => workOrdersPhase("private", "cleanup")).toThrow();
});
test("Work Orders cleanup cannot call an uncertain Preview absent or removed", () => {
  expect(workOrdersCleanup(false, undefined, false)).toBe("no-preview-created");
  expect(workOrdersCleanup(false, "cleanup-required", false)).toBe(
    "cleanup_required",
  );
  expect(workOrdersCleanup(true, undefined, false)).toBe("cleanup_required");
  expect(workOrdersCleanup(true, "cleanup-required", true)).toBe(
    "cleanup_required",
  );
  expect(workOrdersCleanup(true, "owned-preview-recovered", true)).toBe(
    "removed",
  );
});

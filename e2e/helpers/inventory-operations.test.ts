import { expect, test } from "@playwright/test";
import {
  inventoryFactRequest,
  parseInventoryFacts,
  inventoryFailureDiagnostic,
  inventoryPhaseEvent,
} from "./inventory-operations";

test("Inventory observations reject unowned resources and unbounded record identifiers", () => {
  const owned = {
    id: "preview-inventory-test",
    composeProjectName: "factory-preview-preview-inventory-test",
  };
  expect(inventoryFactRequest(owned, ["item-1", "item-2"])).toEqual([
    "item-1",
    "item-2",
  ]);
  for (const candidate of [
    { ...owned, composeProjectName: "factory-preview-preview-someone-else" },
    { ...owned, id: "../preview-inventory-test" },
  ])
    expect(() => inventoryFactRequest(candidate, [])).toThrow(
      "Invalid owned Inventory observation.",
    );
  for (const ids of [
    ["x'; DROP TABLE"],
    ["x".repeat(65)],
    ["same", "same"],
    Array.from({ length: 5 }, (_, i) => "item-" + i),
  ])
    expect(() => inventoryFactRequest(owned, ids)).toThrow(
      "Invalid owned Inventory observation.",
    );
});

test("Inventory facts allow only bounded numbers, never database text or extra fields", () => {
  const empty = {
    items: 0,
    movements: 0,
    audit: 0,
    receipts: 0,
    effects: 0,
    records: [],
  };
  expect(parseInventoryFacts(JSON.stringify(empty), 0)).toEqual(empty);
  for (const payload of [
    { ...empty, secret: "must-not-escape" },
    { ...empty, items: -1 },
    { ...empty, audit: 1.5 },
    { ...empty, records: [{}] },
  ])
    expect(() => parseInventoryFacts(JSON.stringify(payload), 0)).toThrow(
      "Invalid bounded Inventory facts.",
    );
  expect(() => parseInventoryFacts("secret".repeat(10000), 0)).toThrow(
    "Invalid bounded Inventory facts.",
  );
});

test("Inventory diagnostics retain only allowlisted location, matcher and phase", () => {
  const failure = {
    message: "private-message",
    matcherResult: { name: "toEqual", actual: "private-body" },
    stack:
      "Error: private-message\n    at fixture (C:\\repo\\e2e\\inventory-operations.spec.ts:123:9)",
  };
  expect(inventoryFailureDiagnostic(failure)).toEqual({
    assertion: "toEqual",
    location: {
      file: "e2e/inventory-operations.spec.ts",
      line: 123,
      column: 9,
    },
  });
  expect(JSON.stringify(inventoryFailureDiagnostic(failure))).not.toContain(
    "private",
  );
  expect(
    inventoryFailureDiagnostic({
      stack: "at file (/secret/token:12:9)",
      matcherResult: { name: "secret" },
    }),
  ).toEqual({ assertion: "unknown", location: null });
  const attempt = "11111111-1111-4111-8111-111111111111";
  expect(inventoryPhaseEvent(attempt, "restart-replay")).toEqual({
    event: "inventory.acceptance.phase",
    attempt,
    phase: "restart-replay",
  });
  expect(() => inventoryPhaseEvent(attempt, "private-input")).toThrow();
  expect(() => inventoryPhaseEvent("private-input", "draft")).toThrow();
});

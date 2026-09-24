import { describe, it, expect } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { selectCustomerRequestsProfile } from "../src/customer-requests-contract.js";
import {
  generateApplicationBundle,
  buildCompilationInput,
  buildCompilationPlan,
} from "../src/index.js";
import {
  customerRequestsInput,
  roleCustomerRequestsInput,
} from "./fixtures/customer-requests.js";
import { inventoryOperationsInput } from "./fixtures/inventory-operations.js";
type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
const mutableInput = () =>
  structuredClone(customerRequestsInput()) as Mutable<
    ReturnType<typeof customerRequestsInput>
  >;
const select = (input: ReturnType<typeof customerRequestsInput>) =>
  selectCustomerRequestsProfile(input.graph, input.compositionLock);
describe("Customer Requests immutable compiler contract", () => {
  it("selects after JSON persistence with detached frozen coordinates and limits", () => {
    const input = mutableInput();
    const profile = select(JSON.parse(JSON.stringify(input)));
    expect(profile).toMatchObject({
      key: "customer-requests",
      version: "1.0.0",
      graphHash: hashApplicationGraph(input.graph),
      requestEntity: "customer-request",
      historyEntity: "request-history",
      principalEntity: "customer-requests-fixture-principal",
      sessionEntity: "customer-requests-fixture-session",
      roles: { staff: "staff", customer: "customer" },
      pages: {
        list: "my-requests",
        form: "new-request",
        detail: "request-detail",
        queue: "staff-queue",
      },
      reference: {
        blueprint: "request",
        storage: "requestId",
        api: "request",
      },
      requestVersionMaximum: 2147483647,
    });
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile!.roles)).toBe(true);
    expect(Object.isFrozen(profile!.pages)).toBe(true);
    expect(Object.isFrozen(profile!.reference)).toBe(true);
    input.graph.policy.roles[0] = "changed";
    expect(profile!.roles.staff).toBe("staff");
  });
  it("does not activate an unrelated family from labels or six packages", () => {
    const input = inventoryOperationsInput();
    input.graph.metadata.name = "Customer Requests";
    expect(
      selectCustomerRequestsProfile(input.graph, input.compositionLock),
    ).toBeUndefined();
  });
  it.each([
    "missing-lock",
    "graph-hash",
    "lock-digest",
    "package-digest",
    "package-root",
    "binding",
    "missing-package",
    "extra-package",
    "mutable-selections",
    "unknown-root",
    "unknown-field",
    "extra-field",
    "extra-grant",
    "extra-page",
    "effects",
    "missing-number",
    "renamed-number",
    "reserved-route",
    "populated-seed",
    "bad-index",
    "wrong-principal",
  ])("rejects %s even with otherwise fresh locks", (change) => {
    const input = mutableInput();
    const { graph: g } = input;
    if (change === "missing-lock") {
      expect(() => selectCustomerRequestsProfile(g)).toThrow();
      return;
    }
    if (change === "graph-hash") g.metadata.name = "Changed";
    if (change === "lock-digest")
      input.compositionLock.lockDigest = "sha256:" + "0".repeat(64);
    if (change === "package-digest")
      input.compositionLock.packages[0]!.lock.manifestDigest =
        "sha256:" + "0".repeat(64);
    if (change === "package-root")
      input.compositionLock.packages[0]!.lock.packageRoot = "packages/other";
    if (change === "binding")
      input.compositionLock.packages[0]!.bindings.entityKey = {
        graphSymbol: "graph.domain.request-history",
      };
    if (change === "missing-package") input.compositionLock.packages.pop();
    if (change === "extra-package")
      input.compositionLock.packages.push(
        structuredClone(input.compositionLock.packages[0]!),
      );
    if (change === "mutable-selections")
      g.integration.compositionSelections = [];
    if (change === "unknown-root")
      Object.assign(g, {
        witness: { apiVersion: "factory.customer-requests-graph-witness/v1" },
      });
    if (change === "unknown-field")
      Object.assign(g.domain.entities[0]!.fields[0]!, { default: "forged" });
    if (change === "extra-field")
      g.domain.entities[0]!.fields.push({
        key: "private",
        type: "string",
        required: false,
      });
    if (change === "extra-grant")
      g.policy.permissions[0]!.actions.push("delete");
    if (change === "extra-page")
      g.page.pages.push({
        ...g.page.pages[0]!,
        id: "history",
        route: "/history",
      });
    if (change === "effects")
      g.flow.flows[0]!.transitions[0]!.effects = [
        { capability: "audit.record", operation: "record" },
      ];
    if (change === "missing-number")
      g.domain.entities[1]!.fields = g.domain.entities[1]!.fields.filter(
        (f) => f.key !== "requestVersion",
      );
    if (change === "renamed-number")
      g.domain.entities[1]!.fields.find(
        (f) => f.key === "requestVersion",
      )!.key = "otherVersion";
    if (change === "reserved-route") {
      g.domain.entities[0]!.key = "work-order-assignees";
    }
    if (change === "populated-seed")
      g.domain.seedData = [
        {
          entity: "request-history",
          id: "fake",
          values: { requestVersion: 0 },
        },
      ];
    if (change === "bad-index")
      g.domain.entities[1]!.indexes[0]!.unique = false;
    if (change === "wrong-principal")
      g.domain.entities[2]!.fields[1]!.values!.push("visitor");
    // Keep malformed schema/numeric cases raw: hashApplicationGraph itself rejects these.
    if (
      [
        "extra-field",
        "extra-grant",
        "extra-page",
        "effects",
        "populated-seed",
        "bad-index",
        "wrong-principal",
      ].includes(change)
    ) {
      try {
        input.compositionLock = structuredClone(
          createCapabilityCompositionLock({
            graphChecksum: hashApplicationGraph(g),
            selections: input.compositionLock.packages,
          }),
        ) as Mutable<typeof input.compositionLock>;
      } catch {
        /* Boundary still must reject the malformed graph. */
      }
    }
    expect(() => select(input)).toThrow(/Customer Requests/);
  });
  it.each(["accessor", "inherited", "cycle", "symbol", "sparse"])(
    "rejects non-JSON %s without invoking a getter",
    (change) => {
      const input = mutableInput();
      let reads = 0;
      if (change === "accessor")
        Object.defineProperty(input.graph.metadata, "name", {
          enumerable: true,
          get() {
            reads++;
            return "Forged";
          },
        });
      if (change === "inherited")
        Object.setPrototypeOf(input.graph.domain.entities[0]!.fields[0]!, {
          extra: true,
        });
      if (change === "cycle")
        Object.assign(input.graph.metadata, { extra: input.graph });
      if (change === "symbol")
        Object.assign(input.graph.metadata, { [Symbol("extra")]: true });
      if (change === "sparse") delete input.graph.page.pages[0];
      expect(() => select(input)).toThrow();
      expect(reads).toBe(0);
    },
  );
  it("blocks public compilation until the family runtime is implemented", () => {
    const input = {
      ...customerRequestsInput(),
      publishedRevisionId: "customer-requests-published",
    };
    for (const boundary of [
      generateApplicationBundle,
      buildCompilationPlan,
      buildCompilationInput,
    ])
      expect(() => boundary(input)).toThrow(/Customer Requests runtime/);
  });
});

import { createRequire, syncBuiltinESMExports } from "node:module";
it("verifies actual locked package bytes, not only registered manifest values", () => {
  const input = customerRequestsInput();
  const filesystem = createRequire(import.meta.url)(
    "node:fs",
  ) as typeof import("node:fs");
  const original = filesystem.readFileSync;
  let reads = 0;
  filesystem.readFileSync = ((...args: Parameters<typeof original>) => {
    const bytes = original(...args);
    if (
      String(args[0])
        .replaceAll("\\", "/")
        .includes("/assets/core.crud/1.0.1/") &&
      String(args[0]).endsWith(".ts.tpl")
    ) {
      reads++;
      return typeof bytes === "string"
        ? bytes + "\n// changed physical source"
        : Buffer.concat([bytes, Buffer.from("\n// changed physical source")]);
    }
    return bytes;
  }) as typeof original;
  syncBuiltinESMExports();
  try {
    expect(() => select(input)).toThrow(/Customer Requests/);
    expect(reads).toBeGreaterThan(0);
  } finally {
    filesystem.readFileSync = original;
    syncBuiltinESMExports();
  }
});

it.each([
  ["support", "requester"],
  ["customer", "staff"],
  ["s".repeat(128), "c".repeat(128)],
])("binds renamed roles %s and %s without truncation", (staff, customer) => {
  const input = roleCustomerRequestsInput(staff, customer);
  expect(select(input)?.roles).toEqual({ staff, customer });
});
import { customerRequestsBlueprint } from "./fixtures/customer-requests.js";
import { composeInventoryInput } from "./fixtures/inventory-operations.js";
import { selectServiceWorkOrdersProfile } from "../src/service-work-orders-contract.js";
it("derives renamed entities, workflow and pages from structure", () => {
  const { spec, blueprint } = customerRequestsBlueprint();
  const b = JSON.parse(
    JSON.stringify(blueprint)
      .replaceAll('"customer-request"', '"support-ticket"')
      .replaceAll('"request-history"', '"ticket-history"')
      .replaceAll('"handle-request"', '"handle-ticket"')
      .replaceAll('"my-requests"', '"my-tickets"'),
  );
  const input = composeInventoryInput(spec, b);
  expect(select(input)).toMatchObject({
    requestEntity: "support-ticket",
    historyEntity: "ticket-history",
    workflow: "handle-ticket",
    pages: { list: "my-tickets" },
  });
  expect(
    selectServiceWorkOrdersProfile(input.graph, input.compositionLock),
  ).toBeUndefined();
});
it.each([
  "owner-only",
  "history-only",
  "reply-only",
  "transition-reply-only",
  "inherited-candidate",
  "accessor-candidate",
])("fails closed at every public entry for %s", (change) => {
  const input = {
    ...inventoryOperationsInput(),
    publishedRevisionId: "malformed-customer-request",
  };
  let reads = 0;
  if (change === "owner-only")
    input.graph.domain.entities[0]!.fields.push({
      key: "customerPrincipalId",
      type: "string",
      required: true,
    });
  if (change === "history-only")
    input.graph.domain.entities[0]!.fields.push({
      key: "correctsVersion",
      type: "integer",
      required: false,
    });
  if (change === "reply-only")
    input.graph.policy.permissions[0]!.actions.push("reply");
  if (change === "transition-reply-only")
    input.graph.flow.flows[0]!.transitions[0]!.event = "reply";
  if (change === "inherited-candidate")
    Object.setPrototypeOf(input.graph, {
      domain: customerRequestsInput().graph.domain,
    });
  if (change === "inherited-candidate")
    delete (input.graph as Partial<typeof input.graph>).domain;
  if (change === "accessor-candidate")
    Object.defineProperty(input.graph, "domain", {
      enumerable: true,
      get() {
        reads++;
        return {};
      },
    });
  for (const boundary of [
    generateApplicationBundle,
    buildCompilationPlan,
    buildCompilationInput,
  ])
    expect(() => boundary(input)).toThrow(/Customer Requests/);
  expect(reads).toBe(0);
});
it.each([
  "accessor",
  "inherited",
  "unknown",
  "reordered",
  "wrong-version",
  "wrong-role-binding",
])("rejects %s lock data", (change) => {
  const input = mutableInput();
  let reads = 0;
  if (change === "accessor")
    Object.defineProperty(
      input.compositionLock.packages[0]!.lock,
      "manifestDigest",
      {
        enumerable: true,
        get() {
          reads++;
          return "forged";
        },
      },
    );
  if (change === "inherited")
    Object.setPrototypeOf(input.compositionLock.packages[0]!.bindings, {
      forged: true,
    });
  if (change === "unknown")
    Object.assign(input.compositionLock, { witness: true });
  if (change === "reordered") input.compositionLock.packages.reverse();
  if (change === "wrong-version")
    input.compositionLock.packages[0]!.lock.version = "1.0.0";
  if (change === "wrong-role-binding")
    input.compositionLock.packages.find(
      (p) => p.lock.key === "core.identity-policy",
    )!.bindings.authenticatedRole = { graphSymbol: "graph.policy.staff" };
  expect(() => select(input)).toThrow(/Customer Requests/);
  expect(reads).toBe(0);
});

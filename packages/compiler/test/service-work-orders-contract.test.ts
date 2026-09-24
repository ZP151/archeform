import { describe, it, expect } from "vitest";
import { createCapabilityCompositionLock } from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { selectServiceWorkOrdersProfile } from "../src/service-work-orders-contract.js";
import {
  generateApplicationBundle,
  buildCompilationInput,
  buildCompilationPlan,
} from "../src/index.js";
import { serviceWorkOrdersInput } from "./fixtures/service-work-orders.js";
import { inventoryOperationsInput } from "./fixtures/inventory-operations.js";
type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
const mutableInput = () =>
  structuredClone(serviceWorkOrdersInput()) as Mutable<
    ReturnType<typeof serviceWorkOrdersInput>
  >;
const select = (input: ReturnType<typeof serviceWorkOrdersInput>) =>
  selectServiceWorkOrdersProfile(input.graph, input.compositionLock);
describe("Service Work Orders immutable compiler contract", () => {
  it("selects after JSON persistence with detached frozen coordinates and limits", () => {
    const input = mutableInput();
    const profile = select(JSON.parse(JSON.stringify(input)));
    expect(profile).toMatchObject({
      key: "service-work-orders",
      version: "1.0.0",
      graphHash: hashApplicationGraph(input.graph),
      orderEntity: "work-order",
      historyEntity: "work-order-history",
      principalEntity: "work-orders-fixture-principal",
      sessionEntity: "work-orders-fixture-session",
      roles: { dispatcher: "dispatcher", technician: "technician" },
      pages: {
        list: "dispatch",
        form: "new-order",
        detail: "order-detail",
        queue: "assigned-work",
      },
      reference: {
        blueprint: "workOrder",
        storage: "workOrderId",
        api: "workOrder",
      },
      orderVersionMaximum: 2147483647,
    });
    expect(Object.isFrozen(profile)).toBe(true);
    expect(Object.isFrozen(profile!.roles)).toBe(true);
    expect(Object.isFrozen(profile!.pages)).toBe(true);
    expect(Object.isFrozen(profile!.reference)).toBe(true);
    input.graph.policy.roles[0] = "changed";
    expect(profile!.roles.dispatcher).toBe("dispatcher");
  });
  it("does not activate an unrelated family from labels or six packages", () => {
    const input = inventoryOperationsInput();
    input.graph.metadata.name = "Service Work Orders";
    expect(
      selectServiceWorkOrdersProfile(input.graph, input.compositionLock),
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
      expect(() => selectServiceWorkOrdersProfile(g)).toThrow();
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
        graphSymbol: "graph.domain.work-order-history",
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
        witness: { apiVersion: "factory.service-work-orders-graph-witness/v1" },
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
        (f) => f.key !== "orderVersion",
      );
    if (change === "renamed-number")
      g.domain.entities[1]!.fields.find((f) => f.key === "orderVersion")!.key =
        "otherVersion";
    if (change === "reserved-route") {
      g.domain.entities[0]!.key = "work-order-assignees";
    }
    if (change === "populated-seed")
      g.domain.seedData = [
        {
          entity: "work-order-history",
          id: "fake",
          values: { orderVersion: 0 },
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
    expect(() => select(input)).toThrow(/Service Work Orders/);
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
  it("admits public compilation with the integrated family runtime", () => {
    const input = {
      ...serviceWorkOrdersInput(),
      publishedRevisionId: "work-orders-published",
    };
    for (const boundary of [
      generateApplicationBundle,
      buildCompilationPlan,
      buildCompilationInput,
    ])
      expect(() => boundary(input)).not.toThrow();
  });
});

import { createRequire, syncBuiltinESMExports } from "node:module";
it("verifies actual locked package bytes, not only registered manifest values", () => {
  const input = serviceWorkOrdersInput();
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
    expect(() => select(input)).toThrow(/Service Work Orders/);
    expect(reads).toBeGreaterThan(0);
  } finally {
    filesystem.readFileSync = original;
    syncBuiltinESMExports();
  }
});

import {
  loadWorkOrdersRuntime,
  roleWorkOrdersInput,
  workOrdersRoleCases,
} from "./fixtures/service-work-orders-runtime.js";
it.each(workOrdersRoleCases)(
  "keeps fixed fixture identity for $name full Graph roles",
  ({ dispatcher, technician }) => {
    const input = roleWorkOrdersInput(dispatcher, technician);
    expect(select(input)?.roles).toEqual({ dispatcher, technician });
    const emitted = loadWorkOrdersRuntime(undefined, input);
    const { resolvePrincipalContext } = emitted.load("api/src/main.ts");
    const expected = [
      {
        principalId: "fixture-principal-dispatcher",
        sessionId: "fixture-session-dispatcher",
        roles: [dispatcher],
      },
      {
        principalId: "fixture-principal-technician-a",
        sessionId: "fixture-session-technician-a",
        roles: [technician],
      },
      {
        principalId: "fixture-principal-technician-b",
        sessionId: "fixture-session-technician-b",
        roles: [technician],
      },
    ];
    const resolved = expected.map(({ sessionId }) =>
      resolvePrincipalContext({
        headers: { "x-factory-fixture-session": sessionId },
      }),
    );
    expect(resolved).toEqual(
      expected.map((person) => ({
        ...person,
        tenantId: "tenant-local",
        expiresAt: "2099-01-01T00:00:00.000Z",
      })),
    );
    expect(
      new Set(resolved.map((person: any) => person.principalId)).size,
    ).toBe(3);
    expect(new Set(resolved.map((person: any) => person.sessionId)).size).toBe(
      3,
    );
  },
);

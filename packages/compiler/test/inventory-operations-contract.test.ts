import { createCapabilityCompositionLock } from "@factory/capabilities";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import {
  createPublishedGraphExchange,
  parsePublishedGraphExchange,
  matchInventoryOperationsGraphV1,
  hashApplicationGraph,
  validateApplicationGraph,
} from "@factory/graph";
import {
  selectInventoryOperationsProfile,
  generateApplicationBundle,
} from "../src/index.js";
import { inventoryOperationsInput } from "./fixtures/inventory-operations.js";
import { currentDefinitionDataCompilationEvidence } from "./fixtures/definition-data-compatibility.js";
const baseline = JSON.parse(
  readFileSync(
    new URL("./fixtures/nine-definition-baseline.json", import.meta.url),
    "utf8",
  ),
);
const select = (input: ReturnType<typeof inventoryOperationsInput>) =>
  selectInventoryOperationsProfile(input.graph, input.compositionLock);
describe("Inventory Operations Published admission", () => {
  it.each(["review-repro", "removed", "renamed"] as const)(
    "rejects combined %s stock coordinates at selector and public compilation with a fresh valid lock",
    (change) => {
      const input = inventoryOperationsInput();
      const [item, movement] = input.graph.domain.entities;
      const coordinates = new Set(
        change === "review-repro"
          ? ["quantity", "afterQuantity"]
          : [
              "quantity",
              "delta",
              "beforeQuantity",
              "afterQuantity",
              "itemVersion",
            ],
      );
      for (const entity of [item!, movement!]) {
        for (const field of entity.fields) delete field.numericDomain;
        entity.fields =
          change === "renamed"
            ? entity.fields.map((field) => ({
                ...field,
                key: coordinates.has(field.key)
                  ? "renamed_" + field.key
                  : field.key,
              }))
            : entity.fields.filter((field) => !coordinates.has(field.key));
        entity.indexes =
          change === "renamed"
            ? entity.indexes.map((index) => ({
                ...index,
                fields: index.fields.map((key) =>
                  coordinates.has(key) ? "renamed_" + key : key,
                ),
              }))
            : entity.indexes.filter((index) =>
                index.fields.every((key) => !coordinates.has(key)),
              );
      }
      if (change === "review-repro")
        input.graph.domain.seedData = [
          {
            entity: item!.key,
            id: "item-1",
            values: { sku: "A", name: "A", unit: "each" },
          },
          {
            entity: movement!.key,
            id: "movement-1",
            values: {
              stockItemId: "item-1",
              kind: "receive",
              delta: 1,
              beforeQuantity: 0,
              itemVersion: 1,
              reason: "Synthetic receipt",
              actorRole: "stockkeeper",
              recordedAt: "2026-09-24T00:00:00.000Z",
              correctionOf: null,
              status: "recorded",
            },
          },
        ];
      expect(validateApplicationGraph(input.graph)).toEqual([]);
      input.compositionLock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(input.graph),
        selections: input.compositionLock.packages,
      });
      for (const boundary of [
        () => select(input),
        () =>
          generateApplicationBundle({
            ...input,
            publishedRevisionId: "stripped-inventory",
          }),
      ])
        expect(boundary).toThrow(/Unsupported Inventory/);
    },
  );

  it.each([false, true])(
    "preserves public compilation of a non-stock recorded/submit workflow (sku/unit only: %s)",
    (withSkuUnit) => {
      const captured = baseline.entries.find(
        (entry: { definitionKey: string }) =>
          entry.definitionKey === "team-task-tracking",
      );
      const graph = structuredClone(captured.inputGraph);
      if (withSkuUnit)
        graph.domain.entities[0].fields.push(
          { key: "sku", type: "string", required: false },
          { key: "unit", type: "string", required: false },
        );
      const flow = graph.flow.flows[0];
      const member = graph.policy.roles[0];
      flow.initialState = "draft";
      flow.states = ["draft", "recorded"];
      flow.events = ["submit"];
      flow.transitions = [
        { from: "draft", event: "submit", to: "recorded", roles: [member] },
      ];
      graph.domain.entities
        .find((entity: { key: string }) => entity.key === flow.entity)
        .fields.find(
          (field: { key: string }) => field.key === "status",
        ).values = ["draft", "recorded"];
      graph.policy.permissions.find(
        (permission: { role: string; resource: string }) =>
          permission.role === member && permission.resource === flow.entity,
      ).actions = ["create", "read", "update", "submit"];
      for (const seed of graph.domain.seedData)
        if (seed.entity === flow.entity) seed.values.status = "draft";
      const compositionLock = createCapabilityCompositionLock({
        graphChecksum: hashApplicationGraph(graph),
        selections: captured.compositionLock.packages,
      });
      expect(validateApplicationGraph(graph)).toEqual([]);
      expect(
        selectInventoryOperationsProfile(graph, compositionLock),
      ).toBeUndefined();
      expect(
        generateApplicationBundle({
          graph,
          compositionLock,
          publishedRevisionId: "record-published",
        }).files,
      ).toHaveLength(62);
    },
  );
  it("selects an exact detached deeply frozen witness across JSON persistence", () => {
    const input = inventoryOperationsInput();
    const profile = select(input)!;
    expect(profile).toMatchObject({
      key: "inventory-operations",
      version: "1.0.0",
      graphHash: hashApplicationGraph(input.graph),
      itemEntity: "stock-item",
      movementEntity: "stock-movement",
      workflow: "record-movement",
      roles: { stockkeeper: "stockkeeper", observer: "observer" },
      pages: { list: "stock-list", form: "stock-form", detail: "stock-detail" },
      reference: {
        blueprint: "stockItem",
        storage: "stockItemId",
        api: "stockItem",
      },
      quantityMaximum: 1000000000,
      itemVersionMaximum: 2147483647,
      unit: "each",
    });
    expect(select(JSON.parse(JSON.stringify(input)))).toEqual(profile);
    const frozen = (value: unknown) => {
      if (value && typeof value === "object") {
        expect(Object.isFrozen(value)).toBe(true);
        for (const child of Object.values(value)) frozen(child);
      }
    };
    frozen(profile);
    input.graph.policy.roles[0] = "changed";
    expect(profile.roles.stockkeeper).toBe("stockkeeper");
  });
  it("requires a separate verified lock", () => {
    expect(() =>
      selectInventoryOperationsProfile(inventoryOperationsInput().graph),
    ).toThrow(/Inventory/);
  });
  it.each([
    "numeric-domains-removed",
    "seed-missing",
    "seed-nonempty",
    "sku-unique",
    "movement-index",
    "reference",
    "reference-extra",
    "bound",
    "grant",
    "effect",
    "declaration",
    "extra-entity",
    "extra-page",
    "extra-field",
    "terminal",
    "extra-top-level",
    "binding",
    "digest",
    "owner",
    "version",
  ])("rejects %s at the immutable boundary", (kind) => {
    const input = JSON.parse(JSON.stringify(inventoryOperationsInput()));
    const g = input.graph;
    if (kind === "numeric-domains-removed")
      for (const entity of g.domain.entities)
        for (const field of entity.fields) delete field.numericDomain;
    if (kind === "seed-missing") delete g.domain.seedData;
    if (kind === "seed-nonempty")
      g.domain.seedData = [
        {
          entity: "stock-item",
          id: "sample",
          values: { sku: "S", name: "Sample", unit: "each", quantity: 0 },
        },
      ];
    if (kind === "sku-unique") delete g.domain.entities[0].fields[0].unique;
    if (kind === "movement-index") g.domain.entities[1].indexes.pop();
    if (kind === "reference") g.domain.relations[0].field = "stockItem";
    if (kind === "reference-extra")
      g.domain.entities[1].fields.push({
        key: "stockItem",
        type: "string",
        required: true,
      });
    if (kind === "bound")
      g.domain.entities[1].fields[2].numericDomain.minimum.value = 0;
    if (kind === "grant")
      g.policy.permissions.push({
        role: "observer",
        resource: "stock-movement",
        actions: ["read"],
      });
    if (kind === "effect") g.flow.flows[0].transitions[0].effects = [];
    if (kind === "declaration") g.integration.capabilities.shift();
    if (kind === "extra-entity")
      g.domain.entities.push({
        key: "location",
        label: "Location",
        fields: [],
        indexes: [],
      });
    if (kind === "extra-page")
      g.page.pages.push({ ...g.page.pages[0], id: "extra", route: "/extra" });
    if (kind === "extra-field")
      g.domain.entities[0].fields.push({
        key: "location",
        type: "string",
        required: true,
      });
    if (kind === "terminal")
      g.flow.flows[0].transitions.push({
        from: "recorded",
        to: "draft",
        event: "update",
        roles: ["stockkeeper"],
      });
    if (kind === "extra-top-level") g.unreviewed = true;
    if (kind === "binding")
      input.compositionLock.packages.find(
        (p: any) => p.lock.key === "core.audit",
      ).bindings.actorRole.graphSymbol = "graph.policy.observer";
    if (kind === "digest")
      input.compositionLock.packages[0].lock.manifestDigest =
        "sha256:" + "0".repeat(64);
    if (kind === "owner")
      input.compositionLock.packages[0].bindings.unknown = {
        graphSymbol: "graph.domain.stock-movement",
      };
    if (kind === "version")
      input.compositionLock.packages[0].lock.version = "9.0.0";

    expect(() => select(input)).toThrow(/Inventory/);
  });
  it.each(["graph", "lock"])(
    "rejects hostile %s values without executing them",
    (location) => {
      for (const kind of [
        "accessor",
        "toJSON",
        "pollution",
        "cycle",
        "prototype",
        "symbol",
        "hidden",
        "sparse",
      ]) {
        const input = JSON.parse(JSON.stringify(inventoryOperationsInput()));
        const target =
          location === "graph"
            ? input.graph.domain.entities[0]
            : input.compositionLock.packages[0].bindings;
        let called = false;
        const execute = () => {
          called = true;
          return {};
        };
        if (kind === "accessor")
          Object.defineProperty(target, "evil", {
            enumerable: true,
            get: execute,
          });
        if (kind === "toJSON") target.toJSON = execute;
        if (kind === "pollution")
          Object.defineProperty(target, "__proto__", {
            enumerable: true,
            value: {},
          });
        if (kind === "cycle") target.evil = target;
        if (kind === "prototype") Object.setPrototypeOf(target, { evil: true });
        if (kind === "symbol") target[Symbol("evil")] = 1;
        if (kind === "hidden")
          Object.defineProperty(target, "evil", { value: 1 });
        if (kind === "sparse") target.evil = new Array(3);
        expect(() => select(input), kind).toThrow(/Inventory/);
        expect(called).toBe(false);
      }
    },
  );
  it("fails closed through normal and persisted compiler paths until runtime is implemented", () => {
    const input = inventoryOperationsInput();
    for (const value of [input, JSON.parse(JSON.stringify(input))])
      expect(() =>
        generateApplicationBundle({
          ...value,
          publishedRevisionId: "inventory-published",
        }),
      ).toThrow(/Inventory Operations runtime is not implemented/);
  });
  it("shares the exact Draft and Published witness but rejects embedded selection authority", () => {
    const input = inventoryOperationsInput();
    const draft = structuredClone(input.graph);
    draft.integration.compositionSelections = JSON.parse(
      JSON.stringify(input.compositionLock.packages),
    );
    expect(matchInventoryOperationsGraphV1(draft)).toEqual(
      matchInventoryOperationsGraphV1(input.graph),
    );
    expect(hashApplicationGraph(draft)).not.toBe(
      hashApplicationGraph(input.graph),
    );
    expect(() =>
      selectInventoryOperationsProfile(draft, input.compositionLock),
    ).toThrow(/Inventory/);
    const exchange = createPublishedGraphExchange(input.graph, 1);
    const persisted = parsePublishedGraphExchange(
      JSON.parse(JSON.stringify(exchange)),
    );
    expect(
      selectInventoryOperationsProfile(
        persisted.graph,
        JSON.parse(JSON.stringify(input.compositionLock)),
      ),
    ).toEqual(select(input));
  });
  it.each([
    "graph-checksum",
    "lock-digest",
    "contribution",
    "dependency-order",
    "binding-owner",
    "missing-package",
    "extra-package",
  ])("rejects separately tampered %s", (kind) => {
    const input = JSON.parse(JSON.stringify(inventoryOperationsInput()));
    if (kind === "graph-checksum")
      input.graph.metadata.name = "A renamed stockroom";
    if (kind === "lock-digest")
      input.compositionLock.lockDigest = "sha256:" + "0".repeat(64);
    if (kind === "contribution")
      input.compositionLock.resolvedContributionDigests.pop();
    if (kind === "dependency-order")
      input.compositionLock.resolvedDependencyOrder.reverse();
    if (kind === "binding-owner")
      input.compositionLock.packages.find(
        (p: any) => p.lock.key === "core.crud",
      ).bindings.entityKey.graphSymbol = "graph.domain.stock-movement";
    if (kind === "missing-package") input.compositionLock.packages.pop();
    if (kind === "extra-package")
      input.compositionLock.packages.push(input.compositionLock.packages[0]);
    expect(() => select(input)).toThrow(/Inventory/);
  });
  it("accepts safe null-prototype own dictionaries after persistence normalization", () => {
    const input = inventoryOperationsInput();
    const toNull = (value: any): any =>
      Array.isArray(value)
        ? value.map(toNull)
        : value && typeof value === "object"
          ? Object.assign(
              Object.create(null),
              Object.fromEntries(
                Object.entries(value).map(([key, child]) => [
                  key,
                  toNull(child),
                ]),
              ),
            )
          : value;
    expect(select(toNull(input))).toEqual(select(input));
  });
  it("preserves all nine captured immutable inputs, locks and generated bytes", () => {
    const current = currentDefinitionDataCompilationEvidence(
      baseline.entries.map((e: any) => e.definitionKey),
    );
    for (const entry of baseline.entries) {
      const { inputGraph, compositionLock, publishedRevisionId, ...evidence } =
        entry;
      expect(
        current.find((e) => e.definitionKey === entry.definitionKey),
      ).toEqual(evidence);
      expect(
        selectInventoryOperationsProfile(inputGraph, compositionLock),
      ).toBeUndefined();
      const files = generateApplicationBundle({
        graph: inputGraph,
        compositionLock,
        publishedRevisionId,
      }).files;
      expect(
        files.map(({ path, content }) => ({
          path,
          sha256: createHash("sha256").update(content).digest("hex"),
        })),
      ).toEqual(entry.files);
    }
  });
});

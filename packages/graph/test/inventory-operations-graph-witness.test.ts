import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  applicationGraphSchema,
  isNumericFieldValueAllowed,
  assertValidApplicationGraph,
  parseApplicationGraph,
  validateApplicationGraph,
  matchInventoryOperationsGraphV1,
  hashApplicationGraph,
  createPublishedGraphExchange,
  parsePublishedGraphExchange,
  type ApplicationGraphV1,
} from "../src/index.js";

function graph(): ApplicationGraphV1 {
  const field = (key: string, type: string, required = true) => ({
    key,
    type,
    required,
  });
  const number = (key: string, min: number, max: number) => ({
    ...field(key, "integer"),
    numericDomain: {
      apiVersion: "factory.numeric-field-domain/v1",
      minimum: { value: min, inclusive: true },
      maximum: { value: max, inclusive: true },
    },
  });
  return applicationGraphSchema.parse({
    apiVersion: "factory.application-graph/v1",
    metadata: { id: "stock", workspaceId: "local", name: "Stockroom" },
    domain: {
      entities: [
        {
          key: "item",
          label: "Item",
          fields: [
            { ...field("sku", "string"), unique: true },
            field("name", "string"),
            field("unit", "string"),
            number("quantity", 0, 1000000000),
          ],
          indexes: [],
        },
        {
          key: "movement",
          label: "Movement",
          fields: [
            field("stockItemId", "string"),
            {
              ...field("kind", "enum"),
              values: ["receive", "issue", "adjust"],
            },
            number("delta", -1000000000, 1000000000),
            number("beforeQuantity", 0, 1000000000),
            number("afterQuantity", 0, 1000000000),
            number("itemVersion", 1, 2147483647),
            field("reason", "text"),
            field("actorRole", "string"),
            field("recordedAt", "datetime"),
            field("correctionOf", "string", false),
            { ...field("status", "enum"), values: ["draft", "recorded"] },
          ],
          indexes: [
            { fields: ["status"] },
            { fields: ["stockItemId", "itemVersion"], unique: true },
          ],
        },
        {
          key: "stock-principal",
          label: "Principal",
          fields: [
            { ...field("subjectRef", "string"), unique: true },
            { ...field("role", "enum"), values: ["keeper", "viewer"] },
            field("active", "boolean"),
          ],
          indexes: [{ fields: ["active"] }],
        },
        {
          key: "stock-session",
          label: "Session",
          fields: [
            field("subjectRef", "string"),
            { ...field("status", "enum"), values: ["active", "expired"] },
            field("expiresAt", "datetime"),
          ],
          indexes: [{ fields: ["subjectRef", "status"] }],
        },
      ],
      relations: [
        {
          from: "movement",
          to: "item",
          kind: "many-to-one",
          field: "stockItemId",
        },
        {
          from: "stock-session",
          to: "stock-principal",
          kind: "many-to-one",
          field: "subjectRef",
        },
      ],
      seedData: [],
    },
    policy: {
      roles: ["keeper", "viewer"],
      permissions: [
        {
          role: "keeper",
          resource: "item",
          actions: ["create", "read", "update"],
        },
        {
          role: "keeper",
          resource: "movement",
          actions: ["create", "read", "submit", "audit"],
        },
        { role: "keeper", resource: "stock-principal", actions: ["read"] },
        {
          role: "keeper",
          resource: "stock-session",
          actions: ["create", "read", "update"],
        },
        { role: "viewer", resource: "item", actions: ["read"] },
        { role: "viewer", resource: "stock-principal", actions: ["read"] },
        { role: "viewer", resource: "stock-session", actions: ["read"] },
      ],
    },
    flow: {
      flows: [
        {
          id: "record",
          entity: "movement",
          initialState: "draft",
          states: ["draft", "recorded"],
          events: ["submit"],
          transitions: [
            {
              from: "draft",
              event: "submit",
              to: "recorded",
              roles: ["keeper"],
              effects: [{ capability: "audit.record", operation: "record" }],
            },
          ],
        },
      ],
    },
    integration: {
      providers: [],
      capabilities: [
        { key: "audit.record", providerId: "factory", operation: "record" },
        {
          key: "identity.context.resolve",
          providerId: "factory",
          operation: "resolve",
        },
        {
          key: "authorization.decision",
          providerId: "factory",
          operation: "decision",
        },
      ],
    },
    page: {
      pages: ["list", "form", "detail"].map((intent) => ({
        id: `stock-${intent}`,
        route: `/stock-${intent}`,
        title: `Stock ${intent}`,
        blocks: [
          { id: `stock-${intent}-${intent}`, type: intent, entity: "item" },
        ],
      })),
      navigation: [
        {
          id: "nav-stock-list",
          label: "Stock list",
          pageId: "stock-list",
          icon: "list",
        },
      ],
    },
    experience: { theme: { mode: "light", tokens: {} }, locales: ["en"] },
  });
}
const missing = (g: unknown) =>
  validateApplicationGraph(g).filter(
    (issue) => issue.code === "domain.field.numeric_domain_witness_missing",
  );
describe("Inventory Graph numeric witness", () => {
  it("replaces only the five missing seeded witnesses through both entrypoints and Published JSON exchange", () => {
    const g = graph();
    expect(validateApplicationGraph(g)).toEqual([]);
    expect(parseApplicationGraph(g)).toEqual(g);
    expect(assertValidApplicationGraph(g)).toEqual(g);
    const exchange = createPublishedGraphExchange(g, 1);
    expect(
      parsePublishedGraphExchange(JSON.parse(JSON.stringify(exchange))).graph,
    ).toEqual(g);
    expect(g.domain.seedData).toEqual([]);
    expect(hashApplicationGraph(g)).toBe(exchange.publishedRevision.graphHash);
  });
  it("returns exactly a detached deeply frozen five-coordinate witness", () => {
    const g = graph();
    const witness = matchInventoryOperationsGraphV1(g)!;
    expect(witness).toEqual({
      apiVersion: "factory.inventory-operations-graph-witness/v1",
      itemEntity: "item",
      movementEntity: "movement",
      workflow: "record",
      roles: { stockkeeper: "keeper", observer: "viewer" },
      pages: { list: "stock-list", form: "stock-form", detail: "stock-detail" },
      numericFields: [
        { entityKey: "item", fieldKey: "quantity" },
        ...["delta", "beforeQuantity", "afterQuantity", "itemVersion"].map(
          (fieldKey) => ({ entityKey: "movement", fieldKey }),
        ),
      ],
    });
    const frozen = (v: unknown) => {
      if (v && typeof v === "object") {
        expect(Object.isFrozen(v)).toBe(true);
        Object.values(v).forEach(frozen);
      }
    };
    frozen(witness);
    g.policy.roles[0] = "changed";
    expect(witness.roles.stockkeeper).toBe("keeper");
  });
  it.each([
    "missing-seeds",
    "null-seeds",
    "undefined-seeds",
    "nonempty-seeds",
    "foreign-seed",
    "sku-unique",
    "item-index",
    "movement-index",
    "reference",
    "identity",
    "identity-grant",
    "grant",
    "role-order",
    "effect",
    "declaration",
    "provider",
    "flow",
    "page",
    "page-route",
    "navigation",
    "field",
    "bound",
    "required",
    "sixth-domain",
    "calculation",
    "asset-locks",
  ])("retains ordinary missing-witness errors for %s", (kind) => {
    const g: any = graph();
    if (kind === "missing-seeds") delete g.domain.seedData;
    if (kind === "null-seeds") g.domain.seedData = null;
    if (kind === "undefined-seeds") g.domain.seedData = undefined;
    if (kind === "nonempty-seeds")
      g.domain.seedData = [{ entity: "item", values: { quantity: 0 } }];
    if (kind === "foreign-seed")
      g.domain.seedData = [{ entity: "other", values: { quantity: 0 } }];
    if (kind === "sku-unique") delete g.domain.entities[0].fields[0].unique;
    if (kind === "item-index")
      g.domain.entities[0].indexes = [{ fields: ["sku"] }];
    if (kind === "movement-index") g.domain.entities[1].indexes.pop();
    if (kind === "reference") g.domain.relations[0].to = "stock-principal";
    if (kind === "identity") g.domain.entities[2].fields.pop();
    if (kind === "identity-grant")
      g.policy.permissions[2].actions.push("update");
    if (kind === "grant")
      g.policy.permissions.push({
        role: "viewer",
        resource: "movement",
        actions: ["read"],
      });
    if (kind === "role-order") g.policy.roles.reverse();
    if (kind === "effect") g.flow.flows[0].transitions[0].effects = [];
    if (kind === "declaration") g.integration.capabilities.shift();
    if (kind === "provider")
      g.integration.providers.push({ id: "external", type: "webhook" });
    if (kind === "flow")
      g.flow.flows.push({ ...g.flow.flows[0], id: "second" });
    if (kind === "page") g.page.pages.pop();
    if (kind === "page-route") g.page.pages[0].route = "/other";
    if (kind === "navigation") g.page.navigation = [];
    if (kind === "field")
      g.domain.entities[0].fields.push({
        key: "location",
        type: "string",
        required: true,
      });
    if (kind === "bound")
      g.domain.entities[0].fields[3].numericDomain.minimum.value = -1;
    if (kind === "required") g.domain.entities[1].fields[2].required = false;
    if (kind === "sixth-domain")
      g.domain.entities[0].fields.push({
        key: "other",
        type: "integer",
        required: true,
        numericDomain: g.domain.entities[0].fields[3].numericDomain,
      });
    if (kind === "calculation")
      g.domain.entities[0].fields[3].calculation = {
        apiVersion: "factory.quantity-unit-price-total/v1",
        quantityFieldKey: "quantity",
        unitPriceFieldKey: "quantity",
      };
    if (kind === "asset-locks") g.integration.assetLocks = [];
    expect(matchInventoryOperationsGraphV1(g)).toBeUndefined();
    expect(() => parseApplicationGraph(g)).toThrow();
    if (kind !== "null-seeds")
      expect(missing(g)).toHaveLength(
        kind === "sixth-domain" ? 6 : kind === "nonempty-seeds" ? 4 : 5,
      );
  });
  it("keeps domain type errors and supplied-seed errors, and allows ordinary fully seeded graphs without granting Inventory admission", () => {
    const g = graph();
    g.domain.entities[0]!.fields[3]!.type = "string";
    expect(
      validateApplicationGraph(g).some(
        (i) => i.code === "domain.field.numeric_domain_invalid",
      ),
    ).toBe(true);
    const seeded = graph();
    seeded.domain.seedData = [
      { entity: "item", values: { quantity: 0 } },
      {
        entity: "movement",
        values: {
          delta: 1,
          beforeQuantity: 0,
          afterQuantity: 1,
          itemVersion: 1,
        },
      },
    ];
    expect(matchInventoryOperationsGraphV1(seeded)).toBeUndefined();
    expect(validateApplicationGraph(seeded)).toEqual([]);
    seeded.domain.seedData[0]!.values.quantity = -1;
    expect(
      validateApplicationGraph(seeded).some(
        (i) => i.code === "domain.seed.numeric_domain_invalid",
      ),
    ).toBe(true);
  });
  it("keeps the fixed arithmetic tuple as test data only", () => {
    const g = graph();
    const witness = matchInventoryOperationsGraphV1(g)!;
    const values = [0, 1, 0, 1, 1];
    witness.numericFields.forEach(({ entityKey, fieldKey }, index) => {
      const field = g.domain.entities
        .find((entity) => entity.key === entityKey)!
        .fields.find((field) => field.key === fieldKey)!;
      expect(
        isNumericFieldValueAllowed(
          values[index],
          "integer",
          field.numericDomain!,
        ),
      ).toBe(true);
    });
    expect(g.domain.seedData).toEqual([]);
  });
  it("does not match ambiguous page identities", () => {
    const g = graph();
    const page = g.page.pages[1]!;
    page.id = g.page.pages[0]!.id;
    page.route = g.page.pages[0]!.route;
    page.blocks[0]!.id = page.id + "-form";
    expect(matchInventoryOperationsGraphV1(g)).toBeUndefined();
  });
  it("uses a browser-safe leaf without parser, hash, runtime model or upward imports", () => {
    const source = readFileSync(
      new URL("../src/inventory-operations-graph-witness.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/from ["'](?:node:|@factory\/|\.\/index)/);
    expect(source).not.toMatch(
      /(?:parseApplicationGraph|hashApplicationGraph|validateApplicationGraph)\s*\(/,
    );
    expect(source.match(/^import .+$/gm) ?? []).toEqual([
      'import type { ApplicationGraphV1 } from "./model.js";',
    ]);
  });
});

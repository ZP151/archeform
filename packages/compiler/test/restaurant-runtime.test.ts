import {
  composeDefaultCapabilityDraft,
  composeProfileDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";
import { describe, expect, it } from "vitest";

import {
  generateApplicationBundle as compileApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

function persistedProfileLock(
  profile: "simple-ecommerce",
  graph: PublishedGraphInput["graph"],
) {
  return createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections:
      composeDefaultCapabilityDraft({ profile }).graph.integration
        .compositionSelections ?? [],
  });
}

function generateApplicationBundle(
  input: Omit<PublishedGraphInput, "compositionLock"> | PublishedGraphInput,
) {
  return compileApplicationBundle(
    "compositionLock" in input
      ? input
      : {
          ...input,
          compositionLock: createCapabilityCompositionLock({
            graphChecksum: hashApplicationGraph(input.graph),
            selections: [],
          }),
        },
  );
}

function restaurantFiles(revision = "restaurant-runtime-published-1") {
  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: revision,
      graph: composeProfileDraft({ profile: "restaurant-ordering" }).graph,
    }).files.map((file) => [file.path, file.content]),
  );
}

describe("Restaurant transaction runtime compilation", () => {
  it("emits a Prisma transaction command service without an in-memory Restaurant entry path", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const main = files["api/src/main.ts"]!;

    expect(service).toContain("prisma.$transaction");
    expect(service).toContain("RestaurantCommand");
    expect(service).toContain("RestaurantOutboxEvent");
    expect(service).toContain("assertExpectedVersion");
    expect(main).toContain("PrismaRecordStore");
    expect(main).toContain("RestaurantCommandService");
    expect(main).not.toContain("new InMemoryRecordStore");
    expect(
      Object.entries(files)
        .filter(([path]) => path.startsWith("api/"))
        .map(([, content]) => content)
        .join("\n"),
    ).not.toContain("InMemoryRecordStore");
  });

  it("persists the command, outbox, inventory, audit, and capability evidence contract", () => {
    const files = restaurantFiles();
    const schema = files["api/prisma/schema.prisma"]!;
    const migration =
      files["database/prisma/migrations/0001_initial/migration.sql"]!;

    for (const model of [
      "RestaurantCommand",
      "RestaurantOutboxEvent",
      "InventoryLedger",
      "PaymentAttempt",
      "KitchenTicket",
      "AuditEvent",
      "CapabilityEvent",
    ]) {
      expect(schema).toContain(`model ${model}`);
      expect(migration).toContain(`CREATE TABLE \"${model}\"`);
    }
    expect(schema).toContain("@@unique([scope, idempotencyKey])");
  });

  it("emits every Restaurant route with mandatory idempotency and expected-version handling", () => {
    const files = restaurantFiles();
    const main = files["api/src/main.ts"]!;
    const apiReference = files["docs/api-reference.md"]!;
    const endpoints = [
      "restaurant/table-sessions/resolve",
      "restaurant/orders/:id/lines",
      "restaurant/orders/:id/lines/:lineId",
      "restaurant/orders/:id/submit",
      "restaurant/orders/:id/payments",
      "restaurant/orders/:id/cancel",
      "restaurant/kitchen-tickets/:id/events/:event",
      "restaurant/orders/:id/serve",
      "restaurant/reports/summary",
      "restaurant/reports/low-stock",
    ];

    for (const endpoint of endpoints) {
      expect(main).toContain(endpoint);
      expect(apiReference).toContain(`/api/${endpoint}`);
    }
    expect(main).toContain("x-factory-idempotency-key");
    expect(main).toContain("RestaurantCommandBody");
    expect(files["api/src/restaurant/restaurant-command.service.ts"]).toContain(
      "expectedVersion",
    );
  });

  it("emits the complete typed Customer read API without raw table identifiers", () => {
    const files = restaurantFiles();
    const main = files["api/src/main.ts"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const apiReference = files["docs/api-reference.md"]!;

    for (const endpoint of [
      "restaurant/menu/categories",
      "restaurant/menu/items",
      "restaurant/orders/history",
      "restaurant/orders/:id/status",
      "restaurant/orders/:id/receipt",
    ]) {
      expect(main).toContain(endpoint);
      expect(apiReference).toContain(`/api/${endpoint}`);
    }
    expect(main).toContain("RestaurantMenuQuery");
    expect(main).toContain("sessionTokenFrom(request)");
    expect(service).toContain("listMenuCategories");
    expect(service).toContain("listMenuItems");
    expect(service).toContain("listSessionOrders");
    expect(service).toContain("getOrderStatus");
    expect(service).toContain("getReceipt");
    expect(service).not.toContain("rawTableId");
  });

  it("emits executable Customer read and whole-order-note regression coverage", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    for (const behavior of [
      "lists active categories and filters available menu items",
      "rejects invalid and expired tokens for customer reads",
      "returns only the token-bound session order history",
      "denies cross-session order status and receipt reads",
      "persists a validated whole-order note on submit",
    ]) {
      expect(generatedTests).toContain(behavior);
    }
    expect(service).toContain("assertOrderNote");
    expect(service).toContain("orderNote: orderNote");
  });

  it("requires the complete active location chain for token-bound Customer reads", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("restaurantLocation.findUnique");
    expect(service).toContain("Restaurant location is not active.");
    expect(service).toContain(
      "tableSession: { id: session.id, tableCode: table.code, table: { restaurantLocationId: location.id } }",
    );
    expect(service).not.toContain('?? "main-location"');
    for (const behavior of [
      "rejects a table without a Restaurant location",
      "rejects an inactive Restaurant location",
      "rejects wrong-location order and session linkage",
    ]) {
      expect(generatedTests).toContain(behavior);
    }
  });

  it("projects receipt modifiers through a bounded allowlisted DTO", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("RestaurantReceiptModifierView");
    expect(service).toContain("sanitizeReceiptModifiers");
    expect(service).not.toContain("readonly modifiers: unknown");
    expect(service).not.toContain("modifiers: line.modifiers");
    expect(generatedTests).toContain(
      "strips malformed and undeclared receipt modifier data",
    );
  });

  it("creates the authoritative cart when a table session resolves", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const seed = files["database/prisma/seed.ts"]!;
    const apiReference = files["docs/api-reference.md"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("tx.order.create");
    expect(service).toContain('status: "cart"');
    expect(service).toContain('"order.created"');
    expect(seed).toContain("RESTAURANT_DEMO_TABLE_TOKEN");
    expect(seed).toContain('createHash("sha256")');
    expect(seed).toContain("prisma.tableSession.upsert");
    expect(seed).toContain(
      "RESTAURANT_DEMO_TABLE_TOKEN must contain at least 16 characters.",
    );
    expect(seed).not.toContain('const demoTableToken = "');
    expect(apiReference).toContain("Local demo bootstrap");
    expect(apiReference).toContain("There is no predictable default.");
    expect(generatedTests).toContain(
      "resolves a provisioned seed session into an authoritative cart",
    );
  });

  it("requires Compose to forward the environment-only local bootstrap input", () => {
    const files = restaurantFiles();
    const compose = files["docker-compose.yml"]!;
    const readme = files["README.md"]!;

    expect(compose).toContain(
      'RESTAURANT_DEMO_TABLE_TOKEN: "${RESTAURANT_DEMO_TABLE_TOKEN:?Set RESTAURANT_DEMO_TABLE_TOKEN for local demo bootstrap}"',
    );
    expect(readme).toContain(
      'RESTAURANT_DEMO_TABLE_TOKEN="$RESTAURANT_DEMO_TABLE_TOKEN"',
    );
    expect(compose).not.toContain("RESTAURANT_DEMO_TABLE_TOKEN: restaurant-");
    expect(
      restaurantFiles()["docker-compose.yml"]!.match(
        /^      RESTAURANT_DEMO_TABLE_TOKEN:/gm,
      ),
    ).toHaveLength(1);
  });

  it("emits atomic stock reservation and narrowly scoped payment idempotency", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const schema = files["api/prisma/schema.prisma"]!;

    expect(service).toContain("stock: { gte: line.quantity }");
    expect(service).toContain("stock: { decrement: line.quantity }");
    expect(service).toContain("RestaurantCommand_scope_idempotencyKey_key");
    expect(schema).toContain("@@unique([orderId, idempotencyKey])");
    expect(schema).not.toContain("idempotencyKey String @unique");
  });

  it("uses compiled policy enforcement and captures validated cancellation input", () => {
    const files = restaurantFiles();
    const main = files["api/src/main.ts"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;

    expect(main).toContain('import { enforce } from "./policy.js"');
    expect(main).toContain("await assertAllowed(");
    expect(service).toContain("const cancellationReason = body.reason;");
    expect(service).not.toContain("body.reason.trim()");
  });

  it("emits typed HTTP 409 conflicts with authoritative safe order state", () => {
    const files = restaurantFiles();
    const main = files["api/src/main.ts"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("export class RestaurantVersionConflict");
    expect(service).toContain('code: "restaurant.order.version_conflict"');
    expect(service).toContain(
      "await this.authoritativeOrderState(tx, orderId)",
    );
    expect(
      service.match(
        /if \(updated\.count !== 1\) await this\.throwVersionConflict\(tx, (?:orderId|order\.id)\);/g,
      ),
    ).toHaveLength(7);
    expect(main).toContain("error instanceof RestaurantVersionConflict");
    expect(main).toContain(
      "new HttpException(error.payload, HttpStatus.CONFLICT)",
    );
    expect(generatedTests).toContain(
      "returns HTTP 409 with authoritative state after a zero-row optimistic write",
    );
  });

  it("derives capability evidence and generated behavior tests from the accepted FlowModel", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const store = files["api/src/prisma-record-store.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("restaurantTransitionEffects");
    expect(service).toContain('capability: "notification.send"');
    expect(service).toContain('operation: "send"');
    expect(service).not.toContain(
      'capability: "order.transition", operation: action',
    );
    expect(store).toContain("outcome: 'succeeded' as const");
    expect(store).not.toContain("outcome: 'completed' as const");
    for (const behavior of [
      "replays the original outcome without duplicate stock or evidence",
      "rejects a duplicate key with a different payload",
      "rolls back order, stock, command, and evidence on failure",
      "compensates reserved stock when a submitted order is cancelled",
      "persists exactly the declared capability effects and one outbox event",
      "enforces actual Casbin allow and deny decisions",
    ]) {
      expect(generatedTests).toContain(behavior);
    }
  });

  it("derives non-Flow command evidence from accepted Restaurant asset operations", () => {
    const files = restaurantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(service).toContain("restaurantCommandEffects");
    for (const [capability, operation] of [
      ["table-session.validate", "validate"],
      ["order.line.add", "add"],
      ["order.line.update", "update"],
    ]) {
      expect(service).toContain(
        `capability: "${capability}", operation: "${operation}"`,
      );
    }
    expect(generatedTests).toContain(
      "persists and replays non-transition command evidence exactly once",
    );
    expect(generatedTests).toContain(
      "rolls back non-transition mutations and partial evidence on failure",
    );
  });

  it("validates opaque table tokens and binds customer commands to their session scope", () => {
    const files = restaurantFiles();
    const main = files["api/src/main.ts"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(main).toContain("x-factory-table-session-token");
    expect(service).toContain("hashOpaqueToken");
    expect(service).toContain("where: { tokenDigest: hashOpaqueToken(token) }");
    expect(service).toContain("assertSessionOwnsOrder");
    expect(service).toContain("Table session is expired or closed.");
    expect(service).toContain("location:");
    expect(service).not.toContain('requiredString(body, "tokenDigest")');
    expect(generatedTests).toContain(
      'assertSessionOwnsOrder("session-a", "session-b")',
    );
  });

  it("renders hostile Published application names as inert text", () => {
    const graph = structuredClone(
      composeProfileDraft({ profile: "restaurant-ordering" }).graph,
    );
    graph.metadata.name = '<Injected />{"danger": true}';
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "restaurant-hostile-name-1",
        graph,
      }).files.map((file) => [file.path, file.content]),
    );
    const shell = files["web/app/page-runtime.tsx"]!;

    expect(shell).toContain(
      'const applicationName = "<Injected />{\\"danger\\": true}";',
    );
    expect(shell).toContain("<h1>{applicationName}</h1>");
    expect(shell).not.toContain("<h1><Injected");
  });

  it("generates workflow, policy, documentation, and adversarial command tests from the validated profile", () => {
    const files = restaurantFiles();
    const generatedTests =
      files["api/test/restaurant-runtime.generated.test.ts"]!;

    expect(files["api/policy/policy.csv"]).toContain(
      "p, manager, order, cancel",
    );
    expect(files["api/src/flows/definitions.ts"]).toContain(
      '"id": "restaurant-order"',
    );
    expect(files["docs/entity-relationship.md"]).toContain("inventory-ledger");
    expect(files["docs/permission-matrix.md"]).toContain("manager");
    for (const behavior of [
      "zero-row optimistic write",
      "duplicate key with a different payload",
      "Insufficient stock",
      "Cancellation reason",
      "actual Casbin allow and deny",
    ]) {
      expect(generatedTests).toContain(behavior);
    }
  });

  it("rejects an incompatible Restaurant Graph before rendering files", () => {
    const graph = structuredClone(
      composeProfileDraft({ profile: "restaurant-ordering" }).graph,
    );
    graph.flow.flows = graph.flow.flows.map((flow) =>
      flow.entity === "order" ? { ...flow, initialState: "submitted" } : flow,
    );

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "invalid-restaurant-published-1",
        graph,
      }),
    ).toThrow("Restaurant Ordering profile validation failed");
  });

  it("is deterministic and marks the temporary web shell as Task 4-owned", () => {
    const first = restaurantFiles("restaurant-runtime-deterministic-1");
    const second = restaurantFiles("restaurant-runtime-deterministic-1");

    expect(first).toEqual(second);
    expect(first["web/app/page-runtime.tsx"]).toContain(
      "factory.restaurant-runtime-shell/v1",
    );
    expect(first["web/app/page-runtime.tsx"]).toContain(
      "Customer and merchant page renderers are generated by Tasks 4 and 5.",
    );
    expect(first["web/app/page-runtime.tsx"]).not.toContain("menu-browser");
  });

  it("leaves the generic Ecommerce runtime renderer unchanged", () => {
    const graph = composeProfileDraft({ profile: "simple-ecommerce" }).graph;
    const files = Object.fromEntries(
      generateApplicationBundle({
        publishedRevisionId: "ecommerce-runtime-regression-1",
        graph,
        compositionLock: persistedProfileLock("simple-ecommerce", graph),
      }).files.map((file) => [file.path, file.content]),
    );

    expect(files["api/src/application-runtime.ts"]).toContain(
      "export class ApplicationRuntime",
    );
    expect(files["api/src/main.ts"]).not.toContain("RestaurantCommandService");
    expect(
      files["api/src/restaurant/restaurant-command.service.ts"],
    ).toBeUndefined();
  });
});

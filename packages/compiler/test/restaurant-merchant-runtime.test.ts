import { composeProfileDraft } from "@factory/capabilities";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  generateApplicationBundle,
  renderRestaurantEventPublisher,
} from "../src/index.js";

function merchantFiles() {
  return Object.fromEntries(
    generateApplicationBundle({
      publishedRevisionId: "restaurant-merchant-published-1",
      graph: composeProfileDraft({ profile: "restaurant-ordering" }).graph,
    }).files.map((file) => [file.path, file.content]),
  );
}

describe("Restaurant Merchant runtime compilation", () => {
  it("emits only frozen Merchant routes and server-authoritative page actions", () => {
    const files = merchantFiles();
    const main = files["api/src/main.ts"]!;
    const page = files["web/app/restaurant-merchant-runtime.tsx"]!;
    const catchAll = files["web/app/[...path]/page.tsx"]!;

    for (const route of [
      "restaurant/merchant/tables",
      "restaurant/merchant/tables/:id/events/:event",
      "restaurant/merchant/menu/categories",
      "restaurant/merchant/menu/items",
      "restaurant/merchant/menu/items/:id/availability",
      "restaurant/merchant/menu/items/:id/stock-adjustments",
      "restaurant/merchant/kitchen-tickets",
      "restaurant/merchant/orders",
      "restaurant/merchant/orders/:id/receipt",
      "restaurant/orders/:id/cancel",
      "restaurant/kitchen-tickets/:id/events/:event",
      "restaurant/orders/:id/payments",
      "restaurant/orders/:id/serve",
      "restaurant/reports/summary",
      "restaurant/reports/low-stock",
    ]) {
      expect(main).toContain(route);
    }
    expect(page).toContain("type MerchantApiPath =");
    expect(page).toContain("merchantRequest");
    expect(page).toContain('"x-factory-role": role');
    expect(page).not.toContain("window.fetch(");
    expect(page).not.toContain("WebSocket");
    expect(page).not.toContain("socket.on");
    expect(catchAll).toContain("RestaurantMerchantApplication");
    expect(catchAll).toContain('requestedPath.startsWith("/merchant/")');
  });

  it("sorts and restricts the server kitchen projection", () => {
    const service =
      merchantFiles()["api/src/restaurant/restaurant-command.service.ts"]!;

    expect(service).toContain(
      'where: { status: { in: ["paid", "accepted", "preparing", "ready"] } }',
    );
    expect(service).toContain(
      'orderBy: [{ priority: "desc" }, { order: { paidAt: "asc" } }, { tableNumber: "asc" }, { id: "asc" }]',
    );
    expect(service).toContain(
      "assertRestaurantRole(role, [profile.roles.kitchen, profile.roles.manager]);",
    );
  });

  it("compiles truthful manager inventory adjustments and cancellation confirmation", () => {
    const files = merchantFiles();
    const schema = files["api/prisma/schema.prisma"]!;
    const migration =
      files["database/prisma/migrations/0001_initial/migration.sql"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;

    expect(schema).toContain("orderId String?");
    expect(schema).toContain("provenance String");
    expect(schema).toContain("adjustmentReason String?");
    expect(schema).toContain(
      "order Order? @relation(fields: [orderId], references: [id])",
    );
    expect(migration).toContain('"orderId" TEXT');
    expect(migration).not.toContain('"orderId" TEXT NOT NULL, "delta"');
    expect(service).toContain('provenance: "manager-adjustment"');
    expect(service).toContain("assertManagerAdjustmentReason");
    expect(service).toContain('capability: "inventory.adjust"');
    expect(service).toContain("inventoryReleased");
    expect(service).toContain("auditRecorded: true");
  });

  it("uses authoritative resource versions for every Merchant resource mutation", () => {
    const files = merchantFiles();
    const schema = files["api/prisma/schema.prisma"]!;
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const page = files["web/app/restaurant-merchant-runtime.tsx"]!;
    const main = files["api/src/main.ts"]!;

    expect(schema.match(/resourceVersion Int @default\(0\)/g)).toHaveLength(2);
    expect(service).toContain("RestaurantResourceVersionConflict");
    expect(main).toContain(
      "error instanceof RestaurantResourceVersionConflict",
    );
    expect(service).toContain(
      "where: { id: tableId, resourceVersion: body.expectedVersion }",
    );
    expect(service).toContain(
      "where: { id: itemId, resourceVersion: body.expectedVersion",
    );
    expect(service).toContain("resourceVersion: { increment: 1 }");
    expect(service).toContain("version: nextVersion");
    expect(page).toContain("expectedVersion: table.resourceVersion");
    expect(page).toContain("expectedVersion: item.resourceVersion");
    expect(page).not.toContain("expectedVersion: 0");
  });

  it("emits executable Merchant service regressions instead of source-only guarantees", () => {
    const generatedTests =
      merchantFiles()["api/test/restaurant-runtime.generated.test.ts"]!;

    for (const behavior of [
      "rejects denied Merchant roles before mutation",
      "rejects stale and concurrent Merchant resource versions with safe state",
      "keeps successful table transitions out of the publisher outbox",
      "emits only publisher-contract outbox event types",
      "replays Merchant mutations without duplicate evidence",
      "sorts permitted kitchen tickets deterministically",
      "validates cancellation reasons and rolls back cancellation evidence atomically",
      "returns a bounded Merchant receipt",
      "computes persisted Restaurant reports",
    ]) {
      expect(generatedTests).toContain(behavior);
    }
  });

  it("emits an isolated deterministic Merchant browser fixture", () => {
    const seed = merchantFiles()["database/prisma/seed.ts"]!;

    expect(seed).toContain('id: "merchant-e2e-cashier-table"');
    expect(seed).toContain("number: 98");
    expect(seed).toContain('id: "merchant-e2e-cancellation-table"');
    expect(seed).toContain("number: 99");
    expect(seed).toContain('id: "merchant-e2e-cashier-order"');
    expect(seed).toContain('id: "merchant-e2e-cancellation-order"');
    expect(seed.match(/status: "submitted"/g)).toHaveLength(2);
    expect(seed.match(/paymentStatus: "unpaid"/g)).toHaveLength(2);
    expect(seed).toContain('menuItemId: "margherita-pizza"');
    expect(seed).toContain('restaurantLocationId: "main-location"');
  });

  it("projects a safe Merchant receipt and server-computed dashboard", () => {
    const files = merchantFiles();
    const service = files["api/src/restaurant/restaurant-command.service.ts"]!;
    const page = files["web/app/restaurant-merchant-runtime.tsx"]!;

    expect(service).toContain("getMerchantReceipt");
    expect(service).toContain("sanitizeReceiptModifiers");
    expect(service).not.toContain("readonly credentials");
    expect(page).toContain("window.print()");
    expect(page).not.toContain("printerCredential");
    expect(page).toContain("averagePreparationMilliseconds");
    expect(page).toContain("api.reportSummary");
    expect(page).toContain("api.lowStock");
    expect(page).not.toContain("reduce((sum");
  });

  it("publishes transport-neutral events only after committed outbox reads", () => {
    const files = merchantFiles();
    const publisher =
      files["api/src/restaurant/restaurant-event-publisher.ts"]!;

    expect(publisher).toContain("export type RestaurantEventV1");
    expect(publisher).toContain(
      'readonly type: "order.created" | "order.transitioned" | "inventory.changed";',
    );
    expect(publisher).toContain("export interface RestaurantEventPublisher");
    expect(publisher).toContain(
      'orderBy: [{ occurredAt: "asc" }, { id: "asc" }]',
    );
    expect(publisher).toContain("await this.publisher.publish(event)");
    expect(publisher).toContain("publishedAt: new Date()");
    expect(publisher.indexOf("findMany")).toBeLessThan(
      publisher.indexOf("publisher.publish"),
    );
    expect(publisher).not.toContain("transitionKitchenTicket");
    expect(publisher).not.toContain("serveOrder");
    expect(publisher).not.toContain("cancelOrder");
  });

  it("executes committed outbox delivery in occurrence order with no eager publish", async () => {
    const javascript = ts.transpileModule(renderRestaurantEventPublisher(), {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const module = (await import(
      `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
    )) as {
      RestaurantOutboxProcessor: new (
        prisma: unknown,
        publisher: { publish(event: unknown): Promise<void> },
      ) => { publishCommitted(): Promise<number> };
    };
    const calls: string[] = [];
    const rows = [
      {
        id: "first",
        type: "order.created",
        aggregateId: "order-1",
        locationId: "location-1",
        version: 1,
        occurredAt: new Date("2026-07-30T00:00:00.000Z"),
      },
      {
        id: "second",
        type: "inventory.changed",
        aggregateId: null,
        locationId: "location-1",
        version: 2,
        occurredAt: new Date("2026-07-30T00:00:01.000Z"),
      },
    ];
    const processor = new module.RestaurantOutboxProcessor(
      {
        restaurantOutboxEvent: {
          findMany: async () => {
            calls.push("read-committed");
            return rows;
          },
          updateMany: async ({ where }: { where: { id: string } }) => {
            calls.push(`mark:${where.id}`);
            return { count: 1 };
          },
        },
      },
      {
        publish: async (event: unknown) => {
          calls.push(`publish:${(event as { readonly type: string }).type}`);
        },
      },
    );

    expect(calls).toEqual([]);
    await expect(processor.publishCommitted()).resolves.toBe(2);
    expect(calls).toEqual([
      "read-committed",
      "publish:order.created",
      "mark:first",
      "publish:inventory.changed",
      "mark:second",
    ]);
  });
});

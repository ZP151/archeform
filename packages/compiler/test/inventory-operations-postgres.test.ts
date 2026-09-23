import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { mkdirSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { basename, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadInventoryRuntime,
  renamedInventoryInput,
} from "./fixtures/inventory-operations-runtime.js";

/** Root owns the fresh loopback database, probe directory and their teardown.
 * No Docker lifecycle or in-process directory removal: Windows retains loaded
 * Prisma DLLs until this process exits. The parent must remove the exact probe
 * directory only after exit and record that cleanup separately.
 * Opt in: FACTORY_INVENTORY_PG_ENV_FILE=<absolute ignored .env file> pnpm --filter
 * @factory/compiler exec vitest run test/inventory-operations-postgres.test.ts
 * The env file supplies DATABASE_URL for a database named inventory_task2_*,
 * and FACTORY_INVENTORY_PG_WORK_DIR names an absent absolute directory whose
 * basename starts with archeform-inventory-postgres-.
 */
describe.skipIf(!process.env.FACTORY_INVENTORY_PG_ENV_FILE)(
  "inventory emitted PostgreSQL contract",
  () => {
    let directory: string;
    let client: any;
    let runtime: any;
    let store: any;
    let Runtime: any;
    let Store: any;
    const values = { sku: "A-1", name: "Literal %_\\ stock" };
    const command = (
      operation: string,
      id?: string,
      body: unknown = { values },
      key = operation,
    ) =>
      runtime.inventoryCommand(
        "stockkeeper",
        "pg-fixture",
        "stock-item",
        id,
        operation,
        key,
        body,
      );
    beforeAll(async () => {
      loadEnvFile(process.env.FACTORY_INVENTORY_PG_ENV_FILE!);
      let url: URL;
      try {
        url = new URL(process.env.DATABASE_URL!);
      } catch {
        throw Error("A valid local fixture database is required.");
      }
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        !/^\/inventory_task2_[a-z0-9_]+$/.test(url.pathname)
      )
        throw Error(
          "Only an explicitly owned inventory_task2_* loopback database is permitted.",
        );
      directory = process.env.FACTORY_INVENTORY_PG_WORK_DIR ?? "";
      if (
        !isAbsolute(directory) ||
        !basename(directory).startsWith("archeform-inventory-postgres-") ||
        existsSync(directory)
      )
        throw Error("An absent parent-owned probe directory is required.");
      mkdirSync(directory);
      const emitted = loadInventoryRuntime();
      const prismaInventory = join(directory, "prisma");
      mkdirSync(prismaInventory, { recursive: true });
      const schema = emitted.files.find(
        (file: any) => file.path === "database/prisma/schema.prisma",
      )!.content;
      if (!schema.includes('provider = "prisma-client-js"'))
        throw Error("Prisma generator anchor missing.");
      // Only the test client's output directory differs; model and migration bytes are emitted unchanged.
      writeFileSync(
        join(prismaInventory, "schema.prisma"),
        schema.replace(
          'provider = "prisma-client-js"',
          'provider = "prisma-client-js"\n  output = "./client"',
        ),
      );
      for (const file of emitted.files.filter((file: any) =>
        file.path.startsWith("database/prisma/migrations/"),
      )) {
        const target = join(directory, file.path.replace("database/", ""));
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, file.content);
      }
      const controlPlane = fileURLToPath(
        new URL("../../../apps/control-plane/", import.meta.url),
      );
      symlinkSync(
        join(controlPlane, "node_modules"),
        join(directory, "node_modules"),
        "junction",
      );
      const dependencies = createRequire(join(controlPlane, "package.json"));
      const cli = dependencies.resolve("prisma/build/index.js");
      // Validate both admitted business names with the actual Prisma CLI. Root owns
      // these generated clients and removes the probe only after this process exits.
      for (const key of [
        "inventory-mutation-receipt",
        "factory-inventory-mutation-receipt",
      ]) {
        const renamedDirectory = join(directory, key);
        mkdirSync(renamedDirectory);
        const renamed = loadInventoryRuntime(
          undefined,
          renamedInventoryInput(key),
        ).files.find(
          (file: any) => file.path === "api/prisma/schema.prisma",
        )!.content;
        const renamedSchema = join(renamedDirectory, "schema.prisma");
        writeFileSync(
          renamedSchema,
          renamed.replace(
            'provider = "prisma-client-js"',
            'provider = "prisma-client-js"\n  output = "./client"',
          ),
        );
        for (const operation of ["validate", "generate"]) {
          try {
            execFileSync(
              process.execPath,
              [cli, operation, "--schema", renamedSchema],
              { cwd: directory, env: process.env, stdio: "pipe" },
            );
          } catch {
            throw Error(
              "Renamed Inventory Prisma " +
                operation +
                " failed; output suppressed.",
            );
          }
        }
      }

      for (const args of [["generate"], ["migrate", "deploy"]]) {
        try {
          execFileSync(
            process.execPath,
            [cli, ...args, "--schema", join(prismaInventory, "schema.prisma")],
            { cwd: directory, env: process.env, stdio: "pipe" },
          );
        } catch {
          throw Error(
            "Isolated inventory Prisma setup failed; command output suppressed.",
          );
        }
      }
      const local = createRequire(join(directory, "loader.cjs"));
      const { PrismaClient } = local(join(prismaInventory, "client/index.js"));
      client = new PrismaClient();
      Runtime = emitted.ApplicationRuntime;
      Store = emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore;
      store = new Store(client);
      runtime = new Runtime(store);
    }, 120000);
    afterAll(async () => {
      await client?.$disconnect();
    });
    it("persists exact replay after disconnect/restart, same-key races, unique SKU and complete stock journey", async () => {
      expect(
        (await runtime.inventoryList("observer", "stock-item")).records,
      ).toEqual([]);
      const [created, replayed] = await Promise.all([
        command("create"),
        command("create"),
      ]);
      expect(created).toEqual(replayed);
      const id = created.body.id;
      expect(await client.factory_InventoryMutationReceipt.count()).toBe(1);
      expect(await client.factory_AuditEvent.count()).toBe(1);
      await expect(
        command(
          "create",
          undefined,
          { values: { sku: " a-1 ", name: "Duplicate" } },
          "duplicate",
        ),
      ).rejects.toMatchObject({
        status: 409,
        body: { code: "inventory.sku_conflict" },
      });
      const receiveBody = {
        expectedVersion: 0,
        quantity: 10,
        reason: "Delivery",
      };
      const [received, receiveReplay] = await Promise.all([
        command("receive", id, receiveBody),
        command("receive", id, receiveBody),
      ]);
      expect(received).toEqual(receiveReplay);
      await command("issue", id, {
        expectedVersion: 1,
        quantity: 3,
        reason: "Used",
      });
      const corrected = await command("adjust", id, {
        expectedVersion: 2,
        delta: -1,
        reason: "Count correction",
        correctionOf: received.body.movement.id,
      });
      expect(corrected.body.item).toMatchObject({ quantity: 6, version: 3 });
      expect(await client.stockMovement.count()).toBe(3);
      const fullHistory = await runtime.inventoryHistory(
        "stockkeeper",
        "stock-item",
        id,
      );
      expect(
        fullHistory.records.reduce(
          (sum: number, row: any) => sum + row.delta,
          0,
        ),
      ).toBe(6);
      expect(
        fullHistory.records.find(
          (row: any) => row.id === received.body.movement.id,
        ),
      ).toEqual(received.body.movement);
      expect(await client.factory_CapabilityEvent.count()).toBe(3);
      expect(await client.factory_AuditEvent.count()).toBe(4);
      const history = await runtime.inventoryHistory(
        "stockkeeper",
        "stock-item",
        id,
        "limit=2",
      );
      expect(history.hasMore).toBe(true);
      expect(history.records.map((row: any) => row.itemVersion)).toEqual([
        3, 2,
      ]);
      expect(history.records[0].recordedAt).toMatch(/^\d{4}-.*Z$/);
      const before = await client.factory_InventoryMutationReceipt.count();
      await client.$disconnect();
      await client.$connect();
      runtime = new Runtime(new Store(client));
      expect(await command("receive", id, receiveBody)).toEqual(received);
      expect(await client.factory_InventoryMutationReceipt.count()).toBe(
        before,
      );
      const renamed = await command("update", id, {
        expectedVersion: 3,
        values: { name: "New literal %_\\ name" },
      });
      expect(renamed).toMatchObject({
        status: 200,
        body: { quantity: 6, version: 4, name: "New literal %_\\ name" },
      });
      expect(await client.stockMovement.count()).toBe(3);
      await command(
        "create",
        undefined,
        { values: { sku: "B-1", name: "Near xxx name" } },
        "second",
      );
      const search = await runtime.inventoryList(
        "observer",
        "stock-item",
        "q=" + encodeURIComponent("%_\\"),
      );
      expect(search.records.map((row: any) => row.id)).toEqual([id]);
      expect(Object.keys(search.records[0]).sort()).toEqual(
        ["id", "sku", "name", "unit", "quantity", "version"].sort(),
      );
      await expect(
        runtime.inventoryHistory("observer", "stock-item", id),
      ).rejects.toMatchObject({ status: 403 });
      expect(
        (await client.factory_InventoryMutationReceipt.findMany()).every(
          (row: any) => /^sha256:[a-f0-9]{64}$/.test(row.keyDigest),
        ),
      ).toBe(true);
    }, 60000);
    it("gives one winner when two issues race for the last units", async () => {
      const { body: item } = await command(
        "create",
        undefined,
        { values: { sku: "RACE", name: "Race fixture" } },
        "race-create",
      );
      await command(
        "receive",
        item.id,
        { expectedVersion: 0, quantity: 1, reason: "Stock" },
        "race-receive",
      );
      const results = await Promise.allSettled(
        ["race-a", "race-b"].map((key) =>
          command(
            "issue",
            item.id,
            { expectedVersion: 1, quantity: 1, reason: "Last unit" },
            key,
          ),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (
          results.find(
            (result) => result.status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ).toMatchObject({
        status: 409,
        body: { code: "inventory.version_conflict" },
      });
      expect(
        await client.stockItem.findUnique({ where: { id: item.id } }),
      ).toMatchObject({ quantity: 0, version: 2 });
      expect(
        await client.stockMovement.count({ where: { stockItemId: item.id } }),
      ).toBe(2);
      await expect(
        command(
          "issue",
          item.id,
          { expectedVersion: 2, quantity: 1, reason: "Empty" },
          "empty",
        ),
      ).rejects.toMatchObject({
        body: { code: "inventory.insufficient_stock" },
      });
    }, 60000);
    it("rolls back each transactional mutation boundary including declared effect and receipt failures", async () => {
      const { body: item } = await command(
        "create",
        undefined,
        { values: { sku: "ROLLBACK", name: "Rollback fixture" } },
        "rollback-create",
      );
      const snapshot = async () => ({
        item: await client.stockItem.findUnique({ where: { id: item.id } }),
        movements: await client.stockMovement.count(),
        audit: await client.factory_AuditEvent.count(),
        effects: await client.factory_CapabilityEvent.count(),
        receipts: await client.factory_InventoryMutationReceipt.count(),
      });
      for (const method of [
        "conditionalInventoryUpdate",
        "create",
        "appendAudit",
        "appendCapabilityEvent",
        "saveInventoryReceipt",
      ]) {
        const before = await snapshot();
        const failing = new Store(client);
        const transaction = failing.inTransaction.bind(failing);
        failing.inTransaction = (operation: any) =>
          transaction(async (tx: any) => {
            const original = tx[method].bind(tx);
            tx[method] = async (...args: any[]) => {
              await original(...args);
              throw Error("Injected private fixture failure");
            };
            return operation(tx);
          });
        await expect(
          new Runtime(failing).inventoryCommand(
            "stockkeeper",
            "pg-fixture",
            "stock-item",
            item.id,
            "receive",
            "rollback-" + method,
            { expectedVersion: 0, quantity: 1, reason: "Rollback" },
          ),
        ).rejects.toMatchObject({
          status: 500,
          body: { code: "inventory.internal_error" },
        });
        expect(await snapshot()).toEqual(before);
      }
    }, 60000);
    it("enforces PostgreSQL bounds, relation, movement-version uniqueness and SKU uniqueness", async () => {
      const { body: item } = await command(
        "create",
        undefined,
        { values: { sku: "CONSTRAINT", name: "Constraint fixture" } },
        "constraint-create",
      );
      const received = await command(
        "receive",
        item.id,
        { expectedVersion: 0, quantity: 1, reason: "Constraint fixture" },
        "constraint-receive",
      );
      for (const data of [
        { quantity: -1 },
        { quantity: 1000000001 },
        { version: -1 },
        { unit: "kg" },
      ])
        await expect(
          client.stockItem.update({ where: { id: item.id }, data }),
        ).rejects.toThrow();
      const persisted = await client.stockMovement.findUnique({
        where: { id: received.body.movement.id },
      });
      const { id, createdAt, updatedAt, ...base } = persisted;
      await expect(
        client.stockMovement.create({ data: base }),
      ).rejects.toThrow();
      for (const data of [
        { stockItemId: "absent", itemVersion: 2 },
        { delta: 0, itemVersion: 2 },
        { delta: 1000000001, itemVersion: 2 },
        { beforeQuantity: -1, itemVersion: 2 },
        { afterQuantity: 1000000001, itemVersion: 2 },
        { itemVersion: 0 },
      ])
        await expect(
          client.stockMovement.create({ data: { ...base, ...data } }),
        ).rejects.toThrow();
      const changed = await runtime.inventoryRead(
        "stockkeeper",
        "stock-item",
        item.id,
      );
      expect(changed).toMatchObject({ quantity: 1, version: 1 });
      await client.stockItem.update({
        where: { id: item.id },
        data: { version: 2147483647 },
      });
      await expect(
        command(
          "update",
          item.id,
          { expectedVersion: 2147483646, values: { name: "Overflow" } },
          "version-limit",
        ),
      ).rejects.toMatchObject({
        status: 409,
        body: { code: "inventory.version_limit" },
      });
    }, 60000);
    it("resolves a distinct-key SKU race and rejects upper-bound overflow without effects", async () => {
      const results = await Promise.allSettled(
        ["sku-race-a", "sku-race-b"].map((key) =>
          command(
            "create",
            undefined,
            { values: { sku: "SKU-RACE", name: key } },
            key,
          ),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (
          results.find(
            (result) => result.status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ).toMatchObject({
        status: 409,
        body: { code: "inventory.sku_conflict" },
      });
      const { body: item } = await command(
        "create",
        undefined,
        { values: { sku: "MAXIMUM", name: "Maximum fixture" } },
        "maximum-create",
      );
      await command(
        "receive",
        item.id,
        { expectedVersion: 0, quantity: 1000000000, reason: "Upper bound" },
        "maximum-receive",
      );
      const receipts = await client.factory_InventoryMutationReceipt.count(),
        audit = await client.factory_AuditEvent.count();
      await expect(
        command(
          "receive",
          item.id,
          { expectedVersion: 1, quantity: 1, reason: "Overflow" },
          "maximum-overflow",
        ),
      ).rejects.toMatchObject({
        status: 409,
        body: { code: "inventory.quantity_limit" },
      });
      expect(await client.factory_InventoryMutationReceipt.count()).toBe(
        receipts,
      );
      expect(await client.factory_AuditEvent.count()).toBe(audit);
      expect(
        await client.stockMovement.count({ where: { stockItemId: item.id } }),
      ).toBe(1);
      expect(
        await runtime.inventoryRead("observer", "stock-item", item.id),
      ).toMatchObject({ quantity: 1000000000, version: 1 });
    }, 60000);
  },
);

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { loadEnvFile } from "node:process";
import { mkdirSync, writeFileSync, symlinkSync, existsSync } from "node:fs";
import { basename, dirname, join, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDirectoryRuntime } from "./fixtures/content-directory-runtime.js";

/** Root owns the fresh loopback database, probe directory and their teardown.
 * No Docker lifecycle or in-process directory removal: Windows retains loaded
 * Prisma DLLs until this process exits. The parent must remove the exact probe
 * directory only after exit and record that cleanup separately.
 * Opt in: FACTORY_DIRECTORY_PG_ENV_FILE=<absolute ignored .env file> pnpm --filter
 * @factory/compiler exec vitest run test/content-directory-postgres.test.ts
 * The env file supplies DATABASE_URL for a database named directory_task2_*,
 * and FACTORY_DIRECTORY_PG_WORK_DIR names an absent absolute directory whose
 * basename starts with archeform-directory-postgres-.
 */
describe.skipIf(!process.env.FACTORY_DIRECTORY_PG_ENV_FILE)(
  "directory emitted PostgreSQL contract",
  () => {
    let directory: string;
    let client: any;
    let runtime: any;
    let store: any;
    let Runtime: any;
    let Store: any;
    const values = {
      title: "A literal %_\\ guide",
      summary: "Find literal punctuation",
      body: "Real PostgreSQL entry",
      category: "Guides",
    };
    const command = (
      operation: string,
      id?: string,
      body: unknown = { values },
      key = operation,
    ) =>
      runtime.directoryCommand(
        "curator",
        "pg-fixture",
        "resource",
        id,
        operation,
        key,
        body,
      );
    beforeAll(async () => {
      loadEnvFile(process.env.FACTORY_DIRECTORY_PG_ENV_FILE!);
      let url: URL;
      try {
        url = new URL(process.env.DATABASE_URL!);
      } catch {
        throw Error("A valid local fixture database is required.");
      }
      if (
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        !/^\/directory_task2_[a-z0-9_]+$/.test(url.pathname)
      )
        throw Error(
          "Only an explicitly owned directory_task2_* loopback database is permitted.",
        );
      directory = process.env.FACTORY_DIRECTORY_PG_WORK_DIR ?? "";
      if (
        !isAbsolute(directory) ||
        !basename(directory).startsWith("archeform-directory-postgres-") ||
        existsSync(directory)
      )
        throw Error("An absent parent-owned probe directory is required.");
      mkdirSync(directory);
      const emitted = loadDirectoryRuntime();
      const prismaDirectory = join(directory, "prisma");
      mkdirSync(prismaDirectory, { recursive: true });
      const schema = emitted.files.find(
        (file: any) => file.path === "database/prisma/schema.prisma",
      )!.content;
      if (!schema.includes('provider = "prisma-client-js"'))
        throw Error("Prisma generator anchor missing.");
      // Only the test client's output directory differs; model and migration bytes are emitted unchanged.
      writeFileSync(
        join(prismaDirectory, "schema.prisma"),
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
      for (const args of [["generate"], ["migrate", "deploy"]]) {
        try {
          execFileSync(
            process.execPath,
            [cli, ...args, "--schema", join(prismaDirectory, "schema.prisma")],
            { cwd: directory, env: process.env, stdio: "pipe" },
          );
        } catch {
          throw Error(
            "Isolated directory Prisma setup failed; command output suppressed.",
          );
        }
      }
      const local = createRequire(join(directory, "loader.cjs"));
      const { PrismaClient } = local(join(prismaDirectory, "client/index.js"));
      client = new PrismaClient();
      Runtime = emitted.ApplicationRuntime;
      Store = emitted.load("api/src/prisma-record-store.ts").PrismaRecordStore;
      store = new Store(client);
      runtime = new Runtime(store);
    }, 120000);
    afterAll(async () => {
      await client?.$disconnect();
    });
    it("proves literal search, hidden predicates, restart replay, concurrent CAS and rollback", async () => {
      const [a, replay] = await Promise.all([
        command("create"),
        command("create"),
      ]);
      expect(a).toEqual(replay);
      const hidden = await command(
        "create",
        undefined,
        { values: { ...values, title: "B hidden %_\\ guide" } },
        "second",
      );
      const near = await command(
        "create",
        undefined,
        { values: { ...values, title: "C near xx guide" } },
        "near",
      );
      await command("submit", a.body.id, { expectedVersion: 0 }, "show-first");
      await command(
        "submit",
        near.body.id,
        { expectedVersion: 0 },
        "show-near",
      );
      const readerList = await runtime.directoryList(
        "reader",
        "resource",
        "q=" + encodeURIComponent("%_\\") + "&limit=1",
      );
      expect(readerList.records.map((row: any) => row.id)).toEqual([a.body.id]);
      expect(readerList.hasMore).toBe(false);
      expect(readerList.records[0]).not.toHaveProperty("body");
      await expect(
        runtime.read("reader", "resource", hidden.body.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        runtime.read("reader", "resource", "absent"),
      ).rejects.toMatchObject({ status: 404 });
      const state = await runtime.read("curator", "resource", a.body.id);
      const race = await Promise.allSettled([
        command(
          "update",
          a.body.id,
          {
            expectedVersion: state.version,
            values: { ...values, summary: "First concurrent edit" },
          },
          "race-a",
        ),
        command(
          "update",
          a.body.id,
          {
            expectedVersion: state.version,
            values: { ...values, summary: "Second concurrent edit" },
          },
          "race-b",
        ),
      ]);
      expect(
        race.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        (
          race.find(
            (result) => result.status === "rejected",
          ) as PromiseRejectedResult
        ).reason,
      ).toMatchObject({
        status: 409,
        body: { code: "directory.version_conflict" },
      });
      const before = await client.resource.findUnique({
        where: { id: a.body.id },
      });
      const receiptCount = await client.directoryMutationReceipt.count();
      const auditCount = await client.factory_AuditEvent.count();
      const failingStore = new Store(client);
      const originalTransaction = failingStore.inTransaction.bind(failingStore);
      failingStore.inTransaction = (operation: any) =>
        originalTransaction(async (tx: any) => {
          tx.saveDirectoryReceipt = async () => {
            throw Error("Injected receipt failure");
          };
          return operation(tx);
        });
      const failingRuntime = new Runtime(failingStore);
      await expect(
        failingRuntime.directoryCommand(
          "curator",
          "pg-fixture",
          "resource",
          a.body.id,
          "update",
          "rollback",
          {
            expectedVersion: before.version,
            values: { ...values, title: "Must roll back" },
          },
        ),
      ).rejects.toThrow("Directory request failed.");
      expect(
        await client.resource.findUnique({ where: { id: a.body.id } }),
      ).toEqual(before);
      expect(await client.directoryMutationReceipt.count()).toBe(receiptCount);
      expect(await client.factory_AuditEvent.count()).toBe(auditCount);
      expect(await client.factory_CapabilityEvent.count()).toBe(0);
      await client.$disconnect();
      await client.$connect();
      runtime = new Runtime(new Store(client));
      expect(await command("create")).toEqual(a);
      expect(await client.directoryMutationReceipt.count()).toBe(receiptCount);
      expect(await client.factory_AuditEvent.count()).toBe(auditCount);
    }, 60000);
  },
);

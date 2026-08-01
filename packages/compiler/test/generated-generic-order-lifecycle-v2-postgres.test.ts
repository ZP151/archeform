import { execFile, spawn } from "node:child_process";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  capabilityAssets,
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import { generateApplicationBundle } from "../src/index.js";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

type CommerceProfile = "simple-ecommerce" | "retail-counter" | "grocery-pickup";

const profileCases = [
  {
    profile: "simple-ecommerce",
    role: "shopper",
    catalogManagerRole: "merchant",
    orderEntity: "order",
    catalogEntity: "product",
    journey: [
      { event: "submit", role: "shopper" },
      { event: "pay", role: "shopper" },
      { event: "fulfil", role: "merchant" },
    ],
    finalState: "fulfilled",
  },
  {
    profile: "retail-counter",
    role: "shopper",
    catalogManagerRole: "cashier",
    orderEntity: "counter-sale",
    catalogEntity: "retail-item",
    journey: [
      { event: "submit", role: "shopper" },
      { event: "pay", role: "shopper" },
      { event: "issue-receipt", role: "cashier" },
    ],
    finalState: "receipt-issued",
  },
  {
    profile: "grocery-pickup",
    role: "shopper",
    catalogManagerRole: "fulfilment",
    orderEntity: "pickup-order",
    catalogEntity: "grocery-item",
    journey: [
      { event: "submit", role: "shopper" },
      { event: "pay", role: "shopper" },
      { event: "pick", role: "fulfilment" },
      { event: "ready", role: "fulfilment" },
      { event: "handoff", role: "fulfilment" },
    ],
    finalState: "handed-off",
  },
] as const;

function assetLock(asset: (typeof capabilityAssets)[number]) {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    asset.manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
}

function compileDirectV2(profile: CommerceProfile) {
  const graph = structuredClone(
    composeDefaultCapabilityDraft({ profile }).graph,
  );
  const successorOrder = capabilityAssets.find(
    ({ manifest }) =>
      manifest.key === "commerce.order" && manifest.version === "2.1.2",
  )!;
  const successorTransaction = capabilityAssets.find(
    ({ manifest }) =>
      manifest.key === "commerce.transaction" && manifest.version === "2.2.1",
  )!;
  graph.integration.compositionSelections =
    graph.integration.compositionSelections!.map((selection) => {
      if (selection.lock.key === "commerce.order") {
        return { ...selection, lock: assetLock(successorOrder) };
      }
      if (selection.lock.key === "commerce.transaction") {
        return { ...selection, lock: assetLock(successorTransaction) };
      }
      return selection;
    });
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });
  return generateApplicationBundle({
    publishedRevisionId: `live-postgres-${profile}`,
    graph,
    compositionLock,
  });
}

async function linkGeneratedRuntimeDependencies(directory: string) {
  const dependencyRoots = {
    "@nestjs/common": "apps/control-plane/node_modules/@nestjs/common",
    "@nestjs/core": "apps/control-plane/node_modules/@nestjs/core",
    "@nestjs/platform-express":
      "apps/control-plane/node_modules/@nestjs/platform-express",
    "@types/node": "node_modules/@types/node",
    casbin: "packages/compiler/node_modules/casbin",
    "reflect-metadata": "apps/control-plane/node_modules/reflect-metadata",
    rxjs: "apps/control-plane/node_modules/rxjs",
    typescript: "node_modules/typescript",
    xstate: "packages/compiler/node_modules/xstate",
  } as const;
  const nodeModules = resolve(directory, "api/node_modules");
  await mkdir(nodeModules, { recursive: true });
  for (const [dependency, sourcePath] of Object.entries(dependencyRoots)) {
    const target = resolve(nodeModules, ...dependency.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await symlink(
      await realpath(resolve(repositoryRoot, sourcePath)),
      target,
      "junction",
    );
  }
  await mkdir(resolve(nodeModules, "@prisma"), { recursive: true });
  await cp(
    await realpath(
      resolve(repositoryRoot, "apps/control-plane/node_modules/@prisma/client"),
    ),
    resolve(nodeModules, "@prisma/client"),
    { recursive: true, dereference: true },
  );
}

async function runDocker(
  args: readonly string[],
  options: Readonly<{ cwd?: string }> = {},
): Promise<string> {
  const result = await execFileAsync("docker", [...args], {
    cwd: options.cwd,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
    windowsHide: true,
  });
  return `${result.stdout}${result.stderr}`;
}

async function runDockerWithInput(
  args: readonly string[],
  input: string,
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolveRun, rejectRun) => {
    const child = spawn("docker", [...args], {
      cwd,
      stdio: ["pipe", "ignore", "ignore"],
      windowsHide: true,
    });
    child.on("error", rejectRun);
    child.on("close", (exitCode) => {
      if (exitCode === 0) resolveRun();
      else rejectRun(new Error("Generated PostgreSQL migration failed."));
    });
    child.stdin.end(input);
  });
}

async function composeArtifacts(projectName: string) {
  const filters = [
    "--filter",
    `label=com.docker.compose.project=${projectName}`,
  ];
  const [containers, volumes, networks] = await Promise.all([
    runDocker(["ps", "-aq", ...filters]),
    runDocker(["volume", "ls", "-q", ...filters]),
    runDocker(["network", "ls", "-q", ...filters]),
  ]);
  const count = (output: string) =>
    output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean).length;
  return {
    containers: count(containers),
    volumes: count(volumes),
    networks: count(networks),
  };
}

async function withLiveGeneratedPostgres<T>(
  profile: CommerceProfile,
  runnerSource: string,
  transformSource?: (path: string, content: string) => string,
): Promise<
  Readonly<{
    result: T;
    cleanup: Awaited<ReturnType<typeof composeArtifacts>>;
  }>
> {
  const directory = await mkdtemp(
    resolve(tmpdir(), `factory-${profile}-live-postgres-`),
  );
  const projectName = `factory-live-${process.pid}-${randomUUID().slice(0, 8)}`;
  const composeFile = resolve(directory, "docker-compose.yml");
  const overrideFile = resolve(directory, "docker-compose.live.yml");
  const bundle = compileDirectV2(profile);
  let result: T | undefined;
  let operationError: unknown;
  try {
    for (const file of bundle.files) {
      const path = resolve(directory, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(
        path,
        transformSource?.(file.path, file.content) ?? file.content,
        "utf8",
      );
    }
    await writeFile(
      overrideFile,
      [
        "services:",
        "  postgres:",
        "    ports:",
        '      - "127.0.0.1::5432"',
        "",
      ].join("\n"),
      "utf8",
    );
    const composeArgs = [
      "compose",
      "-p",
      projectName,
      "-f",
      composeFile,
      "-f",
      overrideFile,
    ] as const;
    await runDocker([...composeArgs, "up", "-d", "--wait", "postgres"], {
      cwd: directory,
    });
    const migration = await readFile(
      resolve(
        directory,
        "database/prisma/migrations/0001_initial/migration.sql",
      ),
      "utf8",
    );
    await runDockerWithInput(
      [
        ...composeArgs,
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "generated",
        "-d",
        "generated",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      migration,
      directory,
    );
    const endpoint = (
      await runDocker([...composeArgs, "port", "postgres", "5432"], {
        cwd: directory,
      })
    ).trim();
    const port = endpoint.match(/:(\d+)$/u)?.[1];
    if (!port)
      throw new Error("Generated PostgreSQL endpoint was not allocated.");
    const databaseUrl = `postgresql://generated:generated@127.0.0.1:${port}/generated`;

    await linkGeneratedRuntimeDependencies(directory);
    const prismaExecutable = resolve(
      repositoryRoot,
      `apps/control-plane/node_modules/.bin/prisma${process.platform === "win32" ? ".CMD" : ""}`,
    );
    try {
      await execFileAsync(
        prismaExecutable,
        [
          "generate",
          "--schema",
          resolve(directory, "api/prisma/schema.prisma"),
        ],
        {
          cwd: resolve(directory, "api"),
          env: {
            ...process.env,
            CHECKPOINT_DISABLE: "1",
            DATABASE_URL: databaseUrl,
            PRISMA_HIDE_UPDATE_MESSAGE: "1",
          },
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === "win32",
          timeout: 120_000,
          windowsHide: true,
        },
      );
    } catch (error) {
      throw new Error("Generated Prisma Client could not be materialised.", {
        cause: error,
      });
    }
    const pnpmExecutable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    try {
      await execFileAsync(pnpmExecutable, ["build"], {
        cwd: resolve(directory, "api"),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          PATH: [
            resolve(repositoryRoot, "node_modules/.bin"),
            resolve(repositoryRoot, "packages/compiler/node_modules/.bin"),
            resolve(repositoryRoot, "apps/control-plane/node_modules/.bin"),
            process.env.PATH ?? "",
          ].join(process.platform === "win32" ? ";" : ":"),
        },
        maxBuffer: 10 * 1024 * 1024,
        shell: process.platform === "win32",
        timeout: 120_000,
        windowsHide: true,
      });
    } catch (error) {
      throw new Error("Generated API could not be built for live execution.", {
        cause: error,
      });
    }
    const runnerPath = resolve(directory, "live-runner.mjs");
    await writeFile(runnerPath, runnerSource, "utf8");
    try {
      const child = await execFileAsync(process.execPath, [runnerPath], {
        cwd: directory,
        env: { ...process.env, DATABASE_URL: databaseUrl },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120_000,
        windowsHide: true,
      });
      result = JSON.parse(child.stdout) as T;
    } catch (error) {
      throw new Error("Generated live transaction runner failed.", {
        cause: error,
      });
    }
  } catch (error) {
    operationError = error;
  } finally {
    const composeArgs = [
      "compose",
      "-p",
      projectName,
      "-f",
      composeFile,
      "-f",
      overrideFile,
    ];
    await runDocker(
      [
        ...composeArgs,
        "down",
        "--volumes",
        "--remove-orphans",
        "--timeout",
        "0",
      ],
      { cwd: directory },
    ).catch(() => undefined);
  }
  const cleanup = await composeArtifacts(projectName);
  await rm(directory, { recursive: true, force: true, maxRetries: 5 });
  expect(cleanup).toEqual({ containers: 0, volumes: 0, networks: 0 });
  if (operationError !== undefined) throw operationError;
  return { result: result as T, cleanup };
}

function competingTransitionRunner(
  profile: (typeof profileCases)[number],
): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const delegateKey = (entityKey) => entityKey.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const runtimeA = new ApplicationRuntime(new PrismaRecordStore(clientA));
const runtimeB = new ApplicationRuntime(new PrismaRecordStore(clientB));
try {
  const catalogRecord = await runtimeA.create(profile.catalogManagerRole, profile.catalogEntity, {
    name: "Live catalog item",
    price: "10.00",
    stock: 20,
  });
  const order = await runtimeA.create(profile.role, profile.orderEntity, {});
  await runtimeA.addCartItem(profile.role, profile.orderEntity, order.id, {
    catalogEntity: profile.catalogEntity,
    catalogRecordId: catalogRecord.id,
    quantity: 1,
  });
  const before = {
    audit: await clientA.auditEvent.count(),
    outbox: await clientA.capabilityEvent.count(),
  };
  const competing = await Promise.allSettled([
    runtimeA.transition(profile.role, profile.orderEntity, order.id, "submit", {
      expectedVersion: 0,
      idempotencyKey: "competing-submit-a",
    }),
    runtimeB.transition(profile.role, profile.orderEntity, order.id, "submit", {
      expectedVersion: 0,
      idempotencyKey: "competing-submit-b",
    }),
  ]);
  const updated = await runtimeA.read(profile.role, profile.orderEntity, order.id);
  const catalog = await clientA[delegateKey(profile.catalogEntity)].findUnique({
    where: { id: catalogRecord.id },
  });
  const receipts = await clientA.commerceTransactionReceipt.findMany({
    orderBy: { createdAt: "asc" },
  });
  process.stdout.write(JSON.stringify({
    fulfilled: competing.filter(({ status }) => status === "fulfilled").length,
    rejected: competing.filter(({ status }) => status === "rejected").length,
    aggregate: { status: updated.status, version: updated.version },
    stock: catalog.stock,
    auditDelta: (await clientA.auditEvent.count()) - before.audit,
    outboxDelta: (await clientA.capabilityEvent.count()) - before.outbox,
    receiptStates: receipts.map(({ state }) => state).sort(),
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function completedReplayRunner(profile: (typeof profileCases)[number]): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const delegateKey = (entityKey) => entityKey.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const runtimeA = new ApplicationRuntime(new PrismaRecordStore(clientA));
const runtimeB = new ApplicationRuntime(new PrismaRecordStore(clientB));
try {
  const catalogRecord = await runtimeA.create(profile.catalogManagerRole, profile.catalogEntity, {
    name: "Replay catalog item",
    price: "10.00",
    stock: 20,
  });
  const order = await runtimeA.create(profile.role, profile.orderEntity, {});
  await runtimeA.addCartItem(profile.role, profile.orderEntity, order.id, {
    catalogEntity: profile.catalogEntity,
    catalogRecordId: catalogRecord.id,
    quantity: 1,
  });
  const options = { expectedVersion: 0, idempotencyKey: "completed-replay-submit" };
  const first = await runtimeA.transition(
    profile.role,
    profile.orderEntity,
    order.id,
    "submit",
    options,
  );
  const receiptBefore = await clientA.commerceTransactionReceipt.findUnique({
    where: { id: first.receiptId },
  });
  const before = {
    audit: await clientA.auditEvent.count(),
    outbox: await clientA.capabilityEvent.count(),
    receipts: await clientA.commerceTransactionReceipt.count(),
    stock: (await clientA[delegateKey(profile.catalogEntity)].findUnique({
      where: { id: catalogRecord.id },
    })).stock,
  };
  const replay = await runtimeB.transition(
    profile.role,
    profile.orderEntity,
    order.id,
    "submit",
    options,
  );
  const receiptAfter = await clientB.commerceTransactionReceipt.findUnique({
    where: { id: first.receiptId },
  });
  const aggregate = await runtimeA.read(profile.role, profile.orderEntity, order.id);
  const stockAfter = (await clientA[delegateKey(profile.catalogEntity)].findUnique({
    where: { id: catalogRecord.id },
  })).stock;
  process.stdout.write(JSON.stringify({
    first: { kind: first.kind, replayed: first.replayed },
    replay: { kind: replay.kind, replayed: replay.replayed },
    sameReceipt: first.receiptId === replay.receiptId,
    aggregate: { status: aggregate.status, version: aggregate.version },
    stockUnchanged: before.stock === stockAfter,
    auditDelta: (await clientA.auditEvent.count()) - before.audit,
    outboxDelta: (await clientA.capabilityEvent.count()) - before.outbox,
    receiptDelta: (await clientA.commerceTransactionReceipt.count()) - before.receipts,
    terminalUnchanged:
      JSON.stringify(receiptBefore.terminalOutcome) === JSON.stringify(receiptAfter.terminalOutcome),
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function activeClaimRunner(profile: (typeof profileCases)[number]): string {
  return `
import { createHash } from "node:crypto";
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const storeA = new PrismaRecordStore(clientA);
const runtimeA = new ApplicationRuntime(storeA);
const runtimeB = new ApplicationRuntime(new PrismaRecordStore(clientB));
try {
  const order = await runtimeA.create(profile.role, profile.orderEntity, {});
  const idempotencyKey = "active-submit";
  const payloadDigest = "sha256:" + createHash("sha256").update(JSON.stringify({
    entityKey: profile.orderEntity,
    recordId: order.id,
    event: "submit",
    expectedVersion: 0,
    expectedState: "cart",
  })).digest("hex");
  const claim = await storeA.claimTransactionReceipt({
    scope: "order:" + order.id,
    idempotencyKey,
    payloadDigest,
    leaseDurationMs: 30_000,
  });
  const result = await runtimeB.transition(
    profile.role,
    profile.orderEntity,
    order.id,
    "submit",
    { expectedVersion: 0, idempotencyKey },
  );
  const activeReceipt = await clientA.commerceTransactionReceipt.findUnique({
    where: { id: claim.receiptId },
  });
  await storeA.markTransactionReceiptRetryable({
    receiptId: claim.receiptId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
  });
  const releasedReceipt = await clientA.commerceTransactionReceipt.findUnique({
    where: { id: claim.receiptId },
  });
  process.stdout.write(JSON.stringify({
    claimKind: claim.kind,
    resultKind: result.kind,
    retryAfterPositive: result.retryAfterMs > 0,
    sameReceipt: result.receiptId === claim.receiptId,
    activeState: activeReceipt.state,
    releasedState: releasedReceipt.state,
    receiptCount: await clientA.commerceTransactionReceipt.count(),
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function changedDigestRunner(profile: (typeof profileCases)[number]): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const storeA = new PrismaRecordStore(clientA);
const runtimeA = new ApplicationRuntime(storeA);
const runtimeB = new ApplicationRuntime(new PrismaRecordStore(clientB));
try {
  const order = await runtimeA.create(profile.role, profile.orderEntity, {});
  const idempotencyKey = "changed-digest-submit";
  const claim = await storeA.claimTransactionReceipt({
    scope: "order:" + order.id,
    idempotencyKey,
    payloadDigest: "sha256:" + "a".repeat(64),
    leaseDurationMs: 30_000,
  });
  let mismatchRejected = false;
  try {
    await runtimeB.transition(
      profile.role,
      profile.orderEntity,
      order.id,
      "submit",
      { expectedVersion: 0, idempotencyKey },
    );
  } catch (error) {
    mismatchRejected = error instanceof Error && error.message.includes("idempotency payload mismatch");
  }
  await storeA.markTransactionReceiptRetryable({
    receiptId: claim.receiptId,
    leaseToken: claim.leaseToken,
    leaseEpoch: claim.leaseEpoch,
  });
  const aggregate = await runtimeA.read(profile.role, profile.orderEntity, order.id);
  const receipt = await clientA.commerceTransactionReceipt.findUnique({
    where: { id: claim.receiptId },
  });
  process.stdout.write(JSON.stringify({
    mismatchRejected,
    aggregate: { status: aggregate.status, version: aggregate.version },
    receiptState: receipt.state,
    hasTerminalOutcome: receipt.terminalOutcome !== null,
    receiptCount: await clientA.commerceTransactionReceipt.count(),
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function expiredLeaseRunner(): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const clientA = new PrismaClient();
const clientB = new PrismaClient();
const storeA = new PrismaRecordStore(clientA);
const storeB = new PrismaRecordStore(clientB);
try {
  const claimA = await storeA.claimTransactionReceipt({
    scope: "live-expired-lease",
    idempotencyKey: "expired-lease-key",
    payloadDigest: "sha256:" + "b".repeat(64),
    leaseDurationMs: 1,
  });
  await clientA.commerceTransactionReceipt.updateMany({
    where: { id: claimA.receiptId },
    data: { leaseExpiresAt: new Date(0) },
  });
  const claimB = await storeB.claimTransactionReceipt({
    scope: "live-expired-lease",
    idempotencyKey: "expired-lease-key",
    payloadDigest: "sha256:" + "b".repeat(64),
    leaseDurationMs: 30_000,
  });
  const active = await clientB.commerceTransactionReceipt.findUnique({
    where: { id: claimA.receiptId },
  });
  await storeB.markTransactionReceiptRetryable({
    receiptId: claimB.receiptId,
    leaseToken: claimB.leaseToken,
    leaseEpoch: claimB.leaseEpoch,
  });
  const released = await clientB.commerceTransactionReceipt.findUnique({
    where: { id: claimA.receiptId },
  });
  process.stdout.write(JSON.stringify({
    firstKind: claimA.kind,
    takeoverKind: claimB.kind,
    sameReceipt: claimA.receiptId === claimB.receiptId,
    tokenRotated: claimA.leaseToken !== claimB.leaseToken,
    firstEpoch: claimA.leaseEpoch,
    takeoverEpoch: claimB.leaseEpoch,
    activeState: active.state,
    activeEpoch: active.leaseEpoch,
    releasedState: released.state,
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function staleLeaseOwnerRunner(): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const clientA = new PrismaClient();
const clientB = new PrismaClient();
const storeA = new PrismaRecordStore(clientA);
const storeB = new PrismaRecordStore(clientB);
try {
  const payloadDigest = "sha256:" + "c".repeat(64);
  const claimA = await storeA.claimTransactionReceipt({
    scope: "live-stale-owner",
    idempotencyKey: "stale-owner-key",
    payloadDigest,
    leaseDurationMs: 1,
  });
  await clientA.commerceTransactionReceipt.updateMany({
    where: { id: claimA.receiptId },
    data: { leaseExpiresAt: new Date(0) },
  });
  const claimB = await storeB.claimTransactionReceipt({
    scope: "live-stale-owner",
    idempotencyKey: "stale-owner-key",
    payloadDigest,
    leaseDurationMs: 30_000,
  });
  const outcome = {
    aggregateEntity: "order",
    aggregateId: "stale-owner-order",
    aggregateVersion: 1,
    actorRole: "shopper",
    payloadDigest,
    event: "submit",
    flowId: "ecommerce-order",
  };
  let staleCompleteRejected = false;
  let staleReleaseRejected = false;
  try {
    await storeA.completeTransactionReceipt({
      receiptId: claimA.receiptId,
      leaseToken: claimA.leaseToken,
      leaseEpoch: claimA.leaseEpoch,
      outcome,
    });
  } catch (error) {
    staleCompleteRejected =
      error instanceof Error && error.message.includes("lease ownership changed");
  }
  try {
    await storeA.markTransactionReceiptRetryable({
      receiptId: claimA.receiptId,
      leaseToken: claimA.leaseToken,
      leaseEpoch: claimA.leaseEpoch,
    });
  } catch (error) {
    staleReleaseRejected =
      error instanceof Error && error.message.includes("lease ownership changed");
  }
  const active = await clientB.commerceTransactionReceipt.findUnique({
    where: { id: claimA.receiptId },
  });
  await storeB.markTransactionReceiptRetryable({
    receiptId: claimB.receiptId,
    leaseToken: claimB.leaseToken,
    leaseEpoch: claimB.leaseEpoch,
  });
  const released = await clientB.commerceTransactionReceipt.findUnique({
    where: { id: claimA.receiptId },
  });
  process.stdout.write(JSON.stringify({
    staleCompleteRejected,
    staleReleaseRejected,
    activeState: active.state,
    activeEpoch: active.leaseEpoch,
    activeTokenOwnedByReplacement: active.leaseToken === claimB.leaseToken,
    hasTerminalOutcome: active.terminalOutcome !== null,
    releasedState: released.state,
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function forcedRollbackRunner(profile: (typeof profileCases)[number]): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const delegateKey = (entityKey) => entityKey.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
class ForcedOutboxFailureStore extends PrismaRecordStore {
  failCapabilityEvent = false;
  async appendCapabilityEvent(event) {
    if (this.failCapabilityEvent) throw new Error("forced business failure");
    return super.appendCapabilityEvent(event);
  }
}
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const store = new ForcedOutboxFailureStore(clientA);
const runtime = new ApplicationRuntime(store);
try {
  const catalogRecord = await runtime.create(profile.catalogManagerRole, profile.catalogEntity, {
    name: "Rollback catalog item",
    price: "10.00",
    stock: 20,
  });
  const order = await runtime.create(profile.role, profile.orderEntity, {});
  await runtime.addCartItem(profile.role, profile.orderEntity, order.id, {
    catalogEntity: profile.catalogEntity,
    catalogRecordId: catalogRecord.id,
    quantity: 1,
  });
  const before = {
    audit: await clientA.auditEvent.count(),
    outbox: await clientA.capabilityEvent.count(),
    stock: (await clientA[delegateKey(profile.catalogEntity)].findUnique({
      where: { id: catalogRecord.id },
    })).stock,
  };
  store.failCapabilityEvent = true;
  let businessFailureRejected = false;
  try {
    await runtime.transition(
      profile.role,
      profile.orderEntity,
      order.id,
      "submit",
      { expectedVersion: 0, idempotencyKey: "forced-rollback-submit" },
    );
  } catch (error) {
    businessFailureRejected =
      error instanceof Error && error.message === "forced business failure";
  }
  store.failCapabilityEvent = false;
  const aggregate = await runtime.read(profile.role, profile.orderEntity, order.id);
  const stockAfter = (await clientA[delegateKey(profile.catalogEntity)].findUnique({
    where: { id: catalogRecord.id },
  })).stock;
  const receipts = await clientB.commerceTransactionReceipt.findMany();
  process.stdout.write(JSON.stringify({
    businessFailureRejected,
    aggregate: { status: aggregate.status, version: aggregate.version },
    stockUnchanged: stockAfter === before.stock,
    auditDelta: (await clientA.auditEvent.count()) - before.audit,
    outboxDelta: (await clientA.capabilityEvent.count()) - before.outbox,
    receiptCount: receipts.length,
    receiptState: receipts[0]?.state,
    hasTerminalOutcome: receipts[0]?.terminalOutcome !== null,
    hasCompletedAt: receipts[0]?.completedAt !== null,
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

function profileVocabularyRunner(
  profile: (typeof profileCases)[number],
): string {
  return `
import { PrismaClient } from "./api/node_modules/@prisma/client/default.js";
import { ApplicationRuntime } from "./api/dist/application-runtime.js";
import { PrismaRecordStore } from "./api/dist/prisma-record-store.js";

const profile = ${JSON.stringify(profile)};
const clientA = new PrismaClient();
const clientB = new PrismaClient();
const runtimeA = new ApplicationRuntime(new PrismaRecordStore(clientA));
const runtimeB = new ApplicationRuntime(new PrismaRecordStore(clientB));
try {
  const catalogRecord = await runtimeA.create(profile.catalogManagerRole, profile.catalogEntity, {
    name: "Vocabulary catalog item",
    price: "10.00",
    stock: 20,
  });
  const order = await runtimeA.create(profile.role, profile.orderEntity, {});
  await runtimeA.addCartItem(profile.role, profile.orderEntity, order.id, {
    catalogEntity: profile.catalogEntity,
    catalogRecordId: catalogRecord.id,
    quantity: 1,
  });
  const receipts = [];
  for (const [index, step] of profile.journey.entries()) {
    receipts.push(await (index % 2 === 0 ? runtimeA : runtimeB).transition(
      step.role,
      profile.orderEntity,
      order.id,
      step.event,
      {
        expectedVersion: index,
        idempotencyKey: "vocabulary-" + step.event + "-" + (index + 1),
      },
    ));
  }
  const aggregate = await runtimeA.read(profile.role, profile.orderEntity, order.id);
  const terminalReceipts = await clientA.commerceTransactionReceipt.findMany({
    orderBy: { createdAt: "asc" },
  });
  process.stdout.write(JSON.stringify({
    receiptKinds: receipts.map(({ kind }) => kind),
    presentedEvents: receipts.map(({ transition }) => transition),
    terminalEvents: terminalReceipts.map(({ terminalOutcome }) => terminalOutcome.event),
    aggregate: { status: aggregate.status, version: aggregate.version },
    receiptCount: terminalReceipts.length,
  }));
} finally {
  await Promise.allSettled([clientA.$disconnect(), clientB.$disconnect()]);
}
`;
}

describe("generated Generic order lifecycle V2 against live PostgreSQL", () => {
  it.each(profileCases)(
    "$profile executes its declared Flow vocabulary without aliases",
    async (profile) => {
      const evidence = await withLiveGeneratedPostgres<{
        receiptKinds: string[];
        presentedEvents: string[];
        terminalEvents: string[];
        aggregate: { status: string; version: number };
        receiptCount: number;
      }>(profile.profile, profileVocabularyRunner(profile));
      const events = profile.journey.map(({ event }) => event);

      expect(evidence.result).toEqual({
        receiptKinds: events.map(() => "completed"),
        presentedEvents: events,
        terminalEvents: events,
        aggregate: {
          status: profile.finalState,
          version: events.length,
        },
        receiptCount: events.length,
      });
      expect(evidence.cleanup).toEqual({
        containers: 0,
        volumes: 0,
        networks: 0,
      });
    },
    180_000,
  );

  it("rolls back every business effect and leaves only a retryable receipt", async () => {
    const profile = profileCases[0];
    const evidence = await withLiveGeneratedPostgres<{
      businessFailureRejected: boolean;
      aggregate: { status: string; version: number };
      stockUnchanged: boolean;
      auditDelta: number;
      outboxDelta: number;
      receiptCount: number;
      receiptState: string;
      hasTerminalOutcome: boolean;
      hasCompletedAt: boolean;
    }>(profile.profile, forcedRollbackRunner(profile));

    expect(evidence.result).toEqual({
      businessFailureRejected: true,
      aggregate: { status: "cart", version: 0 },
      stockUnchanged: true,
      auditDelta: 0,
      outboxDelta: 0,
      receiptCount: 1,
      receiptState: "retryable",
      hasTerminalOutcome: false,
      hasCompletedAt: false,
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("prevents a stale lease owner from completing or releasing a replacement claim", async () => {
    const evidence = await withLiveGeneratedPostgres<{
      staleCompleteRejected: boolean;
      staleReleaseRejected: boolean;
      activeState: string;
      activeEpoch: number;
      activeTokenOwnedByReplacement: boolean;
      hasTerminalOutcome: boolean;
      releasedState: string;
    }>("simple-ecommerce", staleLeaseOwnerRunner());

    expect(evidence.result).toEqual({
      staleCompleteRejected: true,
      staleReleaseRejected: true,
      activeState: "claimed",
      activeEpoch: 2,
      activeTokenOwnedByReplacement: true,
      hasTerminalOutcome: false,
      releasedState: "retryable",
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("allows an expired receipt lease to be taken over atomically", async () => {
    const evidence = await withLiveGeneratedPostgres<{
      firstKind: string;
      takeoverKind: string;
      sameReceipt: boolean;
      tokenRotated: boolean;
      firstEpoch: number;
      takeoverEpoch: number;
      activeState: string;
      activeEpoch: number;
      releasedState: string;
    }>("simple-ecommerce", expiredLeaseRunner());

    expect(evidence.result).toEqual({
      firstKind: "claimed",
      takeoverKind: "claimed",
      sameReceipt: true,
      tokenRotated: true,
      firstEpoch: 1,
      takeoverEpoch: 2,
      activeState: "claimed",
      activeEpoch: 2,
      releasedState: "retryable",
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("rejects a changed request digest for an existing key", async () => {
    const profile = profileCases[0];
    const evidence = await withLiveGeneratedPostgres<{
      mismatchRejected: boolean;
      aggregate: { status: string; version: number };
      receiptState: string;
      hasTerminalOutcome: boolean;
      receiptCount: number;
    }>(profile.profile, changedDigestRunner(profile));

    expect(evidence.result).toEqual({
      mismatchRejected: true,
      aggregate: { status: "cart", version: 0 },
      receiptState: "retryable",
      hasTerminalOutcome: false,
      receiptCount: 1,
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("reports an active same-key request as in-progress", async () => {
    const profile = profileCases[0];
    const evidence = await withLiveGeneratedPostgres<{
      claimKind: string;
      resultKind: string;
      retryAfterPositive: boolean;
      sameReceipt: boolean;
      activeState: string;
      releasedState: string;
      receiptCount: number;
    }>(profile.profile, activeClaimRunner(profile));

    expect(evidence.result).toEqual({
      claimKind: "claimed",
      resultKind: "in-progress",
      retryAfterPositive: true,
      sameReceipt: true,
      activeState: "claimed",
      releasedState: "retryable",
      receiptCount: 1,
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("replays a completed same-key transition without duplicating committed effects", async () => {
    const profile = profileCases[0];
    const evidence = await withLiveGeneratedPostgres<{
      first: { kind: string; replayed: boolean };
      replay: { kind: string; replayed: boolean };
      sameReceipt: boolean;
      aggregate: { status: string; version: number };
      stockUnchanged: boolean;
      auditDelta: number;
      outboxDelta: number;
      receiptDelta: number;
      terminalUnchanged: boolean;
    }>(profile.profile, completedReplayRunner(profile));

    expect(evidence.result).toEqual({
      first: { kind: "completed", replayed: false },
      replay: { kind: "completed", replayed: true },
      sameReceipt: true,
      aggregate: { status: "submitted", version: 1 },
      stockUnchanged: true,
      auditDelta: 0,
      outboxDelta: 0,
      receiptDelta: 0,
      terminalUnchanged: true,
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);

  it("allows exactly one independent client to commit a competing expected-version transition", async () => {
    const profile = profileCases[0];
    const evidence = await withLiveGeneratedPostgres<{
      fulfilled: number;
      rejected: number;
      aggregate: { status: string; version: number };
      stock: number;
      auditDelta: number;
      outboxDelta: number;
      receiptStates: string[];
    }>(profile.profile, competingTransitionRunner(profile));

    expect(evidence.result).toEqual({
      fulfilled: 1,
      rejected: 1,
      aggregate: { status: "submitted", version: 1 },
      stock: 19,
      auditDelta: 2,
      outboxDelta: 2,
      receiptStates: ["completed", "retryable"],
    });
    expect(evidence.cleanup).toEqual({
      containers: 0,
      volumes: 0,
      networks: 0,
    });
  }, 180_000);
});

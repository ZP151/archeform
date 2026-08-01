import { execFile, spawn } from "node:child_process";
import {
  access,
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
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import ts from "typescript";
import { afterAll, describe, expect, it, vi } from "vitest";

import {
  capabilityAssets,
  composeDefaultCapabilityDraft,
  createCapabilityCompositionLock,
} from "@factory/capabilities";
import { hashApplicationGraph } from "@factory/graph";

import { generateApplicationBundle } from "../src/index.js";

const generatedDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".generated-generic-order-lifecycle-v2",
);
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const execFileAsync = promisify(execFile);

afterAll(async () => {
  await rm(generatedDirectory, { recursive: true, force: true });
});

type CommerceProfile = "simple-ecommerce" | "retail-counter" | "grocery-pickup";

type StoredOrder = Readonly<{
  id: string;
  status: string;
  version: number;
}>;

type TransactionOutcome = Readonly<{
  aggregateEntity: string;
  aggregateId: string;
  aggregateVersion: number;
  actorRole: string;
  payloadDigest: string;
  event: string;
  flowId: string;
}>;

type ReceiptClaim =
  | Readonly<{
      kind: "claimed";
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>
  | Readonly<{
      kind: "completed";
      receiptId: string;
      outcome: TransactionOutcome;
    }>
  | Readonly<{ kind: "in-progress"; receiptId: string; retryAfterMs: number }>
  | Readonly<{ kind: "payload-mismatch"; receiptId: string }>;

type GeneratedRuntime = {
  create(
    role: string,
    entityKey: string,
    input: Record<string, unknown>,
  ): Promise<StoredOrder>;
  read(role: string, entityKey: string, recordId: string): Promise<StoredOrder>;
  addCartItem(
    role: string,
    orderEntity: string,
    orderRecordId: string,
    input: Readonly<{
      catalogEntity: string;
      catalogRecordId: string;
      quantity: number;
    }>,
  ): Promise<Readonly<{ id: string }>>;
  transition(
    role: string,
    entityKey: string,
    recordId: string,
    event: string,
    options: Readonly<{ expectedVersion: number; idempotencyKey: string }>,
  ): Promise<unknown>;
  auditLog(role: string): Promise<readonly unknown[]>;
  capabilityEvents(role: string): Promise<readonly unknown[]>;
};

type GeneratedStore = {
  read?: never;
  find(entityKey: string, recordId: string): Promise<StoredOrder | undefined>;
  update(
    entityKey: string,
    recordId: string,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  applyExpectedAggregateVersion(
    input: Readonly<{
      entity: string;
      id: string;
      expectedVersion: number;
      expectedStatus: string;
      nextStatus: string;
    }>,
  ): Promise<boolean>;
  claimTransactionReceipt(
    input: Readonly<{
      scope: string;
      idempotencyKey: string;
      payloadDigest: string;
      leaseDurationMs?: number;
    }>,
  ): Promise<ReceiptClaim>;
  completeTransactionReceipt(
    input: Readonly<{
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
      outcome: TransactionOutcome;
    }>,
  ): Promise<void>;
  markTransactionReceiptRetryable(
    input: Readonly<{
      receiptId: string;
      leaseToken: string;
      leaseEpoch: number;
    }>,
  ): Promise<void>;
  appendCapabilityEvent(event: {
    capability: string;
    [key: string]: unknown;
  }): Promise<void>;
};

type GeneratedModule = {
  readonly applicationRuntime: GeneratedRuntime;
  readonly ApplicationRuntime: new (store?: GeneratedStore) => GeneratedRuntime;
  readonly InMemoryRecordStore: new () => GeneratedStore;
  readonly PrismaRecordStore: new (prisma: unknown) => GeneratedStore;
  readonly createCommerceOrderTransactionOperationAdapter: (
    declaredEvents: readonly string[],
  ) => {
    parseRequest(input: unknown): unknown;
    prepare(request: unknown): Readonly<{
      command: Readonly<Record<string, unknown>>;
      context: unknown;
    }>;
  };
};

function assetLock(asset: (typeof capabilityAssets)[number]) {
  const { key, version, packageRoot, manifestDigest, lifecycle } =
    asset.manifest;
  return { key, version, packageRoot, manifestDigest, lifecycle };
}

const profileCases = [
  {
    profile: "simple-ecommerce",
    role: "shopper",
    orderEntity: "order",
    orderFlow: "ecommerce-order",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "fulfil", "cancel"],
    catalogEntity: "product",
    catalogRecordId: "everyday-tote",
  },
  {
    profile: "retail-counter",
    role: "shopper",
    orderEntity: "counter-sale",
    orderFlow: "counter-sale-flow",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "issue-receipt", "cancel"],
    catalogEntity: "retail-item",
    catalogRecordId: "counter-item-cup",
  },
  {
    profile: "grocery-pickup",
    role: "shopper",
    orderEntity: "pickup-order",
    orderFlow: "pickup-order-flow",
    initialState: "cart",
    declaredEvents: ["submit", "pay", "pick", "ready", "handoff", "cancel"],
    catalogEntity: "grocery-item",
    catalogRecordId: "grocery-item-apples",
  },
] as const satisfies readonly Readonly<{
  profile: CommerceProfile;
  role: string;
  orderEntity: string;
  orderFlow: string;
  initialState: string;
  declaredEvents: readonly string[];
  catalogEntity: string;
  catalogRecordId: string;
}>[];

function directV2Input(profile: CommerceProfile) {
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
        return {
          ...selection,
          lock: assetLock(successorTransaction),
        };
      }
      return selection;
    });
  const compositionLock = createCapabilityCompositionLock({
    graphChecksum: hashApplicationGraph(graph),
    selections: graph.integration.compositionSelections ?? [],
  });
  return { graph, compositionLock };
}

function compile(profile: CommerceProfile) {
  const { graph, compositionLock } = directV2Input(profile);
  return generateApplicationBundle({
    publishedRevisionId: `generic-order-lifecycle-v2-${profile}`,
    graph,
    compositionLock,
  });
}

function typecheckGeneratedReceiptContract(profile: CommerceProfile): string {
  const generatedRoot = resolve(generatedDirectory, `${profile}-type-contract`);
  const virtualSources = new Map<string, string>(
    compile(profile)
      .files.filter((file) => file.path.startsWith("api/src/"))
      .map((file) => [
        normalize(resolve(generatedRoot, file.path)),
        file.content,
      ]),
  );
  const consumerPath = normalize(
    resolve(generatedRoot, "api/src/order-transition-receipt-consumer.ts"),
  );
  virtualSources.set(
    consumerPath,
    [
      'import type { OrderTransitionReceipt } from "./application-runtime.js";',
      "declare const receipt: OrderTransitionReceipt;",
      "type Assert<T extends true> = T;",
      "type InProgressReceipt = Extract<OrderTransitionReceipt, { kind: 'in-progress' }>;",
      "type CompletedReceipt = Extract<OrderTransitionReceipt, { kind: 'completed' }>;",
      "type RequiredRetryDelay = Assert<InProgressReceipt extends { retryAfterMs: number } ? true : false>;",
      "type NoCompletedRetryDelay = Assert<'retryAfterMs' extends keyof CompletedReceipt ? false : true>;",
      "export const retryAfterMs: number = receipt.kind === 'in-progress' ? receipt.retryAfterMs : 0;",
      "export const inProgress: InProgressReceipt = { kind: 'in-progress', receiptId: 'receipt-1', replayed: false, orderId: 'order-1', transition: 'submit', retryAfterMs: 25 };",
    ].join("\n"),
  );

  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(options);
  const baseFileExists = host.fileExists.bind(host);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseReadFile = host.readFile.bind(host);
  host.fileExists = (fileName) =>
    virtualSources.has(normalize(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) =>
    virtualSources.get(normalize(fileName)) ?? baseReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const source = virtualSources.get(normalize(fileName));
    return source === undefined
      ? baseGetSourceFile(fileName, languageVersion, onError, shouldCreate)
      : ts.createSourceFile(fileName, source, languageVersion, true);
  };
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      if (moduleName.startsWith("./") && moduleName.endsWith(".js")) {
        const virtualModule = normalize(
          resolve(dirname(containingFile), moduleName.replace(/\.js$/, ".ts")),
        );
        if (virtualSources.has(virtualModule)) {
          return {
            extension: ts.Extension.Ts,
            resolvedFileName: virtualModule,
          };
        }
      }
      return ts.resolveModuleName(moduleName, containingFile, options, host)
        .resolvedModule;
    });

  const diagnostics = ts
    .getPreEmitDiagnostics(
      ts.createProgram({ rootNames: [consumerPath], options, host }),
    )
    .filter(
      (diagnostic) =>
        diagnostic.file !== undefined &&
        normalize(diagnostic.file.fileName) === consumerPath,
    );
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
}

function typecheckGeneratedOrderAdapter(profile: CommerceProfile): string {
  const generatedRoot = resolve(
    generatedDirectory,
    `${profile}-order-adapter-typecheck`,
  );
  const includedPaths = new Set([
    "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
    "api/src/capabilities/commerce-transaction-executor.ts",
  ]);
  const virtualSources = new Map<string, string>(
    compile(profile)
      .files.filter((file) => includedPaths.has(file.path))
      .map((file) => [
        normalize(resolve(generatedRoot, file.path)),
        file.content,
      ]),
  );
  const adapterPath = normalize(
    resolve(
      generatedRoot,
      "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
    ),
  );
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
  };
  const host = ts.createCompilerHost(options);
  const baseFileExists = host.fileExists.bind(host);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  const baseReadFile = host.readFile.bind(host);
  host.fileExists = (fileName) =>
    virtualSources.has(normalize(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) =>
    virtualSources.get(normalize(fileName)) ?? baseReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const source = virtualSources.get(normalize(fileName));
    return source === undefined
      ? baseGetSourceFile(fileName, languageVersion, onError, shouldCreate)
      : ts.createSourceFile(fileName, source, languageVersion, true);
  };
  host.resolveModuleNames = (moduleNames, containingFile) =>
    moduleNames.map((moduleName) => {
      if (moduleName.startsWith("./") && moduleName.endsWith(".js")) {
        const virtualModule = normalize(
          resolve(dirname(containingFile), moduleName.replace(/\.js$/, ".ts")),
        );
        if (virtualSources.has(virtualModule)) {
          return {
            extension: ts.Extension.Ts,
            resolvedFileName: virtualModule,
          };
        }
      }
      return ts.resolveModuleName(moduleName, containingFile, options, host)
        .resolvedModule;
    });

  const diagnostics = ts
    .getPreEmitDiagnostics(
      ts.createProgram({ rootNames: [adapterPath], options, host }),
    )
    .filter(
      (diagnostic) =>
        diagnostic.file !== undefined &&
        virtualSources.has(normalize(diagnostic.file.fileName)),
    );
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getNewLine: () => "\n",
  });
}

async function runGeneratedOrderAdapterTypecheck(
  profile: CommerceProfile,
): Promise<Readonly<{ exitCode: number | null; output: string }>> {
  await mkdir(generatedDirectory, { recursive: true });
  const directory = await mkdtemp(
    join(generatedDirectory, `${profile}-order-adapter-command-`),
  );
  try {
    const includedPaths = new Set([
      "api/package.json",
      "api/tsconfig.json",
      "api/tsconfig.typecheck.json",
      "api/prisma/schema.prisma",
      "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
      "api/src/capabilities/commerce-transaction-executor.ts",
    ]);
    await Promise.all(
      compile(profile)
        .files.filter((file) => includedPaths.has(file.path))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    await linkLocalDependencyTopology(resolve(directory, "api"));
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    return await new Promise((resolveResult, rejectResult) => {
      const child = spawn(command, ["typecheck"], {
        cwd: resolve(directory, "api"),
        env: {
          ...process.env,
          CHECKPOINT_DISABLE: "1",
          CI: "1",
          PATH: [
            resolve(repositoryRoot, "node_modules/.bin"),
            resolve(repositoryRoot, "packages/compiler/node_modules/.bin"),
            resolve(repositoryRoot, "apps/control-plane/node_modules/.bin"),
            process.env.PATH ?? "",
          ].join(process.platform === "win32" ? ";" : ":"),
          PNPM_DISABLE_SELF_UPDATE_CHECK: "1",
          PRISMA_HIDE_UPDATE_MESSAGE: "1",
          npm_config_offline: "true",
          npm_config_update_notifier: "false",
        },
        shell: process.platform === "win32",
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.on("error", rejectResult);
      child.on("close", (exitCode) => resolveResult({ exitCode, output }));
    });
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function linkLocalDependencyTopology(
  projectDirectory: string,
): Promise<void> {
  const dependencyRoots = {
    "@nestjs/common": "apps/control-plane/node_modules/@nestjs/common",
    "@nestjs/core": "apps/control-plane/node_modules/@nestjs/core",
    "@nestjs/platform-express":
      "apps/control-plane/node_modules/@nestjs/platform-express",
    "@types/node": "node_modules/@types/node",
    casbin: "packages/compiler/node_modules/casbin",
    prisma: "apps/control-plane/node_modules/prisma",
    "reflect-metadata": "apps/control-plane/node_modules/reflect-metadata",
    rxjs: "apps/control-plane/node_modules/rxjs",
    typescript: "node_modules/typescript",
    vitest: "packages/compiler/node_modules/vitest",
    xstate: "packages/compiler/node_modules/xstate",
  } as const;
  const nodeModules = resolve(projectDirectory, "node_modules");
  await mkdir(nodeModules, { recursive: true });
  await Promise.all(
    Object.entries(dependencyRoots).map(async ([dependency, sourcePath]) => {
      const target = resolve(nodeModules, ...dependency.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await symlink(
        await realpath(resolve(repositoryRoot, sourcePath)),
        target,
        "junction",
      );
    }),
  );
  await cp(
    await realpath(
      resolve(repositoryRoot, "apps/control-plane/node_modules/@prisma/client"),
    ),
    resolve(nodeModules, "@prisma/client"),
    { recursive: true, dereference: true },
  );
}

async function runGeneratedProjectCommands(profile: CommerceProfile): Promise<
  Readonly<{
    directory: string;
    buildOutput: string;
    startArtifact: string;
    dockerArtifact: string;
    startArtifactExists: boolean;
    dockerArtifactExists: boolean;
    invalidTestTypecheckOutput: string;
    typecheckOutput: string;
    testOutput: string;
  }>
> {
  const directory = await mkdtemp(
    join(tmpdir(), `factory-${profile}-generated-api-`),
  );
  try {
    const bundle = compile(profile);
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/"))
        .map(async (file) => {
          const path = resolve(directory, file.path.slice("api/".length));
          await mkdir(dirname(path), { recursive: true });
          await writeFile(path, file.content, "utf8");
        }),
    );
    await linkLocalDependencyTopology(directory);
    const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const pathEntries = [
      resolve(repositoryRoot, "node_modules/.bin"),
      resolve(repositoryRoot, "packages/compiler/node_modules/.bin"),
      resolve(repositoryRoot, "apps/control-plane/node_modules/.bin"),
      process.env.PATH ?? "",
    ];
    const environment = {
      ...process.env,
      CHECKPOINT_DISABLE: "1",
      CI: "1",
      PATH: pathEntries.join(process.platform === "win32" ? ";" : ":"),
      PNPM_DISABLE_SELF_UPDATE_CHECK: "1",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      npm_config_offline: "true",
      npm_config_update_notifier: "false",
    };
    const execute = async (command: "build" | "typecheck" | "test") => {
      try {
        const result = await execFileAsync(executable, [command], {
          cwd: directory,
          env: environment,
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === "win32",
          timeout: 120_000,
          windowsHide: true,
        });
        return `${result.stdout}${result.stderr}`;
      } catch (error) {
        const failure = error as Error & {
          stdout?: string;
          stderr?: string;
        };
        throw new Error(
          `${profile} generated API ${command} failed:\n${failure.stdout ?? ""}${failure.stderr ?? ""}`,
          { cause: error },
        );
      }
    };
    const packageJson = JSON.parse(
      await readFile(resolve(directory, "package.json"), "utf8"),
    ) as { scripts: { start: string } };
    const dockerfile = await readFile(resolve(directory, "Dockerfile"), "utf8");
    const startArtifact =
      packageJson.scripts.start.match(/^node (.+)$/)?.[1] ?? "";
    const dockerArtifact =
      dockerfile.match(/CMD \["node", "([^"]+)"\]/)?.[1] ?? "";
    const artifactExists = async (artifact: string): Promise<boolean> => {
      try {
        await access(resolve(directory, artifact));
        return true;
      } catch {
        return false;
      }
    };
    const typecheckOutput = await execute("typecheck");
    const buildOutput = await execute("build");
    const testOutput = await execute("test");
    const journeyPath = resolve(directory, "test/journey.generated.test.ts");
    await writeFile(
      journeyPath,
      `${await readFile(journeyPath, "utf8")}\nconst generatedTypecheckMustCoverTests: string = 1;\n`,
      "utf8",
    );
    let invalidTestTypecheckOutput = "";
    try {
      await execute("typecheck");
    } catch (error) {
      invalidTestTypecheckOutput = (error as Error).message;
    }
    return {
      directory: relative(tmpdir(), directory),
      buildOutput,
      startArtifact,
      dockerArtifact,
      startArtifactExists: await artifactExists(startArtifact),
      dockerArtifactExists: await artifactExists(dockerArtifact),
      invalidTestTypecheckOutput,
      typecheckOutput,
      testOutput,
    };
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function withGeneratedRuntime<T>(
  profile: CommerceProfile,
  run: (runtime: GeneratedRuntime) => Promise<T>,
): Promise<T> {
  return withGeneratedModule(profile, ({ applicationRuntime }) =>
    run(applicationRuntime),
  );
}

async function withGeneratedModule<T>(
  profile: CommerceProfile,
  run: (module: GeneratedModule) => Promise<T>,
  options: Readonly<{
    bundle?: ReturnType<typeof compile>;
    transformSource?: (path: string, content: string) => string;
  }> = {},
): Promise<T> {
  await mkdir(generatedDirectory, { recursive: true });
  const directory = await mkdtemp(join(generatedDirectory, `${profile}-`));
  try {
    const bundle = options.bundle ?? compile(profile);
    await Promise.all(
      bundle.files
        .filter((file) => file.path.startsWith("api/src/"))
        .map(async (file) => {
          const path = resolve(directory, file.path);
          await mkdir(dirname(path), { recursive: true });
          await writeFile(
            path,
            options.transformSource?.(file.path, file.content) ?? file.content,
            "utf8",
          );
        }),
    );
    const runtimeModule = await import(
      pathToFileURL(resolve(directory, "api/src/application-runtime.ts")).href
    );
    const adapterModule = await import(
      pathToFileURL(
        resolve(
          directory,
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts",
        ),
      ).href
    );
    const prismaModule = await import(
      pathToFileURL(resolve(directory, "api/src/prisma-record-store.ts")).href
    );
    return await run({
      ...runtimeModule,
      ...adapterModule,
      ...prismaModule,
    } as GeneratedModule);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

describe("Generic order lifecycle V2 compilation", () => {
  it.each(profileCases)(
    "$profile newly composed Draft selects the accepted successor pair before Publish",
    ({ profile }) => {
      const graph = composeDefaultCapabilityDraft({ profile }).graph;
      const selectedVersions = Object.fromEntries(
        (graph.integration.compositionSelections ?? [])
          .filter(({ lock }) =>
            ["commerce.order", "commerce.transaction"].includes(lock.key),
          )
          .map(({ lock }) => [lock.key, lock.version]),
      );
      expect(selectedVersions).toEqual({
        "commerce.order": "2.1.2",
        "commerce.transaction": "2.2.1",
      });
    },
  );

  it.each(profileCases)(
    "$profile emits a bound-entity and bound-Flow generated journey",
    ({ profile, role, orderEntity, orderFlow }) => {
      const files = Object.fromEntries(
        compile(profile).files.map((file) => [file.path, file.content]),
      );
      const journey = files["api/test/journey.generated.test.ts"]!;

      expect(journey).toContain(
        `applicationRuntime.create(${JSON.stringify(role)}, ${JSON.stringify(orderEntity)}`,
      );
      expect(journey).not.toContain('"id"');
      expect(journey).not.toContain('"status"');
      expect(journey).not.toContain('"version"');
      expect(journey).toContain("expectedVersion: 0");
      expect(journey).toContain('idempotencyKey: "generated-submit-1"');
      expect(
        files[
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts"
        ],
      ).toContain(`flowId: ${JSON.stringify(orderFlow)}`);
    },
  );

  it.each(profileCases)(
    "$profile generated API builds its start artifact, passes strict typecheck, and runs its own tests",
    async ({ profile }) => {
      const result = await runGeneratedProjectCommands(profile);

      expect(result.directory).toMatch(
        new RegExp(`^factory-${profile}-generated-api-`),
      );
      expect(result.typecheckOutput).toContain("Generated Prisma Client");
      expect(result.typecheckOutput).not.toContain("P1012");
      expect(result.typecheckOutput).not.toContain("error TS");
      expect(result.buildOutput).toContain("> tsc -p tsconfig.json");
      expect(result.startArtifact).toBe("dist/main.js");
      expect(result.dockerArtifact).toBe(result.startArtifact);
      expect(result.startArtifactExists).toBe(true);
      expect(result.dockerArtifactExists).toBe(true);
      expect(result.testOutput).toContain("Test Files");
      expect(result.invalidTestTypecheckOutput).toContain(
        "test/journey.generated.test.ts",
      );
      expect(result.invalidTestTypecheckOutput).toContain("error TS2322");
    },
    120_000,
  );

  it("rejects the revoked Order V2 lock before contribution resolution", () => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    const revokedOrder = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.1.0",
    )!;
    const revokedLock = {
      ...compositionLock,
      packages: compositionLock.packages.map((selection) =>
        selection.lock.key === "commerce.order"
          ? { ...selection, lock: assetLock(revokedOrder) }
          : selection,
      ),
    };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "revoked-order-v2",
        graph,
        compositionLock: revokedLock,
      }),
    ).toThrow(
      "commerce.order@2.1.0 is revoked: fixed event vocabulary excludes bound Flow events",
    );
  });

  it("rejects the strict-TypeScript-unsafe Order V2 lock before contribution resolution", () => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    const revokedOrder = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.order" && manifest.version === "2.1.1",
    )!;
    const revokedLock = {
      ...compositionLock,
      packages: compositionLock.packages.map((selection) =>
        selection.lock.key === "commerce.order"
          ? { ...selection, lock: assetLock(revokedOrder) }
          : selection,
      ),
    };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "strict-typescript-unsafe-order-v2",
        graph,
        compositionLock: revokedLock,
      }),
    ).toThrow(
      "commerce.order@2.1.1 is revoked: generated strict TypeScript reports implicit any",
    );
  });

  it("rejects the revoked Transaction V2 lock before contribution resolution", () => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    const revokedTransaction = capabilityAssets.find(
      ({ manifest }) =>
        manifest.key === "commerce.transaction" && manifest.version === "2.2.0",
    )!;
    const revokedLock = {
      ...compositionLock,
      packages: compositionLock.packages.map((selection) =>
        selection.lock.key === "commerce.transaction"
          ? { ...selection, lock: assetLock(revokedTransaction) }
          : selection,
      ),
    };

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "revoked-transaction-v2",
        graph,
        compositionLock: revokedLock,
      }),
    ).toThrow(
      "commerce.transaction@2.2.0 is revoked: PostgreSQL index identifier exceeds 63 bytes",
    );
  });

  it("publishes a discriminated transition receipt with a required retry delay", () => {
    expect(typecheckGeneratedReceiptContract("simple-ecommerce")).toBe("");
  });

  it("emits an order adapter that passes its generated API strict TypeScript boundary", () => {
    expect(typecheckGeneratedOrderAdapter("simple-ecommerce")).toBe("");
  });

  it("passes the generated adapter package's own strict TypeScript command", async () => {
    const result = await runGeneratedOrderAdapterTypecheck("simple-ecommerce");

    expect(result.exitCode, result.output).toBe(0);
  }, 30_000);

  it.each(profileCases)(
    "$profile creates and transitions through the exact locked V2 lifecycle",
    async ({
      profile,
      role,
      orderEntity,
      initialState,
      catalogEntity,
      catalogRecordId,
    }) => {
      await withGeneratedRuntime(profile, async (runtime) => {
        const order = await runtime.create(role, orderEntity, {});

        expect(order).toMatchObject({
          id: expect.stringMatching(new RegExp(`^${orderEntity}-`)),
          status: initialState,
          version: 0,
        });
        await expect(
          runtime.read(role, orderEntity, order.id),
        ).resolves.toEqual(order);
        await runtime.addCartItem(role, orderEntity, order.id, {
          catalogEntity,
          catalogRecordId,
          quantity: 1,
        });

        const receipt = await runtime.transition(
          role,
          orderEntity,
          order.id,
          "submit",
          {
            expectedVersion: 0,
            idempotencyKey: `${profile}-submit-1`,
          },
        );

        expect(receipt).toMatchObject({
          kind: "completed",
          receiptId: expect.any(String),
          replayed: false,
          orderId: order.id,
          transition: "submit",
        });
        await expect(
          runtime.read(role, orderEntity, order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
      });
    },
    30_000,
  );

  it("replays the same completed submission and rejects a changed payload", async () => {
    await withGeneratedRuntime("simple-ecommerce", async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });
      const options = {
        expectedVersion: 0,
        idempotencyKey: "replay-submit-1",
      } as const;

      const first = await runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        options,
      );
      const replayedTransition = runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        options,
      );
      await expect(replayedTransition).resolves.toMatchObject({
        replayed: true,
      });
      const changedPayloadTransition = runtime.transition(
        "shopper",
        "order",
        order.id,
        "submit",
        {
          ...options,
          expectedVersion: 1,
        },
      );
      await expect(changedPayloadTransition).rejects.toThrow(
        "idempotency payload mismatch",
      );
    });
  });

  it("rejects a stale version without changing the aggregate or inventory", async () => {
    await withGeneratedRuntime("simple-ecommerce", async (runtime) => {
      const order = await runtime.create("shopper", "order", {});
      await runtime.addCartItem("shopper", "order", order.id, {
        catalogEntity: "product",
        catalogRecordId: "everyday-tote",
        quantity: 1,
      });

      await expect(
        runtime.transition("shopper", "order", order.id, "submit", {
          expectedVersion: 1,
          idempotencyKey: "stale-submit-1",
        }),
      ).rejects.toThrow("stale aggregate version");
      await expect(
        runtime.read("shopper", "order", order.id),
      ).resolves.toMatchObject({ status: "cart", version: 0 });
      await expect(
        runtime.read("shopper", "product", "everyday-tote"),
      ).resolves.toMatchObject({ stock: 20 });
    });
  });

  it("returns in-progress for a duplicate while the first owner holds the lease", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ ApplicationRuntime, InMemoryRecordStore }) => {
        let releaseAggregate!: () => void;
        let aggregateEntered!: () => void;
        const aggregateBlocked = new Promise<void>((resolveBlocked) => {
          aggregateEntered = resolveBlocked;
        });
        const aggregateRelease = new Promise<void>((resolveRelease) => {
          releaseAggregate = resolveRelease;
        });
        const BaseStore = InMemoryRecordStore;
        class BlockingStore extends BaseStore {
          private blockOnce = true;

          override async applyExpectedAggregateVersion(input: {
            entity: string;
            id: string;
            expectedVersion: number;
            expectedStatus: string;
            nextStatus: string;
          }): Promise<boolean> {
            if (this.blockOnce && input.nextStatus === "submitted") {
              this.blockOnce = false;
              aggregateEntered();
              await aggregateRelease;
            }
            return super.applyExpectedAggregateVersion(input);
          }
        }

        const runtime = new ApplicationRuntime(new BlockingStore());
        const order = await runtime.create("shopper", "order", {});
        await runtime.addCartItem("shopper", "order", order.id, {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          quantity: 1,
        });
        const options = {
          expectedVersion: 0,
          idempotencyKey: "pending-submit-1",
        } as const;
        const first = runtime.transition(
          "shopper",
          "order",
          order.id,
          "submit",
          options,
        );
        await aggregateBlocked;
        const secondTransition = runtime.transition(
          "shopper",
          "order",
          order.id,
          "submit",
          options,
        );
        await expect(secondTransition).resolves.toMatchObject({
          kind: "in-progress",
          retryAfterMs: expect.any(Number),
        });
        releaseAggregate();
        const completed = await first;

        expect(completed).toMatchObject({ kind: "completed", replayed: false });
        await expect(
          runtime.read("shopper", "order", order.id),
        ).resolves.toMatchObject({ status: "submitted", version: 1 });
      },
    );
  });

  it("rotates an expired lease and rejects completion by the stale owner", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ InMemoryRecordStore }) => {
        const store = new InMemoryRecordStore();
        const input = {
          scope: "order:expired-1",
          idempotencyKey: "expired-submit-1",
          payloadDigest: `sha256:${"a".repeat(64)}`,
          leaseDurationMs: 1,
        } as const;
        const first = await store.claimTransactionReceipt(input);
        expect(first).toMatchObject({
          kind: "claimed",
          leaseEpoch: 1,
          leaseToken: expect.any(String),
        });
        if (first.kind !== "claimed") throw new Error("expected first claim");

        await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));
        const takeover = await store.claimTransactionReceipt(input);
        expect(takeover).toMatchObject({
          kind: "claimed",
          leaseEpoch: 2,
          leaseToken: expect.not.stringMatching(first.leaseToken),
        });
        if (takeover.kind !== "claimed") throw new Error("expected takeover");

        const outcome: TransactionOutcome = {
          aggregateEntity: "order",
          aggregateId: "expired-1",
          aggregateVersion: 1,
          actorRole: "shopper",
          payloadDigest: input.payloadDigest,
          event: "submit",
          flowId: "ecommerce-order",
        };
        const staleOwner = {
          completeReceipt: () =>
            store.completeTransactionReceipt({
              receiptId: first.receiptId,
              leaseToken: first.leaseToken,
              leaseEpoch: first.leaseEpoch,
              outcome,
            }),
        };
        await expect(staleOwner.completeReceipt()).rejects.toThrow(
          "lease ownership",
        );
        await store.completeTransactionReceipt({
          receiptId: takeover.receiptId,
          leaseToken: takeover.leaseToken,
          leaseEpoch: takeover.leaseEpoch,
          outcome,
        });
        await expect(
          store.claimTransactionReceipt(input),
        ).resolves.toMatchObject({ kind: "completed", outcome });
      },
    );
  });

  it("keeps flow identity separate from the order event at the package adapter boundary", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ createCommerceOrderTransactionOperationAdapter }) => {
        const commerceOrderTransactionOperationAdapter =
          createCommerceOrderTransactionOperationAdapter([
            "submit",
            "pay",
            "fulfil",
            "cancel",
          ]);
        const prepared = commerceOrderTransactionOperationAdapter.prepare(
          commerceOrderTransactionOperationAdapter.parseRequest({
            orderId: "order-1",
            expectedVersion: 0,
            expectedState: "cart",
            event: "submit",
            idempotencyKey: "submit-command-shape-1",
            payloadDigest: `sha256:${"b".repeat(64)}`,
          }),
        );

        expect(Object.keys(prepared.command).sort()).toEqual([
          "aggregate",
          "event",
          "flowId",
          "idempotency",
        ]);
        expect(prepared.command).toMatchObject({
          flowId: "ecommerce-order",
          event: "submit",
          aggregate: {
            entity: "order",
            id: "order-1",
            expectedVersion: 0,
            expectedState: "cart",
          },
          idempotency: {
            scope: "order:order-1",
            key: "submit-command-shape-1",
          },
        });
      },
    );
  });

  it("validates bound Flow effects before invoking the package adapter", async () => {
    const { graph } = directV2Input("simple-ecommerce");
    graph.integration.providers = [
      ...graph.integration.providers,
      { id: "mail", type: "email", version: "1.0.0" },
    ];
    graph.integration.capabilities = [
      ...graph.integration.capabilities,
      { key: "email.send", providerId: "mail", operation: "send" },
    ];
    graph.flow.flows = graph.flow.flows.map((flow) =>
      flow.id === "ecommerce-order"
        ? {
            ...flow,
            transitions: flow.transitions.map((transition) =>
              transition.event === "submit"
                ? {
                    ...transition,
                    effects: [{ capability: "email.send", operation: "send" }],
                  }
                : transition,
            ),
          }
        : flow,
    );
    const compositionLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: graph.integration.compositionSelections ?? [],
    });
    const bundle = generateApplicationBundle({
      publishedRevisionId: "flow-effects-before-order-adapter",
      graph,
      compositionLock,
    });
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ applicationRuntime }) => {
        const order = await applicationRuntime.create("shopper", "order", {});

        await expect(
          applicationRuntime.transition(
            "shopper",
            "order",
            order.id,
            "submit",
            {
              expectedVersion: 0,
              idempotencyKey: "flow-effects-before-order-adapter-1",
            },
          ),
        ).rejects.toThrow(
          "External provider capability 'email.send' requires an activated adapter for provider 'mail'.",
        );
      },
      {
        bundle,
        transformSource: (path, content) =>
          path ===
          "api/src/capabilities/commerce-order-transaction-operation-adapter.ts"
            ? content.replace(
                "    parseRequest(input: unknown): CommerceOrderTransactionRequestV2 {",
                '    parseRequest(input: unknown): CommerceOrderTransactionRequestV2 {\n      throw new Error("package adapter invoked before Flow effect validation");',
              )
            : content,
      },
    );

    const runtimeSource = bundle.files.find(
      ({ path }) => path === "api/src/application-runtime.ts",
    )!.content;
    const effectValidationOffset = runtimeSource.indexOf(
      "const effects = this.declaredFactoryEffects(transition.effects);",
    );
    const adapterInvocationOffset = runtimeSource.indexOf(
      "commerceOrderTransactionOperationAdapter.parseRequest",
    );

    expect(effectValidationOffset).toBeGreaterThan(-1);
    expect(adapterInvocationOffset).toBeGreaterThan(effectValidationOffset);
  });

  it("rejects invalid factory event lists and caller-provided API allowlists", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ createCommerceOrderTransactionOperationAdapter }) => {
        for (const declaredEvents of [
          [],
          ["submit", "submit"],
          ["submit", 1],
          Array.from({ length: 129 }, (_, index) => `event-${index}`),
        ] as unknown as readonly string[][]) {
          expect(() =>
            createCommerceOrderTransactionOperationAdapter(declaredEvents),
          ).toThrow("Order Flow event list");
        }

        const originalEvents = ["submit"];
        const adapter =
          createCommerceOrderTransactionOperationAdapter(originalEvents);
        originalEvents.push("caller-added");
        const request = {
          orderId: "order-1",
          expectedVersion: 0,
          expectedState: "cart",
          idempotencyKey: "bound-event-1",
          payloadDigest: `sha256:${"c".repeat(64)}`,
        } as const;
        expect(() =>
          adapter.parseRequest({
            ...request,
            event: "caller-added",
          }),
        ).toThrow("Order transition is not declared.");
        expect(() =>
          adapter.parseRequest({
            ...request,
            event: "submit",
            allowedEvents: ["caller-added"],
          }),
        ).toThrow("Order transition contains undeclared fields.");
      },
    );
  });

  it.each([
    {
      name: "targets a different entity",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        graph.flow.flows.find(({ id }) => id === "ecommerce-order")!.entity =
          "product";
      },
      expected: "must target bound order entity",
    },
    {
      name: "declares no events",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        const flow = graph.flow.flows.find(
          ({ id }) => id === "ecommerce-order",
        )!;
        flow.events = [];
        flow.transitions = [];
      },
      expected: "must declare at least one event",
    },
    {
      name: "declares a duplicate event",
      mutate: (graph: ReturnType<typeof directV2Input>["graph"]) => {
        const flow = graph.flow.flows.find(
          ({ id }) => id === "ecommerce-order",
        )!;
        flow.events = [...flow.events, "submit"];
      },
      expected: "must declare unique events",
    },
  ])("rejects a bound order Flow that $name", ({ mutate, expected }) => {
    const { graph, compositionLock } = directV2Input("simple-ecommerce");
    mutate(graph);
    const reboundLock = createCapabilityCompositionLock({
      graphChecksum: hashApplicationGraph(graph),
      selections: compositionLock.packages,
    });

    expect(() =>
      generateApplicationBundle({
        publishedRevisionId: "invalid-bound-order-flow",
        graph,
        compositionLock: reboundLock,
      }),
    ).toThrow(expected);
  });

  it("uses one Prisma updateMany CAS constrained by id, version, and status", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ PrismaRecordStore }) => {
        const calls: unknown[] = [];
        const updateMany = vi.fn(async (input: unknown) => {
          calls.push(input);
          return { count: 1 };
        });
        const store = new PrismaRecordStore({
          order: { updateMany },
        });

        await expect(
          store.applyExpectedAggregateVersion({
            entity: "order",
            id: "order-1",
            expectedVersion: 3,
            expectedStatus: "cart",
            nextStatus: "submitted",
          }),
        ).resolves.toBe(true);
        expect(calls).toEqual([
          {
            where: { id: "order-1", version: 3, status: "cart" },
            data: { status: "submitted", version: { increment: 1 } },
          },
        ]);

        updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(
          store.applyExpectedAggregateVersion({
            entity: "order",
            id: "order-1",
            expectedVersion: 3,
            expectedStatus: "cart",
            nextStatus: "submitted",
          }),
        ).resolves.toBe(false);
      },
    );
  });

  it("rolls back aggregate, inventory, audit, outbox, and receipt on failure", async () => {
    await withGeneratedModule(
      "simple-ecommerce",
      async ({ ApplicationRuntime, InMemoryRecordStore }) => {
        const BaseStore = InMemoryRecordStore;
        class FailingOutboxStore extends BaseStore {
          private failOnce = true;

          override async appendCapabilityEvent(event: {
            capability: string;
            [key: string]: unknown;
          }): Promise<void> {
            if (this.failOnce && event.capability === "inventory.reserve") {
              this.failOnce = false;
              throw new Error("outbox unavailable");
            }
            return super.appendCapabilityEvent(event);
          }
        }

        const runtime = new ApplicationRuntime(new FailingOutboxStore());
        const order = await runtime.create("shopper", "order", {});
        await runtime.addCartItem("shopper", "order", order.id, {
          catalogEntity: "product",
          catalogRecordId: "everyday-tote",
          quantity: 1,
        });
        const auditBefore = await runtime.auditLog("merchant");
        const outboxBefore = await runtime.capabilityEvents("merchant");
        const options = {
          expectedVersion: 0,
          idempotencyKey: "rollback-submit-1",
        } as const;

        await expect(
          runtime.transition("shopper", "order", order.id, "submit", options),
        ).rejects.toThrow("outbox unavailable");
        await expect(
          runtime.read("shopper", "order", order.id),
        ).resolves.toMatchObject({ status: "cart", version: 0 });
        await expect(
          runtime.read("shopper", "product", "everyday-tote"),
        ).resolves.toMatchObject({ stock: 20 });
        await expect(runtime.auditLog("merchant")).resolves.toEqual(
          auditBefore,
        );
        await expect(runtime.capabilityEvents("merchant")).resolves.toEqual(
          outboxBefore,
        );
        await expect(
          runtime.transition("shopper", "order", order.id, "submit", options),
        ).resolves.toMatchObject({ replayed: false });
      },
    );
  });

  it.each(profileCases)(
    "$profile activates the direct-composable Transaction Command V2 schema, migration, and TypeScript imports",
    ({ profile, declaredEvents }) => {
      const files = Object.fromEntries(
        compile(profile).files.map((file) => [file.path, file.content]),
      );

      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-order-create-handler.js"',
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-order-transaction-operation-adapter.js"',
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        `createCommerceOrderTransactionOperationAdapter(${JSON.stringify(declaredEvents)})`,
      );
      expect(files["api/src/application-runtime.ts"]).not.toContain(
        "event === 'pay' ? 'confirm'",
      );
      expect(files["api/src/application-runtime.ts"]).not.toContain(
        "event === 'fulfil' ? 'fulfill'",
      );
      expect(files["api/src/application-runtime.ts"]).toContain(
        'from "./capabilities/commerce-transaction-executor.js"',
      );
      expect(files["api/prisma/schema.prisma"]).toContain(
        "model CommerceTransactionReceipt",
      );
      expect(files["database/prisma/schema.prisma"]).toContain(
        "model CommerceAggregateVersion",
      );
      expect(
        files["database/prisma/migrations/0001_initial/migration.sql"],
      ).toContain('CREATE TABLE "CommerceTransactionReceipt"');
      for (const indexName of [
        "CommerceTransactionReceipt_state_leaseExpiresAt_idx",
        "ctx_receipt_aggregate_v_idx",
        "CommerceAggregateVersion_entity_aggregateId_version_idx",
      ]) {
        expect(files["database/prisma/schema.prisma"]).toContain(indexName);
        expect(
          files["database/prisma/migrations/0001_initial/migration.sql"],
        ).toContain(indexName);
      }
      expect(files["api/src/prisma-record-store.ts"]).toContain("updateMany");
      expect(files).not.toHaveProperty(
        "database/prisma/fragments/commerce-transaction.prisma",
      );
      expect(files).not.toHaveProperty(
        "database/prisma/migrations/commerce-transaction.sql",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getCatalogHandler",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getCartHandler",
      );
      expect(files["api/src/capabilities/registry.ts"]).toContain(
        "getLineConfigurationHandler",
      );
    },
  );
});

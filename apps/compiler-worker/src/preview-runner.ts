import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, readdir, rm, writeFile } from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  join,
  posix,
  relative,
  resolve,
  sep,
  win32,
} from "node:path";

import type { PreviewDispatch } from "./preview-dispatch-client.js";

export type PreviewRuntimeRequest = Omit<PreviewDispatch, "action">;

export type StartedPreview = {
  readonly webPort: number;
  readonly apiPort: number;
  readonly previewUrl: string;
};

export type PreviewFailureCode =
  | "preview_start_failed"
  | "preview_start_timeout"
  | "preview_start_cancelled"
  | "preview_stop_failed"
  | "preview_health_check_failed";

export class PreviewRunFailure extends Error {
  constructor(readonly code: PreviewFailureCode) {
    super(
      code === "preview_health_check_failed"
        ? "Preview health check failed."
        : "Preview run failed.",
    );
  }
}

export type PreviewProcessCommand = {
  readonly file: "docker";
  readonly args: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
};

export type PreviewProcessRunner = (
  command: PreviewProcessCommand,
  signal: AbortSignal,
) => Promise<string | undefined>;

export type PreviewOperationOptions = {
  readonly operationTimeoutMs: number;
  readonly readinessTimeoutMs?: number;
};

const defaultOperationOptions: PreviewOperationOptions = {
  operationTimeoutMs: 600_000,
};
const previewHealthRetryDelayMs = 250;
const maximumPreviewHealthWaitMs = 30_000;
const previewDirectoryRemovalRetryCount = 3;
const previewDirectoryRemovalRetryDelayMs = 25;
const transientPreviewDirectoryRemovalCodes = new Set([
  "EBUSY",
  "ENOTEMPTY",
  "EPERM",
]);

function previewHealthWaitMs(options: PreviewOperationOptions): number {
  return Math.min(
    options.operationTimeoutMs,
    options.readinessTimeoutMs ?? maximumPreviewHealthWaitMs,
    maximumPreviewHealthWaitMs,
  );
}

function isInside(parent: string, candidate: string): boolean {
  const fromParent = relative(parent, candidate);
  return (
    fromParent !== "" &&
    !fromParent.startsWith(`..${sep}`) &&
    fromParent !== ".." &&
    !isAbsolute(fromParent)
  );
}

function generatedDirectory(
  artifactRoot: string,
  rootDirectory: string,
): string {
  const root = resolve(artifactRoot);
  const directory = resolve(root, rootDirectory);
  if (!isInside(root, directory))
    throw new Error(
      "Generated preview directory is outside the Factory artifact root.",
    );
  return directory;
}

function previewDirectory(artifactRoot: string, previewRunId: string): string {
  if (!/^preview-[a-z0-9-]+$/.test(previewRunId))
    throw new Error("Preview directory must be Factory-derived.");
  return generatedDirectory(artifactRoot, `.preview-runs/${previewRunId}`);
}

function factoryProjectName(request: PreviewRuntimeRequest): string {
  const expected = `factory-preview-${request.previewRunId}`;
  if (
    request.composeProjectName !== expected ||
    !/^factory-preview-preview-[a-z0-9-]+$/.test(expected)
  ) {
    throw new Error("Preview Compose project must be Factory-derived.");
  }
  return expected;
}

function composeCommand(
  directory: string,
  composeFile: string,
  project: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
): PreviewProcessCommand {
  return {
    file: "docker",
    args: [
      "compose",
      "--file",
      composeFile,
      "--project-name",
      project,
      "--project-directory",
      directory,
      ...args,
    ],
    environment,
  };
}

export function createDockerComposeRunner(
  spawnProcess: typeof spawn,
): PreviewProcessRunner {
  return async ({ file, args, environment }, signal) => {
    if (signal.aborted) throw previewAbortReason(signal.reason);
    return new Promise<string>((resolvePromise, reject) => {
      const child = spawnProcess(file, [...args], {
        env: environment,
        shell: false,
        stdio: ["ignore", "pipe", "ignore"],
      });
      let stdout = "";
      let abortReason: PreviewRunFailure | undefined;
      let forceKill: NodeJS.Timeout | undefined;
      const onAbort = () => {
        abortReason = previewAbortReason(signal.reason);
        child.kill("SIGTERM");
        forceKill = setTimeout(() => child.kill("SIGKILL"), 1_000);
        forceKill.unref();
      };
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
      });
      signal.addEventListener("abort", onAbort, { once: true });
      const onError = () => {
        if (abortReason) return;
        signal.removeEventListener("abort", onAbort);
        child.removeListener("error", onError);
        reject(new Error("Preview Docker operation failed."));
      };
      child.on("error", onError);
      child.once("exit", (code) => {
        signal.removeEventListener("abort", onAbort);
        child.removeListener("error", onError);
        if (forceKill) clearTimeout(forceKill);
        if (abortReason) {
          reject(abortReason);
        } else if (code === 0) {
          resolvePromise(stdout);
        } else {
          reject(new Error("Preview Docker operation failed."));
        }
      });
    });
  };
}

function isTransientPreviewDirectoryRemovalError(error: unknown): boolean {
  return (
    error instanceof Error &&
    transientPreviewDirectoryRemovalCodes.has(
      (error as NodeJS.ErrnoException).code ?? "",
    )
  );
}

function waitForPreviewDirectoryRemovalRetry(delayMs: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, delayMs);
  });
}

async function removePreviewDirectory(directory: string): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rm(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (
        !isTransientPreviewDirectoryRemovalError(error) ||
        attempt === previewDirectoryRemovalRetryCount
      ) {
        throw error;
      }
      await waitForPreviewDirectoryRemovalRetry(
        previewDirectoryRemovalRetryDelayMs * 2 ** attempt,
      );
    }
  }
}

export const runDockerCompose = createDockerComposeRunner(spawn);

function previewAbortReason(reason: unknown): PreviewRunFailure {
  return reason instanceof PreviewRunFailure &&
    (reason.code === "preview_start_timeout" ||
      reason.code === "preview_start_cancelled" ||
      reason.code === "preview_stop_failed")
    ? reason
    : new PreviewRunFailure("preview_start_cancelled");
}

async function runPreviewOperation(
  processRunner: PreviewProcessRunner,
  command: PreviewProcessCommand,
  operationTimeoutMs: number,
  timeoutCode: "preview_start_timeout" | "preview_stop_failed",
  cancellationSignal?: AbortSignal,
): Promise<string | undefined> {
  const operation = new AbortController();
  const cancel = () =>
    operation.abort(new PreviewRunFailure("preview_start_cancelled"));
  if (cancellationSignal?.aborted) cancel();
  else cancellationSignal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(
    () => operation.abort(new PreviewRunFailure(timeoutCode)),
    operationTimeoutMs,
  );
  try {
    return await processRunner(command, operation.signal);
  } catch (error) {
    if (operation.signal.aborted)
      throw previewAbortReason(operation.signal.reason);
    throw error;
  } finally {
    clearTimeout(timeout);
    cancellationSignal?.removeEventListener("abort", cancel);
  }
}

function waitForPreviewRetry(
  delayMs: number,
  cancellationSignal: AbortSignal,
): Promise<void> {
  if (cancellationSignal.aborted)
    return Promise.reject(previewAbortReason(cancellationSignal.reason));
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      cancellationSignal.removeEventListener("abort", onAbort);
      resolvePromise();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      cancellationSignal.removeEventListener("abort", onAbort);
      reject(previewAbortReason(cancellationSignal.reason));
    };
    cancellationSignal.addEventListener("abort", onAbort, { once: true });
  });
}

async function waitForWebReadiness(
  processRunner: PreviewProcessRunner,
  command: PreviewProcessCommand,
  operationTimeoutMs: number,
  cancellationSignal: AbortSignal,
): Promise<void> {
  const deadline = Date.now() + operationTimeoutMs;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0)
      throw new PreviewRunFailure("preview_health_check_failed");
    try {
      await runPreviewOperation(
        processRunner,
        command,
        remaining,
        "preview_start_timeout",
        cancellationSignal,
      );
      return;
    } catch (error) {
      if (
        error instanceof PreviewRunFailure &&
        (error.code === "preview_start_timeout" ||
          error.code === "preview_start_cancelled")
      ) {
        throw error;
      }
      const retryDelay = Math.min(
        previewHealthRetryDelayMs,
        Math.max(0, deadline - Date.now()),
      );
      if (retryDelay === 0)
        throw new PreviewRunFailure("preview_health_check_failed");
      await waitForPreviewRetry(retryDelay, cancellationSignal);
    }
  }
}

type ActivePreviewStart = {
  readonly controller: AbortController;
  readonly settled: Promise<void>;
  settle(): void;
};

const activePreviewStarts = new Map<string, ActivePreviewStart>();

function activePreviewStart(): ActivePreviewStart {
  let settle: () => void = () => undefined;
  const settled = new Promise<void>((resolvePromise) => {
    settle = resolvePromise;
  });
  return { controller: new AbortController(), settled, settle };
}

function dockerLoopbackPort(output: string | undefined): number {
  const match = /^127\.0\.0\.1:(\d+)\s*$/.exec(output ?? "");
  if (!match) throw new Error("Docker did not report a loopback preview port.");
  return Number(match[1]);
}

type VerifiedArtifact = {
  readonly path: string;
  readonly contents: Buffer;
};

type ArtifactEvidence = PreviewRuntimeRequest["artifacts"][number];

const restaurantDemoTokenComposeContract =
  'RESTAURANT_DEMO_TABLE_TOKEN: "${RESTAURANT_DEMO_TABLE_TOKEN:?Set RESTAURANT_DEMO_TABLE_TOKEN for local demo bootstrap}"';

function safeArtifactManifest(
  artifacts: PreviewRuntimeRequest["artifacts"],
): PreviewRuntimeRequest["artifacts"] {
  if (!Array.isArray(artifacts)) throw new Error("Invalid artifact manifest.");
  const paths = new Set<string>();
  for (const artifact of artifacts) {
    if (
      !artifact ||
      typeof artifact !== "object" ||
      typeof artifact.path !== "string" ||
      artifact.path.length === 0 ||
      posix.isAbsolute(artifact.path) ||
      win32.isAbsolute(artifact.path) ||
      win32.parse(artifact.path).root.length > 0 ||
      artifact.path.includes("\\") ||
      artifact.path
        .split("/")
        .some(
          (segment: string) =>
            segment === "" || segment === "." || segment === "..",
        ) ||
      typeof artifact.digest !== "string" ||
      !/^sha256:[a-f0-9]{64}$/.test(artifact.digest) ||
      typeof artifact.sizeBytes !== "number" ||
      !Number.isSafeInteger(artifact.sizeBytes) ||
      artifact.sizeBytes < 0 ||
      paths.has(artifact.path)
    ) {
      throw new Error("Invalid artifact manifest.");
    }
    paths.add(artifact.path);
  }
  if (!paths.has("docker-compose.yml"))
    throw new Error("Invalid artifact manifest.");
  return artifacts;
}

async function walkRegularFiles(
  directory: string,
  relativeDirectory = "",
): Promise<string[]> {
  const entries = await readdir(join(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const paths: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = relativeDirectory
      ? posix.join(relativeDirectory, entry.name)
      : entry.name;
    if (entry.isSymbolicLink()) throw new Error("Invalid artifact source.");
    if (entry.isDirectory()) {
      paths.push(...(await walkRegularFiles(directory, path)));
      continue;
    }
    if (!entry.isFile()) throw new Error("Invalid artifact source.");
    paths.push(path);
  }
  return paths;
}

function samePaths(actual: readonly string[], expected: readonly string[]) {
  const actualPaths = new Set(actual);
  return (
    actualPaths.size === expected.length &&
    expected.every((path) => actualPaths.has(path))
  );
}

function noFollowFlag(): number {
  return "O_NOFOLLOW" in constants
    ? (constants as typeof constants & { O_NOFOLLOW: number }).O_NOFOLLOW
    : 0;
}

async function verifiedArtifactContents(
  path: string,
  artifact: ArtifactEvidence,
): Promise<Buffer> {
  const sourceEntry = await lstat(path);
  if (sourceEntry.isSymbolicLink() || !sourceEntry.isFile())
    throw new Error("Invalid artifact source.");
  const handle = await open(path, constants.O_RDONLY | noFollowFlag());
  try {
    const openedEntry = await handle.stat();
    if (!openedEntry.isFile()) throw new Error("Invalid artifact source.");
    const contents = await handle.readFile();
    const digest = `sha256:${createHash("sha256")
      .update(contents)
      .digest("hex")}`;
    if (
      contents.byteLength !== artifact.sizeBytes ||
      digest !== artifact.digest
    ) {
      throw new Error("Invalid artifact source.");
    }
    return contents;
  } finally {
    await handle.close();
  }
}

async function verifyComposeArtifact(
  composeFile: string,
  artifacts: PreviewRuntimeRequest["artifacts"],
): Promise<void> {
  const manifest = safeArtifactManifest(artifacts);
  const composeArtifact = manifest.find(
    (artifact) => artifact.path === "docker-compose.yml",
  );
  if (!composeArtifact) throw new Error("Invalid artifact manifest.");
  await verifiedArtifactContents(composeFile, composeArtifact);
}

async function previewEnvironment(
  composeFile: string,
  artifacts: PreviewRuntimeRequest["artifacts"],
  project: string,
  includePorts: boolean,
  missingTokenFailure: PreviewFailureCode,
): Promise<Readonly<Record<string, string>>> {
  const manifest = safeArtifactManifest(artifacts);
  const composeArtifact = manifest.find(
    (artifact) => artifact.path === "docker-compose.yml",
  );
  if (!composeArtifact) throw new Error("Invalid artifact manifest.");
  const compose = await verifiedArtifactContents(composeFile, composeArtifact);
  const environment: Record<string, string> = {
    FACTORY_COMPOSE_PROJECT_NAME: project,
    ...(includePorts ? { FACTORY_WEB_PORT: "0", FACTORY_API_PORT: "0" } : {}),
  };
  if (!compose.toString("utf8").includes(restaurantDemoTokenComposeContract))
    return environment;

  const token = process.env.RESTAURANT_DEMO_TABLE_TOKEN;
  if (!token) throw new PreviewRunFailure(missingTokenFailure);
  return { ...environment, RESTAURANT_DEMO_TABLE_TOKEN: token };
}

async function verifiedArtifacts(
  sourceDirectory: string,
  artifacts: PreviewRuntimeRequest["artifacts"],
): Promise<VerifiedArtifact[]> {
  const manifest = safeArtifactManifest(artifacts);
  const source = await lstat(sourceDirectory);
  if (source.isSymbolicLink() || !source.isDirectory())
    throw new Error("Invalid artifact source.");

  const expectedPaths = manifest.map((artifact) => artifact.path);
  const initialPaths = await walkRegularFiles(sourceDirectory);
  if (!samePaths(initialPaths, expectedPaths))
    throw new Error("Invalid artifact source.");

  const verified: VerifiedArtifact[] = [];
  for (const artifact of manifest) {
    const sourcePath = join(sourceDirectory, ...artifact.path.split("/"));
    verified.push({
      path: artifact.path,
      contents: await verifiedArtifactContents(sourcePath, artifact),
    });
  }

  const finalPaths = await walkRegularFiles(sourceDirectory);
  if (!samePaths(finalPaths, expectedPaths))
    throw new Error("Invalid artifact source.");
  return verified;
}

async function materializeArtifacts(
  directory: string,
  artifacts: readonly VerifiedArtifact[],
): Promise<void> {
  await rm(directory, { recursive: true, force: true });
  try {
    await mkdir(directory, { recursive: true });
    for (const artifact of artifacts) {
      const destination = join(directory, ...artifact.path.split("/"));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, artifact.contents, { flag: "wx" });
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function startPreviewRun(
  artifactRoot: string,
  request: PreviewRuntimeRequest,
  processRunner: PreviewProcessRunner = runDockerCompose,
  options: PreviewOperationOptions = defaultOperationOptions,
): Promise<StartedPreview> {
  const sourceDirectory = generatedDirectory(
    artifactRoot,
    request.rootDirectory,
  );
  const directory = previewDirectory(artifactRoot, request.previewRunId);
  const project = factoryProjectName(request);
  let environment: Readonly<Record<string, string>>;
  try {
    environment = await previewEnvironment(
      join(sourceDirectory, "docker-compose.yml"),
      request.artifacts,
      project,
      true,
      "preview_start_failed",
    );
  } catch (error) {
    throw error instanceof PreviewRunFailure
      ? error
      : new PreviewRunFailure("preview_start_failed");
  }
  const composeFile = join(directory, "docker-compose.yml");
  const activeStart = activePreviewStart();
  if (activePreviewStarts.has(request.previewRunId)) {
    throw new PreviewRunFailure("preview_start_failed");
  }
  activePreviewStarts.set(request.previewRunId, activeStart);
  try {
    try {
      await materializeArtifacts(
        directory,
        await verifiedArtifacts(sourceDirectory, request.artifacts),
      );
    } catch {
      throw new PreviewRunFailure("preview_start_failed");
    }
    try {
      await runPreviewOperation(
        processRunner,
        composeCommand(
          directory,
          composeFile,
          project,
          ["up", "--build", "--detach", "--wait"],
          environment,
        ),
        options.operationTimeoutMs,
        "preview_start_timeout",
        activeStart.controller.signal,
      );
      const webPort = dockerLoopbackPort(
        await runPreviewOperation(
          processRunner,
          composeCommand(
            directory,
            composeFile,
            project,
            ["port", "web", "3000"],
            environment,
          ),
          options.operationTimeoutMs,
          "preview_start_timeout",
          activeStart.controller.signal,
        ),
      );
      const apiPort = dockerLoopbackPort(
        await runPreviewOperation(
          processRunner,
          composeCommand(
            directory,
            composeFile,
            project,
            ["port", "api", "3001"],
            environment,
          ),
          options.operationTimeoutMs,
          "preview_start_timeout",
          activeStart.controller.signal,
        ),
      );
      await waitForWebReadiness(
        processRunner,
        composeCommand(
          directory,
          composeFile,
          project,
          [
            "exec",
            "-T",
            "web",
            "wget",
            "-q",
            "-O",
            "/dev/null",
            "http://127.0.0.1:3000",
          ],
          environment,
        ),
        previewHealthWaitMs(options),
        activeStart.controller.signal,
      );
      return { webPort, apiPort, previewUrl: `http://127.0.0.1:${webPort}` };
    } catch (error) {
      if (
        error instanceof PreviewRunFailure &&
        error.code === "preview_start_cancelled"
      ) {
        throw error;
      }
      let cleanedUp = false;
      await verifyComposeArtifact(composeFile, request.artifacts)
        .then(() =>
          runPreviewOperation(
            processRunner,
            composeCommand(
              directory,
              composeFile,
              project,
              ["down", "--volumes", "--remove-orphans"],
              environment,
            ),
            options.operationTimeoutMs,
            "preview_stop_failed",
          ),
        )
        .then(() => {
          cleanedUp = true;
        })
        .catch(() => undefined);
      if (
        cleanedUp &&
        !(
          error instanceof PreviewRunFailure &&
          error.code === "preview_start_timeout"
        )
      ) {
        await rm(directory, { recursive: true, force: true });
      }
      throw error instanceof PreviewRunFailure
        ? error
        : new PreviewRunFailure("preview_start_failed");
    }
  } finally {
    activeStart.settle();
    if (activePreviewStarts.get(request.previewRunId) === activeStart) {
      activePreviewStarts.delete(request.previewRunId);
    }
  }
}

export async function stopPreviewRun(
  artifactRoot: string,
  request: PreviewRuntimeRequest,
  processRunner: PreviewProcessRunner = runDockerCompose,
  options: PreviewOperationOptions = defaultOperationOptions,
): Promise<void> {
  const directory = previewDirectory(artifactRoot, request.previewRunId);
  const project = factoryProjectName(request);
  const composeFile = join(directory, "docker-compose.yml");
  try {
    const activeStart = activePreviewStarts.get(request.previewRunId);
    if (activeStart) {
      activeStart.controller.abort(
        new PreviewRunFailure("preview_start_cancelled"),
      );
      await activeStart.settled;
    }
    await verifyComposeArtifact(composeFile, request.artifacts);
    const environment = await previewEnvironment(
      composeFile,
      request.artifacts,
      project,
      false,
      "preview_stop_failed",
    );
    await runPreviewOperation(
      processRunner,
      composeCommand(
        directory,
        composeFile,
        project,
        ["down", "--volumes", "--remove-orphans"],
        environment,
      ),
      options.operationTimeoutMs,
      "preview_stop_failed",
    );
    await removePreviewDirectory(directory);
  } catch {
    throw new PreviewRunFailure("preview_stop_failed");
  }
}

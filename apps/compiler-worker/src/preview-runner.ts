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
) => Promise<string | undefined>;

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

export const runDockerCompose: PreviewProcessRunner = async ({
  file,
  args,
  environment,
}) => {
  return new Promise<string>((resolvePromise, reject) => {
    const child = spawn(file, [...args], {
      env: environment,
      shell: false,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolvePromise(stdout)
        : reject(new Error("Preview Docker operation failed.")),
    );
  });
};

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
): Promise<StartedPreview> {
  const sourceDirectory = generatedDirectory(
    artifactRoot,
    request.rootDirectory,
  );
  const directory = previewDirectory(artifactRoot, request.previewRunId);
  const project = factoryProjectName(request);
  const composeFile = join(directory, "docker-compose.yml");
  const environment = {
    FACTORY_COMPOSE_PROJECT_NAME: project,
    FACTORY_WEB_PORT: "0",
    FACTORY_API_PORT: "0",
  };
  try {
    await materializeArtifacts(
      directory,
      await verifiedArtifacts(sourceDirectory, request.artifacts),
    );
  } catch {
    throw new PreviewRunFailure("preview_start_failed");
  }
  try {
    await processRunner(
      composeCommand(
        directory,
        composeFile,
        project,
        ["up", "--build", "--detach", "--wait"],
        environment,
      ),
    );
    const webPort = dockerLoopbackPort(
      await processRunner(
        composeCommand(
          directory,
          composeFile,
          project,
          ["port", "web", "3000"],
          environment,
        ),
      ),
    );
    const apiPort = dockerLoopbackPort(
      await processRunner(
        composeCommand(
          directory,
          composeFile,
          project,
          ["port", "api", "3001"],
          environment,
        ),
      ),
    );
    try {
      await processRunner(
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
      );
    } catch {
      throw new PreviewRunFailure("preview_health_check_failed");
    }
    return { webPort, apiPort, previewUrl: `http://127.0.0.1:${webPort}` };
  } catch (error) {
    let cleanedUp = false;
    await verifyComposeArtifact(composeFile, request.artifacts)
      .then(() =>
        processRunner(
          composeCommand(
            directory,
            composeFile,
            project,
            ["down", "--volumes", "--remove-orphans"],
            { FACTORY_COMPOSE_PROJECT_NAME: project },
          ),
        ),
      )
      .then(() => {
        cleanedUp = true;
      })
      .catch(() => undefined);
    if (cleanedUp) await rm(directory, { recursive: true, force: true });
    throw error instanceof PreviewRunFailure
      ? error
      : new PreviewRunFailure("preview_start_failed");
  }
}

export async function stopPreviewRun(
  artifactRoot: string,
  request: PreviewRuntimeRequest,
  processRunner: PreviewProcessRunner = runDockerCompose,
): Promise<void> {
  const directory = previewDirectory(artifactRoot, request.previewRunId);
  const project = factoryProjectName(request);
  const composeFile = join(directory, "docker-compose.yml");
  try {
    await verifyComposeArtifact(composeFile, request.artifacts);
    await processRunner(
      composeCommand(
        directory,
        composeFile,
        project,
        ["down", "--volumes", "--remove-orphans"],
        { FACTORY_COMPOSE_PROJECT_NAME: project },
      ),
    );
    await rm(directory, { recursive: true, force: true });
  } catch {
    throw new PreviewRunFailure("preview_stop_failed");
  }
}

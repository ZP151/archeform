import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type PreviewRuntimeRequest = {
  readonly previewRunId: string;
  readonly rootDirectory: string;
  readonly composeProjectName: string;
};

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
  project: string,
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
): PreviewProcessCommand {
  return {
    file: "docker",
    args: [
      "compose",
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
  const environment = {
    FACTORY_COMPOSE_PROJECT_NAME: project,
    FACTORY_WEB_PORT: "0",
    FACTORY_API_PORT: "0",
  };
  try {
    await rm(directory, { recursive: true, force: true });
    await cp(sourceDirectory, directory, {
      recursive: true,
      errorOnExist: true,
    });
    await processRunner(
      composeCommand(
        directory,
        project,
        ["up", "--build", "--detach", "--wait"],
        environment,
      ),
    );
    const webPort = dockerLoopbackPort(
      await processRunner(
        composeCommand(
          directory,
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
    await processRunner(
      composeCommand(
        directory,
        project,
        ["down", "--volumes", "--remove-orphans"],
        { FACTORY_COMPOSE_PROJECT_NAME: project },
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
  try {
    await processRunner(
      composeCommand(
        directory,
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

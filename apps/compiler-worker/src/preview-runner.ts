import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { createServer } from "node:net";
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

export type PreviewProcessCommand = {
  readonly file: "docker";
  readonly args: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
};

export type PreviewProcessRunner = (
  command: PreviewProcessCommand,
) => Promise<void>;
export type LoopbackPortAllocator = () => Promise<number>;
export type PreviewHealthCheck = (url: string) => Promise<boolean>;

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
  if (!isInside(root, directory)) {
    throw new Error(
      "Generated preview directory is outside the Factory artifact root.",
    );
  }
  return directory;
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
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(file, [...args], {
      env: environment,
      shell: false,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error("Preview Docker operation failed."));
    });
  });
};

export const allocateLoopbackPort: LoopbackPortAllocator = async () => {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  await new Promise<void>((resolvePromise, reject) =>
    server.close((error) => (error ? reject(error) : resolvePromise())),
  );
  if (!address || typeof address === "string")
    throw new Error("Loopback port allocation failed.");
  return address.port;
};

export const checkPreviewHealth: PreviewHealthCheck = async (url) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

export async function startPreviewRun(
  artifactRoot: string,
  request: PreviewRuntimeRequest,
  processRunner: PreviewProcessRunner = runDockerCompose,
  allocatePort: LoopbackPortAllocator = allocateLoopbackPort,
  healthCheck: PreviewHealthCheck = checkPreviewHealth,
): Promise<StartedPreview> {
  const directory = generatedDirectory(artifactRoot, request.rootDirectory);
  const project = factoryProjectName(request);
  const [webPort, apiPort] = await Promise.all([
    allocatePort(),
    allocatePort(),
  ]);
  if (webPort === apiPort) throw new Error("Loopback port allocation failed.");
  const environment = {
    FACTORY_COMPOSE_PROJECT_NAME: project,
    FACTORY_WEB_PORT: String(webPort),
    FACTORY_API_PORT: String(apiPort),
  };
  try {
    await processRunner(
      composeCommand(
        directory,
        project,
        ["up", "--build", "--detach", "--wait"],
        environment,
      ),
    );
    const previewUrl = `http://127.0.0.1:${webPort}`;
    if (!(await healthCheck(previewUrl)))
      throw new Error("Preview health check failed.");
    return { webPort, apiPort, previewUrl };
  } catch {
    await processRunner(
      composeCommand(
        directory,
        project,
        ["down", "--volumes", "--remove-orphans"],
        { FACTORY_COMPOSE_PROJECT_NAME: project },
      ),
    ).catch(() => undefined);
    throw new Error("Preview run failed.");
  }
}

export async function stopPreviewRun(
  artifactRoot: string,
  request: PreviewRuntimeRequest,
  processRunner: PreviewProcessRunner = runDockerCompose,
): Promise<void> {
  const directory = generatedDirectory(artifactRoot, request.rootDirectory);
  const project = factoryProjectName(request);
  await processRunner(
    composeCommand(
      directory,
      project,
      ["down", "--volumes", "--remove-orphans"],
      { FACTORY_COMPOSE_PROJECT_NAME: project },
    ),
  );
}

export async function removePreviewDirectory(
  artifactRoot: string,
  rootDirectory: string,
): Promise<void> {
  await rm(generatedDirectory(artifactRoot, rootDirectory), {
    recursive: true,
    force: true,
  });
}

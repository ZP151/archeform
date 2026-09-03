import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  PreviewRunFailure,
  startPreviewRun,
  stopPreviewRun,
  type PreviewProcessRunner,
  type PreviewRuntimeRequest,
} from "../src/preview-runner.js";
import * as previewRunnerModule from "../src/preview-runner.js";

const previewRemovalFailure = vi.hoisted(() => ({
  directory: "",
  failuresRemaining: 0,
  persist: false,
  code: "EPERM",
  attempts: 0,
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rm: async (...args: Parameters<typeof actual.rm>) => {
      if (
        String(args[0]) === previewRemovalFailure.directory &&
        (previewRemovalFailure.persist ||
          previewRemovalFailure.failuresRemaining > 0)
      ) {
        previewRemovalFailure.attempts += 1;
        previewRemovalFailure.failuresRemaining -= 1;
        const error = new Error("Preview directory is still in use.");
        (error as NodeJS.ErrnoException).code = previewRemovalFailure.code;
        throw error;
      }
      return actual.rm(...args);
    },
  };
});

const compose = Buffer.from("services:\n  web:\n    image: example\n", "utf8");
const application = Buffer.from("export const value = 1;\n", "utf8");

function artifact(path: string, contents: Uint8Array) {
  return {
    path,
    digest: `sha256:${createHash("sha256").update(contents).digest("hex")}`,
    sizeBytes: contents.byteLength,
  };
}

function request(
  artifacts: PreviewRuntimeRequest["artifacts"],
): PreviewRuntimeRequest {
  return {
    previewRunId: "preview-1",
    rootDirectory: "expense-published-1",
    composeProjectName: "factory-preview-preview-1",
    artifacts,
  };
}

async function sourceFixture(composeContents = compose) {
  const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
  const source = join(root, "expense-published-1");
  await mkdir(join(source, "src"), { recursive: true });
  await writeFile(join(source, "docker-compose.yml"), composeContents);
  await writeFile(join(source, "src", "app.ts"), application);
  return { root, source };
}

const registeredArtifacts = [
  artifact("docker-compose.yml", compose),
  artifact("src/app.ts", application),
];

const restaurantCompose = Buffer.from(
  'services:\n  migrate:\n    environment:\n      RESTAURANT_DEMO_TABLE_TOKEN: "${RESTAURANT_DEMO_TABLE_TOKEN:?Set RESTAURANT_DEMO_TABLE_TOKEN for local demo bootstrap}"\n',
  "utf8",
);
const restaurantRegisteredArtifacts = [
  artifact("docker-compose.yml", restaurantCompose),
  artifact("src/app.ts", application),
];
const acceptanceCompose = Buffer.from(
  "services:\n  web:\n    image: example\n  api:\n    image: example\n  kitchen:\n    image: example\n    profiles:\n      - acceptance\n  cashier:\n    image: example\n    profiles:\n      - acceptance\n",
  "utf8",
);
const acceptanceRegisteredArtifacts = [
  artifact("docker-compose.yml", acceptanceCompose),
  artifact("src/app.ts", application),
];

describe("preview runner", () => {
  it("uses only the exact acceptance signal to activate the registered profile", async () => {
    const { root } = await sourceFixture(acceptanceCompose);
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };
    vi.stubEnv(
      "FACTORY_LOCAL_PREVIEW_PROFILE",
      "factory.local-preview-profile/v1:acceptance",
    );

    try {
      await startPreviewRun(
        root,
        request(acceptanceRegisteredArtifacts),
        processRunner,
      );
      await stopPreviewRun(
        root,
        request(acceptanceRegisteredArtifacts),
        processRunner,
      );

      expect(commands).not.toHaveLength(0);
      for (const command of commands) {
        expect(command.args.slice(0, 3)).toEqual([
          "compose",
          "--profile",
          "acceptance",
        ]);
        expect(
          command.environment.FACTORY_LOCAL_PREVIEW_PROFILE,
        ).toBeUndefined();
      }
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    "",
    " factory.local-preview-profile/v1:acceptance",
    "factory.local-preview-profile/v1:acceptance ",
    "factory.local-preview-profile/v1:Acceptance",
    "factory.local-preview-profile/v0:acceptance",
    "factory.local-preview-profile/v2:acceptance",
    "factory.local-preview-profile/v1:acceptance,other",
  ])("rejects present profile signal %j before Docker runs", async (value) => {
    const { root } = await sourceFixture(acceptanceCompose);
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    vi.stubEnv("FACTORY_LOCAL_PREVIEW_PROFILE", value);

    try {
      await expect(
        startPreviewRun(
          root,
          request(acceptanceRegisteredArtifacts),
          processRunner,
        ),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retries a transient generated web readiness failure", async () => {
    const { root } = await sourceFixture();
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    let healthChecks = 0;
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
      if (command.args.includes("exec")) {
        healthChecks += 1;
        if (healthChecks === 1) throw new Error("Connection refused.");
      }
    };

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).resolves.toEqual({
        webPort: 49101,
        apiPort: 49102,
        previewUrl: "http://127.0.0.1:49101",
      });
      expect(healthChecks).toBe(2);
      expect(
        commands.filter((command) => command.args.includes("down")),
      ).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("bounds permanent web readiness failure and cleans only its exact project", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    let healthChecks = 0;
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
      if (command.args.includes("exec")) {
        healthChecks += 1;
        throw new Error("Permanent generated Web provisioning failure.");
      }
    };

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 600,
          readinessTimeoutMs: 10,
        }),
      ).rejects.toMatchObject({
        code: "preview_readiness_failed",
        cleanupComplete: true,
      });

      expect(healthChecks).toBeGreaterThanOrEqual(1);
      const downCommands = commands.filter((command) =>
        command.args.includes("down"),
      );
      expect(downCommands).toHaveLength(1);
      expect(downCommands[0]).toMatchObject({
        args: expect.arrayContaining([
          "--file",
          join(preview, "docker-compose.yml"),
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          preview,
          "down",
          "--volumes",
          "--remove-orphans",
        ]),
      });
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("caps the web readiness budget at the overall operation timeout", async () => {
    const { root } = await sourceFixture();
    let healthChecks = 0;
    const processRunner: PreviewProcessRunner = async (command) => {
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
      if (command.args.includes("exec")) {
        healthChecks += 1;
        throw new Error("Generated Web remains unavailable.");
      }
    };

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 20,
          readinessTimeoutMs: 600,
        }),
      ).rejects.toMatchObject({ code: "preview_readiness_failed" });
      expect(healthChecks).toBe(1);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cancels promptly while waiting to retry web readiness", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    let markReadinessFailure: (() => void) | undefined;
    const readinessFailed = new Promise<void>((resolve) => {
      markReadinessFailure = resolve;
    });
    let healthChecks = 0;
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
      if (command.args.includes("exec")) {
        healthChecks += 1;
        markReadinessFailure?.();
        throw new Error("Generated Web is not ready yet.");
      }
    };

    try {
      const starting = startPreviewRun(
        root,
        request(registeredArtifacts),
        processRunner,
        { operationTimeoutMs: 1_000, readinessTimeoutMs: 750 },
      );
      const cancelledStart = expect(starting).rejects.toMatchObject({
        code: "preview_start_cancelled",
      });
      await readinessFailed;
      await new Promise<void>((resolve) => setImmediate(resolve));

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 1_000,
        }),
      ).resolves.toBeUndefined();
      await cancelledStart;

      expect(healthChecks).toBe(1);
      const downCommands = commands.filter((command) =>
        command.args.includes("down"),
      );
      expect(downCommands).toHaveLength(1);
      expect(downCommands[0]).toMatchObject({
        args: expect.arrayContaining([
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          preview,
          "down",
        ]),
      });
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a Restaurant preview without its process-only bootstrap token", async () => {
    const { root } = await sourceFixture(restaurantCompose);
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    vi.stubEnv("RESTAURANT_DEMO_TABLE_TOKEN", "");

    try {
      await expect(
        startPreviewRun(
          root,
          request(restaurantRegisteredArtifacts),
          processRunner,
        ),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("forwards the bootstrap token and Docker CLI lookup variables to preview Docker commands", async () => {
    const { root } = await sourceFixture(restaurantCompose);
    const spawned: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      spawned.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };
    vi.stubEnv("RESTAURANT_DEMO_TABLE_TOKEN", "test-run-scoped-token");
    // The Docker CLI on Windows discovers its compose plugin through host
    // lookup variables (e.g. %ProgramFiles%\Docker\cli-plugins); without
    // them the CLI cannot resolve `docker compose` at all.
    const dockerLookupVariables = [
      "PROGRAMFILES",
      "ProgramW6432",
      "PROGRAMDATA",
      "APPDATA",
      "LOCALAPPDATA",
      "USERPROFILE",
      "HOMEDRIVE",
      "HOMEPATH",
      "HOME",
      "PATH",
      "PATHEXT",
      "SYSTEMROOT",
      "WINDIR",
      "SYSTEMDRIVE",
      "COMSPEC",
      "TEMP",
      "TMP",
    ];

    try {
      await expect(
        startPreviewRun(
          root,
          request(restaurantRegisteredArtifacts),
          processRunner,
        ),
      ).resolves.toMatchObject({ previewUrl: "http://127.0.0.1:49101" });
      expect(spawned).toHaveLength(4);
      for (const command of spawned) {
        expect(command.environment).toEqual(
          expect.objectContaining({
            FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
            FACTORY_WEB_PORT: "0",
            FACTORY_API_PORT: "0",
            RESTAURANT_DEMO_TABLE_TOKEN: "test-run-scoped-token",
          }),
        );
        for (const key of dockerLookupVariables) {
          if (process.env[key] !== undefined) {
            expect(command.environment[key]).toBe(process.env[key]);
          }
        }
        // The forwarded environment must be exactly the preview variables,
        // the bootstrap token, and the Docker CLI lookup allowlist: no other
        // host variable may reach the preview Docker commands, or the
        // "bounded allowlist" property of the fix is unenforced.
        const allowlistedKeys = new Set([
          "FACTORY_COMPOSE_PROJECT_NAME",
          "FACTORY_WEB_PORT",
          "FACTORY_API_PORT",
          "RESTAURANT_DEMO_TABLE_TOKEN",
          ...dockerLookupVariables,
        ]);
        expect(
          Object.keys(command.environment).every((key) =>
            allowlistedKeys.has(key),
          ),
        ).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
      await rm(root, { recursive: true, force: true });
    }
  });

  it("terminates an aborted Docker child and waits for its exit", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      kill(signal?: string): boolean;
    };
    child.stdout = new EventEmitter();
    let terminated = false;
    child.kill = () => {
      terminated = true;
      return true;
    };
    const createDockerComposeRunner = (
      previewRunnerModule as unknown as {
        createDockerComposeRunner: (
          spawnProcess: () => typeof child,
        ) => PreviewProcessRunner;
      }
    ).createDockerComposeRunner;
    const processRunner = createDockerComposeRunner(() => child);
    const controller = new AbortController();
    const operation = processRunner(
      {
        file: "docker",
        args: ["compose", "up"],
        environment: {},
      },
      controller.signal,
    );
    let settled = false;
    void operation.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    controller.abort(new PreviewRunFailure("preview_start_timeout"));
    await Promise.resolve();

    expect(terminated).toBe(true);
    expect(settled).toBe(false);
    child.emit("exit", null, "SIGTERM");
    await expect(operation).rejects.toMatchObject({
      code: "preview_start_timeout",
    });
  });

  it("keeps an aborted Docker operation pending after child error until exit", async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      kill(signal?: string): boolean;
    };
    child.stdout = new EventEmitter();
    child.kill = () => true;
    const createDockerComposeRunner = (
      previewRunnerModule as unknown as {
        createDockerComposeRunner: (
          spawnProcess: () => typeof child,
        ) => PreviewProcessRunner;
      }
    ).createDockerComposeRunner;
    const processRunner = createDockerComposeRunner(() => child);
    const controller = new AbortController();
    const operation = processRunner(
      {
        file: "docker",
        args: ["compose", "up"],
        environment: {},
      },
      controller.signal,
    );
    let settled = false;
    void operation.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    controller.abort(new PreviewRunFailure("preview_start_timeout"));
    child.emit("error", new Error("Child termination is in progress."));
    child.emit("error", new Error("Child escalation is in progress."));
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(settled).toBe(false);
    child.emit("exit", null, "SIGTERM");
    await expect(operation).rejects.toMatchObject({
      code: "preview_start_timeout",
    });
  });

  it("times out a pending start, removes Docker resources, and retains verified Stop recovery", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner = ((
      command: Parameters<PreviewProcessRunner>[0],
      signal: AbortSignal,
    ) => {
      commands.push(command);
      if (command.args.includes("down")) return Promise.resolve(undefined);
      return new Promise<string | undefined>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      });
    }) as PreviewProcessRunner;

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 10,
        }),
      ).rejects.toMatchObject({
        code: "preview_start_timeout",
        cleanupComplete: false,
      });
      expect(commands).toHaveLength(2);
      expect(commands[0]?.args).toContain("up");
      expect(commands[1]?.args).toContain("down");
      expect(commands.at(-1)).toMatchObject({
        args: expect.arrayContaining([
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          preview,
          "down",
        ]),
      });
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).resolves.toEqual(compose);

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 10,
        }),
      ).resolves.toBeUndefined();
      expect(commands).toHaveLength(3);
      expect(commands[2]?.args).toContain("down");
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("cancels only the exact pending start before its stop removes the derived project", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const otherPreview = join(root, ".preview-runs", "preview-2");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    let markStartEntered: (() => void) | undefined;
    const startEntered = new Promise<void>((resolve) => {
      markStartEntered = resolve;
    });
    const processRunner = ((
      command: Parameters<PreviewProcessRunner>[0],
      signal: AbortSignal | undefined,
    ) => {
      commands.push(command);
      if (command.args.includes("down")) return Promise.resolve(undefined);
      markStartEntered?.();
      return new Promise<string | undefined>((_resolve, reject) => {
        const fallback = setTimeout(
          () => reject(new Error("Pending start was not cancelled.")),
          250,
        );
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(fallback);
            reject(signal.reason);
          },
          { once: true },
        );
      });
    }) as PreviewProcessRunner;

    try {
      await mkdir(otherPreview, { recursive: true });
      await writeFile(join(otherPreview, "sentinel.txt"), "other preview");
      const starting = startPreviewRun(
        root,
        request(registeredArtifacts),
        processRunner,
        { operationTimeoutMs: 1_000 },
      );
      const cancelledStart = expect(starting).rejects.toMatchObject({
        code: "preview_start_cancelled",
      });
      await startEntered;

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner, {
          operationTimeoutMs: 1_000,
        }),
      ).resolves.toBeUndefined();
      await cancelledStart;

      const downCommands = commands.filter((command) =>
        command.args.includes("down"),
      );
      expect(downCommands).toHaveLength(1);
      expect(downCommands[0]).toMatchObject({
        args: expect.arrayContaining([
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          preview,
          "down",
        ]),
      });
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).rejects.toThrow();
      await expect(
        readFile(join(otherPreview, "sentinel.txt"), "utf8"),
      ).resolves.toBe("other preview");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a generated directory that escapes the Factory artifact root", async () => {
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);

    await expect(
      startPreviewRun(
        "C:/factory/artifacts",
        {
          ...request([]),
          rootDirectory: "../outside",
        },
        processRunner,
      ),
    ).rejects.toThrow("outside the Factory artifact root");
    expect(processRunner).not.toHaveBeenCalled();
  });

  it("materializes only the complete registered manifest and uses its explicit Compose file", async () => {
    const { root, source } = await sourceFixture();
    const spawned: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      spawned.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };
    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).resolves.toEqual({
        webPort: 49101,
        apiPort: 49102,
        previewUrl: "http://127.0.0.1:49101",
      });

      const preview = join(root, ".preview-runs", "preview-1");
      const composeFile = join(preview, "docker-compose.yml");
      await expect(readFile(composeFile)).resolves.toEqual(compose);
      await expect(readFile(join(preview, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      await expect(readFile(join(source, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      expect(spawned).toHaveLength(4);
      for (const command of spawned) {
        expect(command.args.slice(0, 8)).toEqual([
          "compose",
          "--file",
          composeFile,
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          preview,
          expect.any(String),
        ]);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("accepts an exact manifest independent of source traversal ordering", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const source = join(root, "expense-published-1");
    const nested = Buffer.from("nested", "utf8");
    const sibling = Buffer.from("sibling", "utf8");
    const processRunner: PreviewProcessRunner = async (command) => {
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };
    try {
      await mkdir(join(source, "a"), { recursive: true });
      await writeFile(join(source, "docker-compose.yml"), compose);
      await writeFile(join(source, "a", "file.txt"), nested);
      await writeFile(join(source, "a-b.txt"), sibling);

      await expect(
        startPreviewRun(
          root,
          request([
            artifact("docker-compose.yml", compose),
            artifact("a/file.txt", nested),
            artifact("a-b.txt", sibling),
          ]),
          processRunner,
        ),
      ).resolves.toMatchObject({ previewUrl: "http://127.0.0.1:49101" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a registered file whose digest changed before Docker runs", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      const changed = Buffer.from(application);
      changed[0] = changed[0]! ^ 1;
      await writeFile(join(source, "src", "app.ts"), changed);

      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a registered file whose byte size changed before Docker runs", async () => {
    const { root } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    const wrongSize = registeredArtifacts.map((entry) =>
      entry.path === "src/app.ts"
        ? { ...entry, sizeBytes: entry.sizeBytes + 1 }
        : entry,
    );
    try {
      await expect(
        startPreviewRun(root, request(wrongSize), processRunner),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a missing registered file before Docker runs", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await rm(join(source, "src", "app.ts"));

      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects an unregistered source file before Docker runs", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await writeFile(
        join(source, "docker-compose.override.yml"),
        "services:\n  web:\n    privileged: true\n",
      );

      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects duplicate registered paths before Docker runs", async () => {
    const { root } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await expect(
        startPreviewRun(
          root,
          request([...registeredArtifacts, registeredArtifacts[1]!]),
          processRunner,
        ),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects a symlinked source entry before Docker runs", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await symlink(
        join(source, "src"),
        join(source, "linked-source"),
        "junction",
      );

      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "unsafe path",
      entry: { ...registeredArtifacts[1]!, path: "../app.ts" },
    },
    {
      name: "Windows path",
      entry: { ...registeredArtifacts[1]!, path: "C:/app.ts" },
    },
    {
      name: "malformed digest",
      entry: { ...registeredArtifacts[1]!, digest: "sha256:not-a-digest" },
    },
    {
      name: "negative size",
      entry: { ...registeredArtifacts[1]!, sizeBytes: -1 },
    },
    {
      name: "fractional size",
      entry: { ...registeredArtifacts[1]!, sizeBytes: 1.5 },
    },
  ])(
    "rejects manifest metadata with a $name before Docker runs",
    async ({ entry }) => {
      const { root } = await sourceFixture();
      const processRunner = vi
        .fn<PreviewProcessRunner>()
        .mockResolvedValue(undefined);
      try {
        await expect(
          startPreviewRun(
            root,
            request([registeredArtifacts[0]!, entry]),
            processRunner,
          ),
        ).rejects.toMatchObject({ code: "preview_artifact_failed" });
        expect(processRunner).not.toHaveBeenCalled();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it("requires docker-compose.yml to be a registered source file", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await rm(join(source, "docker-compose.yml"));

      await expect(
        startPreviewRun(
          root,
          request([artifact("src/app.ts", application)]),
          processRunner,
        ),
      ).rejects.toMatchObject({ code: "preview_artifact_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stops only the copied PreviewRun project with its explicit Compose file", async () => {
    const { root, source } = await sourceFixture();
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await startPreviewRun(
        root,
        request(registeredArtifacts),
        async (command) => {
          if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
            return "127.0.0.1:49101\n";
          if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
            return "127.0.0.1:49102\n";
        },
      );
      await stopPreviewRun(root, request(registeredArtifacts), processRunner);

      const preview = join(root, ".preview-runs", "preview-1");
      expect(processRunner).toHaveBeenLastCalledWith(
        {
          file: "docker",
          args: [
            "compose",
            "--file",
            join(preview, "docker-compose.yml"),
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            preview,
            "down",
            "--volumes",
            "--remove-orphans",
          ],
          environment: expect.objectContaining({
            FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
          }),
        },
        expect.any(AbortSignal),
      );
      // Stop needs the same Docker CLI host lookup allowlist as start:
      // without PROGRAMFILES the compose plugin is undiscoverable on
      // Windows and `down` would fail exactly like `up` did.
      const stopCommand = processRunner.mock.calls.at(-1)?.[0];
      expect(stopCommand?.environment.PROGRAMFILES).toBe(
        process.env.PROGRAMFILES,
      );
      expect(stopCommand?.environment.FACTORY_WEB_PORT).toBeUndefined();
      await expect(readFile(join(source, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      await expect(readFile(join(preview, "src", "app.ts"))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("completes stop when Windows releases the preview directory after Compose cleanup", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };

    try {
      await startPreviewRun(root, request(registeredArtifacts), processRunner);
      previewRemovalFailure.directory = preview;
      previewRemovalFailure.failuresRemaining = 1;

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner),
      ).resolves.toBeUndefined();

      expect(
        commands.filter((command) => command.args.includes("down")),
      ).toHaveLength(1);
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).rejects.toThrow();
    } finally {
      previewRemovalFailure.directory = "";
      previewRemovalFailure.failuresRemaining = 0;
      previewRemovalFailure.persist = false;
      previewRemovalFailure.code = "EPERM";
      previewRemovalFailure.attempts = 0;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the preview directory remains locked after Compose cleanup", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };

    try {
      await startPreviewRun(root, request(registeredArtifacts), processRunner);
      previewRemovalFailure.directory = preview;
      previewRemovalFailure.persist = true;

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_stop_failed" });

      expect(
        commands.filter((command) => command.args.includes("down")),
      ).toHaveLength(1);
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).resolves.toEqual(compose);
    } finally {
      previewRemovalFailure.directory = "";
      previewRemovalFailure.failuresRemaining = 0;
      previewRemovalFailure.persist = false;
      previewRemovalFailure.code = "EPERM";
      previewRemovalFailure.attempts = 0;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed without retrying a non-transient preview directory removal error", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };

    try {
      await startPreviewRun(root, request(registeredArtifacts), processRunner);
      previewRemovalFailure.directory = preview;
      previewRemovalFailure.persist = true;
      previewRemovalFailure.code = "EACCES";

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_stop_failed" });

      expect(previewRemovalFailure.attempts).toBe(1);
      expect(
        commands.filter((command) => command.args.includes("down")),
      ).toHaveLength(1);
      await expect(
        readFile(join(preview, "docker-compose.yml")),
      ).resolves.toEqual(compose);
    } finally {
      previewRemovalFailure.directory = "";
      previewRemovalFailure.failuresRemaining = 0;
      previewRemovalFailure.persist = false;
      previewRemovalFailure.code = "EPERM";
      previewRemovalFailure.attempts = 0;
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects stop without a registered Compose artifact before Docker runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await expect(
        stopPreviewRun(
          root,
          request([artifact("src/app.ts", application)]),
          processRunner,
        ),
      ).rejects.toMatchObject({ code: "preview_stop_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects stop when the registered derived Compose file is missing before Docker runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await mkdir(join(root, ".preview-runs", "preview-1"), {
        recursive: true,
      });

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_stop_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "same-size digest change",
      contents: (() => {
        const changed = Buffer.from(compose);
        changed[0] = changed[0]! ^ 1;
        return changed;
      })(),
    },
    {
      name: "byte-size change",
      contents: Buffer.concat([compose, Buffer.from("# changed\n", "utf8")]),
    },
  ])(
    "rejects stop after a derived Compose $name before Docker runs",
    async ({ contents }) => {
      const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
      const preview = join(root, ".preview-runs", "preview-1");
      const processRunner = vi
        .fn<PreviewProcessRunner>()
        .mockResolvedValue(undefined);
      try {
        await mkdir(preview, { recursive: true });
        await writeFile(join(preview, "docker-compose.yml"), contents);

        await expect(
          stopPreviewRun(root, request(registeredArtifacts), processRunner),
        ).rejects.toMatchObject({ code: "preview_stop_failed" });
        expect(processRunner).not.toHaveBeenCalled();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  it("rejects stop with a symlinked derived Compose path before Docker runs", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const preview = join(root, ".preview-runs", "preview-1");
    const target = join(root, "compose-target");
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await mkdir(preview, { recursive: true });
      await mkdir(target, { recursive: true });
      await symlink(target, join(preview, "docker-compose.yml"), "junction");

      await expect(
        stopPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_stop_failed" });
      expect(processRunner).not.toHaveBeenCalled();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not run failed-start cleanup with a changed derived Compose file", async () => {
    const { root } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const commands: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      commands.push(command);
      const changed = Buffer.from(compose);
      changed[0] = changed[0]! ^ 1;
      await writeFile(join(preview, "docker-compose.yml"), changed);
      throw new Error("Docker failed.");
    };
    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({ code: "preview_compose_up_failed" });
      expect(commands).toHaveLength(1);
      expect(commands[0]?.args).toContain("up");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retains a failed-start runtime copy until the allowed stop cleans its named project", async () => {
    const { root, source } = await sourceFixture();
    const preview = join(root, ".preview-runs", "preview-1");
    const startRunner: PreviewProcessRunner = async () => {
      throw new Error("Docker failed.");
    };
    const stopped: Parameters<PreviewProcessRunner>[0][] = [];
    const stopRunner: PreviewProcessRunner = async (command) => {
      stopped.push(command);
    };

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), startRunner),
      ).rejects.toMatchObject({ code: "preview_compose_up_failed" });
      await expect(readFile(join(preview, "src", "app.ts"))).resolves.toEqual(
        application,
      );

      await stopPreviewRun(root, request(registeredArtifacts), stopRunner);

      expect(stopped).toContainEqual(
        expect.objectContaining({
          args: expect.arrayContaining([
            "--file",
            join(preview, "docker-compose.yml"),
            "down",
            "--volumes",
            "--remove-orphans",
          ]),
        }),
      );
      await expect(readFile(join(source, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      await expect(readFile(join(preview, "src", "app.ts"))).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports invalid Compose loopback ports as port discovery failures", async () => {
    const { root } = await sourceFixture();
    const processRunner: PreviewProcessRunner = async (command) => {
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "0.0.0.0:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };

    try {
      await expect(
        startPreviewRun(root, request(registeredArtifacts), processRunner),
      ).rejects.toMatchObject({
        code: "preview_port_discovery_failed",
        cleanupComplete: true,
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

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

async function sourceFixture() {
  const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
  const source = join(root, "expense-published-1");
  await mkdir(join(source, "src"), { recursive: true });
  await writeFile(join(source, "docker-compose.yml"), compose);
  await writeFile(join(source, "src", "app.ts"), application);
  return { root, source };
}

const registeredArtifacts = [
  artifact("docker-compose.yml", compose),
  artifact("src/app.ts", application),
];

describe("preview runner", () => {
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
      ).rejects.toMatchObject({ code: "preview_start_timeout" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
        ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
          environment: {
            FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
          },
        },
        expect.any(AbortSignal),
      );
      await expect(readFile(join(source, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      await expect(readFile(join(preview, "src", "app.ts"))).rejects.toThrow();
    } finally {
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
      ).rejects.toMatchObject({ code: "preview_start_failed" });
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
});

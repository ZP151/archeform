import { createHash } from "node:crypto";
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
  startPreviewRun,
  stopPreviewRun,
  type PreviewProcessRunner,
  type PreviewRuntimeRequest,
} from "../src/preview-runner.js";

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
      expect(processRunner).toHaveBeenLastCalledWith({
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
      });
      await expect(readFile(join(source, "src", "app.ts"))).resolves.toEqual(
        application,
      );
      await expect(readFile(join(preview, "src", "app.ts"))).rejects.toThrow();
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

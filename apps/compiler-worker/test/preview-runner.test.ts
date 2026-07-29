import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  startPreviewRun,
  stopPreviewRun,
  type PreviewProcessRunner,
} from "../src/preview-runner.js";

describe("preview runner", () => {
  it("rejects a generated directory that escapes the Factory artifact root", async () => {
    const processRunner: PreviewProcessRunner = vi.fn();

    await expect(
      startPreviewRun(
        "C:/factory/artifacts",
        {
          previewRunId: "preview-1",
          rootDirectory: "../outside",
          composeProjectName: "factory-preview-preview-1",
        },
        processRunner,
      ),
    ).rejects.toThrow("outside the Factory artifact root");
    expect(processRunner).not.toHaveBeenCalled();
  });

  it("runs a copied PreviewRun directory and discovers Docker-assigned loopback ports", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const generated = join(root, "expense-published-1");
    const spawned: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      spawned.push(command);
      if (command.args.at(-3) === "port" && command.args.at(-2) === "web")
        return "127.0.0.1:49101\n";
      if (command.args.at(-3) === "port" && command.args.at(-2) === "api")
        return "127.0.0.1:49102\n";
    };
    try {
      await mkdir(generated, { recursive: true });
      await writeFile(
        join(root, "expense-published-1", "immutable.txt"),
        "source",
      );
      await expect(
        startPreviewRun(
          root,
          {
            previewRunId: "preview-1",
            rootDirectory: "expense-published-1",
            composeProjectName: "factory-preview-preview-1",
          },
          processRunner,
        ),
      ).resolves.toEqual({
        webPort: 49101,
        apiPort: 49102,
        previewUrl: "http://127.0.0.1:49101",
      });

      const previewDirectory = join(root, ".preview-runs", "preview-1");
      expect(spawned).toEqual([
        expect.objectContaining({
          file: "docker",
          args: [
            "compose",
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            previewDirectory,
            "up",
            "--build",
            "--detach",
            "--wait",
          ],
          environment: {
            FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
            FACTORY_WEB_PORT: "0",
            FACTORY_API_PORT: "0",
          },
        }),
        expect.objectContaining({
          args: [
            "compose",
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            previewDirectory,
            "port",
            "web",
            "3000",
          ],
        }),
        expect.objectContaining({
          args: [
            "compose",
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            previewDirectory,
            "port",
            "api",
            "3001",
          ],
        }),
        expect.objectContaining({
          args: [
            "compose",
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            previewDirectory,
            "exec",
            "-T",
            "web",
            "wget",
            "-q",
            "-O",
            "/dev/null",
            "http://127.0.0.1:3000",
          ],
        }),
      ]);
      expect(await readFile(join(generated, "immutable.txt"), "utf8")).toBe(
        "source",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stops only the copied PreviewRun project and preserves its immutable source", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const generated = join(root, "expense-published-1");
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await mkdir(generated, { recursive: true });
      await writeFile(join(generated, "immutable.txt"), "source");
      await startPreviewRun(
        root,
        {
          previewRunId: "preview-1",
          rootDirectory: "expense-published-1",
          composeProjectName: "factory-preview-preview-1",
        },
        async (command) => {
          processRunner(command);
          if (command.args.at(-2) === "web") return "127.0.0.1:49101\n";
          if (command.args.at(-2) === "api") return "127.0.0.1:49102\n";
        },
      );
      await stopPreviewRun(
        root,
        {
          previewRunId: "preview-1",
          rootDirectory: "expense-published-1",
          composeProjectName: "factory-preview-preview-1",
        },
        processRunner,
      );
      expect(processRunner).toHaveBeenLastCalledWith({
        file: "docker",
        args: [
          "compose",
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          join(root, ".preview-runs", "preview-1"),
          "down",
          "--volumes",
          "--remove-orphans",
        ],
        environment: {
          FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
        },
      });
      await expect(
        readFile(join(generated, "immutable.txt"), "utf8"),
      ).resolves.toBe("source");
      await expect(
        readFile(
          join(root, ".preview-runs", "preview-1", "immutable.txt"),
          "utf8",
        ),
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("retains a failed-start runtime copy until the allowed stop cleans its named project", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const source = join(root, "expense-published-1");
    const request = {
      previewRunId: "preview-1",
      rootDirectory: "expense-published-1",
      composeProjectName: "factory-preview-preview-1",
    };
    const preview = join(root, ".preview-runs", "preview-1");
    const startRunner: PreviewProcessRunner = async () => {
      throw new Error("Docker failed.");
    };
    const stopped: Parameters<PreviewProcessRunner>[0][] = [];
    const stopRunner: PreviewProcessRunner = async (command) => {
      stopped.push(command);
    };

    try {
      await mkdir(source, { recursive: true });
      await writeFile(join(source, "immutable.txt"), "source");

      await expect(
        startPreviewRun(root, request, startRunner),
      ).rejects.toMatchObject({
        code: "preview_start_failed",
      });
      await expect(
        readFile(join(preview, "immutable.txt"), "utf8"),
      ).resolves.toBe("source");

      await stopPreviewRun(root, request, stopRunner);

      expect(stopped).toContainEqual(
        expect.objectContaining({
          args: expect.arrayContaining([
            "down",
            "--volumes",
            "--remove-orphans",
          ]),
        }),
      );
      await expect(
        readFile(join(source, "immutable.txt"), "utf8"),
      ).resolves.toBe("source");
      await expect(
        readFile(join(preview, "immutable.txt"), "utf8"),
      ).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

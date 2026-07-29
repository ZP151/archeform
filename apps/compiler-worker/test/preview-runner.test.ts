import { mkdtemp, rm } from "node:fs/promises";
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
        async () => 43101,
        async () => true,
      ),
    ).rejects.toThrow("outside the Factory artifact root");
    expect(processRunner).not.toHaveBeenCalled();
  });

  it("starts only a Factory-named generated project through an argument-array Docker invocation", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const generated = join(root, "expense-published-1");
    const spawned: Parameters<PreviewProcessRunner>[0][] = [];
    const processRunner: PreviewProcessRunner = async (command) => {
      spawned.push(command);
    };
    const allocate = vi
      .fn()
      .mockResolvedValueOnce(43101)
      .mockResolvedValueOnce(43102);

    try {
      await expect(
        startPreviewRun(
          root,
          {
            previewRunId: "preview-1",
            rootDirectory: "expense-published-1",
            composeProjectName: "factory-preview-preview-1",
          },
          processRunner,
          allocate,
          async (url) => url === "http://127.0.0.1:43101",
        ),
      ).resolves.toEqual({
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      });

      expect(spawned).toEqual([
        expect.objectContaining({
          file: "docker",
          args: [
            "compose",
            "--project-name",
            "factory-preview-preview-1",
            "--project-directory",
            generated,
            "up",
            "--build",
            "--detach",
            "--wait",
          ],
          environment: {
            FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
            FACTORY_WEB_PORT: "43101",
            FACTORY_API_PORT: "43102",
          },
        }),
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("stops only the recorded Factory project with volumes and orphan cleanup", async () => {
    const root = await mkdtemp(join(tmpdir(), "factory-preview-root-"));
    const generated = join(root, "expense-published-1");
    const processRunner = vi
      .fn<PreviewProcessRunner>()
      .mockResolvedValue(undefined);
    try {
      await stopPreviewRun(
        root,
        {
          previewRunId: "preview-1",
          rootDirectory: "expense-published-1",
          composeProjectName: "factory-preview-preview-1",
        },
        processRunner,
      );
      expect(processRunner).toHaveBeenCalledWith({
        file: "docker",
        args: [
          "compose",
          "--project-name",
          "factory-preview-preview-1",
          "--project-directory",
          generated,
          "down",
          "--volumes",
          "--remove-orphans",
        ],
        environment: {
          FACTORY_COMPOSE_PROJECT_NAME: "factory-preview-preview-1",
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

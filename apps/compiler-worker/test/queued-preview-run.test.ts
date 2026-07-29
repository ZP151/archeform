import { describe, expect, it, vi } from "vitest";

import { executeQueuedPreviewRun } from "../src/queued-preview-run.js";

const startJob = {
  action: "start" as const,
  previewRunId: "preview-1",
  compilationId: "compilation-1",
  rootDirectory: "expense-published-1",
  composeProjectName: "factory-preview-preview-1",
};

describe("queued preview run", () => {
  it("reports only declared start evidence after the generated application is ready", async () => {
    const reporter = {
      ready: vi.fn().mockResolvedValue(undefined),
      failed: vi.fn(),
      stopped: vi.fn(),
    };
    const runtime = {
      start: vi.fn().mockResolvedValue({
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      }),
      stop: vi.fn(),
    };

    await executeQueuedPreviewRun("C:/artifacts", startJob, runtime, reporter);

    expect(reporter.ready).toHaveBeenCalledWith("preview-1", {
      webPort: 43101,
      apiPort: 43102,
      previewUrl: "http://127.0.0.1:43101",
    });
    expect(reporter.failed).not.toHaveBeenCalled();
  });

  it("cleans the named preview directory before reporting a stopped run", async () => {
    const reporter = {
      ready: vi.fn(),
      failed: vi.fn(),
      stopped: vi.fn().mockResolvedValue(undefined),
    };
    const runtime = {
      start: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    const removePreviewDirectory = vi.fn().mockResolvedValue(undefined);

    await executeQueuedPreviewRun(
      "C:/artifacts",
      { ...startJob, action: "stop" },
      runtime,
      reporter,
      removePreviewDirectory,
    );

    expect(runtime.stop).toHaveBeenCalledWith(
      "C:/artifacts",
      expect.objectContaining({ ...startJob, action: "stop" }),
    );
    expect(removePreviewDirectory).toHaveBeenCalledWith(
      "C:/artifacts",
      "expense-published-1",
    );
    expect(reporter.stopped).toHaveBeenCalledWith("preview-1");
  });

  it("reports an allowlisted failure code without raw process diagnostics", async () => {
    const reporter = {
      ready: vi.fn(),
      failed: vi.fn().mockResolvedValue(undefined),
      stopped: vi.fn(),
    };
    const runtime = {
      start: vi
        .fn()
        .mockRejectedValue(
          new Error("docker compose --env-file secret.env failed"),
        ),
      stop: vi.fn(),
    };

    await expect(
      executeQueuedPreviewRun("C:/artifacts", startJob, runtime, reporter),
    ).rejects.toThrow("Preview run failed.");
    expect(reporter.failed).toHaveBeenCalledWith("preview-1", {
      diagnostic: "preview_start_failed",
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import { executeQueuedPreviewRun } from "../src/queued-preview-run.js";
import { PreviewRunFailure } from "../src/preview-runner.js";

const startJob = {
  action: "start" as const,
  previewRunId: "preview-1",
};

const startDispatch = {
  ...startJob,
  rootDirectory: "expense-published-1",
  composeProjectName: "factory-preview-preview-1",
  artifacts: [
    {
      path: "docker-compose.yml",
      digest:
        "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      sizeBytes: 512,
    },
  ],
};

function collaborators() {
  return {
    dispatchClient: { get: vi.fn().mockResolvedValue(startDispatch) },
    reporter: {
      ready: vi.fn().mockResolvedValue(undefined),
      failed: vi.fn().mockResolvedValue(undefined),
      stopped: vi.fn().mockResolvedValue(undefined),
    },
    runtime: {
      start: vi.fn().mockResolvedValue({
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      }),
      stop: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("queued preview run", () => {
  it("lets stop overtake delayed start dispatch without publishing start evidence", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    const stopDispatch = { ...startDispatch, action: "stop" as const };
    let releaseStartDispatch:
      ((value: typeof startDispatch) => void) | undefined;
    const delayedStartDispatch = new Promise<typeof startDispatch>(
      (resolve) => {
        releaseStartDispatch = resolve;
      },
    );
    dispatchClient.get.mockImplementation((action) =>
      action === "start" ? delayedStartDispatch : Promise.resolve(stopDispatch),
    );

    const starting = executeQueuedPreviewRun(
      "C:/artifacts",
      startJob,
      dispatchClient,
      reporter,
      runtime,
    );
    const stopping = executeQueuedPreviewRun(
      "C:/artifacts",
      { action: "stop", previewRunId: "preview-1" },
      dispatchClient,
      reporter,
      runtime,
    );
    releaseStartDispatch?.(startDispatch);

    await expect(Promise.all([starting, stopping])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.stop).not.toHaveBeenCalled();
    expect(reporter.ready).not.toHaveBeenCalled();
    expect(reporter.failed).not.toHaveBeenCalled();
    expect(reporter.stopped).toHaveBeenCalledWith("preview-1");
  });

  it("fetches the authoritative dispatch before starting the runtime", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();

    await executeQueuedPreviewRun(
      "C:/artifacts",
      startJob,
      dispatchClient,
      reporter,
      runtime,
    );

    expect(dispatchClient.get).toHaveBeenCalledWith("start", "preview-1");
    expect(dispatchClient.get.mock.invocationCallOrder[0]).toBeLessThan(
      runtime.start.mock.invocationCallOrder[0] ?? 0,
    );
    expect(runtime.start).toHaveBeenCalledWith("C:/artifacts", startDispatch);
    expect(reporter.ready).toHaveBeenCalledWith("preview-1", {
      webPort: 43101,
      apiPort: 43102,
      previewUrl: "http://127.0.0.1:43101",
    });
    expect(reporter.failed).not.toHaveBeenCalled();
  });

  it("fetches the authoritative dispatch before stopping the named runtime", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    const stopDispatch = { ...startDispatch, action: "stop" as const };
    dispatchClient.get.mockResolvedValue(stopDispatch);

    await executeQueuedPreviewRun(
      "C:/artifacts",
      { action: "stop", previewRunId: "preview-1" },
      dispatchClient,
      reporter,
      runtime,
    );

    expect(dispatchClient.get.mock.invocationCallOrder[0]).toBeLessThan(
      runtime.stop.mock.invocationCallOrder[0] ?? 0,
    );
    expect(runtime.stop).toHaveBeenCalledWith("C:/artifacts", stopDispatch);
    expect(reporter.stopped).toHaveBeenCalledWith("preview-1");
  });

  it.each([
    { ...startJob, rootDirectory: "caller-controlled" },
    { ...startJob, compilationId: "compilation-1" },
    { ...startJob, composeProjectName: "caller-controlled" },
    { action: "restart", previewRunId: "preview-1" },
    { action: "start" },
  ])("rejects a structurally invalid public queue job", async (job) => {
    const { dispatchClient, reporter, runtime } = collaborators();

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        job,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).rejects.toThrow("Invalid preview queue job.");
    expect(dispatchClient.get).not.toHaveBeenCalled();
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it("does not invoke the runtime when authenticated dispatch resolution fails", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    dispatchClient.get.mockRejectedValue(new Error("Dispatch rejected."));

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        startJob,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).rejects.toThrow(/Preview start failed during dispatch/);
    expect(runtime.start).not.toHaveBeenCalled();
    expect(runtime.stop).not.toHaveBeenCalled();
  });

  it.each([
    { ...startDispatch, action: "stop" as const },
    { ...startDispatch, previewRunId: "preview-other" },
  ])(
    "does not invoke the runtime for a mismatched dispatch",
    async (dispatch) => {
      const { dispatchClient, reporter, runtime } = collaborators();
      dispatchClient.get.mockResolvedValue(dispatch);

      await expect(
        executeQueuedPreviewRun(
          "C:/artifacts",
          startJob,
          dispatchClient,
          reporter,
          runtime,
        ),
      ).rejects.toThrow(/Preview start failed during dispatch/);
      expect(runtime.start).not.toHaveBeenCalled();
      expect(runtime.stop).not.toHaveBeenCalled();
    },
  );

  it("reports an allowlisted failure code without raw process diagnostics", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    runtime.start.mockRejectedValue(
      new Error("docker compose --env-file secret.env failed"),
    );

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        startJob,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).rejects.toThrow(/Preview start failed during runtime-start/);
    expect(reporter.failed).toHaveBeenCalledWith("preview-1", {
      diagnostic: "preview_start_failed",
    });
  });

  it("preserves the health-check failure code from the Worker runtime", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    runtime.start.mockRejectedValue(
      new PreviewRunFailure("preview_health_check_failed"),
    );

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        startJob,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).rejects.toThrow(/Preview start failed during runtime-start/);
    expect(reporter.failed).toHaveBeenCalledWith("preview-1", {
      diagnostic: "preview_health_check_failed",
    });
  });

  it("resolves a cancelled start without publishing ready or failed evidence", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    runtime.start.mockRejectedValue(
      new PreviewRunFailure("preview_start_cancelled"),
    );

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        startJob,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).resolves.toBeUndefined();
    expect(reporter.ready).not.toHaveBeenCalled();
    expect(reporter.failed).not.toHaveBeenCalled();
    expect(reporter.stopped).not.toHaveBeenCalled();
  });

  it("reports only the allowlisted start-timeout diagnostic", async () => {
    const { dispatchClient, reporter, runtime } = collaborators();
    runtime.start.mockRejectedValue(
      new PreviewRunFailure("preview_start_timeout"),
    );

    await expect(
      executeQueuedPreviewRun(
        "C:/artifacts",
        startJob,
        dispatchClient,
        reporter,
        runtime,
      ),
    ).rejects.toThrow(/Preview start failed during runtime-start/);
    expect(reporter.failed).toHaveBeenCalledWith("preview-1", {
      diagnostic: "preview_start_timeout",
    });
  });
});

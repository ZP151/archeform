import { describe, expect, it, vi } from "vitest";

import type {
  PreviewOperationOptions,
  PreviewProcessRunner,
  PreviewRuntimeRequest,
} from "../src/preview-runner.js";
import { createLoggedVerificationOperations } from "../src/verifier/verification-logging.js";

describe("verification operation logging", () => {
  it("forwards preview dependencies and options by identity while bounding failures", async () => {
    const request = {
      previewRunId: "preview-verification-1",
      rootDirectory: "generated",
      composeProjectName: "factory-preview-preview-verification-1",
      artifacts: [],
    } satisfies PreviewRuntimeRequest;
    const processRunner: PreviewProcessRunner = async () => undefined;
    const options: PreviewOperationOptions = { operationTimeoutMs: 1_234 };
    const startedPreview = {
      webPort: 49_101,
      apiPort: 49_102,
      previewUrl: "http://127.0.0.1:49101",
    };
    const startPreviewRun = vi.fn(async () => startedPreview);
    const stopPreviewRun = vi.fn(async () => {
      throw new Error(`${"x".repeat(200)}\nnot logged`);
    });
    const logger = { info: vi.fn(), error: vi.fn() };
    const operations = createLoggedVerificationOperations({
      jobId: "job-1",
      executeCompilation: vi.fn(),
      startPreviewRun,
      stopPreviewRun,
      logger,
    });

    await expect(
      operations.startPreviewRun(
        "C:/artifacts",
        request,
        processRunner,
        options,
      ),
    ).resolves.toBe(startedPreview);
    await expect(
      operations.stopPreviewRun(
        "C:/artifacts",
        request,
        processRunner,
        options,
      ),
    ).rejects.toThrow();

    const startArguments = startPreviewRun.mock.calls[0];
    expect(startArguments?.[0]).toBe("C:/artifacts");
    expect(startArguments?.[1]).toBe(request);
    expect(startArguments?.[2]).toBe(processRunner);
    expect(startArguments?.[3]).toBe(options);
    const stopArguments = stopPreviewRun.mock.calls[0];
    expect(stopArguments?.[0]).toBe("C:/artifacts");
    expect(stopArguments?.[1]).toBe(request);
    expect(stopArguments?.[2]).toBe(processRunner);
    expect(stopArguments?.[3]).toBe(options);
    expect(logger.info.mock.calls).toEqual([
      ["Factory verification job job-1: booting the isolated preview"],
      ["Factory verification job job-1: preview boot finished"],
      ["Factory verification job job-1: stopping the preview"],
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      `Factory verification job job-1: preview stop failed (${"x".repeat(180)})`,
    );
  });
});

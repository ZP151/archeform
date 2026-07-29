import { Queue, type JobsOptions } from "bullmq";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BullMqPreviewRunQueue } from "../src/preview-run-queue.js";

const acceptedRetention: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
};

describe("BullMqPreviewRunQueue", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses only BullMQ-supported retention options when dispatching a retryable preview job", async () => {
    const add = vi
      .spyOn(Queue.prototype, "add")
      .mockResolvedValue({ id: "bull-job-1" } as never);
    const previewQueue = new BullMqPreviewRunQueue();

    await previewQueue.enqueue({
      action: "stop",
      previewRunId: "preview-1",
    });

    expect(add).toHaveBeenCalledWith(
      "stop",
      { action: "stop", previewRunId: "preview-1" },
      acceptedRetention,
    );
    await previewQueue.onModuleDestroy();
  });
});

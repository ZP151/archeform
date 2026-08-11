import { describe, expect, it, vi } from "vitest";

import { cleanRequestedPreview } from "./preview-cleanup";

describe("cleanRequestedPreview", () => {
  it("recovers a lost start response and survives UI plus first API stop failures", async () => {
    const recovered = {
      previewRunId: "preview-fault-run",
      composeProjectName: "factory-preview-fault-run",
    };
    const stopViaApi = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("first stop response was lost"))
      .mockResolvedValueOnce(undefined);
    const assertAbsent = vi.fn().mockResolvedValue(undefined);

    await expect(
      cleanRequestedPreview({
        knownIdentity: null,
        recoverIdentity: vi.fn().mockResolvedValue(recovered),
        stopViaUi: vi.fn().mockRejectedValue(new Error("Stop unavailable")),
        stopViaApi,
        assertAbsent,
      }),
    ).resolves.toBeUndefined();

    expect(stopViaApi).toHaveBeenCalledTimes(2);
    expect(stopViaApi).toHaveBeenNthCalledWith(1, recovered.previewRunId);
    expect(assertAbsent).toHaveBeenCalledWith(recovered);
  });
});

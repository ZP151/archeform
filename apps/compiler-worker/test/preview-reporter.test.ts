import { describe, expect, it, vi } from "vitest";

import { createPreviewReporter } from "../src/preview-reporter.js";

describe("preview reporter", () => {
  it.each([
    {
      operation: "ready" as const,
      path: "/internal/preview-runs/preview-1/ready",
      evidence: {
        webPort: 43101,
        apiPort: 43102,
        previewUrl: "http://127.0.0.1:43101",
      },
    },
    {
      operation: "failed" as const,
      path: "/internal/preview-runs/preview-1/failed",
      evidence: { diagnostic: "preview_start_failed" as const },
    },
    {
      operation: "stopped" as const,
      path: "/internal/preview-runs/preview-1/stopped",
      evidence: undefined,
    },
  ])("authenticates $operation evidence callbacks", async (scenario) => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });
    const reporter = createPreviewReporter(
      "http://control-plane:3000/",
      "configured-worker-token",
      fetchImplementation as typeof fetch,
    );

    if (scenario.operation === "ready") {
      await reporter.ready("preview-1", scenario.evidence);
    } else if (scenario.operation === "failed") {
      await reporter.failed("preview-1", scenario.evidence);
    } else {
      await reporter.stopped("preview-1");
    }

    expect(fetchImplementation).toHaveBeenCalledWith(
      `http://control-plane:3000${scenario.path}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-factory-internal-token": "configured-worker-token",
        },
        ...(scenario.evidence === undefined
          ? {}
          : { body: JSON.stringify(scenario.evidence) }),
      },
    );
  });
});

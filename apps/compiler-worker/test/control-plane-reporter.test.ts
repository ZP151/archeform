import { describe, expect, it, vi } from "vitest";

import { createControlPlaneReporter } from "../src/control-plane-reporter.js";

describe("control-plane reporter", () => {
  it("posts only bounded Worker evidence to the completion endpoint", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: true });
    const reporter = createControlPlaneReporter(
      "http://control-plane:3000/",
      fetchImplementation as typeof fetch,
    );
    const evidence = {
      compilationId: "compilation-1",
      graphHash:
        "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      rootDirectory: "expense-approval-published-1",
      artifacts: [
        {
          path: "api/src/main.ts",
          digest:
            "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
          sizeBytes: 48,
        },
      ],
    };

    await reporter.complete(evidence);

    expect(fetchImplementation).toHaveBeenCalledWith(
      "http://control-plane:3000/internal/compilations/compilation-1/complete",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          graphHash: evidence.graphHash,
          rootDirectory: evidence.rootDirectory,
          artifacts: evidence.artifacts,
        }),
      },
    );
  });
});

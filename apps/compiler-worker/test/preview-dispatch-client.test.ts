import { describe, expect, it, vi } from "vitest";

import { createPreviewDispatchClient } from "../src/preview-dispatch-client.js";

const dispatch = {
  action: "start" as const,
  previewRunId: "preview-1",
  rootDirectory: "expense-approval-published-1",
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

describe("preview dispatch client", () => {
  it("fetches an authenticated authoritative dispatch without a request body", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(dispatch),
    });
    const client = createPreviewDispatchClient(
      "http://control-plane:3000/",
      "configured-worker-token",
      fetchImplementation as typeof fetch,
    );

    await expect(client.get("start", "preview-1")).resolves.toEqual(dispatch);
    expect(fetchImplementation).toHaveBeenCalledWith(
      "http://control-plane:3000/internal/preview-runs/preview-1/dispatch?action=start",
      {
        method: "GET",
        headers: {
          "x-factory-internal-token": "configured-worker-token",
        },
      },
    );
  });

  it("rejects a Control Plane response with unexpected privileged fields", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...dispatch,
        command: "docker compose up",
      }),
    });
    const client = createPreviewDispatchClient(
      "http://control-plane:3000",
      "configured-worker-token",
      fetchImplementation as typeof fetch,
    );

    await expect(client.get("start", "preview-1")).rejects.toThrow(
      "Control Plane returned an invalid preview dispatch.",
    );
  });

  it.each(["C:/outside.ts", "C:outside.ts"])(
    "rejects a dispatch containing the unsafe artifact path %s",
    async (path) => {
      const fetchImplementation = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ...dispatch,
          artifacts: [{ ...dispatch.artifacts[0], path }],
        }),
      });
      const client = createPreviewDispatchClient(
        "http://control-plane:3000",
        "configured-worker-token",
        fetchImplementation as typeof fetch,
      );

      await expect(client.get("start", "preview-1")).rejects.toThrow(
        "Control Plane returned an invalid preview dispatch.",
      );
    },
  );

  it("rejects a non-successful dispatch response", async () => {
    const fetchImplementation = vi.fn().mockResolvedValue({ ok: false });
    const client = createPreviewDispatchClient(
      "http://control-plane:3000",
      "configured-worker-token",
      fetchImplementation as typeof fetch,
    );

    await expect(client.get("start", "preview-1")).rejects.toThrow(
      "Control Plane rejected the preview dispatch request.",
    );
  });
});

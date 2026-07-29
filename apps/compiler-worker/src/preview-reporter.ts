import type { PreviewFailureCode, StartedPreview } from "./preview-runner.js";

export interface PreviewReporter {
  ready(previewRunId: string, evidence: StartedPreview): Promise<void>;
  failed(
    previewRunId: string,
    evidence: {
      readonly diagnostic: PreviewFailureCode;
    },
  ): Promise<void>;
  stopped(previewRunId: string): Promise<void>;
}

export function createPreviewReporter(
  controlPlaneUrl: string,
  internalWorkerToken: string,
  fetchImplementation: typeof fetch = fetch,
): PreviewReporter {
  const baseUrl = controlPlaneUrl.replace(/\/+$/, "");
  async function post(path: string, body?: unknown): Promise<void> {
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-factory-internal-token": internalWorkerToken,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok)
      throw new Error("Control Plane rejected preview evidence.");
  }
  return {
    ready: (id, evidence) =>
      post(`/internal/preview-runs/${encodeURIComponent(id)}/ready`, evidence),
    failed: (id, evidence) =>
      post(`/internal/preview-runs/${encodeURIComponent(id)}/failed`, evidence),
    stopped: (id) =>
      post(`/internal/preview-runs/${encodeURIComponent(id)}/stopped`),
  };
}

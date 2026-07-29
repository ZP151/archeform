import type { CompilationReporter } from "./queued-compilation.js";

type FetchImplementation = typeof fetch;

/**
 * Bridges the isolated Worker filesystem boundary back to the Control Plane.
 * It intentionally serializes only output evidence; the submitted Graph and
 * any AI request data stay within the queue job and are never reported.
 */
export function createControlPlaneReporter(
  controlPlaneUrl: string,
  internalWorkerToken: string,
  fetchImplementation: FetchImplementation = fetch,
): CompilationReporter {
  const baseUrl = controlPlaneUrl.replace(/\/+$/, "");
  return {
    async complete(evidence) {
      const response = await fetchImplementation(
        `${baseUrl}/internal/compilations/${encodeURIComponent(evidence.compilationId)}/complete`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-factory-internal-token": internalWorkerToken,
          },
          body: JSON.stringify({
            graphHash: evidence.graphHash,
            rootDirectory: evidence.rootDirectory,
            artifacts: evidence.artifacts,
          }),
        },
      );
      if (!response.ok) {
        throw new Error("Control Plane rejected compilation evidence.");
      }
    },
  };
}

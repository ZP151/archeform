import type { DiagnosisV1, VerificationEvidenceV1 } from "@factory/graph";

export type VerificationReportInput = {
  readonly evidence: VerificationEvidenceV1;
  /** Only a failing run carries a diagnosis; success reports none. */
  readonly diagnosis: DiagnosisV1 | undefined;
};

export interface VerificationReporter {
  report(input: VerificationReportInput): Promise<void>;
}

type FetchImplementation = typeof fetch;

/**
 * Bridges the isolated Worker filesystem boundary back to the Control Plane's
 * verification evidence endpoint. It serializes only the safe evidence bundle
 * and, on failure, the deterministic diagnosis (which embeds any reviewable
 * Draft Diff). The submitted Graph, composition lock, and any AI request data
 * stay within the queue job and are never reported.
 */
export function createVerificationReporter(
  controlPlaneUrl: string,
  internalWorkerToken: string,
  fetchImplementation: FetchImplementation = fetch,
): VerificationReporter {
  const baseUrl = controlPlaneUrl.replace(/\/+$/, "");
  return {
    async report({ evidence, diagnosis }) {
      const body: Record<string, unknown> = { evidence };
      if (diagnosis !== undefined) {
        body.diagnosis = diagnosis;
      }
      const response = await fetchImplementation(
        `${baseUrl}/internal/verification-runs/${encodeURIComponent(evidence.verificationRunId)}/evidence`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-factory-internal-token": internalWorkerToken,
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        throw new Error("Control Plane rejected verification evidence.");
      }
    },
  };
}

import {
  diagnoseVerification,
  parseApplicationGraph,
  parseVerificationEvidence,
  VerificationContractError,
  type DiagnosisV1,
} from "@factory/graph";

/**
 * Revision envelopes are not Published Graphs; they fail closed at the
 * boundary. Shared by the diagnosis adapter and the queued job's pre-flight.
 */
export const revisionEnvelopeKeys = new Set([
  "status",
  "revision",
  "publishedRevision",
  "draftRevisionId",
]);

/**
 * Worker-boundary diagnosis adapter. Raw evidence, graph, and composition lock
 * inputs from the job queue are parsed here before the pure deterministic
 * mapping in @factory/graph runs; malformed or hostile inputs fail closed
 * before any diff is derived. Diagnosis persists only hashes and allowlisted
 * prose, never Graph content.
 */
export function diagnoseCompilation(
  evidenceInput: unknown,
  graphInput: unknown,
  compositionLockInput: unknown,
): DiagnosisV1 {
  if (
    graphInput !== null &&
    typeof graphInput === "object" &&
    [...revisionEnvelopeKeys].some((key) => key in (graphInput as object))
  ) {
    throw new VerificationContractError(
      "diagnoseCompilation requires an immutable Published Graph, not a draft or exchange envelope.",
    );
  }
  const evidence = parseVerificationEvidence(evidenceInput);
  const graph = parseApplicationGraph(graphInput);
  return diagnoseVerification(evidence, graph, compositionLockInput);
}

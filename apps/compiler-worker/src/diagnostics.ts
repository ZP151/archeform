/**
 * Bounded diagnostic line for queue-level verification failures. The job
 * adapter reports one terminal evidence bundle for failures inside the
 * handler, but a job can still fail at the queue layer (a stale job, a
 * malformed payload, a crash before the boundary runs); without a listener
 * that failure would be invisible to the acceptance harness. Only the job id
 * and a bounded, newline-free message are ever logged.
 */
export function boundedFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return (
    raw.replace(/[\x00-\x1f\x7f]/g, " ").trim() || "unknown failure"
  ).slice(0, 180);
}

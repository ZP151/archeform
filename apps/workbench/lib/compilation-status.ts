/** Compilation evidence becomes immutable once the Worker reports a terminal state. */
export function isPendingCompilation(status: string): boolean {
  return status === "queued" || status === "running";
}

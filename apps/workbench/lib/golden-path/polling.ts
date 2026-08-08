/**
 * Bounded polling helper for the one-action release pipeline: fetches a value
 * until it is terminal, failing closed with `null` once the deadline passes.
 * Intervals and deadlines are always bounded (1.5s / 300s defaults) so a
 * stalled pipeline cannot poll forever.
 */

export interface PollOptions {
  readonly intervalMs?: number;
  readonly timeoutMs?: number;
}

export async function pollUntil<T>(
  fetch: () => Promise<T>,
  isTerminal: (value: T) => boolean,
  options: PollOptions = {},
): Promise<T | null> {
  const intervalMs = options.intervalMs ?? 1500;
  const timeoutMs = options.timeoutMs ?? 300_000;
  const deadline = Date.now() + timeoutMs;
  let value = await fetch();
  while (!isTerminal(value)) {
    if (Date.now() >= deadline) return null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await fetch();
  }
  return value;
}

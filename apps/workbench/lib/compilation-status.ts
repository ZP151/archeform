export type WorkbenchCompilationResult =
  | { readonly status: "queued" }
  | { readonly status: "running" }
  | {
      readonly status: "succeeded";
      readonly artifactCount: number;
      readonly completedAt: string;
    }
  | {
      readonly status: "failed";
      readonly failureCode: "compilation.failed";
      readonly completedAt: string;
    };

const INVALID_COMPILATION_RESULT =
  "Control Plane compilation result is invalid.";

function exactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function canonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function parseCompilationResult(
  input: unknown,
): WorkbenchCompilationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(INVALID_COMPILATION_RESULT);
  }
  const record = input as Record<string, unknown>;
  if (
    (record.status === "queued" || record.status === "running") &&
    exactKeys(record, ["status"])
  ) {
    return { status: record.status };
  }
  if (
    record.status === "succeeded" &&
    exactKeys(record, ["status", "artifactCount", "completedAt"]) &&
    typeof record.artifactCount === "number" &&
    Number.isSafeInteger(record.artifactCount) &&
    record.artifactCount >= 0 &&
    canonicalIso(record.completedAt)
  ) {
    return {
      status: "succeeded",
      artifactCount: record.artifactCount,
      completedAt: record.completedAt,
    };
  }
  if (
    record.status === "failed" &&
    exactKeys(record, ["status", "failureCode", "completedAt"]) &&
    record.failureCode === "compilation.failed" &&
    canonicalIso(record.completedAt)
  ) {
    return {
      status: "failed",
      failureCode: "compilation.failed",
      completedAt: record.completedAt,
    };
  }
  throw new Error(INVALID_COMPILATION_RESULT);
}

/** Compilation evidence becomes immutable once the Worker reports a terminal state. */
export function isPendingCompilation(status: string): boolean {
  return status === "queued" || status === "running";
}

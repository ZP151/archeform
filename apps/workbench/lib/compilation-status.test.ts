import { describe, expect, it } from "vitest";

import {
  isPendingCompilation,
  parseCompilationResult,
} from "./compilation-status";

describe("isPendingCompilation", () => {
  it("polls queued and running compilation states but not immutable terminal evidence", () => {
    expect(isPendingCompilation("queued")).toBe(true);
    expect(isPendingCompilation("running")).toBe(true);
    expect(isPendingCompilation("succeeded")).toBe(false);
    expect(isPendingCompilation("failed")).toBe(false);
  });
});

describe("parseCompilationResult", () => {
  it.each([
    [{ status: "queued" }, { status: "queued" }],
    [{ status: "running" }, { status: "running" }],
    [
      {
        status: "succeeded",
        artifactCount: 2,
        completedAt: "2026-08-10T12:00:00.000Z",
      },
      {
        status: "succeeded",
        artifactCount: 2,
        completedAt: "2026-08-10T12:00:00.000Z",
      },
    ],
    [
      {
        status: "failed",
        failureCode: "compilation.failed",
        completedAt: "2026-08-10T12:00:00.000Z",
      },
      {
        status: "failed",
        failureCode: "compilation.failed",
        completedAt: "2026-08-10T12:00:00.000Z",
      },
    ],
  ])("accepts an exact terminal or pending result", (input, expected) => {
    expect(parseCompilationResult(input)).toEqual(expected);
  });

  it.each([
    { status: "queued", graph: { secret: "must-not-surface" } },
    { status: "running", message: "must-not-surface" },
    {
      status: "succeeded",
      artifactCount: -1,
      completedAt: "2026-08-10T12:00:00.000Z",
    },
    {
      status: "succeeded",
      artifactCount: 1.5,
      completedAt: "2026-08-10T12:00:00.000Z",
    },
    {
      status: "succeeded",
      artifactCount: 1,
      completedAt: "2026-08-10 12:00:00Z",
    },
    {
      status: "failed",
      failureCode: "provider.failed",
      completedAt: "2026-08-10T12:00:00.000Z",
    },
    {
      status: "failed",
      failureCode: "compilation.failed",
      completedAt: "2026-08-10T12:00:00.000Z",
      stack: "must-not-surface",
    },
  ])("rejects unsafe or malformed result evidence", (input) => {
    expect(() => parseCompilationResult(input)).toThrow(
      "Control Plane compilation result is invalid.",
    );
  });
});

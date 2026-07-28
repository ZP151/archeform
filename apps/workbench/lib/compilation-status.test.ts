import { describe, expect, it } from "vitest";

import { isPendingCompilation } from "./compilation-status";

describe("isPendingCompilation", () => {
  it("polls queued and running compilation states but not immutable terminal evidence", () => {
    expect(isPendingCompilation("queued")).toBe(true);
    expect(isPendingCompilation("running")).toBe(true);
    expect(isPendingCompilation("succeeded")).toBe(false);
    expect(isPendingCompilation("failed")).toBe(false);
  });
});

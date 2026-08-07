import { describe, expect, it } from "vitest";

import { boundedFailureMessage } from "../src/diagnostics.js";

describe("boundedFailureMessage", () => {
  it("strips control characters and newlines from an error message", () => {
    expect(boundedFailureMessage(new Error("line1\nline2\rline3\x07"))).toBe(
      "line1 line2 line3",
    );
  });

  it("falls back for empty or whitespace-only messages", () => {
    expect(boundedFailureMessage(new Error("  \t "))).toBe("unknown failure");
  });

  it("caps the message at 180 characters", () => {
    expect(boundedFailureMessage("x".repeat(200)).length).toBe(180);
  });

  it("trims surrounding whitespace after control-character replacement", () => {
    expect(boundedFailureMessage("\x00\x1b[31merror\x1f")).toBe("[31merror");
  });

  it("accepts non-Error values through String coercion", () => {
    expect(boundedFailureMessage(42)).toBe("42");
    expect(boundedFailureMessage({ message: "boom" })).toBe("[object Object]");
  });
});

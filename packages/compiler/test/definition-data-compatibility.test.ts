import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { currentDefinitionDataCompatibility } from "./fixtures/definition-data-compatibility.js";

describe("Product definition data compatibility", () => {
  it("preserves all four delivered definitions and complete Published bundles from f8cdfe81", () => {
    const expected = JSON.parse(
      readFileSync(
        new URL("./fixtures/definition-data-baseline.json", import.meta.url),
        "utf8",
      ),
    );
    expect(expected.base).toBe("f8cdfe812c6c5ab2710a641862aa8f026134ab15");
    const actual = currentDefinitionDataCompatibility();
    expect(actual).toHaveLength(4);
    expect(actual).toEqual(expected.entries);
  });
});

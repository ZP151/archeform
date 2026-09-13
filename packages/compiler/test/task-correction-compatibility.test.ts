import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  generateApplicationBundle,
  type PublishedGraphInput,
} from "../src/index.js";

const baseline = JSON.parse(
  readFileSync(
    new URL("./fixtures/task-correction-legacy-baseline.json", import.meta.url),
    "utf8",
  ),
);

describe("Task correction compatibility with delivered immutable Task apps", () => {
  it("preserves the complete ordered Published Task bundle captured at 5b65169e", () => {
    expect(baseline.baseline).toBe("5b65169e56c834f2a466539ee81ec020e76541c3");
    for (const entry of baseline.entries) {
      const files = generateApplicationBundle(
        entry.input as PublishedGraphInput,
      ).files;
      const digest = createHash("sha256")
        .update(
          JSON.stringify(files.map(({ path, content }) => [path, content])),
        )
        .digest("hex");
      expect(files).toHaveLength(entry.fileCount);
      expect(digest).toBe(entry.sha256);
    }
  });
});

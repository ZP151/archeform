import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Workbench Dockerfile", () => {
  it("builds every workspace package imported by its browser bundle", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("pnpm --filter @factory/capabilities build");
    expect(dockerfile).toContain("pnpm --filter @factory/workbench build");
  });
});

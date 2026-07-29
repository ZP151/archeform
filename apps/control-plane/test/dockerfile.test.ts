import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Control Plane Dockerfile", () => {
  it("builds every workspace package required by the Control Plane runtime", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );

    expect(dockerfile).toContain("pnpm --filter @factory/graph build");
    expect(dockerfile).toContain("pnpm --filter @factory/adapters build");
    expect(dockerfile).toContain("pnpm --filter @factory/capabilities build");
    expect(dockerfile).toContain("pnpm --filter @factory/control-plane build");
  });
});

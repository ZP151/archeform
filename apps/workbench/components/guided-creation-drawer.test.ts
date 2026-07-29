import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("GuidedCreationDrawer", () => {
  it("defines an outcome-to-capability-to-Draft journey with stable browser controls", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/guided-creation-drawer.tsx"),
      "utf8",
    );

    expect(source).toContain("Create application");
    expect(source).toContain(
      'data-testid={"guided-template-" + option.profile}',
    );
    expect(source).toContain(
      'data-testid={"guided-capability-" + capability.key}',
    );
    expect(source).toContain('data-testid="guided-create"');
    expect(source).toContain("Keep only what you need");
    expect(source).toContain("left-side");
  });
});

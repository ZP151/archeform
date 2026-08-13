import { describe, expect, it } from "vitest";

import {
  assertCopyableGeneratedSource,
  workbenchPrimitiveKeys,
  workbenchUiBoundary,
} from "../src/index.js";

describe("Workbench UI boundary", () => {
  it("keeps operator source separate from generated Restaurant source", () => {
    expect(workbenchUiBoundary).toEqual({
      key: "archeform-workbench",
      version: "1.0.0",
      generatedRuntimeDependency: false,
    });
  });

  it("rejects private workspace imports from copyable generated source", () => {
    expect(() =>
      assertCopyableGeneratedSource(
        'import { Card } from "@factory/ui-primitives";',
      ),
    ).toThrow("private workspace import");
    expect(
      assertCopyableGeneratedSource('<main aria-label="Restaurant"></main>'),
    ).toBe(true);
  });

  it("consumes the real primitive registry without leaking it into generated source", () => {
    expect(workbenchPrimitiveKeys()).toEqual([
      "button",
      "input",
      "label",
      "select",
      "checkbox",
      "switch",
      "dialog",
      "drawer",
      "tabs",
      "table",
      "card",
      "badge",
      "separator",
      "skeleton",
      "toast",
    ]);
    expect(Object.isFrozen(workbenchUiBoundary)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import {
  assertCopyableGeneratedSource,
  workbenchPrimitiveKeys,
  workbenchUiBoundary,
} from "../src/index.js";
import * as workbenchUi from "../src/index.js";

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

  it("declares only the backed Workspace Home and Builder destinations", () => {
    expect(workbenchUi.workbenchContextRegistry).toEqual([
      {
        key: "workspace-home",
        label: "Apps",
        destinations: [{ key: "apps", label: "Apps", icon: "layout-grid" }],
      },
      {
        key: "builder",
        label: "Builder",
        destinations: [
          { key: "page", label: "Page", icon: "panels-top-left" },
          { key: "data", label: "Data", icon: "database" },
          { key: "workflow", label: "Workflow", icon: "workflow" },
          { key: "access", label: "Access", icon: "shield-check" },
          { key: "ai", label: "AI", icon: "sparkles" },
          { key: "code", label: "Code", icon: "code-2" },
          { key: "release", label: "Publish", icon: "rocket" },
        ],
      },
    ]);

    const serialized = JSON.stringify(workbenchUi.workbenchContextRegistry);
    expect(serialized).not.toMatch(
      /graph|capability|evidence|template|management|analytics|cloud/i,
    );
    expect(
      workbenchUi
        .findWorkbenchContext("builder")
        .destinations.map(({ key }) => key),
    ).toEqual(["page", "data", "workflow", "access", "ai", "code", "release"]);
  });

  it("deep-freezes context definitions and redacts unknown lookup material", () => {
    const builder = workbenchUi.findWorkbenchContext("builder");
    expect(Object.isFrozen(workbenchUi.workbenchContextRegistry)).toBe(true);
    expect(Object.isFrozen(builder)).toBe(true);
    expect(Object.isFrozen(builder.destinations)).toBe(true);
    expect(Object.isFrozen(builder.destinations[0])).toBe(true);

    const hostile = "HOSTILE-CONTEXT-SENTINEL";
    expect(() =>
      workbenchUi.findWorkbenchContext(hostile as "builder"),
    ).toThrow("Unknown Workbench context.");
    try {
      workbenchUi.findWorkbenchContext(hostile as "builder");
    } catch (error) {
      expect(String(error)).not.toContain(hostile);
    }
  });
});

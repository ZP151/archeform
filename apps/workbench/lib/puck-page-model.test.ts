import { describe, expect, it } from "vitest";

import {
  applyPuckBlocksToPageModel,
  pageModelToPuckBlocks,
} from "./puck-page-model";
import { workbenchGraph } from "./workbench-graph";

describe("Puck PageModel projection", () => {
  it("round-trips declared blocks, including their order and supported props", () => {
    const page = structuredClone(workbenchGraph.page);
    page.pages[0]!.blocks = [
      {
        id: "fixed-before",
        type: "custom-internal",
        props: { position: "before" },
      },
      {
        id: "intake",
        type: "form",
        entity: "request",
        bindings: { value: "request.title" },
        props: { title: "Intake" },
      },
      {
        id: "fixed-middle",
        type: "custom-internal",
        props: { position: "middle" },
      },
      {
        id: "banner",
        type: "hero",
        bindings: { heading: "request.title" },
        props: { eyebrow: "Ops", heading: "Review work" },
      },
    ];

    const visual = pageModelToPuckBlocks(page, "request-intake");
    const next = applyPuckBlocksToPageModel(page, "request-intake", [
      visual[1]!,
      { type: "Collection", props: { title: "Open requests" } },
    ]);

    expect(next.pages[0]?.blocks).toEqual([
      {
        id: "fixed-before",
        type: "custom-internal",
        props: { position: "before" },
      },
      {
        id: "banner",
        type: "hero",
        bindings: { heading: "request.title" },
        props: { eyebrow: "Ops", heading: "Review work" },
      },
      {
        id: "fixed-middle",
        type: "custom-internal",
        props: { position: "middle" },
      },
      {
        id: "puck-collection-2",
        type: "collection",
        props: { title: "Open requests" },
      },
    ]);
  });

  it("preserves unsupported blocks instead of silently deleting Graph semantics", () => {
    const page = structuredClone(workbenchGraph.page);
    page.pages[0]!.blocks.push({
      id: "special",
      type: "custom-internal",
      props: { x: 1 },
    });

    const next = applyPuckBlocksToPageModel(page, "request-intake", []);

    expect(next.pages[0]?.blocks).toEqual([
      { id: "special", type: "custom-internal", props: { x: 1 } },
    ]);
  });
});

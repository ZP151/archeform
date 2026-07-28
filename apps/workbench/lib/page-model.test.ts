import { describe, expect, it } from "vitest";

import { replaceHeroHeading } from "./page-model";
import { workbenchGraph } from "./workbench-graph";

describe("replaceHeroHeading", () => {
  it("updates only the declared hero heading in a PageModel Draft", () => {
    const next = replaceHeroHeading(
      workbenchGraph.page,
      "request-hero",
      "Route work to the right owner.",
    );

    expect(next.pages[0]?.blocks[0]?.props).toMatchObject({
      heading: "Route work to the right owner.",
    });
    expect(workbenchGraph.page.pages[0]?.blocks[0]?.props).toMatchObject({
      heading: "Move work through the right decision.",
    });
  });
});

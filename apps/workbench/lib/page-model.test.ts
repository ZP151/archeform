import { describe, expect, it } from "vitest";

import {
  addPage,
  replaceHeroHeading,
  setPageBlockEntity,
  setPageDetails,
} from "./page-model";
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

  it("adds a route with owned navigation and keeps route identifiers unique", () => {
    const next = addPage(workbenchGraph.page, {
      id: "request-history",
      route: "/requests/history",
      title: "Request history",
      blocks: [],
      navigation: { id: "request-history", label: "History", icon: "clock" },
    });

    expect(next.pages.at(-1)).toMatchObject({
      id: "request-history",
      route: "/requests/history",
    });
    expect(next.navigation.at(-1)).toEqual({
      id: "request-history",
      label: "History",
      pageId: "request-history",
      icon: "clock",
    });
    expect(() =>
      addPage(workbenchGraph.page, {
        id: "different-id",
        route: "/requests",
        title: "Duplicate route",
        blocks: [],
      }),
    ).toThrow("already uses route");
    expect(() =>
      addPage(workbenchGraph.page, {
        id: "blank-title",
        route: "/blank-title",
        title: "",
        blocks: [],
      }),
    ).toThrow("title is required");
    expect(() =>
      addPage(workbenchGraph.page, {
        id: "valid-page",
        route: "/valid-page",
        title: "A valid title",
        blocks: [],
        navigation: {
          id: "valid-navigation",
          label: "x".repeat(81),
          icon: "layout",
        },
      }),
    ).toThrow("Navigation label");
    expect(() =>
      addPage(workbenchGraph.page, {
        id: `p${"a".repeat(128)}`,
        route: "/too-long-id",
        title: "Too long",
        blocks: [],
      }),
    ).toThrow("invalid");
  });

  it("edits declared route metadata and block entity bindings immutably", () => {
    const renamed = setPageDetails(workbenchGraph.page, "request-intake", {
      title: "Request review",
      route: "/review",
    });
    const bound = setPageBlockEntity(
      renamed,
      "request-intake",
      "request-hero",
      "request",
    );

    expect(bound.pages[0]).toMatchObject({
      title: "Request review",
      route: "/review",
    });
    expect(bound.pages[0]?.blocks[0]?.entity).toBe("request");
    expect(workbenchGraph.page.pages[0]?.route).toBe("/requests");
  });
});
